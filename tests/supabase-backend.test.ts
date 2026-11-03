import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfig, isOwnedPublicCarImage, supabaseJson } from "../server/supabase-client";
import { requireSupabaseIdentity, registerSupabaseAuthRoutes } from "../server/supabase-auth";
import { supabaseMarketRouter } from "../server/supabase-market";

const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_ANON_KEY;
process.env.SUPABASE_URL = "https://project.supabase.co";
process.env.SUPABASE_ANON_KEY = "public-test-key";

const profile = { id: "11111111-1111-4111-8111-111111111111", name: "مالك", email: "owner@example.test", phone: "+96550000000", role: "user", status: "active", created_at: "2026-01-01T00:00:00Z" };
const car = {
  id: "22222222-2222-4222-8222-222222222222", user_id: profile.id, brand: "Toyota", model: "Camry", year: 2024, price: 5000,
  kilometers: 12000, color: "White", description: "A sufficiently detailed description", images: ["https://project.supabase.co/storage/v1/object/public/car-images/cars/11111111-1111-4111-8111-111111111111/file.jpg"], currency: "KWD", status: "pending_featured", created_at: "2026-01-02T00:00:00Z", is_featured: false, featured_until: null, featured_payment_ref: "[paypal] TX-1",
};

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
function context(headers: Record<string, string> = {}) { return { req: { headers, header: (name: string) => headers[name.toLowerCase()] } as any, res: {} as any, user: { role: "admin" } as any }; }

function installFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => Promise.resolve(handler(url, init))));
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "public-test-key";
});

afterAll(() => {
  process.env.SUPABASE_URL = originalUrl;
  process.env.SUPABASE_ANON_KEY = originalKey;
});

