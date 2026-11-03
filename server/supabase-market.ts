import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DEFAULT_SETTINGS } from "../shared/market";
import { decodeUploadedImage } from "./market-router";
import { publicProcedure, router } from "./_core/trpc";
import { isOwnedPublicCarImage, supabaseFetch, supabaseJson, uploadCarImage } from "./supabase-client";
import { requireSupabaseIdentity, updateSupabaseProfile, type SupabaseIdentity, type SupabaseProfile } from "./supabase-auth";

const CAR_FIELDS = "id,user_id,brand,model,year,price,kilometers,color,description,images,currency,status,created_at,is_featured,featured_until,featured_payment_ref";
const USER_FIELDS = "id,name,email,phone,role,status,created_at";
const MAX_IMAGE_BASE64_CHARS = Math.ceil((5 * 1024 * 1024) / 3) * 4 + 128;
const FEATURED_DAYS = 30;
const SITE_ADMIN_URL = "https://sayarty.store/admin";

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const phoneSchema = z.string().trim().min(7).max(32).regex(/^\+?[0-9][0-9\s()-]{5,30}$/, "رقم الهاتف غير صالح");
const emailSchema = z.string().trim().email().max(320);
const idValue = z.union([
  z.number().int().positive(),
  z.string().trim().regex(/^(?:[1-9]\d*|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i, "معرّف الإعلان غير صالح"),
]);
const idSchema = z.object({ id: idValue }).strict();
const imageMimeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

const listingInputSchema = z.object({
  brand: nonEmpty(80),
  model: nonEmpty(120),
  year: z.number().int(),
  color: nonEmpty(64),
  price: z.number().finite().positive().max(100_000_000),
  currency: z.string().trim().regex(/^[A-Z]{3}$/),
  mileage: z.number().int().min(0).max(2_000_000),
  // The following values are accepted for client compatibility, but the verified schema has no columns for them.
  location: optionalText(120).optional(),
  description: nonEmpty(10).max(10_000),
  transmission: optionalText(64).optional(),
  fuel: optionalText(64).optional(),
  condition: optionalText(64).optional(),
  images: z.array(z.string().url().max(2_048)).min(1).max(6).refine((images) => new Set(images).size === images.length, "الصور مكررة"),
  termsAccepted: z.literal(true),
}).strict();

const settingsSchema = z.object({
  brands: z.record(z.string(), z.array(z.string())),
  currencies: z.array(z.string()),
  terms: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  whatsapp: z.string(),
  paypalEnabled: z.boolean(),
  paypalUrl: z.string(),
  westernEnabled: z.boolean(),
  westernInstructions: z.string(),
  featuredPrice: z.number().finite().min(0).max(10_000_000),
  featuredDays: z.number().int().min(1).max(365),
  paypalEmail: z.union([z.literal(""), z.string().trim().email().max(320)]).optional(),
}).strict();

type CarRow = {
  id: string | number;
  user_id: string | number;
  brand: string;
  model: string;
  year: number | string;
  price: number | string;
  kilometers: number | string;
  color: string;
  description: string | null;
  images: unknown;
  currency: string;
  status: string;
  created_at: string;
  is_featured: boolean | null;
  featured_until: string | null;
  featured_payment_ref: string | null;
};
type SiteSettingsRow = {
  id: string | number;
  featured_price: number | string | null;
  western_union_info: string | null;
  paypal_email: string | null;
  paypal_enabled: boolean | null;
  western_union_enabled: boolean | null;
};

function badRequest(message: string): never { throw new TRPCError({ code: "BAD_REQUEST", message }); }
function notFound(message = "العنصر غير موجود"): never { throw new TRPCError({ code: "NOT_FOUND", message }); }
function idText(value: z.infer<typeof idValue>): string { return String(value); }
function dateOrNull(value: string | null): Date | null { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length <= 2_048);
  if (typeof value === "string") { try { return parseImages(JSON.parse(value)); } catch { return []; } }
  return [];
}
function isActiveFeatured(car: CarRow): boolean { const until = dateOrNull(car.featured_until); return Boolean(car.is_featured && until && until.getTime() > Date.now()); }
function visibleStatus(car: CarRow): string { return car.status === "pending_featured" ? "approved" : car.status; }
function mapCar(car: CarRow, seller?: Pick<SupabaseProfile, "name" | "phone"> | null) {
  return {
    id: car.id,
    userId: car.user_id,
    brand: car.brand,
    model: car.model,
    year: Number(car.year),
    color: car.color,
    price: String(car.price),
    currency: car.currency,
    mileage: Number(car.kilometers),
    // These values are intentionally empty: the deployed website schema has no matching columns.
    location: "",
    description: car.description || "",
    transmission: "",
    fuel: "",
    condition: "",
    images: parseImages(car.images),
    status: visibleStatus(car),
    featured: isActiveFeatured(car),
    featuredUntil: car.featured_until,
    sellerName: seller?.name?.trim() || "",
    sellerPhone: seller?.phone || "",
    createdAt: car.created_at,
    rejectionReason: null,
  };
}

