'use server';

import { revalidatePath } from 'next/cache';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { MAX_SEATS, MAX_TABLES, type SeatingTable } from '@/lib/admin/seating';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

type PayloadTable = {
  id: string;
  name: string;
  note: string | null;
  sort_order: number;
  seats: Array<{ id: string; position: number; guest_id: string | null; label: string | null }>;
};

function fail(error: { message: string; code?: string }) {
  console.error('save_seating_chart', error.code, error.message);
  return { ok: false as const, error: 'Não consegui salvar o mapa. Tente de novo.' };
}

export async function saveSeatingChart(
  tables: SeatingTable[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await assertAdminSession();
  if (!session) return { ok: false, error: 'Sessão expirada. Entre de novo no admin.' };

  if (!Array.isArray(tables) || tables.length > MAX_TABLES) {
    return { ok: false, error: 'O mapa aceita no máximo 80 mesas.' };
  }

  const { supabase } = session;
  const seenGuests = new Set<string>();
  const seenSeats = new Set<string>();
  const seenTables = new Set<string>();
  const payload: PayloadTable[] = [];

  for (let index = 0; index < tables.length; index += 1) {
    const table = tables[index];
    if (!table || !UUID.test(table.id) || seenTables.has(table.id)) {
      return { ok: false, error: 'Uma das mesas está inválida. Atualize a página.' };
    }
    seenTables.add(table.id);
    if (!Array.isArray(table.seats) || table.seats.length > MAX_SEATS) {
      return { ok: false, error: 'Cada mesa pode ter no máximo 40 lugares.' };
    }

    const seats = [];
    for (let position = 0; position < table.seats.length; position += 1) {
      const seat = table.seats[position];
      if (!seat || !UUID.test(seat.id) || seenSeats.has(seat.id)) {
        return { ok: false, error: 'Um dos lugares está inválido. Atualize a página.' };
      }
      seenSeats.add(seat.id);
      let guestId = seat.guestId && UUID.test(seat.guestId) ? seat.guestId : null;
      if (guestId && seenGuests.has(guestId)) guestId = null;
      if (guestId) seenGuests.add(guestId);
      const label = guestId ? null : seat.label.trim().replace(/\s+/g, ' ').slice(0, 120) || null;
      seats.push({ id: seat.id, position, guest_id: guestId, label });
    }

    payload.push({
      id: table.id,
      name: table.name.trim().replace(/\s+/g, ' ').slice(0, 80) || `Mesa ${index + 1}`,
      note: table.note.trim().replace(/\s+/g, ' ').slice(0, 160) || null,
      sort_order: index,
      seats,
    });
  }

  const deletedSeats = await supabase.from('seating_seats').delete().neq('id', NIL_UUID);
  if (deletedSeats.error) return fail(deletedSeats.error);
  const deletedTables = await supabase.from('seating_tables').delete().neq('id', NIL_UUID);
  if (deletedTables.error) return fail(deletedTables.error);

  if (payload.length > 0) {
    const insertedTables = await supabase.from('seating_tables').insert(
      payload.map((table) => ({
        id: table.id,
        name: table.name,
        note: table.note,
        sort_order: table.sort_order,
      })),
    );
    if (insertedTables.error) return fail(insertedTables.error);

    const seatRows = payload.flatMap((table) =>
      table.seats.map((seat) => ({
        id: seat.id,
        table_id: table.id,
        position: seat.position,
        guest_id: seat.guest_id,
        label: seat.label,
      })),
    );
    if (seatRows.length > 0) {
      const insertedSeats = await supabase.from('seating_seats').insert(seatRows);
      if (insertedSeats.error) return fail(insertedSeats.error);
    }
  }

  const seatedIds = payload.flatMap((table) =>
    table.seats.map((seat) => seat.guest_id).filter((id): id is string => !!id),
  );

  for (const table of payload) {
    const ids = table.seats.map((seat) => seat.guest_id).filter((id): id is string => !!id);
    if (ids.length === 0) continue;
    const named = await supabase.from('guests').update({ table_name: table.name }).in('id', ids);
    if (named.error) return fail(named.error);
  }

  const namedGuests = await supabase.from('guests').select('id').not('table_name', 'is', null);
  if (namedGuests.error) return fail(namedGuests.error);
  const seated = new Set(seatedIds);
  const toClear = (namedGuests.data ?? []).map((guest) => guest.id).filter((id) => !seated.has(id));
  for (let start = 0; start < toClear.length; start += 100) {
    const chunk = toClear.slice(start, start + 100);
    const cleared = await supabase.from('guests').update({ table_name: null }).in('id', chunk);
    if (cleared.error) return fail(cleared.error);
  }

  revalidatePath('/admin/convidados');
  return { ok: true };
}
