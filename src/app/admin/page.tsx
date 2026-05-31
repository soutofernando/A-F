import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Stat } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

const CARDS: Array<{ href: string; title: string; desc: string; kicker: string }> = [
  { href: '/admin/convidados', kicker: '01', title: 'Convidados', desc: 'Liste, edite e organize por mesa.' },
  { href: '/admin/presentes', kicker: '02', title: 'Presentes', desc: 'Itens, categorias e formas de pagamento.' },
  { href: '/admin/imagens', kicker: '03', title: 'Imagens', desc: 'Suba e organize fotos por contexto.' },
  { href: '/admin/recados', kicker: '04', title: 'Recados', desc: 'Modere os recados antes de exibi-los.' },
  { href: '/admin/config', kicker: '05', title: 'Configurações', desc: 'Data, local, PIX e textos do site.' },
];

export default async function AdminHome() {
  const supabase = await createClient();

  const [
    { count: guestsCount },
    { count: rsvpsYes },
    { count: rsvpsNo },
    { count: giftsTotal },
    { count: giftsTaken },
    { count: messagesPending },
    { count: messagesApproved },
  ] = await Promise.all([
    supabase.from('guests').select('*', { count: 'exact', head: true }),
    supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('status', 'yes'),
    supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('status', 'no'),
    supabase.from('gifts').select('*', { count: 'exact', head: true }),
    supabase.from('gifts').select('*', { count: 'exact', head: true }).not('taken_by_name', 'is', null),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('approved', true),
  ]);

  return (
    <div style={{ maxWidth: 1080 }}>
      <div className="admin-fade-up">
        <div className="micro" style={{ color: 'var(--gold-soft)' }}>
          PAINEL · ALICIA & FERNANDO
        </div>
        <h1
          className="serif italic"
          style={{ fontSize: 46, fontWeight: 300, marginTop: 8, letterSpacing: '.01em', lineHeight: 1.05 }}
        >
          visão geral
        </h1>
        <div className="italic" style={{ fontSize: 14, color: 'rgba(239,231,219,.55)', marginTop: 12, maxWidth: 520 }}>
          tudo que você ajustar aqui aparece no site público na hora — sem deploy, sem espera.
        </div>
      </div>

      {/* Stats */}
      <div
        className="admin-stagger"
        style={{
          marginTop: 36,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
        }}
      >
        <Stat
          label="Convidados"
          value={guestsCount ?? 0}
          meta={
            (rsvpsYes ?? 0) + (rsvpsNo ?? 0) === 0
              ? 'aguardando confirmações'
              : `${rsvpsYes ?? 0} confirmaram · ${rsvpsNo ?? 0} recusaram`
          }
        />
        <Stat
          label="Presentes"
          value={giftsTotal ?? 0}
          meta={
            (giftsTotal ?? 0) === 0
              ? 'lista vazia'
              : `${giftsTaken ?? 0} reservado(s) · ${(giftsTotal ?? 0) - (giftsTaken ?? 0)} livre(s)`
          }
        />
        <Stat
          label="Recados"
          value={(messagesPending ?? 0) + (messagesApproved ?? 0)}
          meta={
            (messagesPending ?? 0) > 0
              ? `${messagesPending} pendente(s) de moderação`
              : `${messagesApproved ?? 0} aprovado(s)`
          }
        />
      </div>

      {/* Atalhos */}
      <div style={{ marginTop: 44 }} className="admin-fade-up">
        <div className="admin-section-sub" style={{ marginBottom: 14 }}>
          ATALHOS
        </div>
        <div
          className="admin-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="admin-card admin-card-link"
              style={{
                display: 'block',
                padding: '22px 22px 20px',
                background: '#141110',
                border: '1px solid rgba(239,231,219,.08)',
                textDecoration: 'none',
                color: 'var(--cream)',
              }}
            >
              <div className="admin-section-sub" style={{ color: 'rgba(239,231,219,.4)' }}>
                {c.kicker}
              </div>
              <div
                className="serif"
                style={{ fontSize: 22, fontWeight: 400, letterSpacing: '.01em', marginTop: 6 }}
              >
                {c.title}
              </div>
              <div
                className="italic"
                style={{ fontSize: 13, color: 'rgba(239,231,219,.5)', marginTop: 8, lineHeight: 1.5 }}
              >
                {c.desc}
              </div>
              <div
                className="admin-card-arrow"
                style={{
                  fontSize: 9,
                  letterSpacing: '.3em',
                  marginTop: 18,
                  color: 'rgba(239,231,219,.45)',
                }}
              >
                ABRIR →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
