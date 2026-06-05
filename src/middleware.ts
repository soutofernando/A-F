import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ---- TEMP: libera apenas /confirmar e /admin (remover este bloco no futuro) ----
const ONLY_PATH = '/confirmar';
function tempRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === ONLY_PATH) return null;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;
  const url = request.nextUrl.clone();
  url.pathname = ONLY_PATH;
  return NextResponse.redirect(url);
}
// ---- /TEMP ----

export async function middleware(request: NextRequest) {
  const redirect = tempRedirect(request); // TEMP: remover
  if (redirect) return redirect; // TEMP: remover
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.).*)'],
};
