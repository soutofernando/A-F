import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { cardChargeCentsFromGift, maxCardInstallments } from '@/lib/card-fee';
import { mercadoPagoDeviceId } from '@/lib/mp-device-id';
import { createAdminClient } from '@/lib/supabase/admin';

const HOLD_MS = 5 * 60 * 1000;

export type CardCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export type PaymentNotice = 'approved' | 'pending' | 'failure' | 'conflict';

type SyncOptions = { revalidate?: boolean };

function revalidateGiftPaths(giftId: string) {
  revalidatePath('/presentes');
  revalidatePath(`/presentes/${giftId}`);
  revalidatePath('/');
  revalidatePath('/admin/presentes');
}

type PreferenceResponse = {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
  error?: string;
};

type PaymentResponse = {
  id?: number | string;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
};

const centsToUnitPrice = (cents: number) => Number((cents / 100).toFixed(2));

const giftPictureUrl = (images: { storage_path: string } | { storage_path: string }[] | null) => {
  const image = Array.isArray(images) ? images[0] : images;
  const path = image?.storage_path?.trim();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!path || !base?.startsWith('https://')) return undefined;
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/photos/${encoded}`;
};

export async function siteOrigin() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  if (!host) {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alicia-fernando.vercel.app').replace(/\/$/, '');
  }
  const proto =
    headerStore.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

const isCheckoutUrl = (value: string) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === 'https:' &&
      (host === 'mercadopago.com' ||
        host === 'mercadopago.com.br' ||
        host.endsWith('.mercadopago.com') ||
        host.endsWith('.mercadopago.com.br'))
    );
  } catch {
    return false;
  }
};

const paymentNotice = (status: string | undefined): PaymentNotice | null => {
  if (status === 'approved') return 'approved';
  if (status === 'pending' || status === 'in_process') return 'pending';
  if (status === 'conflict') return 'conflict';
  if (status === 'released' || status === 'rejected' || status === 'cancelled') return 'failure';
  return null;
};

export function cardCheckoutConfigured() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export async function startCardCheckout(input: {
  giftId: string;
  giverName: string;
  deviceId?: string | null;
}): Promise<CardCheckoutResult> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    return { ok: false, message: 'O pagamento no cartão ainda não está disponível.' };
  }

  const giverName = input.giverName.trim();
  if (giverName.length < 2) {
    return { ok: false, message: 'Escreva o nome de quem está dando o presente.' };
  }

  const admin = createAdminClient();
  const { data: giftRow, error: giftError } = await admin
    .from('gifts')
    .select('price_cents, images(storage_path)')
    .eq('id', input.giftId)
    .maybeSingle();
  if (giftError || giftRow?.price_cents == null || giftRow.price_cents <= 0) {
    return { ok: false, message: 'Este presente não tem um valor fechado para o cartão.' };
  }

  const chargeCents = cardChargeCentsFromGift(giftRow.price_cents);
  const { data, error } = await admin.rpc('reserve_gift_card', {
    p_gift_id: input.giftId,
    p_giver_name: giverName,
    p_charge_cents: chargeCents,
  });

  const reserved = (Array.isArray(data) ? data[0] : data) as {
    payment_id: string;
    amount_cents: number;
    title: string;
  } | null;
  if (error || !reserved?.payment_id) {
    const raw = (error?.message ?? '').toLowerCase();
    if (raw.includes('unavailable')) {
      return { ok: false, message: 'Este presente acabou de ser escolhido por outra pessoa.' };
    }
    if (raw.includes('price')) {
      return { ok: false, message: 'Este presente não tem um valor fechado para o cartão.' };
    }
    if (raw.includes('disabled')) {
      return { ok: false, message: 'Este presente não aceita cartão.' };
    }
    if (raw.includes('invalid charge')) {
      return { ok: false, message: 'Não foi possível calcular o valor do cartão. Tente de novo ou avise os noivos.' };
    }
    if (raw.includes('invalid name')) {
      return { ok: false, message: 'Escreva o nome de quem está dando o presente.' };
    }
    return { ok: false, message: 'Não foi possível abrir o pagamento. Tente de novo.' };
  }

  const origin = await siteOrigin();
  const backUrl = `${origin}/api/mercadopago/return?gift=${input.giftId}`;
  const expiresAt = new Date(Date.now() + HOLD_MS).toISOString();
  const pictureUrl = giftPictureUrl(
    (giftRow as { images?: { storage_path: string } | { storage_path: string }[] | null }).images ?? null,
  );
  const preference: Record<string, unknown> = {
    items: [
      {
        id: input.giftId,
        title: `Presente · ${reserved.title}`.slice(0, 120),
        description: 'Lista de presentes de Alicia e Fernando',
        category_id: 'others',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: centsToUnitPrice(reserved.amount_cents),
        ...(pictureUrl ? { picture_url: pictureUrl } : {}),
      },
    ],
    back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
    external_reference: reserved.payment_id,
    notification_url: `${origin}/api/mercadopago/webhook`,
    payment_methods: {
      installments: maxCardInstallments(),
      default_installments: 1,
      excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }],
    },
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: expiresAt,
    metadata: { gift_id: input.giftId },
  };

  if (origin.startsWith('https://')) {
    preference.auto_return = 'approved';
  }

  const release = () => admin.rpc('release_gift_card', { p_payment_id: reserved.payment_id });

  const deviceId = mercadoPagoDeviceId(input.deviceId);
  let response: Response;
  try {
    response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': reserved.payment_id,
        ...(deviceId ? { 'X-meli-session-id': deviceId } : {}),
      },
      body: JSON.stringify(preference),
    });
  } catch {
    await release();
    return { ok: false, message: 'Não foi possível falar com o Mercado Pago. Tente de novo.' };
  }

  const body = (await response.json().catch(() => null)) as PreferenceResponse | null;
  const checkoutUrl = token.startsWith('TEST-') ? body?.sandbox_init_point : body?.init_point;
  if (!response.ok || !body?.id || !checkoutUrl || !isCheckoutUrl(checkoutUrl)) {
    await release();
    return { ok: false, message: 'O Mercado Pago não abriu o pagamento. Tente de novo.' };
  }

  await admin.rpc('attach_gift_card_preference', {
    p_payment_id: reserved.payment_id,
    p_preference_id: body.id,
  });

  revalidatePath('/presentes');
  revalidatePath(`/presentes/${input.giftId}`);
  revalidatePath('/');
  return { ok: true, url: checkoutUrl };
}

export async function syncMercadoPagoPayment(
  mpPaymentId: string,
  expectedGiftId?: string,
  options: SyncOptions = {},
): Promise<PaymentNotice | null> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token || !/^\d+$/.test(mpPaymentId)) return null;

  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const payment = (await response.json()) as PaymentResponse;
  const reference = payment.external_reference ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(reference)) return null;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const { data: row } = await admin
    .from('gift_payments')
    .select('id, gift_id, amount_cents')
    .eq('id', reference)
    .maybeSingle();

  if (!row) return null;
  if (expectedGiftId && row.gift_id !== expectedGiftId) return null;

  const paidCents = Math.round(Number(payment.transaction_amount) * 100);
  if (!Number.isFinite(paidCents) || paidCents !== row.amount_cents || payment.currency_id !== 'BRL') {
    return 'conflict';
  }

  const { data: status, error } = await admin.rpc('apply_gift_card_payment', {
    p_payment_id: row.id,
    p_mp_payment_id: String(payment.id ?? mpPaymentId),
    p_status: payment.status ?? '',
  });
  if (error || typeof status !== 'string') return null;

  if (options.revalidate !== false) {
    revalidateGiftPaths(row.gift_id);
  }
  return paymentNotice(status);
}

export async function releaseCardCheckout(paymentId: string, giftId: string, options: SyncOptions = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) return;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const { data: row } = await admin
    .from('gift_payments')
    .select('id, gift_id, status')
    .eq('id', paymentId)
    .maybeSingle();
  if (!row || row.gift_id !== giftId || row.status !== 'pending') return;
  await admin.rpc('release_gift_card', { p_payment_id: paymentId });
  if (options.revalidate !== false) {
    revalidateGiftPaths(giftId);
  }
}

export async function resolveMercadoPagoReturn(input: {
  giftId: string;
  paymentId: string;
  status: string;
  externalReference: string;
}): Promise<PaymentNotice | null> {
  const { giftId, paymentId, status, externalReference } = input;
  if (!/^[0-9a-f-]{36}$/i.test(giftId)) return null;

  if (/^\d+$/.test(paymentId)) {
    const notice = await syncMercadoPagoPayment(paymentId, giftId, { revalidate: true });
    if (notice) return notice;
    if (status === 'approved') return 'approved';
    if (status === 'pending' || status === 'in_process') return 'pending';
    if (status === 'failure' || status === 'rejected' || status === 'cancelled') return 'failure';
    return null;
  }

  if (/^[0-9a-f-]{36}$/i.test(externalReference) && (status === 'failure' || status === 'rejected')) {
    await releaseCardCheckout(externalReference, giftId, { revalidate: true });
    return 'failure';
  }

  return null;
}

export function verifyMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  if (!input.signature || !input.requestId || !input.dataId) return false;

  const parts = Object.fromEntries(
    input.signature.split(',').map((part) => {
      const index = part.indexOf('=');
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const dataId = /^[a-zA-Z0-9]+$/.test(input.dataId) ? input.dataId.toLowerCase() : input.dataId;
  const manifest = `id:${dataId};request-id:${input.requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const actual = Buffer.from(v1);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}
