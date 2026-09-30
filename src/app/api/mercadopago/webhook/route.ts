import { NextResponse } from 'next/server';
import { syncMercadoPagoPayment, verifyMercadoPagoSignature } from '@/lib/mercadopago';

export const runtime = 'nodejs';

const one = (value: string | null) => value?.trim() || '';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = (await request.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null;
  const type = one(url.searchParams.get('type')) || one(url.searchParams.get('topic')) || body?.type || '';
  const dataId =
    one(url.searchParams.get('data.id')) ||
    one(url.searchParams.get('id')) ||
    (body?.data?.id != null ? String(body.data.id) : '');

  if (type && type !== 'payment') {
    return NextResponse.json({ ok: true });
  }

  const valid = verifyMercadoPagoSignature({
    signature: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
  });
  if (!valid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  if (/^\d+$/.test(dataId)) {
    await syncMercadoPagoPayment(dataId);
  }

  return NextResponse.json({ ok: true });
}
