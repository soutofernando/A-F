'use client';

import { useRouter, usePathname } from 'next/navigation';

type Props = { onMenu: () => void };

export function TopBar({ onMenu }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/') return null; // home tem chrome próprio

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '52px 18px 14px',
        background: 'linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.25) 70%, transparent)',
      }}
    >
      <button
        onClick={() => router.push('/')}
        aria-label="Voltar para início"
        style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'inherit' }}
      >
        <svg width="18" height="14" viewBox="0 0 18 14">
          <path d="M7 1L1 7L7 13M1 7H17" stroke="currentColor" fill="none" />
        </svg>
      </button>
      <div className="italic" style={{ fontSize: 13, opacity: 0.7 }}>
        A &amp; F
      </div>
      <button
        onClick={onMenu}
        aria-label="Abrir menu"
        style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'inherit' }}
      >
        <svg width="22" height="14" viewBox="0 0 22 14">
          <path d="M0 1H22M0 7H14M0 13H22" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}
