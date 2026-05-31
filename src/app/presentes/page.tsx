'use client';

import { useState } from 'react';
import { WordReveal } from '@/components/WordReveal';
import { Reveal } from '@/components/Reveal';
import { Ph } from '@/components/Ph';

const CATEGORIES = ['Todos', 'Casa', 'Cozinha', 'Lua de mel', 'Pix'] as const;

type Gift = {
  id: number;
  name: string;
  price: string;
  cat: (typeof CATEGORIES)[number];
  taken: boolean;
  label: string;
};

const GIFTS: Gift[] = [
  { id: 1, name: 'Jogo de panelas em cobre', price: 'R$ 480', cat: 'Cozinha', taken: false, label: 'PANELAS · COBRE' },
  { id: 2, name: 'Noite em Paraty', price: 'R$ 650', cat: 'Lua de mel', taken: false, label: 'PARATY · POUSADA' },
  { id: 3, name: 'Jogo de taças de cristal', price: 'R$ 320', cat: 'Cozinha', taken: true, label: 'TAÇAS · CRISTAL' },
  { id: 4, name: 'Roupa de cama king', price: 'R$ 540', cat: 'Casa', taken: false, label: 'LENÇÓIS · LINHO' },
  { id: 5, name: 'Jantar em Buenos Aires', price: 'R$ 380', cat: 'Lua de mel', taken: false, label: 'JANTAR · BA' },
  { id: 6, name: 'Contribuição livre (Pix)', price: 'valor livre', cat: 'Pix', taken: false, label: 'PIX · CHAVE' },
  { id: 7, name: 'Batedeira planetária', price: 'R$ 890', cat: 'Cozinha', taken: false, label: 'BATEDEIRA' },
  { id: 8, name: 'Aromatizador de ambiente', price: 'R$ 180', cat: 'Casa', taken: true, label: 'DIFUSOR' },
];

export default function PresentesPage() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Todos');
  const list = cat === 'Todos' ? GIFTS : GIFTS.filter((g) => g.cat === cat);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '120px 22px 8px' }}>
        <div className="micro" style={{ color: 'var(--gold-soft)' }}>
          CAPÍTULO VI
        </div>
        <WordReveal
          as="div"
          text="lista de presentes"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 40, lineHeight: 1, marginTop: 8 }}
        />
        <div
          className="italic"
          style={{ fontSize: 13, color: 'rgba(239,231,219,.55)', marginTop: 12, maxWidth: 420, lineHeight: 1.5 }}
        >
          sua presença já é, de longe, o melhor presente — mas se quiser nos ajudar a começar, deixamos alguns desejos
          por aqui.
        </div>
      </div>

      <div
        className="phone-scroll"
        style={{ display: 'flex', gap: 10, padding: '20px 22px 4px', overflowX: 'auto', maxWidth: 820, margin: '0 auto' }}
      >
        {CATEGORIES.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                flex: '0 0 auto',
                padding: '8px 16px',
                background: active ? 'var(--gold)' : 'transparent',
                color: active ? 'var(--ink)' : 'var(--cream)',
                border: `1px solid ${active ? 'var(--gold)' : 'rgba(239,231,219,.25)'}`,
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all .25s ease',
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 22px 40px' }}>
        {list.map((g, i) => (
          <Reveal key={g.id} delay={i * 50}>
            <div
              style={{
                display: 'flex',
                gap: 14,
                padding: '16px 0',
                borderBottom: '1px solid rgba(239,231,219,.1)',
                opacity: g.taken ? 0.45 : 1,
              }}
            >
              <div style={{ flex: '0 0 84px' }}>
                <Ph label={g.label} style={{ width: 84, height: 100 }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="mono" style={{ fontSize: 8, color: 'var(--gold-soft)', letterSpacing: '.15em' }}>
                    {g.cat.toUpperCase()}
                  </div>
                  <div
                    className="serif"
                    style={{
                      fontSize: 18,
                      lineHeight: 1.2,
                      marginTop: 4,
                      fontWeight: 400,
                      textDecoration: g.taken ? 'line-through' : 'none',
                    }}
                  >
                    {g.name}
                  </div>
                  <div className="italic" style={{ fontSize: 13, color: 'var(--gold-soft)', marginTop: 4 }}>
                    {g.price}
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  {g.taken ? (
                    <div className="micro" style={{ fontSize: 8, color: 'rgba(239,231,219,.4)' }}>
                      ✓ JÁ PRESENTEADO
                    </div>
                  ) : (
                    <button
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--gold-soft)',
                        color: 'var(--gold-soft)',
                        fontFamily: 'var(--font-inter)',
                        fontSize: 9,
                        letterSpacing: '.2em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      PRESENTEAR →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        ))}

        <div
          style={{
            marginTop: 30,
            padding: '20px',
            background: 'rgba(237,232,208,.08)',
            border: '1px solid rgba(237,232,208,.25)',
            textAlign: 'center',
          }}
        >
          <div className="micro" style={{ color: 'var(--gold-soft)' }}>
            PIX · BANCO INTER
          </div>
          <div className="mono" style={{ fontSize: 13, marginTop: 10, color: 'var(--cream)', letterSpacing: '.1em' }}>
            casamento@aliciafernando.com
          </div>
          <div className="italic" style={{ fontSize: 12, color: 'rgba(239,231,219,.55)', marginTop: 10 }}>
            contribua com o valor que seu coração sentir.
          </div>
        </div>
      </div>
    </div>
  );
}
