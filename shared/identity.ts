export type EntityId = number | string;

/** Preserve Supabase UUIDs; never convert them to NaN or a synthetic number. */
export function parseEntityId(value?: string): EntityId {
  if (!value) return 0;
  if (/^[1-9]\d*$/.test(value)) {
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : value;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : 0;
}

export const WEBSITE_URL = 'https://sayarty.store';
export function listingWebsiteUrl(id: EntityId): string {
  return `${WEBSITE_URL}/car/${encodeURIComponent(String(id))}`;
}
