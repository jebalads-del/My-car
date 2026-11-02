import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  contactMessages,
  featuredRequests,
  localCredentials,
  listings,
  marketSettings,
  uploadedAssets,
  users,
} from "../drizzle/schema";
import { DEFAULT_SETTINGS, type Listing, type MarketSettings } from "../shared/market";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128;
const CONTACT_RATE_LIMIT = 3;
const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const imageMimeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);
const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9][0-9\s()-]{5,30}$/, "رقم الهاتف غير صالح");
const emailSchema = z.string().trim().email().max(320);
const optionalEmailSchema = z
  .string()
  .trim()
  .max(320)
  .refine((value) => value === "" || emailSchema.safeParse(value).success, "البريد الإلكتروني غير صالح");

const settingsSchema = z
  .object({
    brands: z
      .record(
        nonEmpty(80),
        z.array(nonEmpty(120)).min(1).max(80).refine((models) => new Set(models).size === models.length),
      )
      .refine((brands) => Object.keys(brands).length > 0 && Object.keys(brands).length <= 80),
    currencies: z
      .array(z.string().trim().regex(/^[A-Z]{3}$/))
      .min(1)
      .max(20)
      .refine((currencies) => new Set(currencies).size === currencies.length, "العملات مكررة"),
    terms: nonEmpty(10).max(8_000),
    contactEmail: optionalEmailSchema,
    contactPhone: optionalText(32),
    whatsapp: optionalText(64),
    paypalEnabled: z.boolean(),
    paypalUrl: optionalText(512),
    westernEnabled: z.boolean(),
    westernInstructions: optionalText(8_000),
    featuredPrice: z.number().finite().min(0).max(10_000_000),
    featuredDays: z.number().int().min(1).max(365),
  })
  .strict();

const listingInputSchema = z
  .object({
    brand: nonEmpty(80),
    model: nonEmpty(120),
    year: z.number().int(),
    color: nonEmpty(64),
    price: z.number().finite().positive().max(100_000_000),
    currency: z.string().trim().regex(/^[A-Z]{3}$/),
    mileage: z.number().int().min(0).max(2_000_000),
    location: nonEmpty(120),
    description: nonEmpty(10).max(10_000),
    transmission: nonEmpty(64),
    fuel: nonEmpty(64),
    condition: nonEmpty(64),
    images: z
      .array(z.string().trim().max(768).regex(/^\/manus-storage\/cars\/[0-9]+\//, "مسار الصورة غير صالح"))
      .min(1)
      .max(6)
      .refine((images) => new Set(images).size === images.length, "الصور مكررة"),
    termsAccepted: z.literal(true),
  })
  .strict();

const idSchema = z.object({ id: z.number().int().positive() }).strict();

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function notFound(message = "العنصر غير موجود"): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
  }
  return db;
}

function cloneDefaults(): MarketSettings {
  return {
    ...DEFAULT_SETTINGS,
    brands: Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS.brands).map(([brand, models]) => [brand, [...models]]),
    ),
    currencies: [...DEFAULT_SETTINGS.currencies],
  };
}

function isTrustedPaypalUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return host === "paypal.com" || host.endsWith(".paypal.com") || host === "paypal.me" || host.endsWith(".paypal.me");
  } catch {
    return false;
  }
}

function validateSettings(input: unknown): MarketSettings {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    badRequest("إعدادات السوق غير صالحة");
  }
  const settings = parsed.data;
  if (!settings.currencies.includes("KWD")) {
    badRequest("يجب أن تبقى عملة KWD مفعلة");
  }
  if (settings.paypalUrl && !isTrustedPaypalUrl(settings.paypalUrl)) {
    badRequest("رابط PayPal يجب أن يكون HTTPS من paypal.com أو paypal.me");
  }
  if (settings.paypalEnabled && !settings.paypalUrl) {
    badRequest("أدخل رابط PayPal قبل تفعيله");
  }
  if (settings.westernEnabled && !settings.westernInstructions) {
    badRequest("أدخل تعليمات Western Union قبل تفعيله");
  }
  return settings;
}

