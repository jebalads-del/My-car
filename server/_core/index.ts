import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { z } from "zod";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createCorsMiddleware } from "./cors";
import { clearLegacySessionCookie, getSessionCookieName, getSessionCookieOptions } from "./cookies";
import { ensureLocalAdmin, loginLocal, requestRegistrationOtp, verifyRegistrationOtp, requestResetOtp, resetPassword } from "../local-auth";
import { isSupabaseConfigured } from "../supabase-client";
import { registerSupabaseAuthRoutes } from "../supabase-auth";

function registerLegacyAuthRoutes(app: express.Express) {
  registerOAuthRoutes(app);
  app.get("/api/auth/provider", (_req, res) => {
    res.json({ provider: "local" });
  });
  app.post("/api/auth/local-login", async (req, res) => {
    const parsed = z.object({ email: z.string().email().max(320), password: z.string().min(1).max(256) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "بيانات الدخول غير صالحة" }); return; }
    const result = await loginLocal(parsed.data.email.trim().toLowerCase(), parsed.data.password);
    if (!result) { res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }); return; }
    res.cookie(getSessionCookieName(req), result.token, { ...getSessionCookieOptions(req), maxAge: 1000 * 60 * 60 * 24 * 365 });
    res.json({ user: { id: result.user.id, openId: result.user.openId, name: result.user.name, email: result.user.email, phone: result.user.phone, role: result.user.role, blocked: result.user.blocked } });
  });
  app.post("/api/auth/register/request", async (req, res) => {
    const parsed = z.object({ email: z.string().email().max(320), name: z.string().trim().min(2).max(100), password: z.string().min(8).max(256) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل الاسم والبريد وكلمة مرور من 8 أحرف على الأقل" }); return; }
    try { await requestRegistrationOtp(parsed.data.email, parsed.data.name, parsed.data.password); res.json({ ok: true }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "تعذّر إرسال رمز التحقق" }); }
  });
  app.post("/api/auth/register/verify", async (req, res) => {
    const parsed = z.object({ email: z.string().email().max(320), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل رمز التحقق المكوّن من 6 أرقام" }); return; }
    try { const result = await verifyRegistrationOtp(parsed.data.email, parsed.data.code); res.cookie(getSessionCookieName(req), result.token, { ...getSessionCookieOptions(req), maxAge: 1000 * 60 * 60 * 24 * 365 }); res.json({ user: { id: result.user.id, openId: result.user.openId, name: result.user.name, email: result.user.email, phone: result.user.phone, role: result.user.role, blocked: result.user.blocked } }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "تعذّر تفعيل الحساب" }); }
  });
  app.post("/api/auth/password/request", async (req, res) => {
    const parsed = z.object({ email: z.string().email().max(320) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "أدخل بريداً إلكترونياً صالحاً" }); return; }
    try { await requestResetOtp(parsed.data.email); res.json({ ok: true }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "تعذّر إرسال رمز الاستعادة" }); }
  });
  app.post("/api/auth/password/reset", async (req, res) => {
    const parsed = z.object({ email: z.string().email().max(320), code: z.string().regex(/^\d{6}$/), password: z.string().min(8).max(256) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "تحقق من الرمز وكلمة المرور الجديدة" }); return; }
    try { await resetPassword(parsed.data.email, parsed.data.code, parsed.data.password); res.json({ ok: true }); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "تعذّر تغيير كلمة المرور" }); }
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const supabaseEnabled = isSupabaseConfigured();

  app.use(createCorsMiddleware());
  // app_session_id belongs to the platform, not the configured Supabase application.
  if (!supabaseEnabled) app.use(clearLegacySessionCookie());
  // A 5 MiB image expands to about 6.67 MiB in base64. Keeping the whole body below 7 MiB
  // prevents a tRPC batch from smuggling multiple max-size uploads in one request.
  app.use(express.json({ limit: "7mb" }));
  app.use(express.urlencoded({ limit: "7mb", extended: true }));

  registerStorageProxy(app);
  if (supabaseEnabled) {
    // Supabase owns every auth endpoint in configured mode; OAuth/local credentials are never registered.
    registerSupabaseAuthRoutes(app);
  } else {
    registerLegacyAuthRoutes(app);
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  // In production the API and the exported Expo Web app share one origin.
  // Metro remains the web server during Preview/development, so this is a no-op there.
  const webDist = path.resolve(process.cwd(), "web-dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/manus-storage/")) return next();
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  const port = parseInt(process.env.PORT || "3000");
  if (!supabaseEnabled) await ensureLocalAdmin();
  server.listen(port, () => {
    console.log("[api] server listening");
  });
}

startServer().catch(() => {
  console.error("[api] server failed to start");
});
