'use client';

import { useState } from 'react';
import { WordReveal } from '@/components/WordReveal';
import { Reveal } from '@/components/Reveal';
import { Btn } from '@/components/Btn';

type Message = { name: string; text: string };

const SEED: Message[] = [
  {
    name: 'Juliana',
    text: 'Vocês são a prova de que Deus escreve certo por linhas tortas. Sejam felizes para sempre!',
  },
  {
    name: 'Pedro',
    text:
      'Mano, lembro do dia que você disse que ela tinha olhado pra você na academia. Olha onde chegou. Te amo, irmão.',
  },
  {
    name: 'Tia Marta',
    text: 'Que a benção que começou no Campestre continue encontrando vocês todos os dias.',
  },
  {
    name: 'Clara',
    text: 'Ver vocês juntos é uma das coisas mais bonitas. Obrigada por me deixarem fazer parte.',
  },
];

export default function MensagensPage() {
  const [list, setList] = useState<Message[]>(SEED);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!name.trim() || !text.trim()) return;
    setList([{ name: name.trim(), text: text.trim() }, ...list]);
    setName('');
    setText('');
    setSent(true);
    setTimeout(() => setSent(false), 2600);
  };

  return (
    <div
      data-theme="light"
      style={{ minHeight: '100vh', background: 'var(--cream)', color: 'var(--ink)' }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 22px 8px' }}>
        <div className="micro" style={{ color: 'var(--muted)' }}>
          CAPÍTULO VII
        </div>
        <WordReveal
          as="div"
          text="recados dos convidados"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 34, lineHeight: 1, marginTop: 8, color: 'var(--ink)' }}
        />
        <div
          className="italic"
          style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12, maxWidth: 360, lineHeight: 1.5 }}
        >
          deixe uma palavra, um voto, uma lembrança — vamos guardar cada uma.
        </div>
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: '20px auto',
          padding: '20px 22px',
          background: 'rgba(14,11,9,.03)',
          borderTop: '1px solid rgba(14,11,9,.08)',
          borderBottom: '1px solid rgba(14,11,9,.08)',
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="seu nome"
          style={{
            width: '100%',
            padding: '10px 0',
            border: 0,
            borderBottom: '1px solid rgba(14,11,9,.2)',
            background: 'transparent',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          placeholder="escreva aqui..."
          rows={4}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 0',
            border: 0,
            background: 'transparent',
            resize: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            color: 'var(--ink)',
            outline: 'none',
            fontStyle: 'italic',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>
            {text.length}/280
          </div>
          <Btn variant="ghost" small onClick={send}>
            ENVIAR RECADO →
          </Btn>
        </div>
        {sent && (
          <div
            className="fade-up"
            style={{ marginTop: 12, padding: '10px', background: 'rgba(237,232,208,.3)', textAlign: 'center' }}
          >
            <div className="italic" style={{ fontSize: 13, color: 'var(--ink)' }}>
              ✦ obrigado! guardaremos com carinho. ✦
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 22px 80px' }}>
        {list.map((m, i) => (
          <Reveal key={i} delay={i * 60}>
            <div
              style={{
                padding: '20px 0',
                borderBottom: '1px solid rgba(14,11,9,.08)',
                position: 'relative',
              }}
            >
              <div
                className="serif"
                style={{
                  fontSize: 54,
                  color: 'var(--gold-soft)',
                  position: 'absolute',
                  left: -6,
                  top: -4,
                  lineHeight: 1,
                  opacity: 0.5,
                }}
              >
                &ldquo;
              </div>
              <div style={{ paddingLeft: 22 }}>
                <div
                  className="serif"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.5,
                    color: 'var(--ink)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                  }}
                >
                  {m.text}
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, height: 1, background: 'var(--ink)', opacity: 0.6 }} />
                  <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '.15em' }}>
                    {m.name.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
