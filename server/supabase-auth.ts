import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { readSupabaseCookie, supabaseCookieNames, supabaseCookieOptions } from "./supabase-cookies";
import {
  SupabaseRequestError,
  isSupabaseConfigured,
  supabaseAuthJson,
  supabaseFetch,
  supabaseGetUser,
  supabaseJson,
  type SupabaseAuthUser,
} from "./supabase-client";

export type SupabaseProfile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string | null;
  created_at: string | null;
};

export type SupabaseIdentity = {
  authUser: SupabaseAuthUser;
  profile: SupabaseProfile;
  accessToken: string;
  user: ReturnType<typeof toFrontendUser>;
};

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user?: SupabaseAuthUser;
};

const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(8).max(256);
const nameSchema = z.string().trim().min(2).max(100);
const codeSchema = z.string().trim().min(4).max(512);

function authError(error: unknown): { status: number; error: string; code: string } {
  if (error instanceof SupabaseRequestError) {
    if (error.code === "PROFILE_UNAVAILABLE") return { status: 403, code: "PROFILE_UNAVAILABLE", error: "بيانات الدخول صحيحة، لكن ملف حسابك في الموقع غير متاح. يلزم مراجعة ربط الحساب وصلاحياته." };
    if (error.code === "ACCOUNT_BLOCKED" || error.code === "user_banned") return { status: 403, code: "ACCOUNT_BLOCKED", error: "هذا الحساب موقوف. تواصل مع إدارة الموقع." };
    if (error.code === "email_not_confirmed") return { status: 403, code: "EMAIL_NOT_CONFIRMED", error: "يرجى تفعيل البريد الإلكتروني قبل تسجيل الدخول." };
    if (error.code === "invalid_credentials" || error.code === "invalid_grant") return { status: 401, code: "INVALID_CREDENTIALS", error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. استخدم بيانات حسابك الحالي في sayarty.store." };
    if (error.status === 401 || error.status === 403) return { status: 401, code: "AUTH_UNAUTHORIZED", error: "تعذّر التحقق من بيانات الدخول أو انتهت الجلسة." };
    if (error.status === 429) return { status: 429, code: "AUTH_RATE_LIMITED", error: "طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً." };
    if (error.status >= 500) return { status: 503, code: "AUTH_SERVICE_UNAVAILABLE", error: "خدمة الحسابات غير متاحة مؤقتاً. حاول مجدداً لاحقاً." };
  }
  return { status: 400, code: "AUTH_REQUEST_REJECTED", error: "تعذّرت معالجة طلب الحساب. تحقق من بيانات النموذج وحاول مجدداً." };
}

function isBlocked(status: string | null): boolean {
  return ["blocked", "suspended", "disabled", "banned"].includes((status || "").toLowerCase());
}

function toFrontendUser(profile: SupabaseProfile) {
  return {
    id: profile.id,
    openId: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    loginMethod: "supabase",
    role: profile.role || "user",
    blocked: isBlocked(profile.status),
    createdAt: profile.created_at,
  };
}

function bearerToken(req: Request): string | undefined {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token && token.length <= 16_384) return token;
  }
  return readSupabaseCookie(req, 'session');
}

function refreshToken(req: Request, body: unknown): string | undefined {
  const parsedBody = z.object({ refreshToken: z.string().min(1).max(16_384).optional() }).passthrough().safeParse(body);
  if (parsedBody.success && parsedBody.data.refreshToken) return parsedBody.data.refreshToken;
  return readSupabaseCookie(req, 'refresh');
}

async function currentProfile(authUser: SupabaseAuthUser, accessToken: string): Promise<SupabaseProfile> {
  const rows = await supabaseJson<SupabaseProfile[]>(
    `/rest/v1/users?select=id,name,email,phone,role,status,created_at&id=eq.${encodeURIComponent(authUser.id)}&limit=1`,
    { method: "GET" },
    accessToken,
  );
  const profile = rows[0];
  if (!profile) throw new SupabaseRequestError("تعذّر العثور على ملف المستخدم", 403, "PROFILE_UNAVAILABLE");
  return profile;
}

