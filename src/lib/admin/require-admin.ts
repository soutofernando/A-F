import { createClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/admin/allowed-emails';

export async function assertAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedAdminEmail(user.email)) {
    return null;
  }
  return { supabase, user };
}

/** Supabase client only when the session is an allowed admin; otherwise null. */
export async function adminDb() {
  const session = await assertAdminSession();
  return session?.supabase ?? null;
}
