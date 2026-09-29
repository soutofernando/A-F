import { Logo } from './Logo';
import { Ornament } from './Ornament';
import { RusticIcon } from './RusticIcon';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--azul-profundo)',
        color: 'var(--ceu-claro)',
        padding: '56px 22px 32px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Logo height={56} style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
        <Ornament color="var(--dourado)" width={48} />
      </div>
      <p className="serif italic" style={{ marginTop: 16, fontSize: 22, color: 'var(--dourado)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <RusticIcon name="olive" size={18} />
        Alicia &amp; Fernando
        <RusticIcon name="olive" size={18} />
      </p>
      <p className="italic" style={{ marginTop: 18, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', color: 'var(--ceu-claro)' }}>
        pelos olhares que não desviaram, até virarem destino.
      </p>
      <div className="film-credits">
        <p className="serif">Fim do começo.</p>
      </div>
      <div className="micro" style={{ fontSize: 12, marginTop: 22, color: 'var(--ceu)' }}>
        Desenvolvido por{' '}
        <a
          href="https://github.com/soutofernando"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--dourado)', textDecoration: 'none' }}
        >
          Fernando
        </a>
      </div>
    </footer>
  );
}
