import { NextResponse } from 'next/server';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { buildFamilyListPdf } from '@/lib/admin/family-list-pdf';
import {
  buildPresenceParties,
  type ConfirmationRow,
  type GuestRow,
  type RsvpRow,
} from '@/lib/admin/presence-parties';

export const dynamic = 'force-dynamic';

function guestLabel(guest: GuestRow) {
  return guest.full_name || guest.display_name;
}

export async function GET() {
  const session = await assertAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { supabase } = session;
  const [{ data: guests }, { data: rsvps }, { data: confirmations }] = await Promise.all([
    supabase.from('guests').select('id, display_name, full_name, group_name').order('display_name'),
    supabase.from('rsvps').select('guest_id, status'),
    supabase.from('confirmations').select('id, names, created_at, contact').eq('attending', true),
  ]);

  const guestList = (guests ?? []) as GuestRow[];
  const rsvpByGuest = new Map<string, RsvpRow>();
  (rsvps ?? []).forEach((row) => rsvpByGuest.set(row.guest_id, row as RsvpRow));

  const confList = (confirmations ?? []) as Array<ConfirmationRow & { contact: string | null }>;
  const contactById = new Map(confList.map((confirmation) => [confirmation.id, confirmation.contact?.trim() ?? '']));
  const parties = buildPresenceParties(guestList, confList, rsvpByGuest);

  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  const pdf = buildFamilyListPdf(
    parties.map((party) => {
      const yes = party.members.filter((member) => rsvpByGuest.get(member.id)?.status === 'yes').length;
      return {
        family: party.members.length > 1 ? `Família (${party.members.length})` : party.title,
        members: party.members.map(guestLabel).join(', '),
        going: `${yes}/${party.members.length}`,
        whatsapp: contactById.get(party.key) ?? '',
      };
    }),
    generatedAt,
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="familias-whatsapp.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
