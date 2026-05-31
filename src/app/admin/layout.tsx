import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAllowedAdminEmail } from '@/lib/supabase/middleware';
import { AdminChrome } from '@/components/admin/AdminChrome';
import './admin.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login e callback são públicos — a página /admin/login decide o que mostrar.
  // (O middleware já redireciona rotas protegidas sem sessão pra /admin/login.)
  if (!user) {
    return <>{children}</>;
  }

  // Sessão válida mas email não autorizado: trava.
  if (!isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=unauthorized_email');
  }

  return <AdminChrome email={user.email ?? ''}>{children}</AdminChrome>;
}