/** Always validates the live Supabase access token and current users row. */
export async function requireSupabaseIdentity(req: Request, requireAdmin = false): Promise<SupabaseIdentity> {
  if (!isSupabaseConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Supabase غير مهيأ" });
  const accessToken = bearerToken(req);
  if (!accessToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول" });
  try {
    const authUser = await supabaseGetUser(accessToken);
    const profile = await currentProfile(authUser, accessToken);
    if (isBlocked(profile.status)) throw new TRPCError({ code: "FORBIDDEN", message: "هذا الحساب موقوف" });
    if (requireAdmin && profile.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذه العملية للمشرفين فقط" });
    }
    return { authUser, profile, accessToken, user: toFrontendUser(profile) };
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: error instanceof SupabaseRequestError && error.status >= 500 ? "SERVICE_UNAVAILABLE" : "UNAUTHORIZED",
      message: error instanceof SupabaseRequestError && error.status >= 500 ? "خدمة الحسابات غير متاحة" : "انتهت الجلسة أو لا يمكن التحقق منها",
    });
  }
}

export async function getSupabaseIdentity(req: Request): Promise<SupabaseIdentity | null> {
  try {
    return await requireSupabaseIdentity(req);
  } catch {
    return null;
  }
}

function cookieOptions(req: Request) {
  return supabaseCookieOptions(req);
}

function setSessionCookies(req: Request, res: Response, session: SupabaseSession): void {
  const options = cookieOptions(req);
  const names = supabaseCookieNames(req);
  const maxAge = Math.max(1, Number(session.expires_in || 60 * 60)) * 1000;
  res.cookie(names.access, session.access_token, { ...options, maxAge });
  res.cookie(names.refresh, session.refresh_token, { ...options, maxAge: 1000 * 60 * 60 * 24 * 30 });
}

export function clearSupabaseSessionCookies(req: Request, res: Response): void {
  const options = cookieOptions(req);
  const names = supabaseCookieNames(req);
  res.clearCookie(names.access, { ...options, maxAge: -1 });
  res.clearCookie(names.refresh, { ...options, maxAge: -1 });
}

function nativeSessionBody(session: SupabaseSession, user: ReturnType<typeof toFrontendUser>, platform: unknown) {
  const result: Record<string, unknown> = { user };
  if (platform === "native") {
    result.accessToken = session.access_token;
    result.refreshToken = session.refresh_token;
    result.expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + Number(session.expires_in || 0);
  }
  return result;
}

async function identityFromSession(session: SupabaseSession): Promise<SupabaseIdentity> {
  const authUser = session.user ?? await supabaseGetUser(session.access_token);
  const profile = await currentProfile(authUser, session.access_token);
  if (isBlocked(profile.status)) throw new SupabaseRequestError("الحساب موقوف", 403, "ACCOUNT_BLOCKED");
  return { authUser, profile, accessToken: session.access_token, user: toFrontendUser(profile) };
}

export async function revokeSupabaseSession(req: Request): Promise<void> {
  const token = bearerToken(req);
  if (!token || !isSupabaseConfigured()) return;
  try {
    await supabaseFetch("/auth/v1/logout?scope=local", { method: "POST" }, token);
  } catch {
    // Logout must still clear this device's cookies if an expired token cannot be revoked.
  }
}

