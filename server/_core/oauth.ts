import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { oauthNonces } from "../../drizzle/schema";
import { ONE_YEAR_MS } from "../../shared/const.js";
import { getDb, getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";
import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./cookies";
import { sdk } from "./sdk";

const OAUTH_NONCE_COOKIE = "manus_oauth_nonce";
const OAUTH_NONCE_TTL_MS = 10 * 60 * 1000;
const NATIVE_FRONTEND = "native";

type OAuthState = { redirectUri: string; nonce: string };

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function hashNonce(nonce: string): string {
  return createHash("sha256").update(nonce).digest("hex");
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function parseState(value: string): OAuthState | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as OAuthState).redirectUri !== "string" ||
      typeof (parsed as OAuthState).nonce !== "string" ||
      !/^[A-Za-z0-9_-]{32,128}$/.test((parsed as OAuthState).nonce) ||
      (parsed as OAuthState).redirectUri.length > 1024
    ) {
      return null;
    }
    return parsed as OAuthState;
  } catch {
    return null;
  }
}

function urlOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === value
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function configuredOrigin(value: string | undefined): string | null {
  return value ? urlOrigin(value) : null;
}

function configuredApiOrigins(req: Request): Set<string> {
  const origins = new Set<string>();
  for (const value of [
    process.env.EXPO_PUBLIC_API_BASE_URL,
    process.env.MANUS_ADDON_RUNTIME_PUBLIC_ORIGIN,
  ]) {
    const origin = configuredOrigin(value);
    if (origin) origins.add(origin);
  }
  const host = req.get("host");
  if (host) {
    const proto = req.headers["x-forwarded-proto"]?.toString().split(",")[0]?.trim() || req.protocol;
    if (proto === "https" || proto === "http") origins.add(`${proto}://${host}`);
  }
  return origins;
}

function configuredFrontendOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of [process.env.EXPO_WEB_PREVIEW_URL, process.env.EXPO_PACKAGER_PROXY_URL]) {
    const origin = configuredOrigin(value);
    if (origin) origins.add(origin);
  }
  return origins;
}

function validatePrepareRequest(input: { redirectUri: string; frontendOrigin: string }, req: Request): "web" | "native" {
  if (input.frontendOrigin === NATIVE_FRONTEND) {
    try {
      const redirect = new URL(input.redirectUri);
      if (
        (redirect.protocol === "http:" || redirect.protocol === "https:") ||
        !/^[a-z][a-z0-9+.-]*:$/i.test(redirect.protocol)
      ) {
        throw new Error("not-native");
      }
      return "native";
    } catch {
      throw new Error("Invalid native redirect URI");
    }
  }

  const frontendOrigin = urlOrigin(input.frontendOrigin);
  let redirect: URL;
  try {
    redirect = new URL(input.redirectUri);
  } catch {
    throw new Error("Invalid web redirect URI");
  }
  if (
    !frontendOrigin ||
    !configuredFrontendOrigins().has(frontendOrigin) ||
    redirect.protocol !== "https:" ||
    redirect.pathname !== "/api/oauth/callback" ||
    redirect.search ||
    redirect.hash ||
    !configuredApiOrigins(req).has(redirect.origin)
  ) {
    throw new Error("Untrusted OAuth redirect");
  }
  return "web";
}

function oauthNonceCookie(req: Request) {
  const secureOptions = getSessionCookieOptions(req);
  return {
    httpOnly: true,
    path: "/api/oauth",
    sameSite: secureOptions.sameSite,
    secure: secureOptions.secure,
  } as const;
}

function readNonceCookie(req: Request): string | undefined {
  if (!req.headers.cookie) return undefined;
  return parseCookieHeader(req.headers.cookie)[OAUTH_NONCE_COOKIE];
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return (
    saved ?? {
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      phone: null,
      loginMethod: userInfo.loginMethod ?? null,
      role: "user" as const,
      blocked: false,
      lastSignedIn,
    }
  );
}

function buildUserResponse(user: Awaited<ReturnType<typeof syncUser>>) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    phone: user?.phone ?? null,
    loginMethod: user?.loginMethod ?? null,
    role: user?.role ?? "user",
    blocked: Boolean(user?.blocked),
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

