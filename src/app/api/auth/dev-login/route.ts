import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/supabase/middleware';

/** Dev only — bypass magic-link email + rate limit via service role. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing in .env.local' }, { status: 500 });
  }

  const email = (
    request.nextUrl.searchParams.get('email') ??
    process.env.ADMIN_EMAILS?.split(',')[0] ??
    ''
  )
    .trim()
    .toLowerCase();

  if (!email || !isAllowedAdminEmail(email)) {
    return NextResponse.json(
      { error: 'Set ADMIN_EMAILS in .env.local or pass ?email=your@email.com' },
      { status: 403 },
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${request.nextUrl.origin}/auth/callback` },
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    return NextResponse.json({ error: error?.message ?? 'generateLink failed' }, { status: 500 });
  }

  const supabase = await createServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.redirect(`${request.nextUrl.origin}/admin`);
}
