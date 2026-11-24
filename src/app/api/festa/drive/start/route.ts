import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { googleAuthUrl } from '@/lib/festa/drive';
import { originFrom } from '@/lib/festa/origin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = originFrom(request.headers);
  const session = await assertAdminSession();
  if (!session) return NextResponse.redirect(new URL('/admin/login?redirectTo=/admin/festa', origin));

  const state = randomBytes(24).toString('base64url');
  const auth = googleAuthUrl(origin, state);
  if (!auth) return NextResponse.redirect(new URL('/admin/festa?drive=missing-client', origin));

  const response = NextResponse.redirect(auth);
  response.cookies.set('festa_drive_oauth', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/api/festa/drive',
    maxAge: 600,
  });
  return response;
}
