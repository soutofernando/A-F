import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const authError = searchParams.get('error');
  const errorCode = searchParams.get('error_code');

  if (authError || errorCode) {
    const params = new URLSearchParams();
    if (authError) params.set('error', authError);
    if (errorCode) params.set('error_code', errorCode);
    const description = searchParams.get('error_description');
    if (description) params.set('error_description', description);
    return NextResponse.redirect(`${origin}/admin/login?${params}`);
  }

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
