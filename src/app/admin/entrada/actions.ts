'use server';

import { assertAdminSession } from '@/lib/admin/require-admin';
import { ENTRY_TOKEN_PATTERN, type EntryScan } from '@/lib/admin/entry-pass-types';

function textOrNull(value: unknown) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean || null;
}

function parseScan(data: unknown): EntryScan {
  if (!data || typeof data !== 'object') return { ok: false, reason: 'invalid' };
  const row = data as Record<string, unknown>;
  const guestId = textOrNull(row.guest_id) ?? '';
  const name = textOrNull(row.name) ?? '';
  const tableName = textOrNull(row.table_name);
  const usedAt = textOrNull(row.used_at) ?? '';

  if (row.ok === true && row.reason === 'ok') {
    return { ok: true, reason: 'ok', guestId, name, tableName, usedAt };
  }
  if (row.ok === false && row.reason === 'used') {
    return { ok: false, reason: 'used', guestId, name, tableName, usedAt };
  }
  return { ok: false, reason: 'invalid' };
}

export async function consumeEntryPass(rawToken: string): Promise<EntryScan> {
  const token = rawToken.trim();
  if (!ENTRY_TOKEN_PATTERN.test(token)) return { ok: false, reason: 'invalid' };

  const session = await assertAdminSession();
  if (!session) return { ok: false, reason: 'unauthorized' };

  const { data, error } = await session.supabase.rpc('consume_entry_pass', { p_token: token });
  if (error) return { ok: false, reason: 'error' };
  return parseScan(data);
}
