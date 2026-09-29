'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ornament } from './Ornament';

const items: Array<[string, string]> = [
  ['/', 'início'],
  ['/#confirmar', 'confirme presença'],
  ['/presentes', 'presentes'],
  ['/cerimonia', 'cerimônia'],
  ['/dress-code', 'código de vestimenta'],
  ['/#historia', 'nossa história'],
];

type Props = { open: boolean; onClose: () => void };

export function MenuOverlay({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      {...(!open ? { inert: true } : {})}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(248, 245, 238, .96)',
        backdropFilter: 'blur(16px)',
        transition: 'opacity .35s ease',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 28px 36px',
        color: 'var(--texto)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          aria-label="Fechar menu"
          style={{ background: 'transparent', border: 0, color: 'var(--azul-profundo)', cursor: 'pointer', padding: 8 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path d="M2 2L18 18M18 2L2 18" stroke="currentColor" />
          </svg>
        </button>
      </div>

      <nav style={{ flex: 1, overflow: 'auto', marginTop: 12 }}>
        {items.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="serif"
              style={{
                display: 'block',
                padding: '14px 0',
                textDecoration: 'none',
                color: 'var(--azul-profundo)',
                fontSize: 32,
                lineHeight: 1.15,
                borderBottom: active ? '1px solid var(--dourado)' : '1px solid var(--linha)',
                fontStyle: active ? 'italic' : 'normal',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 24 }}>
        <Link href="/#confirmar" onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
          Confirmar presença
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <Ornament />
        </div>
      </div>
    </div>
  );
}
