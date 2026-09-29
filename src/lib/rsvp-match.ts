export type NamedGuest = {
  full_name: string | null;
  display_name?: string | null;
  group_name: string | null;
};

function guestSearchName(guest: NamedGuest) {
  const name = (guest.full_name || guest.display_name || '').trim();
  return name.length > 0 ? name : null;
}

export type MatchResult<T extends NamedGuest> =
  | { kind: 'idle' }
  | { kind: 'none' }
  | { kind: 'many' }
  | { kind: 'one'; guest: T }
  | { kind: 'groups'; options: Array<{ label: string; guest: T }> };

export function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reveals a guest only when the typed name points at one person on the pre-list.
 * Partial overlaps stay hidden so one João cannot confirm another.
 */
export function matchGuests<T extends NamedGuest>(guests: T[], raw: string): MatchResult<T> {
  const query = normalizeName(raw);
  if (query.length < 2) return { kind: 'idle' };

  const named = guests.filter((guest) => {
    const name = guestSearchName(guest);
    return name && normalizeName(name).length > 0;
  });
  const exact = named.filter((guest) => normalizeName(guestSearchName(guest)!) === query);
  const pool =
    exact.length > 0
      ? exact
      : named.filter((guest) => normalizeName(guestSearchName(guest)!).includes(query));

  if (pool.length === 0) return { kind: 'none' };
  if (pool.length === 1) return { kind: 'one', guest: pool[0] };

  if (exact.length > 1) {
    const labels = exact.map((guest) => guest.group_name?.trim() ?? '');
    const unique = new Set(labels.filter(Boolean));
    if (unique.size === exact.length) {
      return {
        kind: 'groups',
        options: exact.map((guest) => ({ label: guest.group_name!.trim(), guest })),
      };
    }
  }

  return { kind: 'many' };
}

/** Guests that share the same non-empty `group_name` (one row per person in the admin list). */
export function getFamilyMembers<T extends NamedGuest>(guests: T[], anchor: T): T[] {
  const group = anchor.group_name?.trim();
  if (!group) return [anchor];

  const groupKey = normalizeName(group);
  const members = guests.filter((guest) => {
    const g = guest.group_name?.trim();
    return g && normalizeName(g) === groupKey;
  });

  if (members.length <= 1) return [anchor];

  return [...members].sort((a, b) =>
    (guestSearchName(a) ?? '').localeCompare(guestSearchName(b) ?? '', 'pt-BR', { sensitivity: 'base' }),
  );
}
