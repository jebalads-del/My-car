import { parse as parseCookieHeader } from "cookie";
import type { CookieOptions, Request, RequestHandler } from "express";
import {
  LEGACY_COOKIE_NAME,
  SESSION_COOKIE_SUFFIX,
} from "../../shared/const.js";

function configuredPublicUsesHttps(req: Request): boolean {
  const forwardedHost = req.headers["x-forwarded-host"];
  const requestHosts = new Set(
    [
      req.hostname,
      ...(Array.isArray(forwardedHost) ? forwardedHost : [forwardedHost]).flatMap((value) =>
        value ? value.split(",") : [],
      ),
    ]
      .filter(Boolean)
      .map((host) => host!.trim().toLowerCase().replace(/:\d+$/, "")),
  );
  const candidates = [
    process.env.EXPO_WEB_PREVIEW_URL,
    process.env.EXPO_PACKAGER_PROXY_URL,
    process.env.EXPO_PUBLIC_API_BASE_URL,
  ];
  return candidates.some((candidate) => {
    try {
      const url = new URL(candidate!);
      return url.protocol === "https:" && requestHosts.has(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  });
}

function isSecureRequest(req: Request) {
  // Public Preview/published traffic can arrive over internal HTTP. Prefer explicit public
  // origins so a secure browser does not receive an unusable non-Secure cookie.
  if (configuredPublicUsesHttps(req)) return true;
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

function configuredApiHostname(): string | null {
  const packager = process.env.EXPO_PACKAGER_PROXY_URL;
  if (!packager) return null;
  try {
    const url = new URL(packager);
    const hostname = url.hostname.replace(/^8081-/, "3000-");
    return hostname === url.hostname ? null : hostname;
  } catch {
    return null;
  }
}

function legacyParentDomain(hostname: string): string | null {
  const normalized = hostname.toLowerCase();
  if (normalized !== configuredApiHostname()?.toLowerCase()) return null;
  if (!/^3000-[a-z0-9-]+(?:\.[a-z0-9-]+){2,}$/.test(normalized)) return null;
  return `.${normalized.split(".").slice(-2).join(".")}`;
}

export function getSessionCookieName(req: Request): string {
  return isSecureRequest(req)
    ? `__Host-manus_session_${SESSION_COOKIE_SUFFIX}`
    : `manus_local_session_${SESSION_COOKIE_SUFFIX}`;
}

export function getLegacySessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    domain: legacyParentDomain(req.hostname) ?? undefined,
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

export function clearLegacySessionCookie(): RequestHandler {
  return (req, res, next) => {
    res.clearCookie(LEGACY_COOKIE_NAME, getLegacySessionCookieOptions(req));
    next();
  };
}

export function currentSessionCookie(req: Request): string | undefined {
  if (!req.headers.cookie) return undefined;
  return parseCookieHeader(req.headers.cookie)[getSessionCookieName(req)];
}
