import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  blocked: boolean("blocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Local email/password credentials. Passwords are stored only as scrypt hashes. */
export const localCredentials = mysqlTable("local_credentials", {
  userId: int("userId").primaryKey().references(() => users.id),
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const otpCodes = mysqlTable("otp_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  purpose: mysqlEnum("purpose", ["register", "reset"]).notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  name: text("name"),
  passwordHash: text("passwordHash"),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** One configurable market profile. `id = 1` is the only permitted row. */
export const marketSettings = mysqlTable("market_settings", {
  id: int("id").primaryKey(),
  brands: json("brands").$type<Record<string, string[]>>().notNull(),
  currencies: json("currencies").$type<string[]>().notNull(),
  terms: text("terms").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 32 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 64 }).notNull(),
  paypalEnabled: boolean("paypalEnabled").default(false).notNull(),
  paypalUrl: varchar("paypalUrl", { length: 512 }).notNull(),
  westernEnabled: boolean("westernEnabled").default(false).notNull(),
  westernInstructions: text("westernInstructions").notNull(),
  featuredPrice: decimal("featuredPrice", { precision: 14, scale: 2 }).notNull(),
  featuredDays: int("featuredDays").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const listings = mysqlTable(
  "listings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    brand: varchar("brand", { length: 80 }).notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    year: int("year").notNull(),
    color: varchar("color", { length: 64 }).notNull(),
    price: decimal("price", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull(),
    mileage: int("mileage").notNull(),
    location: varchar("location", { length: 120 }).notNull(),
    description: text("description").notNull(),
    transmission: varchar("transmission", { length: 64 }).notNull(),
    fuel: varchar("fuel", { length: 64 }).notNull(),
    condition: varchar("condition", { length: 64 }).notNull(),
    images: json("images").$type<string[]>().notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "sold", "archived"])
      .default("pending")
      .notNull(),
    featured: boolean("featured").default(false).notNull(),
    featuredUntil: timestamp("featuredUntil"),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("listings_status_featured_created_idx").on(table.status, table.featured, table.createdAt),
    index("listings_user_created_idx").on(table.userId, table.createdAt),
  ],
);

/** Durable ownership index for every object uploaded through market.upload. */
export const uploadedAssets = mysqlTable(
  "uploaded_assets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    url: varchar("url", { length: 768 }).notNull(),
    mime: varchar("mime", { length: 32 }).notNull(),
    bytes: int("bytes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uploaded_assets_storage_key_uq").on(table.storageKey),
    uniqueIndex("uploaded_assets_url_uq").on(table.url),
    index("uploaded_assets_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const featuredRequests = mysqlTable(
  "featured_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId").notNull().references(() => listings.id),
    userId: int("userId").notNull().references(() => users.id),
    method: mysqlEnum("method", ["paypal", "western"]).notNull(),
    reference: varchar("reference", { length: 256 }).notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
    duration: int("duration").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .default("pending")
      .notNull(),
    decidedAt: timestamp("decidedAt"),
    decidedByUserId: int("decidedByUserId").references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("featured_requests_listing_status_idx").on(table.listingId, table.status),
    index("featured_requests_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const contactMessages = mysqlTable(
  "contact_messages",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    message: text("message").notNull(),
    ipHash: varchar("ipHash", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("contact_messages_ip_created_idx").on(table.ipHash, table.createdAt)],
);

/** Single-use server-side records bind OAuth callback state to the original login preparation. */
export const oauthNonces = mysqlTable(
  "oauth_nonces",
  {
    id: int("id").autoincrement().primaryKey(),
    nonceHash: varchar("nonceHash", { length: 64 }).notNull(),
    redirectUri: varchar("redirectUri", { length: 1024 }).notNull(),
    frontendOrigin: varchar("frontendOrigin", { length: 512 }),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("oauth_nonces_nonce_hash_uq").on(table.nonceHash),
    index("oauth_nonces_expiry_idx").on(table.expiresAt),
  ],
);
