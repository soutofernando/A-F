import { NextResponse } from 'next/server';
import { resolveMercadoPagoReturn } from '@/lib/mercadopago';

export const runtime = 'nodejs';

const one = (value: string | null) => value?.trim() ?? '';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const giftId = one(url.searchParams.get('gift'));
  const paymentId = one(url.searchParams.get('payment_id')) || one(url.searchParams.get('collection_id'));
  const status =
    one(url.searchParams.get('status')) || one(url.searchParams.get('collection_status'));
  const externalReference = one(url.searchParams.get('external_reference'));

  if (!/^[0-9a-f-]{36}$/i.test(giftId)) {
    return NextResponse.redirect(new URL('/presentes', url.origin));
  }

  const notice = await resolveMercadoPagoReturn({
    giftId,
    paymentId,
    status,
    externalReference,
  });

  const params = new URLSearchParams();
  if (notice) params.set('card', notice);

  const target = `/presentes/${giftId}${params.size ? `?${params}` : ''}`;
  return NextResponse.redirect(new URL(target, url.origin));
}
