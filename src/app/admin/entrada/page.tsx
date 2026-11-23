import Link from 'next/link';
import { redirect } from 'next/navigation';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { loadEntryRoster } from '@/lib/admin/entry-passes';
import { EntryScanner } from '@/components/admin/EntryScanner';

export const dynamic = 'force-dynamic';

export default async function EntryDoorPage() {
  const session = await assertAdminSession();
  if (!session) redirect('/admin/login');

  const roster = await loadEntryRoster(session.supabase);
  if (!roster.ok) {
    return (
      <div style={{ padding: 24 }}>
        <Link href="/admin" style={{ color: 'rgba(239,231,219,.7)', fontSize: 13 }}>
          voltar
        </Link>
        <p style={{ color: '#e7a394', lineHeight: 1.5, marginTop: 18 }}>{roster.error}</p>
      </div>
    );
  }

  return <EntryScanner guests={roster.guests} />;
}
