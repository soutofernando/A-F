import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
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

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        kicker="PRÉ-CONFIRMAÇÃO"
        title="confirmações das famílias"
        subtitle="Respostas enviadas pela página pública /confirmar — onde cada família digita os próprios nomes."
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
        <Stat label="Pessoas confirmadas" value={totalPeople} meta="somando acompanhantes" />
        <Stat label="Crianças" value={totalChildren} meta="entre os confirmados" />
        <Stat label="Respostas no total" value={list.length} />
      </div>

      <Card title="Todas as respostas" subtitle="Mais recentes primeiro.">
        {list.length === 0 ? (
          <div style={{ fontStyle: 'italic', color: '#6E6A5C', padding: '20px 0' }}>
            Nenhuma confirmação ainda. Envie o link /confirmar para as famílias.
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
                      {(c.names ?? []).length === 0 ? (
                        <span style={{ color: '#6E6A5C' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(c.names ?? []).map((n, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 12,
                                padding: '3px 9px',
                                borderRadius: 999,
                                border: '1px solid rgba(239,231,219,.15)',
                                background:
                                  n.kind === 'child' ? 'rgba(212,175,122,.16)' : 'rgba(239,231,219,.05)',
                                color: n.kind === 'child' ? '#E8C58A' : 'inherit',
                              }}
                            >
                              {n.kind === 'child' ? '✿ ' : ''}
                              {n.name}
                            </span>
                          ))}
                        </div>
                      )}
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
                      <form action={deleteConfirmation}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton variant="danger" small>
                          excluir
                        </SubmitButton>
                      </form>
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
