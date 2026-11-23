import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntryGuest, EntryPassCard } from '@/lib/admin/entry-pass-types';

type GuestRow = {
  id: string;
  display_name: string;
  full_name: string | null;
  table_name: string | null;
};

type PassRow = {
  guest_id: string;
  token: string;
  used_at: string | null;
};

export function entryGuestName(guest: { display_name: string; full_name: string | null }) {
  const full = guest.full_name?.trim();
  return full || guest.display_name.trim();
}

function tableName(value: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function isMissingPassesTable(error: { code?: string; message?: string }) {
  const message = error.message ?? '';
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /entry_passes/i.test(message) ||
    /schema cache/i.test(message)
  );
}

function fail(error: { code?: string; message?: string }) {
  if (isMissingPassesTable(error)) {
    return {
      ok: false as const,
      error: 'A tabela de passes ainda não existe. Rode a migration 0024_entry_passes.sql no Supabase.',
    };
  }
  return { ok: false as const, error: error.message || 'Não foi possível carregar os passes.' };
}

async function confirmedGuests(supabase: SupabaseClient) {
  const { data: rsvps, error } = await supabase.from('rsvps').select('guest_id').eq('status', 'yes');
  if (error) return { ok: false as const, error: error.message };

  const ids = [...new Set((rsvps ?? []).map((row) => row.guest_id as string).filter(Boolean))];
  if (ids.length === 0) return { ok: true as const, guests: [] as GuestRow[] };

  const { data: guests, error: guestError } = await supabase
    .from('guests')
    .select('id, display_name, full_name, table_name')
    .in('id', ids);
  if (guestError) return { ok: false as const, error: guestError.message };

  return { ok: true as const, guests: (guests ?? []) as GuestRow[] };
}

async function ensurePasses(supabase: SupabaseClient, guestIds: string[]) {
  if (guestIds.length === 0) return { ok: true as const };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: existing, error: readError } = await supabase
      .from('entry_passes')
      .select('guest_id')
      .in('guest_id', guestIds);
    if (readError) return fail(readError);

    const have = new Set((existing ?? []).map((row) => row.guest_id as string));
    const missing = guestIds.filter((id) => !have.has(id));
    if (missing.length === 0) return { ok: true as const };

    const rows = missing.map((guestId) => ({
      guest_id: guestId,
      token: randomBytes(32).toString('base64url'),
    }));
    const { error: insertError } = await supabase.from('entry_passes').insert(rows);
    if (!insertError) return { ok: true as const };
    if (insertError.code !== '23505' || attempt === 1) return fail(insertError);
  }

  return { ok: true as const };
}

export async function loadEntryRoster(supabase: SupabaseClient) {
  const confirmed = await confirmedGuests(supabase);
  if (!confirmed.ok) return confirmed;
  if (confirmed.guests.length === 0) return { ok: true as const, guests: [] as EntryGuest[] };

  const ids = confirmed.guests.map((guest) => guest.id);
  const { data: passes, error } = await supabase
    .from('entry_passes')
    .select('guest_id, used_at')
    .in('guest_id', ids);
  if (error) return fail(error);

  const usedByGuest = new Map((passes ?? []).map((row) => [row.guest_id as string, (row.used_at as string | null) ?? null]));
  const guests: EntryGuest[] = confirmed.guests
    .map((guest) => ({
      id: guest.id,
      name: entryGuestName(guest),
      tableName: tableName(guest.table_name),
      usedAt: usedByGuest.get(guest.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  return { ok: true as const, guests };
}

export async function loadEntryPassCards(supabase: SupabaseClient) {
  const confirmed = await confirmedGuests(supabase);
  if (!confirmed.ok) return confirmed;

  const ids = confirmed.guests.map((guest) => guest.id);
  const ensured = await ensurePasses(supabase, ids);
  if (!ensured.ok) return ensured;
  if (ids.length === 0) return { ok: true as const, cards: [] as EntryPassCard[] };

  const { data: passes, error } = await supabase
    .from('entry_passes')
    .select('guest_id, token, used_at')
    .in('guest_id', ids);
  if (error) return fail(error);

  const passByGuest = new Map((passes ?? []).map((row) => [row.guest_id as string, row as PassRow]));
  const cards: EntryPassCard[] = [];
  for (const guest of confirmed.guests) {
    const pass = passByGuest.get(guest.id);
    if (!pass) continue;
    cards.push({
      guestId: guest.id,
      name: entryGuestName(guest),
      tableName: tableName(guest.table_name),
      token: pass.token,
      usedAt: pass.used_at,
    });
  }
  cards.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  return { ok: true as const, cards };
}
