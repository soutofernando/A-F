import { Ornament } from './Ornament';

export function Footer() {
  return (
    <footer
      style={{
        background: '#0A0908',
        color: 'rgba(239,231,219,.55)',
        padding: '40px 22px 28px',
        textAlign: 'center',
        borderTop: '1px solid rgba(239,231,219,.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Ornament color="rgba(239,231,219,.35)" width={40} />
      </div>
      <div className="italic" style={{ fontSize: 14, marginTop: 16, color: 'var(--gold-soft)', opacity: 0.7 }}>
        A &amp; F · MMXXVI
      </div>
      <div className="mono" style={{ fontSize: 9, marginTop: 20, letterSpacing: '.25em' }}>
        DESENVOLVIDO POR{' '}
        <a
          href="https://github.com/soutofernando"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--gold-soft)',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(239,231,219,.3)',
            paddingBottom: 2,
            transition: 'color .3s, border-color .3s',
          }}
        >
          FERNANDO
        </a>
      </div>
    </footer>
  );
}
