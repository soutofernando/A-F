import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminDb } from '@/lib/admin/require-admin';
import { ConfirmationsAdminPanel } from '@/components/admin/ConfirmationsAdminPanel';
import { addConfirmationFamily } from '@/app/admin/confirmacoes/actions';
import { buildPresenceParties, type GuestRow, type RsvpRow } from '@/lib/admin/presence-parties';
import { Card, PageHeader, Stat } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

type Name = { name: string; kind: 'adult' | 'child' };
type Confirmation = {
  id: string;
  attending: boolean;
  party_size: number;
  names: Name[] | null;
  contact: string | null;
  message: string | null;
  created_at: string;
};

const fmt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

async function deleteConfirmation(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await adminDb();
  if (!supabase) return;
  await supabase.from('confirmations').delete().eq('id', id);
  revalidatePath('/admin/confirmacoes');
  revalidatePath('/admin/presencas');
}

async function unconfirmFamily(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await adminDb();
  if (!supabase) return;
  await supabase
    .from('confirmations')
    .update({ attending: false, party_size: 0, names: [] })
    .eq('id', id);
  revalidatePath('/admin/confirmacoes');
  revalidatePath('/admin/presencas');
}

export default async function ConfirmacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('confirmations')
    .select('id, attending, party_size, names, contact, message, created_at')
    .order('created_at', { ascending: false });

  const list = (data ?? []) as Confirmation[];
  const [{ data: guests }, { data: rsvps }] = await Promise.all([
    supabase.from('guests').select('id, display_name, full_name, group_name').order('display_name'),
    supabase.from('rsvps').select('guest_id, status'),
  ]);
  const guestList = (guests ?? []) as GuestRow[];
  const rsvpByGuest = new Map<string, RsvpRow>();
  (rsvps ?? []).forEach((row) => rsvpByGuest.set(row.guest_id, row as RsvpRow));
  const parties = buildPresenceParties(
    guestList,
    list.map((confirmation) => ({
      id: confirmation.id,
      names: confirmation.names,
      created_at: confirmation.created_at,
    })),
    rsvpByGuest,
  );
  const confirmationById = new Map(list.map((confirmation) => [confirmation.id, confirmation]));

  const yes = list.filter((c) => c.attending);
  const no = list.filter((c) => !c.attending);
  const totalPeople = yes.reduce((acc, c) => acc + (c.party_size || 0), 0);
  const totalChildren = yes.reduce(
    (acc, c) => acc + (c.names ?? []).filter((n) => n.kind === 'child').length,
    0,
  );
  const totalAdults = totalPeople - totalChildren;

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        kicker="PRÉ-CONFIRMAÇÃO"
        title="pré-confirmação das famílias"
        subtitle="A mesma lista de famílias de Presenças. Aqui você edita os nomes da pré-confirmação."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <Stat label="Famílias confirmadas" value={yes.length} meta={`${no.length} não poderão`} />
        <Stat label="Pessoas na pré-lista" value={totalPeople} meta="pré-confirmação" />
        <Stat label="Adultos" value={totalAdults} meta="marcados no formulário" />
        <Stat label="Crianças" value={totalChildren} meta="marcadas no formulário" />
        <Stat label="Respostas no total" value={list.length} />
      </div>

      <Card
        title="Por família (pré-confirmação)"
        subtitle="Mesma ordem e as mesmas pessoas de Presenças. O nome salva ao sair do campo."
      >
        <ConfirmationsAdminPanel
          parties={parties.map((party) => {
            const confirmation = confirmationById.get(party.key);
            return {
              key: party.key,
              title: party.title,
              members: party.members.map((member) => ({
                id: member.id,
                label: member.full_name || member.display_name,
                status: rsvpByGuest.get(member.id)?.status ?? null,
              })),
              confirmation: confirmation
                ? {
                    id: confirmation.id,
                    attending: confirmation.attending,
                    party_size: confirmation.party_size,
                    names: confirmation.names,
                    contact: confirmation.contact,
                    message: confirmation.message,
                    createdAtLabel: fmt.format(new Date(confirmation.created_at)),
                  }
                : null,
            };
          })}
          addFamilyAction={addConfirmationFamily}
          unconfirmAction={unconfirmFamily}
          deleteAction={deleteConfirmation}
        />
      </Card>
    </div>
  );
}
