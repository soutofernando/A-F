'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV: Array<[string, string]> = [
  ['/admin', 'Visão geral'],
  ['/admin/confirmacoes', 'Confirmações'],
  ['/admin/convidados', 'Convidados'],
  ['/admin/presentes', 'Presentes'],
  ['/admin/imagens', 'Imagens'],
  ['/admin/recados', 'Recados'],
  ['/admin/config', 'Configurações'],
];

export function AdminChrome({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0E0B09', color: 'var(--cream)', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: '#141110',
          borderRight: '1px solid rgba(239,231,219,.08)',
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Link href="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="italic" style={{ fontSize: 14, color: 'var(--gold-soft)' }}>
            a &amp; f
          </div>
          <div className="serif italic" style={{ fontSize: 26, marginTop: 2 }}>
            admin
          </div>
        </Link>

        <nav style={{ marginTop: 36, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(([href, label]) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="admin-nav-item"
                style={{
                  display: 'block',
                  padding: active ? '10px 12px 10px 16px' : '10px 12px',
                  textDecoration: 'none',
                  color: active ? 'var(--cream)' : 'rgba(239,231,219,.55)',
                  background: active ? 'rgba(239,231,219,.06)' : 'transparent',
                  borderLeft: `2px solid ${active ? 'var(--gold-soft)' : 'transparent'}`,
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ paddingTop: 20, borderTop: '1px solid rgba(239,231,219,.08)' }}>
          <div className="mono" style={{ fontSize: 9, color: 'rgba(239,231,219,.45)', letterSpacing: '.2em' }}>
            LOGADO COMO
          </div>
          <div style={{ fontSize: 12, marginTop: 6, wordBreak: 'break-all', color: 'rgba(239,231,219,.75)' }}>
            {email}
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: '1px solid rgba(239,231,219,.25)',
              color: 'rgba(239,231,219,.8)',
              padding: '8px 14px',
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              cursor: loggingOut ? 'wait' : 'pointer',
              width: '100%',
            }}
          >
            {loggingOut ? 'saindo...' : 'sair'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px 80px', maxWidth: '100%' }}>{children}</main>
    </div>
  );
}
