'use client';

import { WordReveal } from '@/components/WordReveal';
import { Reveal } from '@/components/Reveal';
import { Ph } from '@/components/Ph';
import { Ornament } from '@/components/Ornament';

type Moment = { date: string; title: string; body: string; tag: string };

const MOMENTS: Moment[] = [
  {
    date: 'OUT · 2022',
    title: 'O primeiro olhar',
    body:
      'Eu comecei a academia. Ela já estava lá. No primeiro dia, ela quase quebrou o pescoço para me olhar — e eu fingi que não percebi.',
    tag: 'A ACADEMIA',
  },
  {
    date: 'OUT · 2022',
    title: 'Dois meses de olhares',
    body: 'Por dois meses inteiros a gente trocou olhares silenciosos, cada um no seu canto, fingindo treinar.',
    tag: 'O INTERVALO',
  },
  {
    date: 'DEZ · 2022',
    title: 'A primeira conversa',
    body: 'Eu criei coragem e cheguei nela. Um dia depois — um único dia — já estávamos ficando.',
    tag: 'O PRIMEIRO DIA',
  },
  {
    date: '28 · 12 · 2022',
    title: 'O pedido de namoro',
    body: 'No Campestre, onde tudo começou, eu a pedi em namoro. Ela disse sim, e aquele lugar virou nosso.',
    tag: 'O CAMPESTRE',
  },
  {
    date: '2024',
    title: 'A primeira casa',
    body:
      'Arrumamos nossas coisas, nossos cheiros, nossos barulhos — e descobrimos que rotina pode ser bonita.',
    tag: 'O NOSSO LAR',
  },
  {
    date: '2025',
    title: 'O pedido',
    body: 'Um joelho no chão, um sim sem hesitar, e duas famílias que viraram uma.',
    tag: 'O SIM',
  },
  {
    date: '28 · 11 · 2026',
    title: 'O altar',
    body: 'E aqui estamos, esperando você, para começar o resto.',
    tag: 'O PRÓXIMO CAPÍTULO',
  },
];

export default function HistoriaPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: 'var(--cream)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 22px 20px' }}>
        <div className="micro" style={{ color: 'var(--gold-soft)' }}>
          CAPÍTULO I
        </div>
        <WordReveal
          as="div"
          text="nossa história"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 48, lineHeight: 1, marginTop: 8 }}
        />
        <div className="hairline" style={{ marginTop: 20 }} />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 22px' }}>
        <Ph label="FOTO HORIZONTAL · PRÉ-WEDDING · 16:9" aspect="16/9" />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 22px 80px', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: '52px',
            top: 40,
            bottom: 40,
            width: 1,
            background:
              'linear-gradient(180deg, transparent, rgba(237,232,208,.45) 8%, rgba(237,232,208,.45) 92%, transparent)',
          }}
        />

        {MOMENTS.map((m, i) => (
          <Reveal key={i} y={24}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 36, position: 'relative' }}>
              <div style={{ flex: '0 0 44px', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: 6,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 0 0 4px rgba(237,232,208,.2)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="micro" style={{ color: 'var(--gold-soft)', fontSize: 9 }}>
                  {m.date} · {m.tag}
                </div>
                <div className="serif" style={{ fontSize: 24, fontWeight: 400, marginTop: 6, lineHeight: 1.15 }}>
                  {m.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: 'rgba(239,231,219,.75)',
                    marginTop: 8,
                    fontFamily: 'var(--font-inter)',
                    fontWeight: 300,
                  }}
                >
                  {m.body}
                </div>
                {i === 3 && <Ph label="CAMPESTRE · PEDIDO" aspect="4/3" style={{ marginTop: 14 }} />}
                {i === 5 && <Ph label="ANEL · DETALHE" aspect="1" style={{ marginTop: 14, maxWidth: 180 }} />}
              </div>
            </div>
          </Reveal>
        ))}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Ornament />
          </div>
          <div className="italic" style={{ fontSize: 18, marginTop: 18, color: 'var(--gold-soft)' }}>
            &ldquo;por todos os olhares que não desviaram.&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
