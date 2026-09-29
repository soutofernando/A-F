import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  Checkbox,
  Field,
  FileField,
  PageHeader,
  SelectField,
  SubmitButton,
  TextField,
} from '@/components/admin/ui';
import { resolveGiftImageIdFromForm } from '@/lib/admin/upload-presentes-image';
import { GIFT_CATEGORY_IDS } from '@/lib/gift-categories';

export const dynamic = 'force-dynamic';

async function updateGift(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const title = String(formData.get('title') ?? '').trim();
  const priceReais = String(formData.get('price') ?? '').replace(',', '.').trim();
  const priceCents = priceReais ? Math.round(parseFloat(priceReais) * 100) : null;
  const image_id = await resolveGiftImageIdFromForm(formData, title);

  const supabase = await createClient();
  await supabase
    .from('gifts')
    .update({
      title,
      category: String(formData.get('category') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim() || null,
      price_cents: Number.isFinite(priceCents) ? priceCents : null,
      image_id,
      pix_enabled: formData.get('pix_enabled') === 'on',
      card_enabled: formData.get('card_enabled') === 'on',
      display_order: Number(formData.get('display_order') ?? 0) || 0,
    })
    .eq('id', id);
  revalidatePath('/admin/presentes');
  revalidatePath('/presentes');
  revalidatePath('/admin/imagens');
  redirect('/admin/presentes');
}

export default async function EditGiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: gift }, { data: images }] = await Promise.all([
    supabase.from('gifts').select('*').eq('id', id).maybeSingle(),
    supabase.from('images').select('id, alt, storage_path, context').order('alt'),
  ]);
  if (!gift) notFound();

  const imgList = (images ?? []) as Array<{ id: string; alt: string | null; storage_path: string; context: string }>;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const currentImage = gift.image_id ? imgList.find((img) => img.id === gift.image_id) : null;
  const currentImageUrl = currentImage
    ? `${baseUrl}/storage/v1/object/public/photos/${currentImage.storage_path}`
    : null;
  const priceReais = gift.price_cents != null ? (gift.price_cents / 100).toFixed(2) : '';

  const categoryOptions: Array<string> = [...GIFT_CATEGORY_IDS];
  if (gift.category && !categoryOptions.includes(gift.category)) {
    categoryOptions.push(`${gift.category}`);
  }

  const presentesImages = imgList.filter((img) => img.context === 'presentes');
  const imageOptions = [
    { value: '', label: '— sem imagem —' },
    ...presentesImages.map((img) => ({
      value: img.id,
      label: img.alt ?? img.storage_path,
    })),
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <PageHeader kicker="EDITAR PRESENTE" title={gift.title} />

      <Card>
        <form action={updateGift} encType="multipart/form-data" style={{ display: 'grid', gap: 16 }}>
          <input type="hidden" name="id" value={gift.id} />
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Field label="Título" name="title" defaultValue={gift.title} required />
            <SelectField
              label="Categoria"
              name="category"
              options={categoryOptions}
              defaultValue={gift.category ?? 'Casa'}
              required
            />
            <Field label="Preço (R$)" name="price" defaultValue={priceReais} placeholder="299,90" />
            <Field
              label="Ordem de exibição"
              name="display_order"
              type="number"
              defaultValue={gift.display_order ?? 0}
            />
          </div>

          {currentImageUrl ? (
            <div>
              <span style={{ display: 'block', fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(239,231,219,.55)', marginBottom: 7 }}>
                Foto atual
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageUrl}
                alt={currentImage?.alt ?? gift.title}
                style={{ width: 120, height: 120, objectFit: 'cover', border: '1px solid rgba(239,231,219,.12)' }}
              />
            </div>
          ) : null}

          <FileField
            label="Nova foto do presente"
            name="file"
            hint="Envie para substituir a foto atual. JPG, PNG ou WebP."
          />
          <Field label="Texto da foto (opcional)" name="image_alt" placeholder="Se vazio, usa o título" />

          <SelectField
            label="Ou escolher da galeria"
            name="image_id"
            options={imageOptions}
            defaultValue={gift.image_id ?? ''}
            hint="Usado se nenhum arquivo novo for enviado."
          />

          <TextField label="Descrição" name="description" defaultValue={gift.description} rows={3} />

          <div style={{ display: 'flex', gap: 24, padding: '4px 0' }}>
            <Checkbox label="Aceita PIX" name="pix_enabled" defaultChecked={gift.pix_enabled ?? false} />
            <Checkbox label="Aceita cartão" name="card_enabled" defaultChecked={gift.card_enabled ?? false} />
          </div>

          <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(239,231,219,.08)' }}>
            <SubmitButton variant="gold">salvar alterações</SubmitButton>
            <Link
              href="/admin/presentes"
              className="admin-btn"
              style={{
                color: 'rgba(239,231,219,.6)',
                fontSize: 11,
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                alignSelf: 'center',
                padding: '11px 16px',
              }}
            >
              voltar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
