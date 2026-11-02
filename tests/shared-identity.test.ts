import { describe, expect, it } from 'vitest';
import { parseEntityId, listingWebsiteUrl } from '../shared/identity';

describe('Supabase shared identities', () => {
  it('preserves UUIDs for listing lookup and editing', () => {
    const id = '2bee03ee-4e4e-464a-8bd9-56f15a056432';
    expect(parseEntityId(id)).toBe(id);
    expect(listingWebsiteUrl(id)).toBe(`https://sayarty.store/car/${id}`);
  });
  it('accepts existing numeric car identifiers', () => {
    expect(parseEntityId('123')).toBe(123);
    expect(listingWebsiteUrl(123)).toBe('https://sayarty.store/car/123');
  });
  it('does not silently truncate large bigint identifiers', () => {
    expect(parseEntityId('9007199254740993')).toBe('9007199254740993');
  });
  it('rejects invalid route values instead of producing NaN', () => {
    for (const id of [undefined, '', 'wrong-id', '-1', '1/../../admin']) expect(parseEntityId(id)).toBe(0);
  });
});