describe("Supabase backend integration", () => {
  it("uses publishable keys only in apikey rather than pretending they are JWTs", async () => {
    process.env.SUPABASE_ANON_KEY = "sb_publishable_mock_key";
    installFetch(() => json([]));
    await supabaseJson('/rest/v1/cars?select=id&limit=0');
    const headers = new Headers((fetch as any).mock.calls[0][1].headers);
    expect(headers.get('apikey')).toBe('sb_publishable_mock_key');
    expect(headers.has('Authorization')).toBe(false);
  });

  it("rejects secret and legacy service-role keys in a public-key configuration", () => {
    process.env.SUPABASE_ANON_KEY = 'sb_secret_mock_key';
    expect(getSupabaseConfig).toThrow('استخدم مفتاح Supabase العام');
    process.env.SUPABASE_ANON_KEY = 'mock.' + Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url') + '.mock';
    expect(getSupabaseConfig).toThrow('استخدم مفتاح Supabase العام');
  });

  it("uses the anon key only as transport auth and forwards a caller JWT for RLS", async () => {
    installFetch((_url, init) => json([]));
    await supabaseJson("/rest/v1/cars?select=id", { method: "GET" }, "user-jwt");
    const request = (fetch as any).mock.calls[0];
    expect(request[0]).toBe("https://project.supabase.co/rest/v1/cars?select=id");
    expect(new Headers(request[1].headers).get("authorization")).toBe("Bearer user-jwt");
    expect(new Headers(request[1].headers).get("apikey")).toBe("public-test-key");
  });

  it.each([
    ['invalid_credentials', 401, 'INVALID_CREDENTIALS'],
    ['email_not_confirmed', 403, 'EMAIL_NOT_CONFIRMED'],
    ['user_banned', 403, 'ACCOUNT_BLOCKED'],
  ])('preserves Supabase error_code %s and returns an actionable safe login error', async (providerCode, status, code) => {
    const routes = new Map<string, Function>();
    registerSupabaseAuthRoutes({ get: vi.fn(), post: (path: string, fn: Function) => routes.set(path, fn) } as any);
    installFetch(() => json({ error_code: providerCode, msg: 'Provider message that must not be exposed verbatim' }, 400));
    const res: any = { json: vi.fn(), cookie: vi.fn(), status: vi.fn() }; res.status.mockReturnValue(res);
    await routes.get('/api/auth/local-login')!({ body: { email: profile.email, password: 'mock-password', platform: 'web' } }, res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json.mock.calls[0][0]).toMatchObject({ code });
    expect(res.json.mock.calls[0][0].error).not.toContain('Provider message');
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('reports missing users profile distinctly after successful Auth without issuing cookies', async () => {
    const routes = new Map<string, Function>();
    registerSupabaseAuthRoutes({ get: vi.fn(), post: (path: string, fn: Function) => routes.set(path, fn) } as any);
    installFetch(url => url.includes('/auth/v1/token')
      ? json({ access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600, user: { id: profile.id } })
      : json([]));
    const res: any = { json: vi.fn(), cookie: vi.fn(), status: vi.fn() }; res.status.mockReturnValue(res);
    await routes.get('/api/auth/local-login')!({ body: { email: profile.email, password: 'mock-password', platform: 'web' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROFILE_UNAVAILABLE' }));
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("rejects an email-only admin claim when the current users row is not admin", async () => {
    installFetch((url) => {
      if (url.includes("/auth/v1/user")) return json({ id: profile.id, email: "admin@sayarty.store" });
      if (url.includes("/rest/v1/users")) return json([{ ...profile, role: "user" }]);
      return json([]);
    });
    await expect(requireSupabaseIdentity(context({ authorization: "Bearer live-jwt" }).req, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("maps pending_featured safely without exposing seller contacts in the public list", async () => {
    installFetch((url) => {
      if (url.includes("/rest/v1/cars")) return json([car]);
      return json([]);
    });
    const caller = supabaseMarketRouter.createCaller(context());
    const listings = await caller.list();
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({ id: car.id, status: "approved", sellerName: "", sellerPhone: "", location: "", transmission: "", fuel: "", condition: "" });
  });

  it("requires the authenticated UUID image prefix and does not treat another user's image as owned", () => {
    expect(isOwnedPublicCarImage(car.images[0], profile.id)).toBe(true);
    expect(isOwnedPublicCarImage(car.images[0], "33333333-3333-4333-8333-333333333333")).toBe(false);
  });

  it("never reports a deleted listing when RLS affects zero rows", async () => {
    installFetch((url, init) => {
      if (url.includes('/auth/v1/user')) return json({ id: profile.id });
      if (url.includes('/rest/v1/users')) return json([{ ...profile, role: 'admin' }]);
      if (url.includes('/rest/v1/cars')) return json(init?.method === 'DELETE' ? [] : [car]);
      return json([]);
    });
    const caller = supabaseMarketRouter.createCaller(context({ authorization: 'Bearer live-jwt' }));
    await expect(caller.deleteListing({ id: car.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it("does not partially delete an Auth user without a safe administrative API", async () => {
    installFetch((url) => {
      if (url.includes('/auth/v1/user')) return json({ id: profile.id });
      return json([{ ...profile, role: 'admin' }]);
    });
    const caller = supabaseMarketRouter.createCaller(context({ authorization: 'Bearer live-jwt' }));
    await expect(caller.deleteUser({ id: car.id })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect((fetch as any).mock.calls.every(([, init]: any) => init.method === 'GET')).toBe(true);
  });

  it("accepts platform metadata for native signup and recovery requests", async () => {
    const routes = new Map<string, Function>();
    const app = { get: vi.fn(), post: (path: string, fn: Function) => routes.set(path, fn) };
    registerSupabaseAuthRoutes(app as any);
    installFetch(() => json({}));
    for (const path of ['/api/auth/register/request', '/api/auth/password/request']) {
      const res: any = { json: vi.fn(), status: vi.fn() }; res.status.mockReturnValue(res);
      const body = path.includes('register')
        ? { email: profile.email, name: profile.name, password: 'not-a-real-password', platform: 'native' }
        : { email: profile.email, platform: 'native' };
      await routes.get(path)!({ body }, res);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    }
    expect((fetch as any).mock.calls).toHaveLength(2);
  });

  it("returns tokens only to native login and uses HttpOnly web cookies", async () => {
    const routes = new Map<string, Function>();
    registerSupabaseAuthRoutes({ get: vi.fn(), post: (path: string, fn: Function) => routes.set(path, fn) } as any);
    installFetch((url) => url.includes('/auth/v1/token')
      ? json({ access_token: 'mock-access', refresh_token: 'mock-refresh', expires_in: 3600, user: { id: profile.id } })
      : json([profile]));
    for (const platform of ['web', 'native']) {
      const req: any = { body: { email: profile.email, password: 'mock-password', platform }, headers: { 'x-forwarded-proto': 'https' }, hostname: 'example.test', protocol: 'http' };
      const res: any = { json: vi.fn(), cookie: vi.fn(), status: vi.fn() }; res.status.mockReturnValue(res);
      await routes.get('/api/auth/local-login')!(req, res);
      const payload = res.json.mock.calls[0][0];
      expect(payload.user.id).toBe(profile.id);
      expect(payload.accessToken).toBe(platform === 'native' ? 'mock-access' : undefined);
      expect(payload.refreshToken).toBe(platform === 'native' ? 'mock-refresh' : undefined);
      expect(res.cookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, secure: true, sameSite: 'none' });
    }
  });
});
