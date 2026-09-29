import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

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

  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.).*)'],
};