async function findNonce(state: OAuthState) {
  const db = await requireDb();
  return (
    await db
      .select()
      .from(oauthNonces)
      .where(
        and(
          eq(oauthNonces.nonceHash, hashNonce(state.nonce)),
          eq(oauthNonces.redirectUri, state.redirectUri),
          isNull(oauthNonces.usedAt),
          gt(oauthNonces.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];
}

async function consumeNonce(state: OAuthState) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const nonce = (
      await tx
        .select()
        .from(oauthNonces)
        .where(
          and(
            eq(oauthNonces.nonceHash, hashNonce(state.nonce)),
            eq(oauthNonces.redirectUri, state.redirectUri),
            isNull(oauthNonces.usedAt),
            gt(oauthNonces.expiresAt, new Date()),
          ),
        )
        .limit(1)
        .for("update")
    )[0];
    if (!nonce) throw new Error("Invalid or already used OAuth state");
    await tx.update(oauthNonces).set({ usedAt: new Date() }).where(eq(oauthNonces.id, nonce.id));
    return nonce;
  });
}

async function finishOAuth(code: string, state: OAuthState) {
  const tokenResponse = await sdk.exchangeCodeForToken(code, state.redirectUri);
  const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
  const user = await syncUser(userInfo);
  if (user.blocked) throw new Error("Blocked account");
  const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
    name: userInfo.name || "",
    expiresInMs: ONE_YEAR_MS,
  });
  return { sessionToken, user };
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/oauth/prepare", async (req: Request, res: Response) => {
    const parsed = zPrepare.safeParse(req.body);
    if (!parsed.success || !ENV.appId || !ENV.oAuthPortalUrl) {
      res.status(400).json({ error: "invalid_oauth_prepare_request" });
      return;
    }
    try {
      const flow = validatePrepareRequest(parsed.data, req);
      const nonce = randomBytes(32).toString("base64url");
      const state = encodeState({ redirectUri: parsed.data.redirectUri, nonce });
      const db = await requireDb();
      await db.insert(oauthNonces).values({
        nonceHash: hashNonce(nonce),
        redirectUri: parsed.data.redirectUri,
        frontendOrigin: flow === "web" ? parsed.data.frontendOrigin : null,
        expiresAt: new Date(Date.now() + OAUTH_NONCE_TTL_MS),
      });
      if (flow === "web") {
        res.cookie(OAUTH_NONCE_COOKIE, nonce, { ...oauthNonceCookie(req), maxAge: OAUTH_NONCE_TTL_MS });
      }
      const url = new URL("app-auth", ENV.oAuthPortalUrl.replace(/\/$/, "") + "/");
      url.searchParams.set("appId", ENV.appId);
      url.searchParams.set("redirectUri", parsed.data.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("responseType", "code");
      res.json({ url: url.toString(), state });
    } catch {
      res.status(400).json({ error: "invalid_oauth_prepare_request" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const encodedState = getQueryParam(req, "state");
    const state = encodedState ? parseState(encodedState) : null;
    if (!code || !state) {
      res.status(400).json({ error: "invalid_oauth_callback" });
      return;
    }
    try {
      const nonce = await findNonce(state);
      if (!nonce?.frontendOrigin || readNonceCookie(req) !== state.nonce) {
        res.status(400).json({ error: "invalid_oauth_state" });
        return;
      }
      const consumed = await consumeNonce(state);
      const { sessionToken } = await finishOAuth(code, state);
      if (!consumed.frontendOrigin) throw new Error("Missing web frontend origin");
      res.cookie(getSessionCookieName(req), sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.clearCookie(OAUTH_NONCE_COOKIE, oauthNonceCookie(req));
      res.redirect(302, consumed.frontendOrigin);
    } catch {
      console.error("[OAuth] Secure web callback failed");
      res.status(500).json({ error: "oauth_callback_failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const encodedState = getQueryParam(req, "state");
    const state = encodedState ? parseState(encodedState) : null;
    if (!code || !state) {
      res.status(400).json({ error: "invalid_oauth_callback" });
      return;
    }
    try {
      const nonce = await findNonce(state);
      if (!nonce || nonce.frontendOrigin !== null) {
        res.status(400).json({ error: "invalid_oauth_state" });
        return;
      }
      await consumeNonce(state);
      const { sessionToken, user } = await finishOAuth(code, state);
      res.json({ app_session_id: sessionToken, user: buildUserResponse(user) });
    } catch {
      console.error("[OAuth] Secure mobile exchange failed");
      res.status(500).json({ error: "oauth_callback_failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(getSessionCookieName(req), { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      res.cookie(getSessionCookieName(req), token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

const zPrepare = z.object({
  redirectUri: z.string().trim().min(1).max(1024),
  frontendOrigin: z.string().trim().min(1).max(512),
}).strict();
