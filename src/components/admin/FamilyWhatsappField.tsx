'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateConfirmationWhatsapp } from '@/app/admin/confirmacoes/actions';

type Props = {
  confirmationId: string;
  initialValue: string;
};

export function FamilyWhatsappField({ confirmationId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initialValue);
    setSavedValue(initialValue);
  }, [confirmationId, initialValue]);

  const save = () => {
    const next = value.trim().replace(/\s+/g, ' ');
    if (next === savedValue.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await updateConfirmationWhatsapp(confirmationId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedValue(next);
      setValue(next);
    });
  };

  return (
    <label style={{ display: 'block', margin: '0 0 14px', maxWidth: 320 }}>
      <span
        className="mono"
        style={{
          display: 'block',
          fontSize: 10,
          letterSpacing: '.18em',
          color: 'rgba(239,231,219,.45)',
          marginBottom: 6,
        }}
      >
        WHATSAPP DO RESPONSÁVEL
      </span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        placeholder="(83) 99999-9999"
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        disabled={pending}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: '#0E0B09',
          border: '1px solid rgba(239,231,219,.18)',
          borderRadius: 8,
          color: 'var(--cream)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <span style={{ display: 'block', marginTop: 4, fontSize: 11, color: error ? '#f0a8a8' : '#6E6A5C' }}>
        {error ? error : pending ? 'salvando…' : savedValue ? 'salvo' : 'salva ao sair do campo'}
      </span>
    </label>
  );
}
