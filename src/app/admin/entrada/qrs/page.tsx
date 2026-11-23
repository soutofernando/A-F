import Link from 'next/link';
import { redirect } from 'next/navigation';
import { assertAdminSession } from '@/lib/admin/require-admin';
import { loadEntryPassCards } from '@/lib/admin/entry-passes';
import { EntryQrCards } from '@/components/admin/EntryQrCards';
import { PageHeader } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function EntryQrPage() {
  const session = await assertAdminSession();
  if (!session) redirect('/admin/login');

  const loaded = await loadEntryPassCards(session.supabase);
  if (!loaded.ok) {
    return (
      <div style={{ maxWidth: 720 }}>
        <PageHeader kicker="QR DE ENTRADA" title="imagens para enviar" />
        <p style={{ color: '#e7a394', lineHeight: 1.5 }}>{loaded.error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHeader
        kicker="QR DE ENTRADA"
        title="imagens para enviar"
        subtitle="Um QR por pessoa que confirmou na home. Baixe a imagem — o nome vai junto — e mande para ela. Cada código entra uma vez."
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div className="micro" style={{ color: 'rgba(239,231,219,.55)' }}>
          {loaded.cards.length === 1 ? '1 pessoa confirmada' : `${loaded.cards.length} pessoas confirmadas`}
        </div>
        <Link href="/admin/entrada" style={{ color: 'var(--gold-soft)', fontSize: 13 }}>
          abrir o leitor
        </Link>
      </div>
      {loaded.cards.length === 0 ? (
        <p style={{ color: 'rgba(239,231,219,.55)' }}>Ninguém confirmou presença na home ainda.</p>
      ) : (
        <EntryQrCards cards={loaded.cards} />
      )}
    </div>
  );
}
