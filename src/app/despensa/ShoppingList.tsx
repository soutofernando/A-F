'use client';

import { Fragment, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type ShoppingItem = {
  id: string;
  name: string;
  unit: string;
  needed_qty: number | string;
  purchased_qty: number | string;
  display_order: number;
  category: string;
  notes: string | null;
};

function num(v: number | string) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(v: number | string) {
  return num(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function remainingOf(item: ShoppingItem) {
  const needed = num(item.needed_qty);
  const bought = num(item.purchased_qty);
  if (needed <= 0) return null;
  return Math.max(needed - bought, 0);
}

export function ShoppingList({ initialItems }: { initialItems: ShoppingItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [qtyById, setQtyById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const closed = items.filter((i) => num(i.needed_qty) > 0);
    const done = closed.filter((i) => remainingOf(i) === 0).length;
    return { done, total: closed.length };
  }, [items]);

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const key = item.category || 'Outros';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const contribute = async (item: ShoppingItem) => {
    setError(null);
    const raw = (qtyById[item.id] ?? '').replace(',', '.').trim();
    const qty = Number(raw);
    if (!raw || !Number.isFinite(qty) || qty <= 0) {
      setError('Informe a quantidade que você está comprando.');
      return;
    }

    const cap = remainingOf(item);
    if (cap != null && qty > cap) {
      setError(`${item.name}: só faltam ${fmt(cap)} ${item.unit}.`);
      return;
    }

    setBusyId(item.id);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('contribute_shopping_item', {
      p_item_id: item.id,
      p_qty: qty,
      p_buyer_name: '-',
    });

    if (err) {
      setError(err.message);
      setBusyId(null);
      return;
    }

    const payload = data as { purchased_qty: number; needed_qty: number };

    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, purchased_qty: payload.purchased_qty, needed_qty: payload.needed_qty }
          : row,
      ),
    );
    setQtyById((prev) => ({ ...prev, [item.id]: '' }));
    setBusyId(null);
    setFlashId(item.id);
    window.setTimeout(() => setFlashId((id) => (id === item.id ? null : id)), 900);
  };

  return (
    <main className="sh-root" data-theme="light">
      <div className="sh-toolbar">
        <h1>Lista de compras</h1>
        <span>
          {totals.done}/{totals.total} completos · Enter ou + soma no “já temos”
        </span>
      </div>

      {error && <div className="sh-error">{error}</div>}

      <div className="sh-sheet">
        <table>
          <thead>
            <tr>
              <th className="col-item">Item</th>
              <th className="col-num">Un</th>
              <th className="col-num">Meta</th>
              <th className="col-num">Já temos</th>
              <th className="col-num">Falta</th>
              <th className="col-add">Comprando</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([category, rows]) => (
              <Fragment key={category}>
                <tr className="sh-cat">
                  <td colSpan={6}>{category}</td>
                </tr>
                {rows.map((item) => {
                  const needed = num(item.needed_qty);
                  const bought = num(item.purchased_qty);
                  const remaining = remainingOf(item);
                  const open = needed <= 0;
                  const done = remaining === 0 && !open;
                  const busy = busyId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`${done ? 'is-done' : ''}${flashId === item.id ? ' is-flash' : ''}`}
                    >
                      <td className="col-item">
                        {item.name}
                        {item.notes ? <small>{item.notes}</small> : null}
                      </td>
                      <td className="col-num">{item.unit}</td>
                      <td className="col-num">{open ? '—' : fmt(needed)}</td>
                      <td className="col-num">{fmt(bought)}</td>
                      <td className={`col-num${done ? ' is-ok' : ''}`}>
                        {open ? 'aberto' : done ? '0' : fmt(remaining ?? 0)}
                      </td>
                      <td className="col-add">
                        {done ? (
                          <span className="sh-ok">ok</span>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void contribute(item);
                            }}
                          >
                            <input
                              inputMode="decimal"
                              value={qtyById[item.id] ?? ''}
                              onChange={(e) => setQtyById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="0"
                              aria-label={`Comprando ${item.name}`}
                              disabled={busy}
                            />
                            <button type="submit" disabled={busy} aria-label={`Somar ${item.name}`}>
                              {busy ? '…' : '+'}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
