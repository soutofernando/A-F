import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAllowedAdminEmail } from '@/lib/admin/allowed-emails';

export { isAllowedAdminEmail } from '@/lib/admin/allowed-emails';

function applyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith('/admin');
  const isLoginRoute = path === '/admin/login';
  const isAuthorizedAdmin = user ? isAllowedAdminEmail(user.email) : false;

  const redirectToLoginUnauthorized = async () => {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('error', 'unauthorized_email');
    url.searchParams.delete('redirectTo');
    const redirect = NextResponse.redirect(url);
    applyCookies(supabaseResponse, redirect);
    return redirect;
  };

  if (isAdminRoute && !isLoginRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && !isLoginRoute && user && !isAuthorizedAdmin) {
    return redirectToLoginUnauthorized();
  }

  if (isLoginRoute && user && isAuthorizedAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.searchParams.delete('redirectTo');
    const redirect = NextResponse.redirect(url);
    applyCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (isLoginRoute && user && !isAuthorizedAdmin) {
    return redirectToLoginUnauthorized();
  }

  return supabaseResponse;
}
