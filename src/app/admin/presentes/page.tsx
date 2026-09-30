import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  Checkbox,
  Field,
  FileField,
  PageHeader,
  SelectField,
  Stat,
  SubmitButton,
  TextField,
} from '@/components/admin/ui';
import { AdminGiftsList } from '@/components/admin/AdminGiftsList';
import { resolveGiftImageIdFromForm } from '@/lib/admin/upload-presentes-image';
import { GIFT_CATEGORIES_PUBLIC_LABEL, GIFT_CATEGORY_IDS } from '@/lib/gift-categories';

export const dynamic = 'force-dynamic';

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

  const image_id = await resolveGiftImageIdFromForm(formData, title);

  const supabase = await createClient();
  await supabase.from('gifts').insert({
    title,
    category,
    description: String(formData.get('description') ?? '').trim() || null,
    price_cents: Number.isFinite(priceCents) ? priceCents : null,
    image_id,
    pix_enabled: formData.get('pix_enabled') === 'on',
    card_enabled: formData.get('card_enabled') === 'on',
    display_order: Number(formData.get('display_order') ?? 0) || 0,
  });
  revalidatePath('/admin/presentes');
  revalidatePath('/presentes');
  revalidatePath('/');
  revalidatePath('/admin/imagens');
}

async function deleteGift(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('gifts').delete().eq('id', id);
  revalidatePath('/admin/presentes');
  revalidatePath('/presentes');
  revalidatePath('/');
}

async function clearTakenBy(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = await createClient();
  await supabase.from('gifts').update({
    taken_by_name: null,
    taken_at: null,
    claim_method: null,
    claim_address_id: null,
    claim_address_text: null,
    card_hold_until: null,
  }).eq('id', id);
  await supabase.from('gift_payments').update({ status: 'cancelled' }).eq('gift_id', id).eq('status', 'pending');
  revalidatePath('/admin/presentes');
  revalidatePath('/presentes');
  revalidatePath('/');
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
  claim_method: string | null;
  claim_address_text: string | null;
};

type Image = { id: string; alt: string | null; storage_path: string; context: string };

export default async function PresentesPage() {
  const supabase = await createClient();
  const [{ data: gifts }, { data: images }] = await Promise.all([
    supabase
      .from('gifts')
      .select('id, title, description, category, price_cents, image_id, pix_enabled, card_enabled, display_order, taken_by_name, claim_method, claim_address_text')
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

  const presentesImages = imgList.filter((img) => img.context === 'presentes');
  const imageOptions = [
    { value: '', label: '— sem imagem —' },
    ...presentesImages.map((img) => ({
      value: img.id,
      label: img.alt ?? img.storage_path,
    })),
  ];

  return (
    <div style={{ maxWidth: 1080 }}>
      <PageHeader
        kicker="PRESENTES"
        title="lista de presentes"
        subtitle={`Categorias visíveis no site público: ${GIFT_CATEGORIES_PUBLIC_LABEL}.`}
      />

      <p style={{ margin: '0 0 24px', fontSize: 13 }}>
        <Link href="/admin/presentes/import" className="admin-btn" style={{ color: 'var(--gold-soft)', textDecoration: 'none' }}>
          importar vários de uma vez (planilha / CSV) →
        </Link>
      </p>

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
              options={GIFT_CATEGORY_IDS}
              defaultValue="Casa"
              required
            />
            <Field label="Preço (R$)" name="price" placeholder="299,90" />
            <Field label="Ordem de exibição" name="display_order" type="number" defaultValue={0} />
          </div>

          <FileField
            label="Foto do presente"
            name="file"
            hint="JPG, PNG ou WebP. Enviada para a galeria (contexto presentes) e vinculada a este item."
          />
          <Field
            label="Texto da foto (opcional)"
            name="image_alt"
            placeholder="Se vazio, usa o título do presente"
          />
          {presentesImages.length > 0 ? (
            <SelectField
              label="Ou escolher foto já enviada"
              name="image_id"
              options={imageOptions}
              hint="Ignorado se você enviar um arquivo novo acima."
            />
          ) : (
            <input type="hidden" name="image_id" value="" />
          )}

          <TextField label="Descrição (opcional)" name="description" rows={2} />

          <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
            <Checkbox label="Aceita PIX" name="pix_enabled" defaultChecked />
            <Checkbox label="Aceita cartão" name="card_enabled" defaultChecked />
          </div>

          <div>
            <SubmitButton variant="gold">adicionar presente</SubmitButton>
          </div>
        </form>
      </Card>

      <Card title={`Cadastrados (${list.length})`}>
        <AdminGiftsList
          items={list.map((g) => {
            const img = g.image_id ? imgById.get(g.image_id) : null;
            const imgUrl = img ? `${baseUrl}/storage/v1/object/public/photos/${img.storage_path}` : null;
            return {
              id: g.id,
              title: g.title,
              description: g.description,
              category: g.category,
              priceLabel: formatBRL(g.price_cents),
              imgUrl,
              taken_by_name: g.taken_by_name,
              claim_method: g.claim_method,
              pix_enabled: g.pix_enabled,
              card_enabled: g.card_enabled,
            };
          })}
          deleteGift={deleteGift}
          clearTakenBy={clearTakenBy}
        />
      </Card>
    </div>
  );
}
