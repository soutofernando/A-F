import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/admin/ui';
import { SeatingChart } from '@/components/admin/SeatingChart';
import {
  mergeGuestTableNames,
  seedTablesFromGuests,
  type GuestTableHint,
  type SeatingDraft,
  type SeatingGuest,
  type SeatingSeat,
  type SeatingTable,
} from '@/lib/admin/seating';

export const dynamic = 'force-dynamic';

type GuestRow = {
  id: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
  table_name: string | null;
};

type RsvpRow = {
  guest_id: string;
  status: string;
  companions: number | null;
};

type TableRow = {
  id: string;
  name: string;
  note: string | null;
  sort_order: number;
};

type SeatRow = {
  id: string;
  table_id: string;
  position: number;
  guest_id: string | null;
  label: string | null;
};

function guestName(guest: GuestRow) {
  return (guest.full_name || guest.display_name).trim();
}

export default async function MesasPage() {
  const supabase = await createClient();
  const [guestsResult, rsvpsResult, tablesResult, seatsResult] = await Promise.all([
    supabase
      .from('guests')
      .select('id, display_name, full_name, group_name, table_name')
      .order('display_name'),
    supabase.from('rsvps').select('guest_id, status, companions, confirmed_at').order('confirmed_at', { ascending: true }),
    supabase.from('seating_tables').select('id, name, note, sort_order').order('sort_order'),
    supabase.from('seating_seats').select('id, table_id, position, guest_id, label').order('position'),
  ]);

  const schemaMissing =
    tablesResult.error?.code === 'PGRST205' ||
    seatsResult.error?.code === 'PGRST205' ||
    tablesResult.error?.message?.includes('seating_tables') ||
    seatsResult.error?.message?.includes('seating_seats');

  if (schemaMissing || tablesResult.error || seatsResult.error || guestsResult.error) {
    return (
      <div style={{ maxWidth: 720 }}>
        <PageHeader
          kicker="MAPA DE MESAS"
          title="mapa de mesas"
          subtitle={schemaMissing ? 'O banco ainda não aceita este mapa.' : 'Não consegui carregar o mapa.'}
        />
        <Card title={schemaMissing ? 'Falta a migração' : 'Tente de novo'}>
          <p className="italic" style={{ color: 'rgba(239,231,219,.7)', fontSize: 14, lineHeight: 1.5 }}>
            {schemaMissing
              ? 'No SQL Editor do Supabase deste casamento, execute o arquivo supabase/migrations/0023_seating_chart.sql e atualize esta página.'
              : 'A lista de convidados ou as mesas não respondeu. Atualize a página.'}
          </p>
        </Card>
      </div>
    );
  }

  const guestRows = (guestsResult.data ?? []) as GuestRow[];
  const rsvpByGuest = new Map<string, RsvpRow>();
  for (const row of (rsvpsResult.data ?? []) as RsvpRow[]) {
    rsvpByGuest.set(row.guest_id, row);
  }

  const guests: SeatingGuest[] = guestRows.map((guest) => {
    const rsvp = rsvpByGuest.get(guest.id);
    const status = rsvp?.status === 'yes' || rsvp?.status === 'no' ? rsvp.status : 'pending';
    return {
      id: guest.id,
      name: guestName(guest),
      group: guest.group_name,
      status,
      companions: status === 'yes' ? Math.max(0, rsvp?.companions ?? 0) : 0,
    };
  });

  const hints: GuestTableHint[] = guestRows.map((guest) => ({
    id: guest.id,
    name: guestName(guest),
    tableName: guest.table_name,
  }));
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));
  const tableRows = (tablesResult.data ?? []) as TableRow[];
  const seatRows = (seatsResult.data ?? []) as SeatRow[];

  let initialTables: SeatingTable[];
  let draft: SeatingDraft = null;

  if (tableRows.length === 0) {
    initialTables = seedTablesFromGuests(hints);
    if (initialTables.length > 0) draft = { kind: 'seed', tables: initialTables.length };
  } else {
    const seatsByTable = new Map<string, SeatRow[]>();
    for (const seat of seatRows) {
      const list = seatsByTable.get(seat.table_id) ?? [];
      list.push(seat);
      seatsByTable.set(seat.table_id, list);
    }

    initialTables = [...tableRows]
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'))
      .map((table) => {
        const seats: SeatingSeat[] = (seatsByTable.get(table.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((seat) => {
            const guest = seat.guest_id ? guestById.get(seat.guest_id) : undefined;
            return {
              id: seat.id,
              guestId: guest ? guest.id : null,
              label: guest ? guest.name : (seat.label ?? ''),
            };
          });
        return {
          id: table.id,
          name: table.name,
          note: table.note ?? '',
          seats,
        };
      });

    const merged = mergeGuestTableNames(initialTables, hints);
    initialTables = merged.tables;
    if (merged.broughtIn > 0) draft = { kind: 'merge', people: merged.broughtIn };
  }

  return (
    <div className="seating-page">
      <PageHeader
        kicker="MAPA DE MESAS"
        title="mapa de mesas"
        subtitle="Cada coluna é uma mesa. Inclua quantas precisar e preencha os lugares com a lista ao lado."
      />
      <SeatingChart guests={guests} initialTables={initialTables} initialDraft={draft} />
    </div>
  );
}