async function fetchSettings(accessToken?: string): Promise<SiteSettingsRow | null> {
  const rows = await supabaseJson<SiteSettingsRow[]>(
    "/rest/v1/site_settings?select=id,featured_price,western_union_info,paypal_email,paypal_enabled,western_union_enabled&id=eq.global&limit=1",
    { method: "GET" }, accessToken,
  );
  return rows[0] ?? null;
}

async function loadSettings(accessToken?: string) {
  const row = await fetchSettings(accessToken);
  return {
    ...DEFAULT_SETTINGS,
    featuredPrice: Number(row?.featured_price ?? DEFAULT_SETTINGS.featuredPrice),
    featuredDays: FEATURED_DAYS,
    paypalEnabled: Boolean(row?.paypal_enabled),
    paypalUrl: "", // An email address must never be turned into a guessed PayPal.me URL.
    paypalEmail: row?.paypal_email?.trim() || "",
    westernEnabled: Boolean(row?.western_union_enabled),
    westernInstructions: row?.western_union_info || "",
  };
}

function assertListingValues(input: z.infer<typeof listingInputSchema>): void {
  const currentYear = new Date().getFullYear() + 1;
  if (input.year < 1886 || input.year > currentYear) badRequest("سنة الصنع غير منطقية");
}

async function carById(id: string, accessToken?: string): Promise<CarRow | null> {
  const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?select=${CAR_FIELDS}&id=eq.${encodeURIComponent(id)}&limit=1`, { method: "GET" }, accessToken);
  return rows[0] ?? null;
}

async function requireOwnedCar(identity: SupabaseIdentity, id: string): Promise<CarRow> {
  const car = await carById(id, identity.accessToken);
  if (!car || String(car.user_id) !== identity.authUser.id) notFound();
  return car;
}

async function sellerForDetail(car: CarRow, accessToken?: string): Promise<Pick<SupabaseProfile, "name" | "phone"> | null> {
  try {
    const rows = await supabaseJson<Pick<SupabaseProfile, "name" | "phone">[]>(
      `/rest/v1/users?select=name,phone&id=eq.${encodeURIComponent(String(car.user_id))}&limit=1`,
      { method: "GET" }, accessToken,
    );
    return rows[0] ?? null;
  } catch {
    // Public list responses never include sellers; detail gets only business contact where RLS permits it.
    return null;
  }
}

function assertImagesOwned(images: string[], identity: SupabaseIdentity, existing?: CarRow): void {
  const existingImages = new Set(existing ? parseImages(existing.images) : []);
  if (images.some((url) => !isOwnedPublicCarImage(url, identity.authUser.id) && !existingImages.has(url))) {
    badRequest("كل صورة يجب أن تكون مرفوعة من حسابك عبر المنصة");
  }
}

function methodFromRef(reference: string | null): { method: "paypal" | "western"; reference: string } | null {
  const match = /^\[(paypal|western)\]\s*(.*)$/i.exec(reference || "");
  return match ? { method: match[1].toLowerCase() as "paypal" | "western", reference: match[2] } : null;
}

function isSame(value: unknown, expected: unknown): boolean { return JSON.stringify(value) === JSON.stringify(expected); }
function assertSupportedSettings(input: z.infer<typeof settingsSchema>): void {
  if (!isSame(input.brands, DEFAULT_SETTINGS.brands) || !isSame(input.currencies, DEFAULT_SETTINGS.currencies) || input.terms !== DEFAULT_SETTINGS.terms || input.contactEmail !== "" || input.contactPhone !== "" || input.whatsapp !== "" || input.paypalUrl !== "" || input.featuredDays !== FEATURED_DAYS) {
    badRequest("إعدادات الماركات والعملات والشروط والتواصل ورابط PayPal ومدة التمييز غير مدعومة في مخطط الموقع الحالي");
  }
  if (input.paypalEnabled && !input.paypalEmail) badRequest("أدخل بريد PayPal الحقيقي؛ لا يمكن حفظ رابط PayPal غير المدعوم");
  if (input.westernEnabled && !input.westernInstructions.trim()) badRequest("أدخل تعليمات Western Union قبل تفعيله");
}

export const supabaseMarketRouter = router({
  settings: publicProcedure.query(async () => loadSettings()),

  list: publicProcedure.query(async () => {
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?select=${CAR_FIELDS}&status=in.(approved,pending_featured)&order=created_at.desc`, { method: "GET" });
    return rows.map((car) => mapCar(car)).sort((a, b) => Number(b.featured) - Number(a.featured) || String(b.createdAt).localeCompare(String(a.createdAt)));
  }),

  detail: publicProcedure.input(idSchema).query(async ({ ctx, input }) => {
    const identity = await (async () => { try { return await requireSupabaseIdentity(ctx.req); } catch { return null; } })();
    const car = await carById(idText(input.id), identity?.accessToken);
    if (!car) notFound();
    const publicCar = ["approved", "pending_featured"].includes(car.status);
    if (!publicCar && (!identity || (String(car.user_id) !== identity.authUser.id && identity.profile.role !== "admin"))) notFound();
    const seller = await sellerForDetail(car, identity?.accessToken);
    return mapCar(car, seller);
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?select=${CAR_FIELDS}&user_id=eq.${encodeURIComponent(identity.authUser.id)}&order=created_at.desc`, { method: "GET" }, identity.accessToken);
    const requests = rows.filter((car) => car.status === "pending_featured").map((car) => {
      const parsed = methodFromRef(car.featured_payment_ref);
      return { id: car.id, listingId: car.id, method: parsed?.method || "western", reference: parsed?.reference || "", status: "pending", createdAt: car.created_at, amount: 0, duration: FEATURED_DAYS };
    });
    return { ...identity.user, user: identity.user, listings: rows.map((car) => mapCar(car, identity.profile)), featuredRequests: requests };
  }),

  profile: publicProcedure.input(z.object({ name: nonEmpty(100), email: emailSchema, phone: phoneSchema }).strict()).mutation(async ({ ctx, input }) => updateSupabaseProfile(ctx.req, input)),

  create: publicProcedure.input(listingInputSchema).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    if (!identity.profile.phone?.trim()) badRequest("أضف رقم هاتف صالحاً في الملف الشخصي قبل نشر إعلان");
    assertListingValues(input);
    assertImagesOwned(input.images, identity);
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?select=${CAR_FIELDS}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: identity.authUser.id, brand: input.brand, model: input.model, year: input.year, price: input.price, kilometers: input.mileage, color: input.color, description: input.description, images: input.images, currency: input.currency, status: "pending", is_featured: false }),
    }, identity.accessToken);
    const car = rows[0];
    if (!car) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر حفظ الإعلان" });
    return { id: car.id };
  }),

  update: publicProcedure.input(idSchema.extend(listingInputSchema.shape).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    const id = idText(input.id);
    const current = await requireOwnedCar(identity, id);
    if (current.status === "archived") badRequest("لا يمكن تعديل إعلان مؤرشف");
    if (!identity.profile.phone?.trim()) badRequest("أضف رقم هاتف صالحاً في الملف الشخصي قبل إعادة تقديم الإعلان");
    assertListingValues(input);
    assertImagesOwned(input.images, identity, current);
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=${CAR_FIELDS}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ brand: input.brand, model: input.model, year: input.year, price: input.price, kilometers: input.mileage, color: input.color, description: input.description, images: input.images, currency: input.currency, status: "pending", is_featured: false, featured_until: null, featured_payment_ref: null }),
    }, identity.accessToken);
    if (!rows[0]) notFound();
    return { id: rows[0].id, status: "pending" as const };
  }),

  setSold: publicProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    const id = idText(input.id); const current = await requireOwnedCar(identity, id);
    if (visibleStatus(current) !== "approved") badRequest("يمكن تعليم الإعلانات المنشورة فقط على أنها مباعة");
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=${CAR_FIELDS}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "sold", is_featured: false, featured_until: null }) }, identity.accessToken);
    if (!rows[0]) notFound();
    return { id: rows[0].id, status: "sold" as const };
  }),

  upload: publicProcedure.input(z.object({ base64: z.string().max(MAX_IMAGE_BASE64_CHARS), mime: z.string().trim().max(32) }).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    const mime = imageMimeSchema.safeParse(input.mime); if (!mime.success) badRequest("نوع الصورة غير مدعوم");
    const { bytes, detected } = decodeUploadedImage(input.base64, mime.data);
    const uploaded = await uploadCarImage(identity.authUser.id, bytes, detected.mime, identity.accessToken);
    return { url: uploaded.url };
  }),

  featureRequest: publicProcedure.input(z.object({ listingId: idValue, method: z.enum(["paypal", "western"]), reference: nonEmpty(256) }).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req);
    const id = idText(input.listingId); const car = await requireOwnedCar(identity, id);
    if (car.status !== "approved") badRequest("لا يمكن طلب تمييز إلا لإعلان منشور");
    const settings = await loadSettings(identity.accessToken);
    if (input.method === "paypal" && (!settings.paypalEnabled || !settings.paypalEmail)) badRequest("الدفع عبر PayPal غير مفعل");
    if (input.method === "western" && (!settings.westernEnabled || !settings.westernInstructions)) badRequest("Western Union غير مفعل");
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=${CAR_FIELDS}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "pending_featured", featured_payment_ref: `[${input.method}] ${input.reference}` }) }, identity.accessToken);
    if (!rows[0]) notFound();
    return { id: rows[0].id, status: "pending" as const };
  }),

  contact: publicProcedure.input(z.object({ name: nonEmpty(100), email: emailSchema, message: nonEmpty(4).max(5_000) }).strict()).mutation(() => {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يوجد جدول رسائل تواصل في مخطط الموقع؛ استخدم بيانات التواصل الرسمية في الموقع بدلاً من حفظ رسالة غير مدعومة" });
  }),

  adminOverview: publicProcedure.query(async ({ ctx }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true);
    const [cars, users, settings] = await Promise.all([
      supabaseJson<CarRow[]>(`/rest/v1/cars?select=${CAR_FIELDS}&order=created_at.desc`, { method: "GET" }, identity.accessToken),
      supabaseJson<SupabaseProfile[]>(`/rest/v1/users?select=${USER_FIELDS}&order=created_at.desc`, { method: "GET" }, identity.accessToken),
      loadSettings(identity.accessToken),
    ]);
    const people = new Map(users.map((person) => [String(person.id), person]));
    const requests = cars.filter((car) => car.status === "pending_featured").map((car) => {
      const ref = methodFromRef(car.featured_payment_ref);
      const seller = people.get(String(car.user_id));
      return { id: car.id, listingId: car.id, method: ref?.method || "western", reference: ref?.reference || "", status: "pending", createdAt: car.created_at, listingTitle: `${car.brand} ${car.model} ${car.year}`, userName: seller?.name || "", amount: String(settings.featuredPrice), duration: FEATURED_DAYS };
    });
    return {
      listings: cars.map((car) => mapCar(car, people.get(String(car.user_id)) || null)),
      users: users.map((person) => ({ ...toAdminUser(person) })),
      requests,
      messages: [],
      stats: { total: cars.length, pending: cars.filter((car) => car.status === "pending").length, featured: cars.filter(isActiveFeatured).length, users: users.length },
    };
  }),

  moderate: publicProcedure.input(z.object({ id: idValue, status: z.enum(["approved", "rejected", "sold"]), reason: optionalText(2_000).optional() }).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true); const id = idText(input.id);
    if (input.reason?.trim()) badRequest("حفظ سبب الرفض غير متاح في مخطط الموقع الحالي");
    if (!await carById(id, identity.accessToken)) notFound();
    const patch: Record<string, unknown> = { status: input.status };
    if (input.status !== "approved") Object.assign(patch, { is_featured: false, featured_until: null });
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=${CAR_FIELDS}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }, identity.accessToken);
    if (!rows[0]) notFound();
    return { id: rows[0].id, status: input.status };
  }),

  deleteListing: publicProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true); const id = idText(input.id);
    if (!await carById(id, identity.accessToken)) notFound("الإعلان غير موجود");
    const deleted = await supabaseJson<{ id: string | number }[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=id`, { method: "DELETE", headers: { Prefer: "return=representation" } }, identity.accessToken);
    if (!deleted[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لم يُحذف الإعلان؛ تحقق من صلاحيات الإدارة في الموقع" });
    return { id: input.id, deleted: true as const };
  }),

  featureDecision: publicProcedure.input(z.object({ id: idValue, approved: z.boolean(), paymentConfirmed: z.boolean() }).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true); const id = idText(input.id); const car = await carById(id, identity.accessToken);
    if (!car || car.status !== "pending_featured") badRequest("طلب التمييز غير موجود أو تمت مراجعته");
    if (input.approved && !input.paymentConfirmed) badRequest("لا يمكن اعتماد التمييز قبل تأكيد الدفع يدوياً");
    const patch = input.approved ? { status: "approved", is_featured: true, featured_until: new Date(Date.now() + FEATURED_DAYS * 86_400_000).toISOString() } : { status: "approved", is_featured: false, featured_until: null };
    const rows = await supabaseJson<CarRow[]>(`/rest/v1/cars?id=eq.${encodeURIComponent(id)}&select=${CAR_FIELDS}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }, identity.accessToken);
    if (!rows[0]) notFound();
    return { id: rows[0].id, status: input.approved ? "approved" as const : "rejected" as const, ...(input.approved ? { featuredUntil: rows[0].featured_until } : {}) };
  }),

  userStatus: publicProcedure.input(z.object({ id: idValue, blocked: z.boolean() }).strict()).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true); const id = idText(input.id);
    if (id === identity.authUser.id) badRequest("لا يمكنك تغيير حالة حسابك");
    const rows = await supabaseJson<SupabaseProfile[]>(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=${USER_FIELDS}&limit=1`, { method: "GET" }, identity.accessToken);
    const target = rows[0]; if (!target) notFound("المستخدم غير موجود"); if (target.role === "admin") badRequest("لا يمكن حظر حساب إداري");
    const changed = await supabaseJson<{ id: string }[]>(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&select=id`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: input.blocked ? "blocked" : "active" }) }, identity.accessToken);
    if (!changed[0]) throw new TRPCError({ code: "FORBIDDEN", message: "لم تتغير حالة المستخدم؛ تحقق من صلاحيات الإدارة في الموقع" });
    return { id: input.id, blocked: input.blocked };
  }),

  deleteUser: publicProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    await requireSupabaseIdentity(ctx.req, true);
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: `حذف مستخدم Auth غير متاح بدون واجهة إدارية آمنة. استخدم ${SITE_ADMIN_URL}؛ لم يُحذف أي مستخدم أو إعلان.` });
  }),

  saveSettings: publicProcedure.input(settingsSchema).mutation(async ({ ctx, input }) => {
    const identity = await requireSupabaseIdentity(ctx.req, true);
    assertSupportedSettings(input);
    const existing = await fetchSettings(identity.accessToken);
    if (!existing) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يوجد صف إعدادات عام قابل للتحديث في الموقع" });
    const rows = await supabaseJson<SiteSettingsRow[]>(`/rest/v1/site_settings?id=eq.${encodeURIComponent(String(existing.id))}&select=id,featured_price,western_union_info,paypal_email,paypal_enabled,western_union_enabled`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ featured_price: input.featuredPrice, western_union_info: input.westernInstructions || null, paypal_email: input.paypalEmail || null, paypal_enabled: input.paypalEnabled, western_union_enabled: input.westernEnabled }),
    }, identity.accessToken);
    if (!rows[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر حفظ الإعدادات" });
    return loadSettings(identity.accessToken);
  }),
});

function toAdminUser(profile: SupabaseProfile) {
  return { id: profile.id, name: profile.name, email: profile.email, phone: profile.phone, role: profile.role || "user", blocked: ["blocked", "suspended", "disabled", "banned"].includes((profile.status || "").toLowerCase()), status: profile.status, createdAt: profile.created_at };
}
