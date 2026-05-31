import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  Checkbox,
  Field,
  PageHeader,
  Pill,
  SelectField,
  Stat,
  SubmitButton,
  TextField,
} from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

const GIFT_CATEGORIES = ['Casa', 'Cozinha', 'Lua de mel', 'Pix'] as const;

const formatBRL = (cents: number | null | undefined) => {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

async function createGift(formData: FormData) {
  'use server';
  const title = String(formData.get('title') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  if (!title || !category) return;

  const priceReais = String(formData.get('price') ?? '').replace(',', '.').trim();
  const priceCents = priceReais ? Math.round(parseFloat(priceReais) * 100) : null;

  const supabase = await createClient();
  await supabase.from('gifts').insert({
    title,
    category,
    description: String(formData.get('description') ?? '').trim() || null,
    price_cents: Number.isFinite(priceCents) ? priceCents : null,
    image_id: String(formData.get('image_id') ?? '') || null,
    pix_enabled: formData.get('pix_enabled') === 'on',
    card_enabled: formData.get('card_enabled') === 'on',
    display_order: Number(formData.get('display_order') ?? 0) || 0,
  });
  revalidatePath('/admin/presentes');
}

async function deleteGift(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('gifts').delete().eq('id', id);
  revalidatePath('/admin/presentes');
}

async function clearTakenBy(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('gifts').update({ taken_by_name: null, taken_at: null }).eq('id', id);
  revalidatePath('/admin/presentes');
}

type Gift = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  image_id: string | null;
  pix_enabled: boolean | null;
  card_enabled: boolean | null;
  display_order: number | null;
  taken_by_name: string | null;
};

type Image = { id: string; alt: string | null; storage_path: string; context: string };

export default async function PresentesPage() {
  const supabase = await createClient();
  const [{ data: gifts }, { data: images }] = await Promise.all([
    supabase
      .from('gifts')
      .select('id, title, description, category, price_cents, image_id, pix_enabled, card_enabled, display_order, taken_by_name')
      .order('display_order')
      .order('title'),
    supabase.from('images').select('id, alt, storage_path, context').order('alt'),
  ]);

  const list = (gifts ?? []) as Gift[];
  const imgList = (images ?? []) as Image[];
  const imgById = new Map(imgList.map((i) => [i.id, i]));
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

  const taken = list.filter((g) => g.taken_by_name).length;
  const totalValue = list.reduce((sum, g) => sum + (g.price_cents ?? 0), 0);

  const imageOptions = [
    { value: '', label: '— sem imagem —' },
    ...imgList.map((img) => ({
      value: img.id,
      label: `[${img.context}] ${img.alt ?? img.storage_path}`,
    })),
  ];

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader
        kicker="PRESENTES"
        title="lista de presentes"
        subtitle="Categorias visíveis no site público: Casa · Cozinha · Lua de mel · PIX."
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
        <Stat label="Itens na lista" value={list.length} meta={`${list.length - taken} livre(s)`} />
        <Stat label="Reservados" value={taken} meta={taken > 0 ? 'aguardando confirmação' : 'nenhum ainda'} />
        <Stat label="Valor total" value={formatBRL(totalValue)} />
      </div>

      <Card title="Adicionar presente">
        <form action={createGift} style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Título" name="title" required placeholder="Jogo de panelas de cobre" />
            <SelectField
              label="Categoria"
              name="category"
              options={GIFT_CATEGORIES}
              defaultValue="Casa"
              required
            />
            <Field label="Preço (R$)" name="price" placeholder="299,90" />
            <Field label="Ordem de exibição" name="display_order" type="number" defaultValue={0} />
          </div>

          <SelectField label="Imagem (opcional)" name="image_id" options={imageOptions} />

          <TextField label="Descrição (opcional)" name="description" rows={2} />

          <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
            <Checkbox label="Aceita PIX" name="pix_enabled" defaultChecked />
            <Checkbox label="Aceita cartão" name="card_enabled" />
          </div>

          <div>
            <SubmitButton variant="gold">adicionar presente</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title={`Cadastrados (${list.length})`}>
        {list.length === 0 ? (
          <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
            Nenhum presente ainda — adicione o primeiro acima.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {list.map((g) => {
              const img = g.image_id ? imgById.get(g.image_id) : null;
              const imgUrl = img ? `${baseUrl}/storage/v1/object/public/photos/${img.storage_path}` : null;
              return (
                <div
                  key={g.id}
                  className="admin-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid rgba(239,231,219,.1)',
                    background: '#0E0B09',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      background: imgUrl ? `url(${imgUrl}) center/cover` : '#141110',
                      border: '1px solid rgba(239,231,219,.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: 'rgba(239,231,219,.3)',
                      letterSpacing: '.15em',
                    }}
                  >
                    {!imgUrl && 'SEM IMG'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="serif" style={{ fontSize: 17, fontWeight: 400 }}>
                        {g.title}
                      </span>
                      <Pill variant="gold">{g.category}</Pill>
                      {g.taken_by_name ? (
                        <Pill variant="success">reservado · {g.taken_by_name}</Pill>
                      ) : null}
                    </div>
                    {g.description && (
                      <div
                        className="italic"
                        style={{
                          fontSize: 12,
                          color: 'rgba(239,231,219,.5)',
                          marginTop: 4,
                          lineHeight: 1.45,
                        }}
                      >
                        {g.description.length > 90 ? `${g.description.slice(0, 90)}…` : g.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'rgba(239,231,219,.45)', marginTop: 6, letterSpacing: '.1em' }}>
                      {g.pix_enabled && 'PIX'}
                      {g.pix_enabled && g.card_enabled && ' · '}
                      {g.card_enabled && 'CARTÃO'}
                      {!g.pix_enabled && !g.card_enabled && 'sem pagamento'}
                    </div>
                  </div>

                  <div
                    className="serif"
                    style={{ fontSize: 18, fontWeight: 400, color: 'var(--gold-soft)', whiteSpace: 'nowrap' }}
                  >
                    {formatBRL(g.price_cents)}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
                    {g.taken_by_name && (
                      <form action={clearTakenBy} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={g.id} />
                        <SubmitButton variant="outline" small>
                          liberar
                        </SubmitButton>
                      </form>
                    )}
                    <Link
                      href={`/admin/presentes/${g.id}`}
                      className="admin-btn"
                      style={{
                        color: 'var(--gold-soft)',
                        fontSize: 10,
                        letterSpacing: '.22em',
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        padding: '6px 14px',
                        border: '1px solid rgba(212,175,122,.4)',
                      }}
                    >
                      editar
                    </Link>
                    <form action={deleteGift} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={g.id} />
                      <SubmitButton variant="danger" small>
                        ✕
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
