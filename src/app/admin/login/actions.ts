'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/admin/allowed-emails';

export async function requestAdminMagicLink(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    return { ok: false, error: 'Informe um e-mail válido.' };
  }

  if (!isAllowedAdminEmail(normalized)) {
    return { ok: false, error: 'Este e-mail não está autorizado a acessar o admin.' };
  }

  const headerStore = await headers();
  const origin =
    headerStore.get('origin')?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';
  const redirectTo = `${origin}/auth/callback`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
