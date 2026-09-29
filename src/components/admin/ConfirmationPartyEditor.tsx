'use client';

import { useEffect, useRef, useState, useTransition, type CSSProperties } from 'react';
import {
  updateConfirmationNames,
  type ConfirmationName,
} from '@/app/admin/confirmacoes/actions';

type Props = {
  confirmationId: string;
  attending: boolean;
  initialNames: ConfirmationName[];
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: 8,
  alignItems: 'center',
  marginTop: 8,
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 120,
  padding: '6px 10px',
  fontSize: 13,
  background: '#0E0B09',
  border: '1px solid rgba(239,231,219,.18)',
  color: 'var(--cream)',
  borderRadius: 8,
  outline: 'none',
};

const childToggleStyle = (on: boolean): CSSProperties => ({
  fontSize: 10,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '6px 10px',
  borderRadius: 999,
  border: `1px solid ${on ? 'rgba(232,197,138,.45)' : 'rgba(239,231,219,.15)'}`,
  background: on ? 'rgba(212,175,122,.2)' : 'rgba(239,231,219,.05)',
  color: on ? '#E8C58A' : 'rgba(239,231,219,.55)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

export function ConfirmationPartyEditor({ confirmationId, attending, initialNames }: Props) {
  const [names, setNames] = useState<ConfirmationName[]>(initialNames);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setNames(initialNames);
  }, [confirmationId, initialNames]);

  useEffect(() => {
    if (focusIndex == null) return;
    inputRefs.current[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex, names.length]);

  const persist = (next: ConfirmationName[]) => {
    setError(null);
    startTransition(async () => {
      const result = await updateConfirmationNames(confirmationId, attending, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNames(result.names);
    });
  };

  const updateAt = (index: number, patch: Partial<ConfirmationName>) => {
    const next = names.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    setNames(next);
  };

  const saveAt = (index: number) => {
    const trimmed = names[index]?.name.trim() ?? '';
    if (!trimmed) {
      const savedAtIndex = initialNames[index]?.name.trim() ?? '';
      const isNewEmptyRow = !savedAtIndex;
      if (isNewEmptyRow && names.length > 1) {
        setNames((current) => current.filter((_, i) => i !== index));
        setError(null);
        return;
      }
      setError('O nome não pode ficar vazio.');
      setNames((current) =>
        current.map((entry, i) => (i === index ? { ...entry, name: initialNames[index]?.name ?? '' } : entry)),
      );
      return;
    }
    const normalized = names.map((entry, i) =>
      i === index ? { ...entry, name: trimmed } : entry,
    );
    persist(normalized);
  };

  const addPerson = () => {
    if (names.length >= 30) {
      setError('Limite de 30 pessoas por confirmação.');
      return;
    }
    setError(null);
    const nextIndex = names.length;
    setNames((current) => [...current, { name: '', kind: 'adult' }]);
    setFocusIndex(nextIndex);
  };

  const toggleChild = (index: number) => {
    const next: ConfirmationName[] = names.map((entry, i) => {
      if (i !== index) return entry;
      const kind: ConfirmationName['kind'] = entry.kind === 'child' ? 'adult' : 'child';
      return { ...entry, kind };
    });
    persist(next);
  };

  const removeAt = (index: number) => {
    if (names.length <= 1 && attending) {
      setError('Não é possível remover a última pessoa de uma confirmação “vai”.');
      return;
    }
    persist(names.filter((_, i) => i !== index));
  };

  if (!attending || names.length === 0) {
    return <span style={{ color: '#6E6A5C' }}>—</span>;
  }

  return (
    <div style={{ minWidth: 220 }}>
      {names.map((entry, index) => (
        <div key={`${confirmationId}-${index}`} style={rowStyle}>
          <input
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            value={entry.name}
            disabled={pending}
            placeholder="Nome"
            onChange={(e) => updateAt(index, { name: e.target.value })}
            onBlur={() => saveAt(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={inputStyle}
            aria-label={`Nome ${index + 1}`}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => toggleChild(index)}
            style={childToggleStyle(entry.kind === 'child')}
            title={entry.kind === 'child' ? 'Marcado como criança' : 'Marcar como criança'}
          >
            {entry.kind === 'child' ? '✿ criança' : 'adulto'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => removeAt(index)}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              border: '1px solid rgba(239,100,100,.35)',
              borderRadius: 8,
              background: 'transparent',
              color: '#f0a8a8',
              cursor: 'pointer',
            }}
            aria-label={`Remover ${entry.name}`}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={pending || names.length >= 30}
        onClick={addPerson}
        style={{
          marginTop: 10,
          padding: '6px 12px',
          fontSize: 10,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          border: '1px solid rgba(239,231,219,.22)',
          borderRadius: 8,
          background: 'rgba(239,231,219,.06)',
          color: 'rgba(239,231,219,.75)',
          cursor: pending || names.length >= 30 ? 'not-allowed' : 'pointer',
        }}
      >
        + adicionar pessoa
      </button>
      {error ? (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f0a8a8' }}>{error}</p>
      ) : null}
      {pending ? (
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#6E6A5C', letterSpacing: '.1em' }}>SALVANDO…</p>
      ) : null}
    </div>
  );
}
