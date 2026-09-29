'use client';

import { useEffect, useState } from 'react';
import { GIFT_CATEGORIES } from '@/lib/gift-categories';
import { GIFTS_REQUIRE_RSVP } from '@/lib/site';
import { hasConfirmedPresence } from '@/lib/rsvp-storage';
import { FieldBackdrop } from '@/components/FieldBackdrop';
import { RusticIcon, type RusticName } from '@/components/RusticIcon';

export type Gift = {
  id: string | number;
  name: string;
  price: string;
  cat: string;
  taken: boolean;
  label: string;
  imageUrl?: string | null;
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

export function GiftsBand({
  heading = 'Agora escolha um presente',
  lede,
  gifts = GIFTS,
}: {
  heading?: string;
  lede?: string;
  gifts?: Gift[];
}) {
  const [cat, setCat] = useState<string>('Todos');
  const [open, setOpen] = useState(!GIFTS_REQUIRE_RSVP);
  const knownIds = new Set<string>(GIFT_CATEGORIES.map((item) => item.id));
  const legacyIds = Array.from(new Set(gifts.map((gift) => gift.cat))).filter(
    (id) => id && !knownIds.has(id),
  );
  const categories = [
    { id: 'Todos', icon: 'olive' as RusticName },
    ...GIFT_CATEGORIES.map((item) => ({ id: item.id, icon: item.icon as RusticName })),
    ...legacyIds.map((id) => ({ id, icon: 'gift' as RusticName })),
  ];
  const list = cat === 'Todos' ? gifts : gifts.filter((gift) => gift.cat === cat);

  useEffect(() => {
    const sync = () => setOpen(!GIFTS_REQUIRE_RSVP || hasConfirmedPresence());
    sync();
    window.addEventListener('aef-rsvp', sync);
    return () => window.removeEventListener('aef-rsvp', sync);
  }, []);

  return (
    <section id="presentes" className="has-field" style={{ position: 'relative', padding: '80px 22px', maxWidth: 1100, margin: '0 auto' }}>
      <FieldBackdrop tone="petal" />
      <div className="wash" aria-hidden />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--terracota)' }}>
        <RusticIcon name="gift" size={28} />
        <h2 className="serif" style={{ fontSize: 'clamp(40px, 6vw, 64px)', color: 'var(--azul-profundo)', fontWeight: 400, lineHeight: 0.95 }}>
          {heading}
        </h2>
      </div>
      {lede && (
        <p className="italic phrase-blue-b" style={{ marginTop: 12, maxWidth: 460 }}>
          {lede}
        </p>
      )}
      <div className="phone-scroll" data-lenis-prevent style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 22 }}>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCat(item.id)}
            className="micro"
            style={{
              flex: '0 0 auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid var(--linha)',
              background: cat === item.id ? 'var(--azul-profundo)' : 'transparent',
              color: cat === item.id ? '#fff' : 'var(--texto)',
              cursor: 'pointer',
            }}
          >
            <RusticIcon name={item.icon} size={16} />
            {item.id}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative', marginTop: 22 }}>
        <ul
          style={{
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            padding: 0,
            filter: open ? 'none' : 'blur(1.5px)',
          }}
        >
          {list.map((gift) => (
            <li key={gift.id}>
              <GiftCard gift={gift} />
            </li>
          ))}
        </ul>
        {!open && (
          <div className="veil">
            <p className="serif" style={{ fontSize: 28, maxWidth: 280 }}>
              Confirme sua presença para escolher
            </p>
          </div>
        )}
      </div>
      <div className="phrase-blue-c" style={{ marginTop: 28, textAlign: 'center' }}>
        <div className="micro">Pix · Banco Inter</div>
        <p className="serif" style={{ fontSize: 22, marginTop: 8, color: 'var(--azul-profundo)' }}>
          casamento@aliciafernando.com
        </p>
        <p className="italic">contribua com o valor que seu coração sentir.</p>
      </div>
    </section>
  );
}

function GiftCard({ gift }: { gift: Gift }) {
  const [tilt, setTilt] = useState('none');
  const [shift, setShift] = useState('scale(1.06)');
  return (
    <article
      className="gift-card"
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt(`rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`);
        setShift(`scale(1.08) translate(${(-x * 10).toFixed(1)}px, ${(-y * 8).toFixed(1)}px)`);
      }}
      onPointerLeave={() => {
        setTilt('none');
        setShift('scale(1.06)');
      }}
      style={{ transform: tilt, padding: 14, opacity: gift.taken ? 0.72 : 1, position: 'relative' }}
    >
      <div className="arch ph" style={{ aspectRatio: '4 / 3', overflow: 'hidden' }}>
        {gift.imageUrl ? (
          <img src={gift.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: shift }} />
        ) : (
          <div className="ph-label" style={{ transform: shift }}>{gift.label}</div>
        )}
      </div>
      <div className="micro" style={{ marginTop: 12, color: 'var(--texto-suave)' }}>
        {gift.cat}
      </div>
      <h3 className="serif" style={{ fontSize: 26, fontWeight: 400, color: 'var(--azul-profundo)', lineHeight: 1.1, marginTop: 4 }}>
        {gift.name}
      </h3>
      <p className="italic" style={{ color: 'var(--dourado-esc)', marginTop: 4 }}>
        {gift.price}
      </p>
      {gift.taken ? (
        <span
          className="micro"
          style={{
            position: 'absolute',
            top: 22,
            right: 22,
            background: 'var(--dourado)',
            color: 'var(--azul-profundo)',
            borderRadius: 999,
            padding: '6px 10px',
          }}
        >
          Reservado
        </span>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
          <RusticIcon name="gift" size={14} />
          Presentear
        </button>
      )}
    </article>
  );
}
