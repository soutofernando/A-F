import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { GiftClaim } from '@/components/home/GiftClaim';
import { buildPixPayload } from '@/lib/pix-brcode';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type GiftRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  pix_enabled: boolean | null;
  taken_by_name: string | null;
  images: { storage_path: string; alt: string | null } | { storage_path: string; alt: string | null }[] | null;
};

type AddressRow = {
  id: string;
  label: string;
  recipient: string | null;
  address_line: string;
};

const formatPrice = (cents: number | null) => {
  if (cents == null) return 'valor livre';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const imageOf = (images: GiftRow['images']) => {
  if (!images) return null;
  return Array.isArray(images) ? images[0] ?? null : images;
};

export default async function GiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: gift }, { data: config }, { data: addresses }] = await Promise.all([
    supabase
      .from('gifts')
      .select('id, title, description, category, price_cents, pix_enabled, taken_by_name, images(storage_path, alt)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('config').select('key, value').in('key', ['pix_key', 'pix_bank', 'pix_holder']),
    supabase
      .from('gift_addresses')
      .select('id, label, recipient, address_line')
      .order('display_order')
      .order('label'),
  ]);

  if (!gift) notFound();
  const row = gift as GiftRow;
  const settings = new Map((config ?? []).map((item) => [item.key, item.value ?? '']));
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const image = imageOf(row.images);
  const pixKey = settings.get('pix_key')?.trim() ?? '';
  const payload =
    row.pix_enabled && pixKey
      ? buildPixPayload({
          key: pixKey,
          holder: settings.get('pix_holder')?.trim() || 'Alicia e Fernando',
          amountCents: row.price_cents,
          reference: row.id.replace(/-/g, '').slice(0, 20),
        })
      : null;
  const qrDataUrl = payload
    ? await QRCode.toDataURL(payload, {
        margin: 1,
        width: 280,
        color: { dark: '#173B66', light: '#ffffff' },
      })
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 88 }}>
      <GiftClaim
        gift={{
          id: row.id,
          title: row.title,
          category: row.category,
          priceLabel: formatPrice(row.price_cents),
          imageUrl: image?.storage_path ? `${baseUrl}/storage/v1/object/public/photos/${image.storage_path}` : null,
          pixEnabled: Boolean(row.pix_enabled),
          taken: Boolean(row.taken_by_name),
        }}
        pix={
          row.pix_enabled
            ? {
                bank: settings.get('pix_bank')?.trim() ?? '',
                holder: settings.get('pix_holder')?.trim() ?? '',
                payload,
                qrDataUrl,
              }
            : null
        }
        addresses={((addresses ?? []) as AddressRow[]).map((address) => ({
          id: address.id,
          label: address.label,
          recipient: address.recipient,
          line: address.address_line,
        }))}
      />
    </div>
  );
}
