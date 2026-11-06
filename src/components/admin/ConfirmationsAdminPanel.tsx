'use client';

import { useMemo, useState } from 'react';
import { ConfirmationPartyEditor } from '@/components/admin/ConfirmationPartyEditor';
import { Pill, SubmitButton, TextField } from '@/components/admin/ui';
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

export type ConfirmationListParty = {
  key: string;
  title: string;
  members: Array<{ id: string; label: string; status: string | null }>;
  confirmation: ConfirmationRow | null;
};

type Props = {
  parties: ConfirmationListParty[];
  addFamilyAction: (formData: FormData) => void | Promise<void>;
  unconfirmAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export function ConfirmationsAdminPanel({
  parties,
  addFamilyAction,
  unconfirmAction,
  deleteAction,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return parties;
    return parties.filter((party) => {
      const people = party.members.map((member) => member.label);
      const confirmation = party.confirmation;
      const stored = (confirmation?.names ?? []).map((entry) => entry.name);
      return matchesSearch(
        q,
        party.title,
        ...people,
        ...stored,
        confirmation?.contact ?? '',
        confirmation?.message ?? '',
      );
    });
  }, [parties, query]);

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
          {query.trim() ? `Nenhuma família encontrada para “${query.trim()}”.` : 'Nenhuma família na pré-confirmação ainda.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {filtered.map((party) => {
            const yesCount = party.members.filter((member) => member.status === 'yes').length;
            const noCount = party.members.filter((member) => member.status === 'no').length;
            const hasRsvp = party.members.some((member) => member.status === 'yes' || member.status === 'no');
            const confirmation = party.confirmation;

            return (
              <div
                key={party.key}
                style={{
                  border: '1px solid rgba(239,231,219,.12)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  background: 'rgba(14,11,9,.35)',
                  opacity: hasRsvp ? 1 : 0.72,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  <div className="serif" style={{ fontSize: 20, color: 'var(--cream)', lineHeight: 1.25 }}>
                    {party.members.length > 1 ? `Família (${party.members.length})` : party.title}
                  </div>
                  {party.members.length > 1 && (
                    <Pill variant={yesCount > 0 ? 'success' : noCount > 0 ? 'danger' : 'muted'}>
                      {yesCount} vai · {noCount} não · {party.members.length - yesCount - noCount} aguardando
                    </Pill>
                  )}
                </div>
                {party.members.length > 1 && (
                  <p style={{ fontSize: 12, color: 'rgba(239,231,219,.45)', margin: '0 0 10px' }}>
                    {party.members.map((member) => member.label).join(' · ')}
                  </p>
                )}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                  {party.members.map((member) => (
                    <li
                      key={member.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'rgba(239,231,219,.9)' }}>{member.label}</span>
                      {member.status === 'yes' ? (
                        <Pill variant="success">vai</Pill>
                      ) : member.status === 'no' ? (
                        <Pill variant="danger">não vai</Pill>
                      ) : (
                        <Pill variant="muted">aguardando</Pill>
                      )}
                    </li>
                  ))}
                </ul>

                {confirmation && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(239,231,219,.08)' }}>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(239,231,219,.45)', marginBottom: 4 }}>
                      EDITAR PRÉ-CONFIRMAÇÃO
                    </div>
                    <ConfirmationPartyEditor
                      confirmationId={confirmation.id}
                      attending={confirmation.attending}
                      initialNames={confirmation.names ?? []}
                    />
                    <p style={{ margin: '12px 0 0', fontSize: 12, color: '#A9A492', lineHeight: 1.5 }}>
                      {confirmation.contact || 'Sem contato'}
                      {' · '}
                      {confirmation.message || 'Sem recado'}
                      {' · '}
                      {confirmation.createdAtLabel}
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                      {confirmation.attending && (
                        <form action={unconfirmAction}>
                          <input type="hidden" name="id" value={confirmation.id} />
                          <SubmitButton variant="outline" small>
                            desconfirmar
                          </SubmitButton>
                        </form>
                      )}
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={confirmation.id} />
                        <SubmitButton variant="danger" small>
                          excluir
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
