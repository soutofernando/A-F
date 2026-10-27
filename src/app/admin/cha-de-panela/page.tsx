import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminDb } from '@/lib/admin/require-admin';
import { Card, PageHeader, Pill, Stat, SubmitButton } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

async function releaseItem(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await adminDb();
  if (!supabase) return;
  await supabase.rpc('release_panela_item', { p_item_id: id });
  revalidatePath('/admin/cha-de-panela');
  revalidatePath('/cha-de-panela');
}

type Item = {
  id: string;
  name: string;
  display_order: number;
  claimed: boolean;
};

type Claim = {
  item_id: string;
  giver_name: string;
  created_at: string;
};

const fmt = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export default async function AdminChaDePanelaPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: claims }] = await Promise.all([
    supabase.from('panela_items').select('id, name, display_order, claimed').order('display_order', { ascending: true }),
    supabase.from('panela_claims').select('item_id, giver_name, created_at'),
  ]);

  const list = (items ?? []) as Item[];
  const byItem = new Map(((claims ?? []) as Claim[]).map((claim) => [claim.item_id, claim]));
  const taken = list.filter((item) => item.claimed).length;

  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader
        kicker="CHÁ DE PANELA"
        title="quem vai dar"
        subtitle="Na página pública o item só aparece riscado. O nome fica aqui."
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
        <Stat label="Escolhidos" value={taken} meta={taken ? 'já têm nome' : 'ninguém escolheu ainda'} />
        <Stat label="Livres" value={list.length - taken} />
        <Stat label="Total" value={list.length} />
      </div>

      <Card title="Lista" subtitle="Liberar devolve o item para a lista pública.">
        {list.length === 0 ? (
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Nenhum item na lista.
          </div>
        ) : (
          <div className="admin-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((item) => {
              const claim = byItem.get(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                    padding: '14px 16px',
                    background: '#0E0B09',
                    border: '1px solid rgba(239,231,219,.12)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="serif" style={{ fontSize: 18, lineHeight: 1.3 }}>
                      {item.name}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {claim ? (
                        <>
                          <Pill variant="success">{claim.giver_name}</Pill>
                          <span style={{ fontSize: 12, color: 'rgba(239,231,219,.45)' }}>
                            {fmt.format(new Date(claim.created_at))}
                          </span>
                        </>
                      ) : (
                        <Pill variant="muted">livre</Pill>
                      )}
                    </div>
                  </div>
                  {item.claimed ? (
                    <form action={releaseItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton variant="outline" small>
                        liberar
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
