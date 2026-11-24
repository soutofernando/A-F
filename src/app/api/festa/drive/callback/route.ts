import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { connectDriveFromCode } from '@/lib/festa/drive';
import { originFrom } from '@/lib/festa/origin';

export const runtime = 'nodejs';

function sameState(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const origin = originFrom(request.headers);
  const session = await assertAdminSession();
  if (!session) return NextResponse.redirect(new URL('/admin/login?redirectTo=/admin/festa', origin));

  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const jar = await cookies();
  const saved = jar.get('festa_drive_oauth')?.value ?? '';

  const finish = (drive: string) => {
    const response = NextResponse.redirect(new URL(`/admin/festa?drive=${drive}`, origin));
    response.cookies.set('festa_drive_oauth', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https:'),
      path: '/api/festa/drive',
      maxAge: 0,
    });
    return response;
  };

  if (url.searchParams.get('error')) return finish('denied');
  if (!code || !state || !saved || !sameState(saved, state)) return finish('state');

  const connected = await connectDriveFromCode(code, origin);
  if (connected.error) return finish(connected.error);
  return finish('ok');
}
