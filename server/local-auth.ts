import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, isNull } from "drizzle-orm";
import { localCredentials, otpCodes, users } from "../drizzle/schema";
import { getDb } from "./db";
import { sdk } from "./_core/sdk";

const scrypt = promisify(scryptCallback);
const LOCAL_ADMIN_EMAIL = "admin@sayarty.store";
const LOCAL_ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || "admin123";
const LOCAL_ADMIN_OPEN_ID = "local_admin_sayarty";
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}
async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, stored] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !stored || stored.length !== 128) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(stored, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function codeHash(code: string) { return createHash("sha256").update(code).digest("hex"); }
function makeCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
async function sendOtp(email: string, code: string, purpose: "register" | "reset") {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey) throw new Error("خدمة البريد غير مهيأة");
  const action = purpose === "register" ? "تفعيل حسابك" : "استعادة كلمة المرور";
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [email], subject: `سيّارة — رمز ${action}`, html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2>سيّارة</h2><p>رمز ${action} هو:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>ينتهي الرمز خلال 10 دقائق. لا تشاركه مع أي شخص.</p></div>` }) });
  if (!response.ok) { const detail = await response.text(); console.error("[Resend] OTP failed", response.status, detail); throw new Error("تعذّر إرسال رمز التحقق"); }
}
export async function ensureLocalAdmin(): Promise<void> {
  const db = await getDb(); if (!db) return;
  const existing = (await db.select().from(users).where(eq(users.openId, LOCAL_ADMIN_OPEN_ID)).limit(1))[0];
  let userId = existing?.id;
  if (!userId) { const inserted = await db.insert(users).values({ openId: LOCAL_ADMIN_OPEN_ID, name: "مدير سيّارة", email: LOCAL_ADMIN_EMAIL, loginMethod: "local", role: "admin", blocked: false }).$returningId(); userId = inserted[0]?.id; }
  if (!userId) throw new Error("Unable to initialize local admin");
  const credential = (await db.select().from(localCredentials).where(eq(localCredentials.userId, userId)).limit(1))[0];
  if (!credential) await db.insert(localCredentials).values({ userId, passwordHash: await hashPassword(LOCAL_ADMIN_PASSWORD) });
  else if (existing?.role !== "admin" || existing.blocked) await db.update(users).set({ role: "admin", blocked: false }).where(eq(users.id, userId));
}
export async function loginLocal(email: string, password: string): Promise<{ token: string; user: typeof users.$inferSelect } | null> {
  const db = await getDb(); if (!db) return null;
  const user = (await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1))[0];
  if (!user || user.blocked) return null;
  const credential = (await db.select().from(localCredentials).where(eq(localCredentials.userId, user.id)).limit(1))[0];
  if (!credential || !(await verifyPassword(password, credential.passwordHash))) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return { token: await sdk.createSessionToken(user.openId, { name: user.name || "" }), user: { ...user, lastSignedIn: new Date() } };
}
async function saveOtp(email: string, purpose: "register" | "reset", extra: { name?: string; passwordHash?: string } = {}) {
  const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const code = makeCode();
  await db.delete(otpCodes).where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, purpose)));
  await db.insert(otpCodes).values({ email, purpose, codeHash: codeHash(code), name: extra.name ?? null, passwordHash: extra.passwordHash ?? null, expiresAt: new Date(Date.now() + OTP_TTL_MS) });
  await sendOtp(email, code, purpose);
}
export async function requestRegistrationOtp(emailInput: string, name: string, password: string) {
  const email = normalizeEmail(emailInput); const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const existing = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) throw new Error("يوجد حساب بهذا البريد الإلكتروني");
  await saveOtp(email, "register", { name: name.trim(), passwordHash: await hashPassword(password) });
}
export async function verifyRegistrationOtp(emailInput: string, code: string) {
  const email = normalizeEmail(emailInput); const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة");
  const otp = (await db.select().from(otpCodes).where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, "register"), isNull(otpCodes.consumedAt))).orderBy(desc(otpCodes.createdAt)).limit(1))[0];
  if (!otp || otp.expiresAt.getTime() < Date.now() || otp.attempts >= MAX_OTP_ATTEMPTS) throw new Error("رمز التحقق غير صحيح أو منتهي");
  if (otp.codeHash !== codeHash(code.trim())) { await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id)); throw new Error("رمز التحقق غير صحيح أو منتهي"); }
  const openId = `local_email_${createHash("sha256").update(email).digest("hex").slice(0, 48)}`;
  const userId = await db.transaction(async (tx) => { await tx.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id)); const inserted = await tx.insert(users).values({ openId, name: otp.name || "مستخدم سيّارة", email, loginMethod: "email", role: "user", blocked: false }).$returningId(); const id = inserted[0]?.id; if (!id || !otp.passwordHash) throw new Error("تعذّر إنشاء الحساب"); await tx.insert(localCredentials).values({ userId: id, passwordHash: otp.passwordHash }); return id; });
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0]!;
  return { token: await sdk.createSessionToken(user.openId, { name: user.name || "" }), user };
}
export async function requestResetOtp(emailInput: string) { const email = normalizeEmail(emailInput); const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]; if (!user) throw new Error("لا يوجد حساب بهذا البريد الإلكتروني"); await saveOtp(email, "reset"); }
export async function resetPassword(emailInput: string, code: string, password: string) { const email = normalizeEmail(emailInput); const db = await getDb(); if (!db) throw new Error("قاعدة البيانات غير متاحة"); const otp = (await db.select().from(otpCodes).where(and(eq(otpCodes.email, email), eq(otpCodes.purpose, "reset"), isNull(otpCodes.consumedAt))).orderBy(desc(otpCodes.createdAt)).limit(1))[0]; if (!otp || otp.expiresAt.getTime() < Date.now() || otp.attempts >= MAX_OTP_ATTEMPTS) throw new Error("رمز التحقق غير صحيح أو منتهي");
  if (otp.codeHash !== codeHash(code.trim())) { await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id)); throw new Error("رمز التحقق غير صحيح أو منتهي"); } const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]; if (!user) throw new Error("الحساب غير موجود"); await db.transaction(async (tx) => { await tx.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id)); await tx.update(localCredentials).set({ passwordHash: await hashPassword(password) }).where(eq(localCredentials.userId, user.id)); }); }
export const localAdminEmail = LOCAL_ADMIN_EMAIL;
