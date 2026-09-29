'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldBackdrop } from '@/components/FieldBackdrop';
import { Ph } from '@/components/Ph';
import { Btn } from '@/components/Btn';
import { RusticIcon } from '@/components/RusticIcon';

const LABELS = [
  'ENSAIO · CAMPO',
  'DETALHE · MÃOS',
  'RETRATO · ELA',
  'RETRATO · ELE',
  'NOIVADO',
  'PEDIDO',
  'FAZENDA',
  'ABRAÇO',
  'ANEL',
  'RISO',
  'PÔR DO SOL',
  'PRÉ-WEDDING',
];

const SEED = [
  { name: 'Juliana', text: 'Vocês são a prova de que Deus escreve certo por linhas tortas. Sejam felizes para sempre!' },
  { name: 'Pedro', text: 'Mano, lembro do dia que você disse que ela tinha olhado pra você na academia. Olha onde chegou. Te amo, irmão.' },
  { name: 'Tia Marta', text: 'Que a benção que começou no Campestre continue encontrando vocês todos os dias.' },
  { name: 'Clara', text: 'Ver vocês juntos é uma das coisas mais bonitas. Obrigada por me deixarem fazer parte.' },
];

export function AlbumBand() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  const open = (label: string) => setActive(label);

  return (
    <section id="album" className="has-field" style={{ padding: '72px 0 40px' }}>
      <FieldBackdrop tone="leaf" />
      <div style={{ padding: '0 22px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 className="serif" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'clamp(40px, 6vw, 64px)', color: 'var(--azul-profundo)', fontWeight: 400 }}>
          <span style={{ color: 'var(--oliva)' }}>
            <RusticIcon name="petal" size={28} />
          </span>
          álbum de fotos
        </h2>
        <p className="italic phrase-blue-a" style={{ marginTop: 8 }}>
          deslize para ver os dias que nos trouxeram até aqui.
        </p>
      </div>
      <div className="phone-scroll" data-lenis-prevent style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '28px 22px 8px' }}>
        {LABELS.map((label) => (
          <button
            key={label}
            type="button"
            className="film-still"
            aria-label={`Abrir foto: ${label}`}
            onClick={() => open(label)}
          >
            <Ph label={label} style={{ width: 200, height: 260 }} />
          </button>
        ))}
      </div>
      {active &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true" aria-label={active} onClick={() => setActive(null)}>
            <button type="button" className="intro-skip lightbox-close" onClick={() => setActive(null)}>
              Fechar
            </button>
            <div className="lightbox-frame film-still" onClick={(event) => event.stopPropagation()}>
              <Ph label={active} style={{ width: 'min(72vw, 420px)', height: 'min(70vh, 540px)' }} />
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

export function NotesBand() {
  const [list, setList] = useState(SEED);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!name.trim() || !text.trim()) return;
    setList([{ name: name.trim(), text: text.trim() }, ...list]);
    setName('');
    setText('');
    setSent(true);
    window.setTimeout(() => setSent(false), 2600);
  };

  return (
    <section id="recados" className="has-field" style={{ padding: '40px 22px 80px', maxWidth: 760, margin: '0 auto' }}>
      <FieldBackdrop tone="gold" />
      <h2 className="serif" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 'clamp(40px, 6vw, 64px)', color: 'var(--azul-profundo)', fontWeight: 400, lineHeight: 0.95 }}>
        <span style={{ color: 'var(--dourado-esc)' }}>
          <RusticIcon name="olive" size={28} />
        </span>
        recados dos convidados
      </h2>
      <p className="italic phrase-blue-d" style={{ marginTop: 8 }}>
        deixe uma palavra, um voto, uma lembrança — vamos guardar cada uma.
      </p>
      <div style={{ marginTop: 22 }}>
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="seu nome" />
        <textarea
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 280))}
          placeholder="escreva aqui..."
          rows={4}
          style={{ marginTop: 10, fontSize: 18 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span className="micro" style={{ color: 'var(--texto-suave)' }}>
            {text.length}/280
          </span>
          <Btn variant="primary" small onClick={send}>
            Enviar recado
          </Btn>
        </div>
        {sent && (
          <p className="italic" style={{ marginTop: 12, color: 'var(--oliva-esc)' }}>
            obrigado! guardaremos com carinho.
          </p>
        )}
      </div>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 28 }}>
        {list.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className={index === 0 && sent ? 'note-card note-drop' : 'note-card'}
            style={{ ['--tilt' as string]: `${index % 2 === 0 ? -0.8 : 0.9}deg` }}
          >
            <span className="note-pin" aria-hidden />
            <p className="serif italic" style={{ fontSize: 20, color: 'var(--texto)' }}>
              {item.text}
            </p>
            <p className="micro" style={{ marginTop: 8, color: 'var(--gold)' }}>
              {item.name}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
