import { NextResponse } from 'next/server';
import { joinPlayer } from '@/lib/festa/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await joinPlayer(body);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
