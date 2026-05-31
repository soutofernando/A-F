import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  Field,
  PageHeader,
  Pill,
  Stat,
  SubmitButton,
  TextField,
  adminTableStyle,
  adminTdStyle,
  adminThStyle,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function createGuest(formData: FormData) {
  'use server';
  const display_name = String(formData.get('display_name') ?? '').trim();
  if (!display_name) return;

  const slugRaw = String(formData.get('slug') ?? '').trim();
  const slug = slugRaw ? slugify(slugRaw) : slugify(display_name);
  if (!slug) return;

  const supabase = await createClient();
  await supabase.from('guests').insert({
    slug,
    display_name,
    full_name: String(formData.get('full_name') ?? '').trim() || null,
    greeting: String(formData.get('greeting') ?? '').trim() || null,
    group_name: String(formData.get('group_name') ?? '').trim() || null,
    table_name: String(formData.get('table_name') ?? '').trim() || null,
    max_companions: Number(formData.get('max_companions') ?? 0) || 0,
  });
  revalidatePath('/admin/convidados');
}

async function deleteGuest(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('guests').delete().eq('id', id);
  revalidatePath('/admin/convidados');
}

type Guest = {
  id: string;
  slug: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
  table_name: string | null;
  max_companions: number | null;
};

type Rsvp = { guest_id: string; status: string; companions: number | null };

export default async function ConvidadosPage() {
  const supabase = await createClient();
  const [{ data: guests }, { data: rsvps }] = await Promise.all([
    supabase
      .from('guests')
      .select('id, slug, display_name, full_name, group_name, table_name, max_companions')
      .order('display_name'),
    supabase.from('rsvps').select('guest_id, status, companions'),
  ]);

  const rsvpByGuest = new Map<string, Rsvp>();
  (rsvps ?? []).forEach((r) => rsvpByGuest.set(r.guest_id, r));

  const list = (guests ?? []) as Guest[];
  const confirmed = list.filter((g) => rsvpByGuest.get(g.id)?.status === 'yes');
  const declined = list.filter((g) => rsvpByGuest.get(g.id)?.status === 'no');
  const pending = list.length - confirmed.length - declined.length;
  const totalSeats = confirmed.reduce(
    (sum, g) => sum + 1 + (rsvpByGuest.get(g.id)?.companions ?? 0),
    0,
  );

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader
        kicker="CONVIDADOS"
        title="lista de convidados"
        subtitle="Cadastre, organize por grupo e mesa, e acompanhe as confirmações."
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
        <Stat label="Total" value={list.length} meta={`${pending} aguardando`} />
        <Stat label="Confirmados" value={confirmed.length} meta={`${totalSeats} cadeira(s)`} />
        <Stat label="Recusaram" value={declined.length} />
      </div>

      <Card title="Adicionar convidado" subtitle="O slug (URL pessoal) é gerado a partir do nome — você pode editar depois.">
        <form action={createGuest} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Nome de exibição" name="display_name" required placeholder="Maria" />
            <Field label="Nome completo" name="full_name" placeholder="Maria Silva (opcional)" />
            <Field label="Grupo" name="group_name" placeholder="Família, Amigos…" />
            <Field label="Mesa" name="table_name" placeholder="Mesa 4" />
            <Field
              label="Máx. de acompanhantes"
              name="max_companions"
              type="number"
              min={0}
              defaultValue={0}
            />
            <Field label="Slug personalizado (opcional)" name="slug" placeholder="auto a partir do nome" />
          </div>
          <TextField label="Saudação personalizada (opcional)" name="greeting" rows={2} />
          <div>
            <SubmitButton variant="gold">adicionar convidado</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title={`Cadastrados (${list.length})`}>
        {list.length === 0 ? (
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Ninguém cadastrado ainda — adicione o primeiro convidado acima.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={adminTableStyle}>
              <thead>
                <tr>
                  <th style={adminThStyle}>Convidado</th>
                  <th style={adminThStyle}>Grupo · Mesa</th>
                  <th style={adminThStyle}>Acomp.</th>
                  <th style={adminThStyle}>Status</th>
                  <th style={adminThStyle}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((g) => {
                  const rsvp = rsvpByGuest.get(g.id);
                  return (
                    <tr key={g.id} className="admin-row">
                      <td style={adminTdStyle}>
                        <div style={{ fontWeight: 500 }}>{g.display_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(239,231,219,.4)', marginTop: 2, fontFamily: 'monospace' }}>
                          /convidado/{g.slug}
                        </div>
                      </td>
                      <td style={adminTdStyle}>
                        {g.group_name ?? <span style={{ color: 'rgba(239,231,219,.35)' }}>—</span>}
                        {g.table_name && (
                          <div style={{ fontSize: 11, color: 'rgba(239,231,219,.5)', marginTop: 2 }}>
                            {g.table_name}
                          </div>
                        )}
                      </td>
                      <td style={adminTdStyle}>{g.max_companions ?? 0}</td>
                      <td style={adminTdStyle}>
                        {rsvp ? (
                          rsvp.status === 'yes' ? (
                            <Pill variant="success">confirmado +{rsvp.companions ?? 0}</Pill>
                          ) : (
                            <Pill variant="danger">recusou</Pill>
                          )
                        ) : (
                          <Pill variant="muted">aguardando</Pill>
                        )}
                      </td>
                      <td style={{ ...adminTdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link
                          href={`/admin/convidados/${g.id}`}
                          style={{
                            color: 'var(--gold-soft)',
                            fontSize: 11,
                            letterSpacing: '.22em',
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                            marginRight: 16,
                          }}
                        >
                          editar
                        </Link>
                        <form action={deleteGuest} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={g.id} />
                          <SubmitButton variant="danger" small>
                            excluir
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
