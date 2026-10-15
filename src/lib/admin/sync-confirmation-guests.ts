import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

function normalizePersonName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same shape as public.guest_slug_from_name. */
function guestSlugFromName(name: string) {
  const normalized = normalizePersonName(name).replace(/[^a-z0-9]+/g, '-').slice(0, 48);
  const hash = createHash('md5').update(name).digest('hex').slice(0, 6);
  return `${normalized}-${hash}`;
}

/**
 * People added on a confirmation must exist in `guests`, because the public
 * RSVP search only reads that table. This does not write an RSVP.
 */
export async function ensureGuestsForNames(supabase: SupabaseClient, names: string[]) {
  const clean = [...new Set(names.map((name) => name.trim()).filter((name) => name.length > 0))];
  if (clean.length === 0) return { ok: true as const };

  const { data: guests, error } = await supabase.from('guests').select('display_name, full_name');
  if (error) return { ok: false as const, error: error.message };

  const existing = new Set(
    (guests ?? [])
      .map((guest) => normalizePersonName(guest.full_name || guest.display_name || ''))
      .filter(Boolean),
  );
  const missing = clean.filter((name) => !existing.has(normalizePersonName(name)));
  if (missing.length === 0) return { ok: true as const };

  for (const name of missing) {
    const { error: insertError } = await supabase.from('guests').insert({
      slug: guestSlugFromName(name),
      display_name: name,
      full_name: name,
      max_companions: 0,
    });
    if (insertError && insertError.code !== '23505') {
      return { ok: false as const, error: insertError.message };
    }
  }

  return { ok: true as const };
}
