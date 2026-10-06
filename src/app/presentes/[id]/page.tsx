import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { GiftClaim } from '@/components/home/GiftClaim';
import { buildPixPayload, describePixKey } from '@/lib/pix-brcode';
import {
  cardCheckoutConfigured,
  releaseCardCheckout,
  syncMercadoPagoPayment,
  type PaymentNotice,
} from '@/lib/mercadopago';
import { cardChargeCentsFromGift, cardCheckoutFeeNote, formatBrlFromCents, maxCardInstallments } from '@/lib/card-fee';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type GiftRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  pix_enabled: boolean | null;
  card_enabled: boolean | null;
  delivery_enabled: boolean | null;
  taken_by_name: string | null;
  card_hold_until: string | null;
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

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export default async function GiftDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const card = one(query.card);
  const paymentId = one(query.payment_id) || one(query.collection_id);
  const status = one(query.status) || one(query.collection_status);
  const externalReference = one(query.external_reference);

  let paymentNotice: PaymentNotice | null = null;
  if (card === 'approved' || card === 'pending' || card === 'failure' || card === 'conflict') {
    paymentNotice = card;
  } else if (/^\d+$/.test(paymentId)) {
    // Links antigos do Mercado Pago que ainda apontam direto para /presentes/[id]
    paymentNotice = await syncMercadoPagoPayment(paymentId, id, { revalidate: false });
    if (!paymentNotice && status === 'approved') paymentNotice = 'approved';
  } else if (/^[0-9a-f-]{36}$/i.test(externalReference) && (status === 'failure' || status === 'rejected')) {
    await releaseCardCheckout(externalReference, id, { revalidate: false });
    paymentNotice = 'failure';
  }

  const supabase = await createClient();
  const [{ data: gift }, { data: config }, { data: addresses }] = await Promise.all([
    supabase
      .from('gifts')
      .select('id, title, description, category, price_cents, pix_enabled, card_enabled, delivery_enabled, taken_by_name, card_hold_until, images(storage_path, alt)')
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
  const pixKey = describePixKey(settings.get('pix_key') ?? '');
  const payload =
    row.pix_enabled && pixKey
      ? buildPixPayload({
          key: pixKey.emv,
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

  const held = Boolean(row.card_hold_until && new Date(row.card_hold_until).getTime() > Date.now());
  const cardEnabled =
    Boolean(row.card_enabled) &&
    row.price_cents != null &&
    row.price_cents > 0 &&
    cardCheckoutConfigured();
  const cardChargeLabel =
    cardEnabled && row.price_cents != null
      ? formatBrlFromCents(cardChargeCentsFromGift(row.price_cents))
      : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 88 }}>
      <GiftClaim
        gift={{
          id: row.id,
          title: row.title,
          category: row.category,
          priceLabel: formatPrice(row.price_cents),
          cardChargeLabel,
          cardFeeNote: cardCheckoutFeeNote(),
          cardMaxInstallments: maxCardInstallments(),
          imageUrl: image?.storage_path ? `${baseUrl}/storage/v1/object/public/photos/${image.storage_path}` : null,
          pixEnabled: Boolean(row.pix_enabled),
          cardEnabled,
          deliveryEnabled: row.delivery_enabled !== false,
          taken: Boolean(row.taken_by_name),
          held,
          takenName: row.taken_by_name,
        }}
        pix={
          row.pix_enabled
            ? {
                bank: settings.get('pix_bank')?.trim() ?? '',
                holder: settings.get('pix_holder')?.trim() ?? '',
                payload,
                qrDataUrl,
                keyLabel: pixKey?.phone ? pixKey.label : null,
                keyCopy: pixKey?.phone ? pixKey.copy : null,
              }
            : null
        }
        addresses={((addresses ?? []) as AddressRow[]).map((address) => ({
          id: address.id,
          label: address.label,
          recipient: address.recipient,
          line: address.address_line,
        }))}
        paymentNotice={paymentNotice}
      />
    </div>
  );
}