async function loadSettings(db: Awaited<ReturnType<typeof requireDb>>): Promise<MarketSettings> {
  const row = (await db.select().from(marketSettings).where(eq(marketSettings.id, 1)).limit(1))[0];
  if (!row) return cloneDefaults();

  const defaults = cloneDefaults();
  const candidate = {
    ...defaults,
    brands: row.brands ?? defaults.brands,
    currencies: row.currencies ?? defaults.currencies,
    terms: row.terms ?? defaults.terms,
    contactEmail: row.contactEmail ?? defaults.contactEmail,
    contactPhone: row.contactPhone ?? defaults.contactPhone,
    whatsapp: row.whatsapp ?? defaults.whatsapp,
    paypalEnabled: Boolean(row.paypalEnabled),
    paypalUrl: row.paypalUrl ?? defaults.paypalUrl,
    westernEnabled: Boolean(row.westernEnabled),
    westernInstructions: row.westernInstructions ?? defaults.westernInstructions,
    featuredPrice: Number(row.featuredPrice),
    featuredDays: row.featuredDays,
  };
  const parsed = settingsSchema.safeParse(candidate);
  // An older or manually-corrupted row must never make the public endpoint unsafe or unusable.
  return parsed.success ? parsed.data : defaults;
}

function assertListingAllowed(
  input: z.infer<typeof listingInputSchema>,
  settings: MarketSettings,
): void {
  const maxYear = new Date().getFullYear() + 1;
  if (input.year < 1886 || input.year > maxYear) {
    badRequest("سنة الصنع غير منطقية");
  }
  const models = settings.brands[input.brand];
  if (!models || !models.includes(input.model)) {
    badRequest("العلامة أو الموديل غير متاح في إعدادات السوق");
  }
  if (!settings.currencies.includes(input.currency)) {
    badRequest("العملة غير مفعلة في إعدادات السوق");
  }
}

async function assertOwnedUploads(
  db: Awaited<ReturnType<typeof requireDb>>,
  userId: number,
  imageUrls: string[],
): Promise<void> {
  const uploaded = await db
    .select({ url: uploadedAssets.url })
    .from(uploadedAssets)
    .where(and(eq(uploadedAssets.userId, userId), inArray(uploadedAssets.url, imageUrls)));
  if (uploaded.length !== imageUrls.length) {
    badRequest("كل صورة يجب أن تكون مرفوعة من حسابك عبر المنصة");
  }
}

function activeFeatured(listing: { featured: boolean; featuredUntil: Date | null }): boolean {
  return Boolean(listing.featured) && Boolean(listing.featuredUntil && listing.featuredUntil.getTime() > Date.now());
}

type ListingRow = typeof listings.$inferSelect;
type SellerRow = typeof users.$inferSelect;

function toListing(listing: ListingRow, seller: SellerRow): Listing {
  return {
    id: listing.id,
    userId: listing.userId,
    brand: listing.brand,
    model: listing.model,
    year: listing.year,
    color: listing.color,
    price: String(listing.price),
    currency: listing.currency,
    mileage: listing.mileage,
    location: listing.location,
    description: listing.description,
    transmission: listing.transmission,
    fuel: listing.fuel,
    condition: listing.condition,
    images: Array.isArray(listing.images) ? listing.images : [],
    status: listing.status,
    featured: activeFeatured(listing),
    featuredUntil: listing.featuredUntil,
    sellerName: seller.name?.trim() || "مستخدم",
    sellerPhone: seller.phone ?? "",
    createdAt: listing.createdAt,
    rejectionReason: listing.rejectionReason,
  };
}

async function findListingWithSeller(db: Awaited<ReturnType<typeof requireDb>>, id: number) {
  return (
    await db
      .select({ listing: listings, seller: users })
      .from(listings)
      .innerJoin(users, eq(listings.userId, users.id))
      .where(eq(listings.id, id))
      .limit(1)
  )[0];
}

function clientIpHash(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  const ip = (candidate || req.ip || "unknown").trim().slice(0, 128);
  return createHash("sha256").update(`${process.env.MANUS_JWT_SECRET ?? "market"}:${ip}`).digest("hex");
}

type DetectedImage = { mime: z.infer<typeof imageMimeSchema> };

