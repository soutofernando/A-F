import { normalizeName } from '@/lib/rsvp-match';

export type PartyMemberRow = {
  guest_id: string;
  name: string;
  kind: 'adult' | 'child';
  rsvp_status: string | null;
};

export type GuestWithId = {
  id: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
  greeting?: string | null;
  max_companions?: number | null;
};

export function partyRowsFromRpc(data: unknown): PartyMemberRow[] {
  if (!data || typeof data !== 'object') return [];
  const payload = data as { members?: unknown };
  if (!Array.isArray(payload.members)) return [];
  return payload.members
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const m = row as Record<string, unknown>;
      const guestId = typeof m.guest_id === 'string' ? m.guest_id : '';
      const name = typeof m.name === 'string' ? m.name : '';
      if (!guestId || !name) return null;
      const kind = m.kind === 'child' ? 'child' : 'adult';
      const rsvp_status = typeof m.rsvp_status === 'string' ? m.rsvp_status : null;
      return { guest_id: guestId, name, kind, rsvp_status };
    })
    .filter((row): row is PartyMemberRow => row !== null);
}

export function guestsFromPartyRows(rows: PartyMemberRow[], catalog: GuestWithId[]): GuestWithId[] {
  const out: GuestWithId[] = [];
  for (const row of rows) {
    const fromId = catalog.find((g) => g.id === row.guest_id);
    if (fromId) {
      out.push(fromId);
      continue;
    }
    const key = normalizeName(row.name);
    const fromName = catalog.find(
      (g) => normalizeName(g.full_name || g.display_name) === key,
    );
    if (fromName) out.push(fromName);
  }
  return out;
}

export function isFamilyParty(data: unknown, memberCount: number) {
  if (!data || typeof data !== 'object') return memberCount > 1;
  const kind = (data as { kind?: string }).kind;
  return kind === 'family' && memberCount > 1;
}
