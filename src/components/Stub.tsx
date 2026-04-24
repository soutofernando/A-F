import { Ornament } from './Ornament';

type Props = { title: string; subtitle: string; number: string };

export function Stub({ title, subtitle, number }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 60px',
        textAlign: 'center',
        color: 'var(--cream)',
      }}
    >
      <div className="mono" style={{ fontSize: 10, color: 'var(--gold-soft)', letterSpacing: '.3em' }}>
        · {number} ·
      </div>
      <div className="serif" style={{ fontSize: 44, marginTop: 14, fontWeight: 300, letterSpacing: '.02em' }}>
        {title}
      </div>
      <div className="italic" style={{ fontSize: 14, color: 'rgba(239,231,219,.6)', marginTop: 8 }}>
        {subtitle}
      </div>
      <div style={{ marginTop: 28 }}>
        <Ornament />
      </div>
      <div className="micro" style={{ marginTop: 28, color: 'rgba(239,231,219,.4)' }}>
        em construção
      </div>
    </div>
  );
}
