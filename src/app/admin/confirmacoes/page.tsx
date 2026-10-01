import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminDb } from '@/lib/admin/require-admin';
import { ConfirmationsAdminPanel } from '@/components/admin/ConfirmationsAdminPanel';
import { addConfirmationFamily } from '@/app/admin/confirmacoes/actions';
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
}

export default async function ConfirmacoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('confirmations')
    .select('id, attending, party_size, names, contact, message, created_at')
    .order('created_at', { ascending: false });

  const list = (data ?? []) as Confirmation[];
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
        subtitle="Respostas antigas de interesse inicial (pré-confirmação). A confirmação oficial é na home do site — veja em Presenças."
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
        title="Todas as respostas"
        subtitle="Adicione famílias manualmente, busque por nome e edite a lista — salva ao sair do campo."
      >
        <ConfirmationsAdminPanel
          rows={list.map((c) => ({
            id: c.id,
            attending: c.attending,
            party_size: c.party_size,
            names: c.names,
            contact: c.contact,
            message: c.message,
            createdAtLabel: fmt.format(new Date(c.created_at)),
          }))}
          addFamilyAction={addConfirmationFamily}
          unconfirmAction={unconfirmFamily}
          deleteAction={deleteConfirmation}
        />
      </Card>
    </div>
  );
}