export function decodeUploadedImage(base64: string, claimedMime: z.infer<typeof imageMimeSchema>): {
  bytes: Buffer;
  detected: DetectedImage;
} {
  const dataUri = /^data:([^;]+);base64,/i.exec(base64);
  if (dataUri && dataUri[1].toLowerCase() !== claimedMime) {
    badRequest("نوع ملف الصورة لا يطابق البيانات المرفوعة");
  }
  const encoded = (dataUri ? base64.slice(dataUri[0].length) : base64).replace(/\s/g, "");
  if (!encoded || encoded.length > MAX_IMAGE_BASE64_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 === 1) {
    badRequest("ترميز الصورة غير صالح أو يتجاوز الحد المسموح");
  }
  const bytes = Buffer.from(encoded, "base64");
  const canonical = bytes.toString("base64").replace(/=+$/, "");
  if (!bytes.length || canonical !== encoded.replace(/=+$/, "") || bytes.length > MAX_IMAGE_BYTES) {
    badRequest("ترميز الصورة غير صالح أو يتجاوز الحد المسموح");
  }

  let detected: DetectedImage | null = null;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detected = { mime: "image/jpeg" };
  } else if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    detected = { mime: "image/png" };
  } else if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    detected = { mime: "image/webp" };
  }
  if (!detected || detected.mime !== claimedMime) {
    badRequest("ملف الصورة ليس JPEG أو PNG أو WEBP مطابقاً للنوع المرسل");
  }
  return { bytes, detected };
}