export function registerSupabaseAuthRoutes(app: Express): void {
  app.get("/api/auth/provider", (_req, res) => {
    res.json({
      provider: "supabase",
      websiteUrl: "https://sayarty.store",
      unsupportedCarFields: ["location", "transmission", "fuel", "condition"],
      extendedSettings: false,
    });
  });

  // Cookie transport diagnostic only: the challenge is never an authentication token.
  app.get('/api/auth/session/transport', (req, res) => {
    const challenge = randomBytes(16).toString('hex');
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(supabaseCookieNames(req).probe, challenge, { ...cookieOptions(req), maxAge: 60000 });
    res.json({ challenge });
  });
  app.post('/api/auth/session/transport', (req, res) => {
    const parsed = z.object({ challenge: z.string().regex(/^[a-f0-9]{32}$/) }).strict().safeParse(req.body);
    const persisted = parsed.success && readSupabaseCookie(req, 'transport') === parsed.data.challenge;
    res.setHeader('Cache-Control', 'no-store');
    res.clearCookie(supabaseCookieNames(req).probe, cookieOptions(req));
    res.json({ persisted: Boolean(persisted) });
  });

  app.post("/api/auth/local-login", async (req, res) => {
    const parsed = z.object({ email: emailSchema, password: z.string().min(1).max(256), platform: z.string().optional() }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "بيانات الدخول غير صالحة" }); return; }
    try {
      const session = await supabaseJson<SupabaseSession>("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email: parsed.data.email.toLowerCase(), password: parsed.data.password }),
      });
      const identity = await identityFromSession(session);
      setSessionCookies(req, res, session);
      res.json(nativeSessionBody(session, identity.user, parsed.data.platform));
    } catch (error) {
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.post("/api/auth/session/refresh", async (req, res) => {
    const token = refreshToken(req, req.body);
    if (!token) { res.status(401).json({ error: "جلسة التجديد غير متاحة" }); return; }
    try {
      const session = await supabaseJson<SupabaseSession>("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: token }),
      });
      const identity = await identityFromSession(session);
      setSessionCookies(req, res, session);
      const platform = z.object({ platform: z.string().optional() }).passthrough().safeParse(req.body).data?.platform;
      res.json(nativeSessionBody(session, identity.user, platform));
    } catch (error) {
      clearSupabaseSessionCookies(req, res);
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.post("/api/auth/register/request", async (req, res) => {
    const parsed = z.object({ email: emailSchema, name: nameSchema, password: passwordSchema, platform: z.string().optional() }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل الاسم والبريد وكلمة مرور من 8 أحرف على الأقل" }); return; }
    try {
      await supabaseAuthJson("signup", { email: parsed.data.email.toLowerCase(), password: parsed.data.password, data: { name: parsed.data.name } });
      res.json({ ok: true });
    } catch (error) {
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.post("/api/auth/register/verify", async (req, res) => {
    const parsed = z.object({ email: emailSchema, code: codeSchema, platform: z.string().optional() }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل رمز التحقق الصحيح" }); return; }
    try {
      const session = await supabaseAuthJson<SupabaseSession>("verify", { type: "signup", email: parsed.data.email.toLowerCase(), token: parsed.data.code });
      const identity = await identityFromSession(session);
      setSessionCookies(req, res, session);
      res.json(nativeSessionBody(session, identity.user, parsed.data.platform));
    } catch (error) {
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.post("/api/auth/password/request", async (req, res) => {
    const parsed = z.object({ email: emailSchema, platform: z.string().optional() }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل بريداً إلكترونياً صالحاً" }); return; }
    try {
      await supabaseAuthJson("recover", { email: parsed.data.email.toLowerCase() });
      // Deliberately generic: the provider owns account-existence disclosure.
      res.json({ ok: true });
    } catch (error) {
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.post("/api/auth/password/reset", async (req, res) => {
    const parsed = z.object({ email: emailSchema, code: codeSchema, password: passwordSchema, platform: z.string().optional() }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "تحقق من الرمز وكلمة المرور الجديدة" }); return; }
    try {
      const session = await supabaseAuthJson<SupabaseSession>("verify", { type: "recovery", email: parsed.data.email.toLowerCase(), token: parsed.data.code });
      await supabaseFetch("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password: parsed.data.password }) }, session.access_token);
      const identity = await identityFromSession(session);
      setSessionCookies(req, res, session);
      res.json({ ok: true, ...nativeSessionBody(session, identity.user, parsed.data.platform) });
    } catch (error) {
      const result = authError(error);
      res.status(result.status).json({ error: result.error, code: result.code });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const identity = await getSupabaseIdentity(req);
    if (!identity) { res.status(401).json({ error: "Not authenticated", user: null }); return; }
    res.json({ user: identity.user });
  });

  app.post("/api/auth/logout", async (req, res) => {
    await revokeSupabaseSession(req);
    clearSupabaseSessionCookies(req, res);
    res.json({ success: true });
  });
}

export async function updateSupabaseProfile(
  req: Request,
  input: { name: string; email: string; phone: string },
): Promise<ReturnType<typeof toFrontendUser> & { emailChangeRequested?: boolean }> {
  const identity = await requireSupabaseIdentity(req);
  const requestedEmail = input.email.trim().toLowerCase();
  let emailChangeRequested = false;
  if (requestedEmail !== (identity.authUser.email || "").toLowerCase()) {
    await supabaseFetch("/auth/v1/user", { method: "PUT", body: JSON.stringify({ email: requestedEmail }) }, identity.accessToken);
    emailChangeRequested = true;
  }
  const rows = await supabaseJson<SupabaseProfile[]>(
    `/rest/v1/users?id=eq.${encodeURIComponent(identity.profile.id)}&select=id,name,email,phone,role,status,created_at`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: input.name.trim(), phone: input.phone.trim() }) },
    identity.accessToken,
  );
  const profile = rows[0];
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "لم تُحفظ البيانات؛ تحقق من صلاحيات الحساب في الموقع" });
  return { ...toFrontendUser(profile), ...(emailChangeRequested ? { emailChangeRequested: true } : {}) };
}
