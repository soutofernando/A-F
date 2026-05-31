'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ornament } from './Ornament';

const items: Array<[string, string]> = [
  ['/', 'início'],
  ['/confirmar', 'pré-confirmação'],
  ['/rsvp', 'confirme presença'],
  ['/presentes', 'presentes'],
  ['/cerimonia', 'cerimônia'],
  ['/dress-code', 'código de vestimenta'],
  ['/album', 'álbum de fotos'],
  ['/historia', 'nossa história'],
  ['/mensagens', 'recados'],
];

type Props = { open: boolean; onClose: () => void };

export function MenuOverlay({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(14,11,9,.96)',
        backdropFilter: 'blur(10px)',
        transition: 'opacity .5s, transform .5s',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transform: open ? 'translateY(0)' : 'translateY(-20px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '60px 28px 40px',
        color: 'var(--cream)',
      }}
    >
      <button
        onClick={onClose}
        aria-label="Fechar menu"
        style={{
          position: 'absolute',
          top: 22,
          right: 22,
          background: 'transparent',
          border: 0,
          color: 'var(--cream)',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M2 2L18 18M18 2L2 18" stroke="currentColor" />
        </svg>
      </button>

      <div className="italic" style={{ fontSize: 14, color: 'var(--gold-soft)', marginBottom: 30 }}>
        alicia &amp; fernando
      </div>

      <nav style={{ flex: 1 }}>
        {items.map(([href, label], i) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                width: '100%',
                background: 'transparent',
                border: 0,
                padding: '14px 0',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(239,231,219,.08)',
                color: 'var(--cream)',
                opacity: open ? 1 : 0,
                transform: open ? 'translateX(0)' : 'translateX(-10px)',
                transition: `opacity .6s ${i * 60 + 200}ms, transform .6s ${i * 60 + 200}ms`,
              }}
            >
              <span
                className="serif"
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  fontStyle: active ? 'italic' : 'normal',
                  color: active ? 'var(--gold-soft)' : 'var(--cream)',
                }}
              >
                {label}
              </span>
              <span className="mono" style={{ fontSize: 9, color: 'rgba(239,231,219,.4)' }}>
                0{i + 1}
              </span>
            </Link>
          );
        })}
      </nav>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Ornament />
        </div>
        <div className="mono" style={{ fontSize: 9, marginTop: 14, color: 'rgba(239,231,219,.5)', letterSpacing: '.25em' }}>
          28 · 11 · 2026
        </div>
      </div>
    </div>
  );
}
