import { randomUUID } from "node:crypto";

export type SupabaseConfig = { url: string; anonKey: string };
export type SupabaseAuthUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> };

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

/** Whether the shared website integration is deliberately configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_ANON_KEY?.trim());
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new SupabaseRequestError("Supabase غير مهيأ", 503, "SUPABASE_UNAVAILABLE");
  let privileged = anonKey.startsWith("sb_secret_");
  try { privileged ||= JSON.parse(Buffer.from(anonKey.split(".")[1] ?? "", "base64url").toString()).role === "service_role"; } catch { /* Publishable keys are not JWTs. */ }
  if (privileged) throw new SupabaseRequestError("استخدم مفتاح Supabase العام وليس مفتاح الإدارة", 503, "SUPABASE_KEY_TYPE_INVALID");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) throw new Error("invalid project URL");
  } catch {
    throw new SupabaseRequestError("إعداد Supabase غير صالح", 503, "SUPABASE_UNAVAILABLE");
  }
  return { url, anonKey };
}

function safeErrorMessage(payload: unknown): { message: string; code?: string } {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.msg ?? record.message ?? record.error_description ?? record.error;
    const code = typeof record.error_code === "string" ? record.error_code : typeof record.code === "string" ? record.code : undefined;
    if (typeof message === "string" && message.length <= 500) return { message, code };
  }
  return { message: "تعذّر الاتصال بالخدمة" };
}

export async function supabaseFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<Response> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  else if (anonKey.split(".").length === 3) headers.set("Authorization", `Bearer ${anonKey}`);
  else headers.delete("Authorization");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${url}${path.startsWith("/") ? path : `/${path}`}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(20000) });
  } catch {
    throw new SupabaseRequestError("تعذّر الاتصال بـ Supabase", 503, "SUPABASE_UNAVAILABLE");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = safeErrorMessage(payload);
    throw new SupabaseRequestError(detail.message, response.status, detail.code);
  }
  return response;
}

export async function supabaseJson<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const response = await supabaseFetch(path, init, accessToken);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function supabaseAuthJson<T>(path: string, body: unknown, accessToken?: string | null): Promise<T> {
  return supabaseJson<T>(`/auth/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    body: JSON.stringify(body),
  }, accessToken);
}

export async function supabaseGetUser(accessToken: string): Promise<SupabaseAuthUser> {
  const response = await supabaseFetch("/auth/v1/user", { method: "GET" }, accessToken);
  return (await response.json()) as SupabaseAuthUser;
}

export function storagePublicUrl(key: string): string {
  const { url } = getSupabaseConfig();
  return `${url}/storage/v1/object/public/car-images/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadCarImage(
  authUserId: string,
  bytes: Buffer,
  contentType: string,
  accessToken: string,
): Promise<{ key: string; url: string }> {
  const key = `cars/${authUserId}/${randomUUID()}.jpg`;
  await supabaseFetch(`/storage/v1/object/car-images/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { "Content-Type": contentType, "x-upsert": "false" },
    body: new Uint8Array(bytes),
  }, accessToken);
  return { key, url: storagePublicUrl(key) };
}

export function isOwnedPublicCarImage(url: string, authUserId: string): boolean {
  const prefix = storagePublicUrl(`cars/${authUserId}/`);
  return url.startsWith(prefix) && !url.slice(prefix.length).includes("/");
}
