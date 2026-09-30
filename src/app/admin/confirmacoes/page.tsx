import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ConfirmationPartyEditor } from '@/components/admin/ConfirmationPartyEditor';
import {
  Card,
  PageHeader,
  Pill,
  Stat,
  SubmitButton,
  adminTableStyle,
  adminThStyle,
  adminTdStyle,
} from '@/components/admin/ui';

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
  const supabase = await createClient();
  await supabase.from('confirmations').delete().eq('id', id);
  revalidatePath('/admin/confirmacoes');
}

async function unconfirmFamily(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
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
        subtitle="Mais recentes primeiro. Edite nomes, marque criança ou remova alguém — salva ao sair do campo ou ao clicar."
      >
        {list.length === 0 ? (
          <div style={{ fontStyle: 'italic', color: '#6E6A5C', padding: '20px 0' }}>
            Nenhuma resposta de pré-confirmação registrada ainda.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={adminTableStyle}>
              <thead>
                <tr>
                  <th style={adminThStyle}>Status</th>
                  <th style={adminThStyle}>Nomes</th>
                  <th style={adminThStyle}>Contato</th>
                  <th style={adminThStyle}>Recado</th>
                  <th style={adminThStyle}>Quando</th>
                  <th style={adminThStyle}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td style={adminTdStyle}>
                      {c.attending ? (
                        <Pill variant="success">vai ({c.party_size})</Pill>
                      ) : (
                        <Pill variant="danger">não vai</Pill>
                      )}
                    </td>
                    <td style={adminTdStyle}>
                      <ConfirmationPartyEditor
                        confirmationId={c.id}
                        attending={c.attending}
                        initialNames={c.names ?? []}
                      />
                    </td>
                    <td style={{ ...adminTdStyle, fontSize: 12, color: '#A9A492' }}>
                      {c.contact || '—'}
                    </td>
                    <td style={{ ...adminTdStyle, fontStyle: 'italic', fontSize: 13, maxWidth: 220 }}>
                      {c.message || '—'}
                    </td>
                    <td style={{ ...adminTdStyle, fontSize: 11, color: '#6E6A5C', whiteSpace: 'nowrap' }}>
                      {fmt.format(new Date(c.created_at))}
                    </td>
                    <td style={adminTdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        {c.attending && (
                          <form action={unconfirmFamily}>
                            <input type="hidden" name="id" value={c.id} />
                            <SubmitButton variant="outline" small>
                              desconfirmar
                            </SubmitButton>
                          </form>
                        )}
                        <form action={deleteConfirmation}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton variant="danger" small>
                            excluir
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
