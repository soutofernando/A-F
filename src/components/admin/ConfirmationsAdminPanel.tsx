'use client';

import { useMemo, useState } from 'react';
import { ConfirmationPartyEditor } from '@/components/admin/ConfirmationPartyEditor';
import {
  Pill,
  SubmitButton,
  TextField,
  adminTableStyle,
  adminThStyle,
  adminTdStyle,
} from '@/components/admin/ui';
import { matchesSearch } from '@/lib/search-text';

type Name = { name: string; kind: 'adult' | 'child' };
export type ConfirmationRow = {
  id: string;
  attending: boolean;
  party_size: number;
  names: Name[] | null;
  contact: string | null;
  message: string | null;
  createdAtLabel: string;
};

type Props = {
  rows: ConfirmationRow[];
  addFamilyAction: (formData: FormData) => void | Promise<void>;
  unconfirmAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function ConfirmationsAdminPanel({
  rows,
  addFamilyAction,
  unconfirmAction,
  deleteAction,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    return rows.filter((row) => {
      const people = (row.names ?? []).map((n) => n.name);
      return matchesSearch(query, ...people, row.contact ?? '', row.message ?? '');
    });
  }, [rows, query]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <form
        action={addFamilyAction}
        style={{
          display: 'grid',
          gap: 14,
          padding: '16px 18px',
          border: '1px solid rgba(239,231,219,.12)',
          borderRadius: 4,
        }}
      >
        <div className="mono" style={{ fontSize: 10, letterSpacing: '.22em', color: 'rgba(239,231,219,.55)' }}>
          ADICIONAR FAMÍLIA
        </div>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <TextField label="Nome principal" name="name" placeholder="Ex.: Família Silva" />
          <TextField label="Contato (opcional)" name="contact" placeholder="WhatsApp ou e-mail" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(239,231,219,.75)' }}>
          <input type="checkbox" name="attending" defaultChecked />
          Família confirmada (vai)
        </label>
        <div>
          <SubmitButton variant="gold">adicionar família</SubmitButton>
        </div>
      </form>

      <label style={{ display: 'block', maxWidth: 420 }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '.22em', color: 'rgba(239,231,219,.55)' }}>
          BUSCAR PESSOA
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, contato ou recado…"
          className="field"
          style={{ marginTop: 8, width: '100%' }}
        />
      </label>

      {filtered.length === 0 ? (
        <div style={{ fontStyle: 'italic', color: '#6E6A5C', padding: '12px 0' }}>
          {query.trim() ? `Nenhuma família encontrada para “${query.trim()}”.` : 'Nenhuma resposta registrada.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={adminTableStyle}>
            <thead>
              <tr>
                <th style={adminThStyle}>Status</th>
                <th style={adminThStyle}>Nomes</th>
                <th style={adminThStyle}>Contato</th>
                <th style={adminThStyle}>Recado</th>
                <th style={adminThStyle}>Quando</th>
                <th style={adminThStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={adminTdStyle}>
                    {c.attending ? (
                      <Pill variant="success">vai ({c.party_size})</Pill>
                    ) : (
                      <Pill variant="danger">não vai</Pill>
                    )}
                  </td>
                  <td style={adminTdStyle}>
                    <ConfirmationPartyEditor
                      confirmationId={c.id}
                      attending={c.attending}
                      initialNames={c.names ?? []}
                    />
                  </td>
                  <td style={{ ...adminTdStyle, fontSize: 12, color: '#A9A492' }}>{c.contact || '—'}</td>
                  <td style={{ ...adminTdStyle, fontStyle: 'italic', fontSize: 13, maxWidth: 220 }}>
                    {c.message || '—'}
                  </td>
                  <td style={{ ...adminTdStyle, fontSize: 11, color: '#6E6A5C', whiteSpace: 'nowrap' }}>
                    {c.createdAtLabel}
                  </td>
                  <td style={adminTdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                      {c.attending && (
                        <form action={unconfirmAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton variant="outline" small>
                            desconfirmar
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton variant="danger" small>
                          excluir
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
