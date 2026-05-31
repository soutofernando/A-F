import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader, Pill, Stat, SubmitButton } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

async function setApproved(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const approved = formData.get('approved') === '1';
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('messages').update({ approved }).eq('id', id);
  revalidatePath('/admin/recados');
  revalidatePath('/mensagens');
}

async function deleteMessage(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('messages').delete().eq('id', id);
  revalidatePath('/admin/recados');
  revalidatePath('/mensagens');
}

type Msg = {
  id: string;
  guest_name: string;
  body: string;
  approved: boolean | null;
  created_at: string;
};

const fmt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export default async function RecadosPage() {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from('messages')
    .select('id, guest_name, body, approved, created_at')
    .order('created_at', { ascending: false });

  const list = (messages ?? []) as Msg[];
  const pending = list.filter((m) => !m.approved);
  const approved = list.filter((m) => m.approved);

  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader
        kicker="RECADOS"
        title="moderação de mensagens"
        subtitle="Recados só aparecem na página pública /mensagens depois de aprovados."
      />

      <div
        className="admin-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Stat label="Pendentes" value={pending.length} meta={pending.length ? 'aguardando moderação' : 'caixa de entrada limpa'} />
        <Stat label="Aprovados" value={approved.length} meta={approved.length ? 'visíveis no site' : '—'} />
        <Stat label="Total" value={list.length} />
      </div>

      <Card title={pending.length ? `Pendentes (${pending.length})` : 'Pendentes'} subtitle="Aprove ou exclua antes de aparecerem no site público.">
        {pending.length === 0 ? (
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Tudo limpo — nada para moderar.
          </div>
        ) : (
          <div className="admin-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((m) => (
              <MessageBlock key={m.id} m={m} approveTo />
            ))}
          </div>
        )}
      </Card>

      <Card title={`Aprovados (${approved.length})`}>
        {approved.length === 0 ? (
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Nenhum recado aprovado ainda.
          </div>
        ) : (
          <div className="admin-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {approved.map((m) => (
              <MessageBlock key={m.id} m={m} approveTo={false} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MessageBlock({ m, approveTo }: { m: Msg; approveTo: boolean }) {
  return (
    <div
      className="admin-card"
      style={{
        border: '1px solid rgba(239,231,219,.12)',
        background: '#0E0B09',
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="serif" style={{ fontSize: 17, color: 'var(--cream)' }}>
            {m.guest_name}
          </div>
          {m.approved ? <Pill variant="success">aprovado</Pill> : <Pill variant="muted">pendente</Pill>}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(239,231,219,.45)', letterSpacing: '.18em' }}>
          {fmt.format(new Date(m.created_at))}
        </div>
      </div>
      <div
        className="italic"
        style={{
          fontSize: 14,
          color: 'rgba(239,231,219,.85)',
          lineHeight: 1.65,
          padding: '12px 16px',
          borderLeft: '2px solid rgba(212,175,122,.4)',
          background: 'rgba(212,175,122,.03)',
        }}
      >
        “{m.body}”
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <form action={setApproved} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="approved" value={approveTo ? '1' : '0'} />
          <SubmitButton variant={approveTo ? 'gold' : 'outline'} small>
            {approveTo ? '✓ aprovar' : '↺ remover aprovação'}
          </SubmitButton>
        </form>
        <form action={deleteMessage} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={m.id} />
          <SubmitButton variant="danger" small>
            excluir
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
