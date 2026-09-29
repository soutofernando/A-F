import { normalizeName } from '@/lib/rsvp-match';

export type GuestRow = {
  id: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
};

export type RsvpRow = {
  guest_id: string;
  status: string;
};

export type ConfirmationRow = {
  id: string;
  names: Array<{ name: string; kind?: string }> | null;
  created_at: string;
};

export type PresenceParty = {
  key: string;
  title: string;
  members: GuestRow[];
};

function guestLabel(g: GuestRow) {
  return g.full_name || g.display_name;
}

function findGuestByName(guests: GuestRow[], name: string): GuestRow | undefined {
  const key = normalizeName(name);
  return guests.find((g) => normalizeName(guestLabel(g)) === key);
}

/** Agrupa pela pré-confirmação (mesma lógica da home). Só entra na lista quem tem RSVP ou família 2+ na pré-lista. */
export function buildPresenceParties(
  guests: GuestRow[],
  confirmations: ConfirmationRow[],
  rsvpByGuest: Map<string, RsvpRow>,
): PresenceParty[] {
  const usedGuestIds = new Set<string>();
  const parties: PresenceParty[] = [];

  const sorted = [...confirmations].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  for (const conf of sorted) {
    const names = conf.names ?? [];
    if (names.length < 2) continue;

    const members: GuestRow[] = [];
    for (const entry of names) {
      const guest = findGuestByName(guests, entry.name);
      if (guest && !usedGuestIds.has(guest.id)) {
        members.push(guest);
        usedGuestIds.add(guest.id);
      }
    }

    if (members.length < 2) continue;

    const title = members.map(guestLabel).join(' · ');
    parties.push({ key: conf.id, title, members });
  }

  for (const guest of guests) {
    if (usedGuestIds.has(guest.id)) continue;
    if (!rsvpByGuest.has(guest.id)) continue;
    parties.push({
      key: `solo:${guest.id}`,
      title: guestLabel(guest),
      members: [guest],
    });
    usedGuestIds.add(guest.id);
  }

  parties.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }));
  return parties;
}

export function collectPreListGuestIds(guests: GuestRow[], confirmations: ConfirmationRow[]) {
  const preListGuestIds = new Set<string>();
  let preListNameCount = 0;

  for (const conf of confirmations) {
    for (const entry of conf.names ?? []) {
      if (!entry.name?.trim()) continue;
      preListNameCount += 1;
      const guest = findGuestByName(guests, entry.name);
      if (guest) preListGuestIds.add(guest.id);
    }
  }

  return { preListGuestIds, preListNameCount };
}

export function countPresenceStats(
  guests: GuestRow[],
  rsvpByGuest: Map<string, RsvpRow>,
  preListGuestIds: Set<string>,
  preListNameCount: number,
) {
  let yes = 0;
  let no = 0;
  let preListYes = 0;
  let preListNo = 0;
  let preListAwaitingHome = 0;

  for (const guest of guests) {
    const st = rsvpByGuest.get(guest.id)?.status;
    if (st === 'yes') yes += 1;
    else if (st === 'no') no += 1;
  }

  for (const guestId of preListGuestIds) {
    const st = rsvpByGuest.get(guestId)?.status;
    if (st === 'yes') preListYes += 1;
    else if (st === 'no') preListNo += 1;
    else preListAwaitingHome += 1;
  }

  const notOnPreList = guests.length - preListGuestIds.size;
  const namesNotMatched = preListNameCount - preListGuestIds.size;

  return {
    totalGuests: guests.length,
    preListNameCount,
    preListMatchedGuests: preListGuestIds.size,
    namesNotMatched,
    notOnPreList,
    yes,
    no,
    preListYes,
    preListNo,
    preListAwaitingHome,
  };
}
