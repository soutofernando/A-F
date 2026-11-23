'use client';

import { useState } from 'react';
import type { EntryPassCard } from '@/lib/admin/entry-pass-types';
import { EntryQrDownload } from '@/components/admin/EntryQrDownload';

export function EntryQrCards({ cards }: { cards: EntryPassCard[] }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  const visible = needle
    ? cards.filter((card) => card.name.toLocaleLowerCase('pt-BR').includes(needle))
    : cards;

  return (
    <div>
      <label style={{ display: 'block', marginBottom: 18 }}>
        <span className="micro" style={{ color: 'rgba(239,231,219,.55)' }}>
          buscar
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="nome da pessoa"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 420,
            marginTop: 8,
            padding: '12px 14px',
            background: '#0E0B09',
            border: '1px solid rgba(239,231,219,.18)',
            color: 'var(--cream)',
            fontSize: 16,
          }}
        />
      </label>
      {visible.length === 0 ? (
        <p style={{ color: 'rgba(239,231,219,.55)' }}>Ninguém com esse nome nesta lista.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {visible.map((card) => (
            <li
              key={card.guestId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '12px 0',
                borderBottom: '1px solid rgba(239,231,219,.08)',
              }}
            >
              <span>
                <span style={{ fontSize: 16 }}>{card.name}</span>
                {card.tableName && (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'rgba(239,231,219,.5)' }}>
                    {card.tableName}
                  </span>
                )}
                {card.usedAt && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 4,
                      fontSize: 11,
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: '#e7a394',
                    }}
                  >
                    já entrou
                  </span>
                )}
              </span>
              <EntryQrDownload name={card.name} token={card.token} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
