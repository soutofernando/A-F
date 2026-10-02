'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pill, SubmitButton, adminInputStyle, adminLabelStyle } from '@/components/admin/ui';
import { matchesSearch } from '@/lib/search-text';

export type AdminGiftListItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priceLabel: string;
  imgUrl: string | null;
  taken_by_name: string | null;
  claim_method: string | null;
  pix_enabled: boolean | null;
  card_enabled: boolean | null;
  delivery_enabled: boolean | null;
};

export function AdminGiftsList({
  items,
  deleteGift,
  clearTakenBy,
}: {
  items: AdminGiftListItem[];
  deleteGift: (formData: FormData) => Promise<void>;
  clearTakenBy: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => items.filter((g) => matchesSearch(query, g.title)),
    [items, query],
  );

  if (items.length === 0) {
    return (
      <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '20px 0' }}>
        Nenhum presente ainda — adicione o primeiro acima.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <label style={{ display: 'block' }}>
        <span style={adminLabelStyle}>Buscar por nome</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do presente…"
          className="admin-input"
          style={adminInputStyle}
          aria-label="Buscar presente por nome"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="italic" style={{ color: 'rgba(239,231,219,.5)', fontSize: 14, padding: '8px 0' }}>
          Nenhum presente corresponde a &quot;{query.trim()}&quot;.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {query.trim() ? (
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(239,231,219,.45)', letterSpacing: '.1em' }}>
              {filtered.length} de {items.length} item(ns)
            </p>
          ) : null}
          {filtered.map((g) => (
            <div
              key={g.id}
              className="admin-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr auto auto',
                gap: 16,
                alignItems: 'center',
                padding: '12px 14px',
                border: '1px solid rgba(239,231,219,.1)',
                background: '#0E0B09',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: g.imgUrl ? `url(${g.imgUrl}) center/cover` : '#141110',
                  border: '1px solid rgba(239,231,219,.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  color: 'rgba(239,231,219,.3)',
                  letterSpacing: '.15em',
                }}
              >
                {!g.imgUrl && 'SEM IMG'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="serif" style={{ fontSize: 17, fontWeight: 400 }}>
                    {g.title}
                  </span>
                  <Pill variant="gold">{g.category}</Pill>
                  {g.taken_by_name ? (
                    <Pill variant="success">
                      presenteado · {g.taken_by_name}
                      {g.claim_method === 'pix' ? ' · PIX' : ''}
                      {g.claim_method === 'in_hand' ? ' · nas mãos' : ''}
                      {g.claim_method === 'address' ? ' · envio' : ''}
                      {g.claim_method === 'card' ? ' · cartão' : ''}
                    </Pill>
                  ) : null}
                </div>
                {g.description && (
                  <div
                    className="italic"
                    style={{
                      fontSize: 12,
                      color: 'rgba(239,231,219,.5)',
                      marginTop: 4,
                      lineHeight: 1.45,
                    }}
                  >
                    {g.description.length > 90 ? `${g.description.slice(0, 90)}…` : g.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(239,231,219,.45)', marginTop: 6, letterSpacing: '.1em' }}>
                  {g.pix_enabled && 'PIX'}
                  {g.pix_enabled && g.card_enabled && ' · '}
                  {g.card_enabled && 'CARTÃO'}
                  {(g.pix_enabled || g.card_enabled) && g.delivery_enabled !== false && ' · '}
                  {g.delivery_enabled !== false && 'ENTREGA'}
                  {!g.pix_enabled && !g.card_enabled && g.delivery_enabled === false && 'sem forma de presentear'}
                </div>
              </div>

              <div
                className="serif"
                style={{ fontSize: 18, fontWeight: 400, color: 'var(--gold-soft)', whiteSpace: 'nowrap' }}
              >
                {g.priceLabel}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', whiteSpace: 'nowrap' }}>
                {g.taken_by_name && (
                  <form action={clearTakenBy} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={g.id} />
                    <SubmitButton variant="outline" small>
                      liberar
                    </SubmitButton>
                  </form>
                )}
                <Link
                  href={`/admin/presentes/${g.id}`}
                  className="admin-btn"
                  style={{
                    color: 'var(--gold-soft)',
                    fontSize: 10,
                    letterSpacing: '.22em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    padding: '6px 14px',
                    border: '1px solid rgba(212,175,122,.4)',
                  }}
                >
                  editar
                </Link>
                <form action={deleteGift} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={g.id} />
                  <SubmitButton variant="danger" small>
                    ✕
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
