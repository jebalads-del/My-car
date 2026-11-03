import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { isSupabaseConfigured } from "./supabase-client";
import { getSupabaseIdentity, revokeSupabaseSession, clearSupabaseSessionCookies } from "./supabase-auth";
import { supabaseMarketRouter } from "./supabase-market";

/**
 * The Supabase market router is intentionally the single exported tRPC shape.
 * This avoids a conditional Router union, which makes generated React hooks uncallable.
 */
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!isSupabaseConfigured()) return ctx.user;
      return (await getSupabaseIdentity(ctx.req))?.user ?? null;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (isSupabaseConfigured()) {
        await revokeSupabaseSession(ctx.req);
        clearSupabaseSessionCookies(ctx.req, ctx.res);
      } else {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(getSessionCookieName(ctx.req), { ...cookieOptions, maxAge: -1 });
      }
      return { success: true } as const;
    }),
  }),
  market: supabaseMarketRouter,
});

export type AppRouter = typeof appRouter;