export const marketRouter = router({
  settings: publicProcedure.query(async () => loadSettings(await requireDb())),

  list: publicProcedure.query(async () => {
    const db = await requireDb();
    const now = new Date();
    const rows = await db
      .select({ listing: listings, seller: users })
      .from(listings)
      .innerJoin(users, eq(listings.userId, users.id))
      .where(eq(listings.status, "approved"))
      .orderBy(
        desc(sql<number>`case when ${listings.featured} = 1 and ${listings.featuredUntil} > ${now} then 1 else 0 end`),
        desc(listings.createdAt),
      );
    return rows.map(({ listing, seller }) => toListing(listing, seller));
  }),

  detail: publicProcedure.input(idSchema).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const row = await findListingWithSeller(db, input.id);
    if (!row) notFound();
    const mayViewUnapproved = ctx.user && (ctx.user.id === row.listing.userId || ctx.user.role === "admin");
    if (row.listing.status !== "approved" && !mayViewUnapproved) notFound();
    return toListing(row.listing, row.seller);
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const ownListings = await db
      .select({ listing: listings, seller: users })
      .from(listings)
      .innerJoin(users, eq(listings.userId, users.id))
      .where(eq(listings.userId, ctx.user.id))
      .orderBy(desc(listings.createdAt));
    const requests = await db
      .select({
        id: featuredRequests.id,
        listingId: featuredRequests.listingId,
        method: featuredRequests.method,
        reference: featuredRequests.reference,
        status: featuredRequests.status,
        createdAt: featuredRequests.createdAt,
      })
      .from(featuredRequests)
      .where(eq(featuredRequests.userId, ctx.user.id))
      .orderBy(desc(featuredRequests.createdAt));
    return {
      ...ctx.user,
      user: ctx.user,
      listings: ownListings.map(({ listing, seller }) => toListing(listing, seller)),
      featuredRequests: requests,
    };
  }),

  profile: protectedProcedure
    .input(z.object({ name: nonEmpty(100), email: emailSchema, phone: phoneSchema }).strict())
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(users).set({ name: input.name, email: input.email, phone: input.phone }).where(eq(users.id, ctx.user.id));
      const user = (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
      if (!user) notFound("الحساب غير موجود");
      return user;
    }),

  create: protectedProcedure.input(listingInputSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const user = (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
    if (!user?.phone?.trim()) badRequest("أضف رقم هاتف صالحاً في الملف الشخصي قبل نشر إعلان");
    const settings = await loadSettings(db);
    assertListingAllowed(input, settings);
    await assertOwnedUploads(db, ctx.user.id, input.images);
    const inserted = await db
      .insert(listings)
      .values({
        userId: ctx.user.id,
        brand: input.brand,
        model: input.model,
        year: input.year,
        color: input.color,
        price: input.price.toFixed(2),
        currency: input.currency,
        mileage: input.mileage,
        location: input.location,
        description: input.description,
        transmission: input.transmission,
        fuel: input.fuel,
        condition: input.condition,
        images: input.images,
        status: "pending",
        featured: false,
      })
      .$returningId();
    return { id: inserted[0]!.id };
  }),

  update: protectedProcedure
    .input(idSchema.extend(listingInputSchema.shape).strict())
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = (await db.select().from(listings).where(eq(listings.id, input.id)).limit(1))[0];
      if (!existing || existing.userId !== ctx.user.id) notFound();
      if (existing.status === "archived") badRequest("لا يمكن تعديل إعلان مؤرشف");
      const user = (await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1))[0];
      if (!user?.phone?.trim()) badRequest("أضف رقم هاتف صالحاً في الملف الشخصي قبل إعادة تقديم الإعلان");
      const settings = await loadSettings(db);
      assertListingAllowed(input, settings);
      await assertOwnedUploads(db, ctx.user.id, input.images);
      await db
        .update(listings)
        .set({
          brand: input.brand,
          model: input.model,
          year: input.year,
          color: input.color,
          price: input.price.toFixed(2),
          currency: input.currency,
          mileage: input.mileage,
          location: input.location,
          description: input.description,
          transmission: input.transmission,
          fuel: input.fuel,
          condition: input.condition,
          images: input.images,
          status: "pending",
          featured: false,
          featuredUntil: null,
          rejectionReason: null,
        })
        .where(and(eq(listings.id, input.id), eq(listings.userId, ctx.user.id)));
      return { id: input.id, status: "pending" as const };
    }),

  setSold: protectedProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const listing = (await db.select().from(listings).where(eq(listings.id, input.id)).limit(1))[0];
    if (!listing || listing.userId !== ctx.user.id) notFound();
    if (listing.status !== "approved") badRequest("يمكن تعليم الإعلانات المنشورة فقط على أنها مباعة");
    await db
      .update(listings)
      .set({ status: "sold", featured: false, featuredUntil: null })
      .where(and(eq(listings.id, input.id), eq(listings.userId, ctx.user.id), eq(listings.status, "approved")));
    return { id: input.id, status: "sold" as const };
  }),

  upload: protectedProcedure
    .input(z.object({ base64: z.string().max(MAX_IMAGE_BASE64_CHARS), mime: z.string().trim().max(32) }).strict())
    .mutation(async ({ ctx, input }) => {
      const claimedMime = imageMimeSchema.safeParse(input.mime);
      if (!claimedMime.success) badRequest("نوع الصورة غير مدعوم");
      const { bytes, detected } = decodeUploadedImage(input.base64, claimedMime.data);
      const db = await requireDb();
      // The UUID makes the exact stable key unguessably unique; storagePut is instructed not to add a second suffix.
      const key = `cars/${ctx.user.id}/${randomUUID()}.jpg`;
      const stored = await storagePut(key, bytes, detected.mime, { unique: false });
      await db.insert(uploadedAssets).values({
        userId: ctx.user.id,
        storageKey: stored.key,
        url: stored.url,
        mime: detected.mime,
        bytes: bytes.length,
      });
      return { url: stored.url };
    }),

  featureRequest: protectedProcedure
    .input(
      z
        .object({
          listingId: z.number().int().positive(),
          method: z.enum(["paypal", "western"]),
          reference: nonEmpty(256),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const listing = (await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1))[0];
      if (!listing || listing.userId !== ctx.user.id) notFound();
      if (listing.status !== "approved") badRequest("لا يمكن طلب تمييز إلا لإعلان منشور");
      const settings = await loadSettings(db);
      if (input.method === "paypal" && (!settings.paypalEnabled || !settings.paypalUrl)) {
        badRequest("الدفع عبر PayPal غير مفعل");
      }
      if (input.method === "western" && (!settings.westernEnabled || !settings.westernInstructions)) {
        badRequest("Western Union غير مفعل");
      }
      const duplicate = await db
        .select({ id: featuredRequests.id })
        .from(featuredRequests)
        .where(and(eq(featuredRequests.listingId, input.listingId), eq(featuredRequests.status, "pending")))
        .limit(1);
      if (duplicate.length) badRequest("يوجد طلب تمييز قيد المراجعة لهذا الإعلان");
      const inserted = await db
        .insert(featuredRequests)
        .values({
          listingId: input.listingId,
          userId: ctx.user.id,
          method: input.method,
          reference: input.reference,
          amount: settings.featuredPrice.toFixed(2),
          duration: settings.featuredDays,
          status: "pending",
        })
        .$returningId();
      return { id: inserted[0]!.id, status: "pending" as const };
    }),

  contact: publicProcedure
    .input(z.object({ name: nonEmpty(100), email: emailSchema, message: nonEmpty(4).max(5_000) }).strict())
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const ipHash = clientIpHash(ctx.req);
      const since = new Date(Date.now() - CONTACT_RATE_WINDOW_MS);
      const recent = await db
        .select({ id: contactMessages.id })
        .from(contactMessages)
        .where(and(eq(contactMessages.ipHash, ipHash), gt(contactMessages.createdAt, since)))
        .limit(CONTACT_RATE_LIMIT);
      if (recent.length >= CONTACT_RATE_LIMIT) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "حاول مجدداً بعد ساعة" });
      }
      await db.insert(contactMessages).values({ ...input, ipHash });
      return { success: true };
    }),

  adminOverview: adminProcedure.query(async () => {
    const db = await requireDb();
    const now = new Date();
    const [listingRows, userRows, requestRows, messageRows, listingCounts, pendingCounts, featuredCounts, userCounts] = await Promise.all([
      db
        .select({ listing: listings, seller: users })
        .from(listings)
        .innerJoin(users, eq(listings.userId, users.id))
        .orderBy(desc(listings.createdAt)),
      db.select().from(users).orderBy(desc(users.createdAt)),
      db
        .select({
          id: featuredRequests.id,
          listingId: featuredRequests.listingId,
          method: featuredRequests.method,
          reference: featuredRequests.reference,
          status: featuredRequests.status,
          createdAt: featuredRequests.createdAt,
          listingTitle: sql<string>`concat(${listings.brand}, ' ', ${listings.model}, ' ', ${listings.year})`,
          userName: users.name,
          amount: featuredRequests.amount,
          duration: featuredRequests.duration,
        })
        .from(featuredRequests)
        .innerJoin(listings, eq(featuredRequests.listingId, listings.id))
        .innerJoin(users, eq(featuredRequests.userId, users.id))
        .orderBy(desc(featuredRequests.createdAt)),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
      db.select({ count: sql<number>`count(*)` }).from(listings),
      db.select({ count: sql<number>`count(*)` }).from(listings).where(eq(listings.status, "pending")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(listings)
        .where(and(eq(listings.featured, true), gt(listings.featuredUntil, now))),
      db.select({ count: sql<number>`count(*)` }).from(users),
    ]);
    return {
      listings: listingRows.map(({ listing, seller }) => toListing(listing, seller)),
      users: userRows,
      requests: requestRows.map((request) => ({ ...request, amount: String(request.amount) })),
      messages: messageRows,
      stats: {
        total: Number(listingCounts[0]?.count ?? 0),
        pending: Number(pendingCounts[0]?.count ?? 0),
        featured: Number(featuredCounts[0]?.count ?? 0),
        users: Number(userCounts[0]?.count ?? 0),
      },
    };
  }),

  moderate: adminProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          status: z.enum(["approved", "rejected", "sold"]),
          reason: optionalText(2_000).optional(),
        })
        .strict(),
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const listing = (await db.select().from(listings).where(eq(listings.id, input.id)).limit(1))[0];
      if (!listing) notFound();
      await db
        .update(listings)
        .set({
          status: input.status,
          rejectionReason: input.status === "rejected" ? input.reason || null : null,
          ...(input.status === "approved" ? {} : { featured: false, featuredUntil: null }),
        })
        .where(eq(listings.id, input.id));
      return { id: input.id, status: input.status };
    }),

  deleteListing: adminProcedure.input(idSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const listing = (await db.select().from(listings).where(eq(listings.id, input.id)).limit(1))[0];
    if (!listing) notFound("الإعلان غير موجود");
    await db.transaction(async (tx) => {
      await tx.delete(featuredRequests).where(eq(featuredRequests.listingId, input.id));
      await tx.delete(listings).where(eq(listings.id, input.id));
    });
    return { id: input.id, deleted: true as const };
  }),

  featureDecision: adminProcedure
    .input(
      z
        .object({ id: z.number().int().positive(), approved: z.boolean(), paymentConfirmed: z.boolean() })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const request = (await db.select().from(featuredRequests).where(eq(featuredRequests.id, input.id)).limit(1))[0];
      if (!request) notFound("طلب التمييز غير موجود");
      if (request.status !== "pending") badRequest("تمت مراجعة طلب التمييز مسبقاً");
      const listing = (await db.select().from(listings).where(eq(listings.id, request.listingId)).limit(1))[0];
      if (!listing || listing.status !== "approved") {
        badRequest("لا يمكن مراجعة الطلب لأن الإعلان لم يعد منشوراً");
      }
      if (input.approved && !input.paymentConfirmed) {
        badRequest("لا يمكن اعتماد التمييز قبل تأكيد الدفع يدوياً");
      }
      const now = new Date();
      if (input.approved) {
        const featuredUntil = new Date(now.getTime() + request.duration * ONE_DAY_MS);
        await db.update(featuredRequests).set({ status: "approved", decidedAt: now, decidedByUserId: ctx.user.id }).where(and(eq(featuredRequests.id, input.id), eq(featuredRequests.status, "pending")));
        await db.update(listings).set({ featured: true, featuredUntil }).where(and(eq(listings.id, listing.id), eq(listings.status, "approved")));
        return { id: input.id, status: "approved" as const, featuredUntil };
      }
      await db.update(featuredRequests).set({ status: "rejected", decidedAt: now, decidedByUserId: ctx.user.id }).where(and(eq(featuredRequests.id, input.id), eq(featuredRequests.status, "pending")));
      return { id: input.id, status: "rejected" as const };
    }),

  userStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), blocked: z.boolean() }).strict())
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.user.id) badRequest("لا يمكنك تغيير حالة حسابك");
      const db = await requireDb();
      const target = (await db.select().from(users).where(eq(users.id, input.id)).limit(1))[0];
      if (!target) notFound("المستخدم غير موجود");
      if (target.role === "admin") badRequest("لا يمكن حظر حساب إداري");
      await db.update(users).set({ blocked: input.blocked }).where(eq(users.id, input.id));
      return { id: input.id, blocked: input.blocked };
    }),

  deleteUser: adminProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    if (input.id === ctx.user.id) badRequest("لا يمكنك حذف حسابك الحالي");
    const db = await requireDb();
    const target = (await db.select().from(users).where(eq(users.id, input.id)).limit(1))[0];
    if (!target) notFound("المستخدم غير موجود");
    if (target.role === "admin") badRequest("لا يمكن حذف حساب إداري");
    const owned = await db.select({ id: listings.id }).from(listings).where(eq(listings.userId, input.id));
    await db.transaction(async (tx) => {
      for (const listing of owned) await tx.delete(featuredRequests).where(eq(featuredRequests.listingId, listing.id));
      await tx.delete(listings).where(eq(listings.userId, input.id));
      await tx.delete(uploadedAssets).where(eq(uploadedAssets.userId, input.id));
      await tx.delete(localCredentials).where(eq(localCredentials.userId, input.id));
      await tx.delete(users).where(eq(users.id, input.id));
    });
    return { id: input.id, deleted: true as const };
  }),

  saveSettings: adminProcedure.input(settingsSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const settings = validateSettings(input);
    await db
      .insert(marketSettings)
      .values({
        id: 1,
        brands: settings.brands,
        currencies: settings.currencies,
        terms: settings.terms,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        whatsapp: settings.whatsapp,
        paypalEnabled: settings.paypalEnabled,
        paypalUrl: settings.paypalUrl,
        westernEnabled: settings.westernEnabled,
        westernInstructions: settings.westernInstructions,
        featuredPrice: settings.featuredPrice.toFixed(2),
        featuredDays: settings.featuredDays,
      })
      .onDuplicateKeyUpdate({
        set: {
          brands: settings.brands,
          currencies: settings.currencies,
          terms: settings.terms,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
          whatsapp: settings.whatsapp,
          paypalEnabled: settings.paypalEnabled,
          paypalUrl: settings.paypalUrl,
          westernEnabled: settings.westernEnabled,
          westernInstructions: settings.westernInstructions,
          featuredPrice: settings.featuredPrice.toFixed(2),
          featuredDays: settings.featuredDays,
        },
      });
    return settings;
  }),
});
