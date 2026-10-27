'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type PanelaItem = {
  id: string;
  name: string;
  display_order: number;
  claimed: boolean;
};

export function ChaPanelaList({ initialItems }: { initialItems: PanelaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [active, setActive] = useState<PanelaItem | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [customItem, setCustomItem] = useState('');
  const [customGiver, setCustomGiver] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [customBusy, setCustomBusy] = useState(false);
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    setActive(null);
    setName('');
    setError(null);
    openerRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [active, busy, close]);

  const open = (item: PanelaItem, button: HTMLButtonElement) => {
    if (item.claimed) return;
    openerRef.current = button;
    setName('');
    setError(null);
    setActive(item);
  };

  const confirm = async () => {
    if (!active || busy) return;
    const giver = name.trim();
    if (giver.length < 2) {
      setError('Escreva o nome de quem vai dar o presente.');
      inputRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc('claim_panela_item', {
      p_item_id: active.id,
      p_giver_name: giver,
    });

    if (err) {
      const taken = /já foi escolhido/i.test(err.message);
      if (taken) {
        setItems((prev) => prev.map((row) => (row.id === active.id ? { ...row, claimed: true } : row)));
        setError('Esse item já foi escolhido.');
      } else {
        setError('Não foi possível registrar. Tente de novo.');
      }
      setBusy(false);
      return;
    }

    setItems((prev) => prev.map((row) => (row.id === active.id ? { ...row, claimed: true } : row)));
    setBusy(false);
    setActive(null);
    setName('');
    openerRef.current?.focus();
  };

  const addCustom = async () => {
    if (customBusy) return;
    const itemName = customItem.trim();
    const giver = customGiver.trim();
    if (itemName.length < 2) {
      setCustomError('Escreva o nome do presente.');
      return;
    }
    if (giver.length < 2) {
      setCustomError('Escreva o nome de quem vai dar.');
      return;
    }

    setCustomBusy(true);
    setCustomError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('add_custom_panela_item', {
      p_item_name: itemName,
      p_giver_name: giver,
    });

    if (err || !data) {
      setCustomError('Não foi possível adicionar. Tente de novo.');
      setCustomBusy(false);
      return;
    }

    const row = data as { id: string; name: string; display_order: number };
    setItems((prev) => [
      ...prev,
      { id: row.id, name: row.name, display_order: row.display_order, claimed: true },
    ]);
    setCustomItem('');
    setCustomGiver('');
    setCustomBusy(false);
  };

  return (
    <>
      {items.length === 0 ? <p className="cp-empty">A lista ainda não está disponível.</p> : null}
      <ul className="cp-items">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={item.claimed}
              onClick={(event) => open(item, event.currentTarget)}
            >
              <span className="cp-name">{item.name}</span>
              {item.claimed ? <span className="cp-chosen">escolhido</span> : null}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="cp-custom"
        onSubmit={(event) => {
          event.preventDefault();
          void addCustom();
        }}
      >
        <p>Quer dar outra coisa?</p>
        <label>
          O presente
          <input
            value={customItem}
            onChange={(event) => setCustomItem(event.target.value)}
            maxLength={120}
            disabled={customBusy}
          />
        </label>
        <label>
          Quem vai dar
          <input
            value={customGiver}
            onChange={(event) => setCustomGiver(event.target.value)}
            maxLength={80}
            autoComplete="name"
            disabled={customBusy}
          />
        </label>
        {customError ? <p className="cp-error">{customError}</p> : null}
        <button type="submit" className="cp-confirm" disabled={customBusy}>
          {customBusy ? 'Adicionando' : 'Adicionar'}
        </button>
      </form>

      {active ? (
        <div className="cp-modal" onMouseDown={close}>
          <form
            className="cp-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            <h2 id={titleId}>Quem vai dar o presente</h2>
            <p className="cp-dialog-item">{active.name}</p>
            <label>
              Nome
              <input
                ref={inputRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                disabled={busy}
              />
            </label>
            {error ? <p className="cp-error">{error}</p> : null}
            <div className="cp-actions">
              <button type="submit" className="cp-confirm" disabled={busy}>
                {busy ? 'Confirmando' : 'Confirmar'}
              </button>
              <button type="button" className="cp-cancel" onClick={close} disabled={busy}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
