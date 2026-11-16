import { normalizeName } from '@/lib/rsvp-match';

export const DEFAULT_SEAT_COUNT = 8;
export const MAX_TABLES = 80;
export const MAX_SEATS = 40;

export type SeatingGuest = {
  id: string;
  name: string;
  group: string | null;
  status: 'yes' | 'no' | 'pending';
  companions: number;
};

export type SeatingSeat = {
  id: string;
  guestId: string | null;
  label: string;
};

export type SeatingTable = {
  id: string;
  name: string;
  note: string;
  seats: SeatingSeat[];
};

export type SeatingDraft =
  | { kind: 'seed'; tables: number }
  | { kind: 'merge'; people: number }
  | null;

export type GuestTableHint = {
  id: string;
  name: string;
  tableName: string | null;
};

export function newId() {
  return crypto.randomUUID();
}

export function emptySeat(): SeatingSeat {
  return { id: newId(), guestId: null, label: '' };
}

export function nextTableName(tables: Array<{ name: string }>) {
  let max = 0;
  for (const table of tables) {
    const match = table.name.match(/(\d+)\s*$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Mesa ${Math.max(max + 1, tables.length + 1)}`;
}

export function blankTable(name: string, seatCount = DEFAULT_SEAT_COUNT): SeatingTable {
  const count = Math.min(MAX_SEATS, Math.max(1, seatCount));
  return {
    id: newId(),
    name,
    note: '',
    seats: Array.from({ length: count }, () => emptySeat()),
  };
}

function padSeats(seats: SeatingSeat[], peopleCount: number) {
  const target = Math.min(MAX_SEATS, Math.max(DEFAULT_SEAT_COUNT, peopleCount + 2));
  while (seats.length < target) seats.push(emptySeat());
  return seats;
}

export function seedTablesFromGuests(guests: GuestTableHint[]): SeatingTable[] {
  const groups = new Map<string, { name: string; people: GuestTableHint[] }>();
  for (const guest of guests) {
    const raw = guest.tableName?.trim();
    if (!raw || !guest.name.trim()) continue;
    const key = normalizeName(raw);
    const group = groups.get(key) ?? { name: raw, people: [] };
    group.people.push(guest);
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' }))
    .map((group) => {
      const people = [...group.people].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      );
      const seats = people.slice(0, MAX_SEATS).map((person) => ({
        id: newId(),
        guestId: person.id,
        label: person.name,
      }));
      return {
        id: newId(),
        name: group.name,
        note: '',
        seats: padSeats(seats, people.length),
      };
    });
}

export function mergeGuestTableNames(
  tables: SeatingTable[],
  guests: GuestTableHint[],
): { tables: SeatingTable[]; broughtIn: number } {
  const seated = new Set(
    tables.flatMap((table) => table.seats.map((seat) => seat.guestId).filter((id): id is string => !!id)),
  );
  let broughtIn = 0;
  const next = tables.map((table) => ({
    ...table,
    seats: table.seats.map((seat) => ({ ...seat })),
  }));

  for (const guest of guests) {
    const raw = guest.tableName?.trim();
    if (!raw || !guest.name.trim() || seated.has(guest.id)) continue;
    const table = next.find((item) => normalizeName(item.name) === normalizeName(raw));
    if (!table) continue;
    const empty = table.seats.find((seat) => !seat.guestId && !seat.label.trim());
    if (empty) {
      empty.guestId = guest.id;
      empty.label = guest.name;
    } else if (table.seats.length < MAX_SEATS) {
      table.seats.push({ id: newId(), guestId: guest.id, label: guest.name });
    } else {
      continue;
    }
    seated.add(guest.id);
    broughtIn += 1;
  }

  return { tables: next, broughtIn };
}

export function placeGuest(
  tables: SeatingTable[],
  tableId: string,
  guest: { id: string; name: string },
): { tables: SeatingTable[]; seatId: string | null; changed: boolean } {
  const current = tables.find((table) => table.id === tableId);
  const existing = current?.seats.find((seat) => seat.guestId === guest.id);
  if (existing) return { tables, seatId: existing.id, changed: false };

  const cleared = tables.map((table) => ({
    ...table,
    seats: table.seats.map((seat) =>
      seat.guestId === guest.id ? { ...seat, guestId: null, label: '' } : seat,
    ),
  }));
  const index = cleared.findIndex((table) => table.id === tableId);
  if (index < 0) return { tables, seatId: null, changed: false };

  const table = cleared[index];
  const seats = table.seats.map((seat) => ({ ...seat }));
  const emptyIndex = seats.findIndex((seat) => !seat.guestId && !seat.label.trim());
  let seatId: string;
  if (emptyIndex >= 0) {
    seatId = seats[emptyIndex].id;
    seats[emptyIndex] = { ...seats[emptyIndex], guestId: guest.id, label: guest.name };
  } else if (seats.length < MAX_SEATS) {
    seatId = newId();
    seats.push({ id: seatId, guestId: guest.id, label: guest.name });
  } else {
    return { tables, seatId: null, changed: false };
  }

  const next = cleared.slice();
  next[index] = { ...table, seats };
  return { tables: next, seatId, changed: true };
}

export function matchUniqueGuest(guests: SeatingGuest[], raw: string, taken: Set<string>) {
  const query = normalizeName(raw);
  if (!query) return null;
  const hits = guests.filter(
    (guest) => !taken.has(guest.id) && normalizeName(guest.name) === query,
  );
  return hits.length === 1 ? hits[0] : null;
}

export function commitSeatLabel(
  tables: SeatingTable[],
  tableId: string,
  seatId: string,
  guests: SeatingGuest[],
): SeatingTable[] {
  const seat = tables.find((table) => table.id === tableId)?.seats.find((item) => item.id === seatId);
  if (!seat) return tables;

  const trimmed = seat.label.trim().replace(/\s+/g, ' ');
  const taken = new Set<string>();
  for (const table of tables) {
    for (const item of table.seats) {
      if (item.guestId && item.id !== seatId) taken.add(item.guestId);
    }
  }
  const match = trimmed ? matchUniqueGuest(guests, trimmed, taken) : null;
  const nextGuestId = !trimmed ? null : match ? match.id : null;
  const nextLabel = !trimmed ? '' : match ? match.name : trimmed;
  const steals = !!match && tables.some((table) => table.seats.some((item) => item.id !== seatId && item.guestId === match.id));
  if (seat.guestId === nextGuestId && seat.label === nextLabel && !steals) return tables;

  return tables.map((table) => ({
    ...table,
    seats: table.seats.map((item) => {
      if (table.id === tableId && item.id === seatId) {
        return { ...item, label: nextLabel, guestId: nextGuestId };
      }
      if (match && item.guestId === match.id) return { ...item, guestId: null, label: '' };
      return item;
    }),
  }));
}

export function suggestGuests(guests: SeatingGuest[], raw: string, taken: Set<string>) {
  const query = normalizeName(raw);
  const rank = { yes: 0, pending: 1, no: 2 };
  return guests
    .filter((guest) => {
      if (taken.has(guest.id)) return false;
      if (!query) return guest.status !== 'no';
      const haystack = normalizeName(`${guest.name} ${guest.group ?? ''}`);
      return haystack.includes(query);
    })
    .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 8);
}

export function moveTable(tables: SeatingTable[], tableId: string, direction: -1 | 1) {
  const index = tables.findIndex((table) => table.id === tableId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= tables.length) return tables;
  const next = tables.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
