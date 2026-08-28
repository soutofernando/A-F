import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ---- TEMP: libera apenas /confirmar, lista de compras e /admin (remover este bloco no futuro) ----
const ONLY_PATH = '/confirmar';
const OPEN_PREFIXES = ['/despensa', '/despesas'];
function tempRedirect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === ONLY_PATH) return null;
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/')) return null;
  if (pathname.startsWith('/api/')) return null;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;
  const url = request.nextUrl.clone();
  url.pathname = ONLY_PATH;
  return NextResponse.redirect(url);
}
// ---- /TEMP ----

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase fallback malformado: /code=UUID em vez de /auth/callback?code=UUID
  if (pathname.startsWith('/code=')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    url.searchParams.set('code', pathname.slice('/code='.length));
    return NextResponse.redirect(url);
  }

  // ?code= na raiz (Site URL sem path de callback)
  if (pathname === '/' && searchParams.has('code')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // erros auth na raiz (redirect URL não na allowlist do Supabase)
  if (pathname === '/' && (searchParams.has('error') || searchParams.has('error_code'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  const redirect = tempRedirect(request); // TEMP: remover
  if (redirect) return redirect; // TEMP: remover
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.).*)'],
};
