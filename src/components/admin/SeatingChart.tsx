'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { saveSeatingChart } from '@/app/admin/mesas/actions';
import { Stat } from '@/components/admin/ui';
import { normalizeName } from '@/lib/rsvp-match';
import {
  blankTable,
  commitSeatLabel,
  MAX_SEATS,
  MAX_TABLES,
  moveTable,
  nextTableName,
  placeGuest,
  suggestGuests,
  type SeatingDraft,
  type SeatingGuest,
  type SeatingTable,
} from '@/lib/admin/seating';

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type MenuState = {
  tableId: string;
  seatId: string;
  top: number;
  left: number;
  width: number;
  items: SeatingGuest[];
  activeIndex: number;
};

function takenIds(tables: SeatingTable[], exceptSeatId?: string) {
  const taken = new Set<string>();
  for (const table of tables) {
    for (const seat of table.seats) {
      if (seat.guestId && seat.id !== exceptSeatId) taken.add(seat.guestId);
    }
  }
  return taken;
}

function seatTableName(tables: SeatingTable[], guestId: string) {
  for (const table of tables) {
    if (table.seats.some((seat) => seat.guestId === guestId)) return table.name || 'uma mesa';
  }
  return null;
}

export function SeatingChart({
  guests,
  initialTables,
  initialDraft,
}: {
  guests: SeatingGuest[];
  initialTables: SeatingTable[];
  initialDraft: SeatingDraft;
}) {
  const menuId = useId();
  const [tables, setTables] = useState(initialTables);
  const [activeTableId, setActiveTableId] = useState<string | null>(initialTables[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [showDeclined, setShowDeclined] = useState(false);
  const [draft, setDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>(initialDraft ? 'pending' : 'saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [placedSeatId, setPlacedSeatId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [mounted, setMounted] = useState(false);

  const dirty = useRef(false);
  const saveGen = useRef(0);
  const saveChain = useRef(Promise.resolve());
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  useEffect(() => {
    setMounted(true);
  }, []);

  const persist = useCallback(async (snapshot: SeatingTable[]) => {
    const gen = ++saveGen.current;
    dirty.current = false;
    setSaveState('saving');
    setSaveError(null);
    const run = saveChain.current.then(() => saveSeatingChart(snapshot));
    saveChain.current = run.then(
      () => undefined,
      () => undefined,
    );
    const result = await run;
    if (saveGen.current !== gen) return;
    if (!result.ok) {
      dirty.current = true;
      setSaveState('error');
      setSaveError(result.error);
      return;
    }
    if (dirty.current) return;
    setSaveState('saved');
    setDraft(null);
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(() => {
      void persist(tablesRef.current);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [tables, persist]);

  useEffect(() => {
    if (!placedSeatId) return;
    const seat = document.querySelector(`[data-seat-id="${CSS.escape(placedSeatId)}"]`);
    seat?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const timer = window.setTimeout(() => setPlacedSeatId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [placedSeatId]);

  useEffect(() => {
    if (!menu) return;
    const reposition = () => {
      const input = document.querySelector<HTMLInputElement>(
        `input[data-seat-id="${CSS.escape(menu.seatId)}"]`,
      );
      if (!input) {
        setMenu(null);
        return;
      }
      const rect = input.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom;
      const top = below < 220 && rect.top > below ? Math.max(8, rect.top - 228) : rect.bottom + 4;
      setMenu((current) =>
        current && current.seatId === menu.seatId
          ? { ...current, top, left: rect.left, width: Math.max(rect.width, 220) }
          : current,
      );
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [menu]);

  const touch = () => {
    dirty.current = true;
    setSaveState('pending');
    setSaveError(null);
  };

  const guestById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);

  const seatedIds = useMemo(() => takenIds(tables), [tables]);

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;

  const stats = useMemo(() => {
    let filled = 0;
    let freeText = 0;
    let openSeats = 0;
    for (const table of tables) {
      for (const seat of table.seats) {
        if (seat.guestId) filled += 1;
        else if (seat.label.trim()) {
          filled += 1;
          freeText += 1;
        } else openSeats += 1;
      }
    }
    const unseated = guests.filter((guest) => !seatedIds.has(guest.id));
    return {
      filled,
      freeText,
      openSeats,
      coming: unseated.filter((guest) => guest.status !== 'no').length,
      declined: unseated.filter((guest) => guest.status === 'no').length,
    };
  }, [tables, guests, seatedIds]);

  const poolQuery = normalizeName(query);
  const unseated = guests
    .filter((guest) => !seatedIds.has(guest.id))
    .filter((guest) => {
      if (!poolQuery) return true;
      return normalizeName(`${guest.name} ${guest.group ?? ''}`).includes(poolQuery);
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const coming = unseated.filter((guest) => guest.status !== 'no');
  const declined = unseated.filter((guest) => guest.status === 'no');

  const alreadySeated = poolQuery
    ? guests
        .filter(
          (guest) =>
            seatedIds.has(guest.id) &&
            normalizeName(`${guest.name} ${guest.group ?? ''}`).includes(poolQuery),
        )
        .slice(0, 4)
    : [];

  const updateTable = (tableId: string, recipe: (table: SeatingTable) => SeatingTable) => {
    setTables((current) => current.map((table) => (table.id === tableId ? recipe(table) : table)));
    touch();
  };

  const addTable = () => {
    if (tables.length >= MAX_TABLES) {
      setNotice('O mapa aceita no máximo 80 mesas.');
      return;
    }
    const table = blankTable(nextTableName(tables));
    setTables((current) => [...current, table]);
    setActiveTableId(table.id);
    setNotice(null);
    touch();
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-table-id="${CSS.escape(table.id)}"]`)
        ?.scrollIntoView({ inline: 'end', block: 'nearest' });
    });
  };

  const removeTable = (tableId: string) => {
    const table = tables.find((item) => item.id === tableId);
    if (!table) return;
    const filled = table.seats.some((seat) => seat.guestId || seat.label.trim());
    const name = table.name.trim() || 'esta mesa';
    if (filled && !window.confirm(`Tirar "${name}" do mapa? Quem está nela volta para a lista.`)) return;
    const next = tables.filter((item) => item.id !== tableId);
    setTables(next);
    if (activeTableId === tableId) setActiveTableId(next[0]?.id ?? null);
    touch();
  };

  const seatGuest = (guest: SeatingGuest) => {
    let base = tables;
    let targetId = base.some((table) => table.id === activeTableId) ? activeTableId : base[0]?.id ?? null;
    if (!targetId) {
      if (base.length >= MAX_TABLES) {
        setNotice('O mapa aceita no máximo 80 mesas.');
        return;
      }
      const created = blankTable('Mesa 1');
      base = [created];
      targetId = created.id;
      setActiveTableId(created.id);
    }
    const placed = placeGuest(base, targetId, guest);
    if (!placed.changed) {
      if (!placed.seatId) {
        const name = base.find((table) => table.id === targetId)?.name || 'Essa mesa';
        setNotice(`${name} já tem ${MAX_SEATS} lugares. Abra outra mesa.`);
        return;
      }
      setPlacedSeatId(placed.seatId);
      return;
    }
    setNotice(null);
    setPlacedSeatId(placed.seatId);
    setTables(placed.tables);
    touch();
  };

  const openMenu = (tableId: string, seatId: string, label: string) => {
    const input = document.querySelector<HTMLInputElement>(`input[data-seat-id="${CSS.escape(seatId)}"]`);
    if (!input) return;
    const items = suggestGuests(guests, label, takenIds(tablesRef.current, seatId));
    if (items.length === 0) {
      setMenu(null);
      return;
    }
    const rect = input.getBoundingClientRect();
    setMenu({
      tableId,
      seatId,
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
      items,
      activeIndex: 0,
    });
  };

  const pickGuest = (tableId: string, seatId: string, guest: SeatingGuest) => {
    setMenu(null);
    setTables((current) =>
      current.map((table) => ({
        ...table,
        seats: table.seats.map((seat) => {
          if (table.id === tableId && seat.id === seatId) {
            return { ...seat, guestId: guest.id, label: guest.name };
          }
          if (seat.guestId === guest.id) return { ...seat, guestId: null, label: '' };
          return seat;
        }),
      })),
    );
    setPlacedSeatId(seatId);
    touch();
  };

  const onSeatKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    table: SeatingTable,
    seatIndex: number,
  ) => {
    const seat = table.seats[seatIndex];
    if (event.key === 'ArrowDown' && menu && menu.seatId === seat.id) {
      event.preventDefault();
      setMenu({ ...menu, activeIndex: (menu.activeIndex + 1) % menu.items.length });
      return;
    }
    if (event.key === 'ArrowUp' && menu && menu.seatId === seat.id) {
      event.preventDefault();
      setMenu({
        ...menu,
        activeIndex: (menu.activeIndex - 1 + menu.items.length) % menu.items.length,
      });
      return;
    }
    if (event.key === 'Escape') {
      setMenu(null);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (menu && menu.seatId === seat.id && menu.items[menu.activeIndex]) {
        pickGuest(table.id, seat.id, menu.items[menu.activeIndex]);
        return;
      }
      const next = table.seats[seatIndex + 1];
      if (next) {
        document.querySelector<HTMLInputElement>(`input[data-seat-id="${CSS.escape(next.id)}"]`)?.focus();
      }
    }
  };

  const saveLabel =
    saveState === 'saving'
      ? 'Salvando…'
      : saveState === 'pending'
        ? 'Salvando em instantes…'
        : saveState === 'saved'
          ? 'Mapa salvo'
        : saveState === 'error'
          ? 'Não salvou'
          : saveState === 'saved' && tables.length > 0
            ? 'Mapa salvo'
            : '';

  const printTables = tables
    .map((table) => ({
      id: table.id,
      name: table.name.trim() || 'Mesa',
      note: table.note.trim(),
      people: table.seats.flatMap((seat, index) => {
        const name = seat.label.trim();
        return name ? [{ n: index + 1, name }] : [];
      }),
    }))
    .filter((table) => table.people.length > 0 || table.note);
  const printNames = printTables.reduce((sum, table) => sum + table.people.length, 0);

  return (
    <div>
      <section className="seating-print" aria-hidden="true">
        <header className="seating-print-head">
          <div>
            <p className="seating-print-kicker">Alicia & Fernando</p>
            <h1>mapa de mesas</h1>
          </div>
          <p className="seating-print-meta">
            28 de novembro de 2026
            <br />
            {printTables.length} {printTables.length === 1 ? 'mesa' : 'mesas'} · {printNames}{' '}
            {printNames === 1 ? 'nome' : 'nomes'}
          </p>
        </header>
        {printTables.length === 0 ? (
          <p className="seating-print-empty">Nenhuma mesa preenchida.</p>
        ) : (
          <div className="seating-print-grid">
            {printTables.map((table) => (
              <article key={table.id} className="seating-print-card">
                <h2>{table.name}</h2>
                {table.note ? <p className="seating-print-note">{table.note}</p> : null}
                <ol>
                  {table.people.map((person) => (
                    <li key={`${table.id}-${person.n}`}>
                      <span className="seating-print-num">{String(person.n).padStart(2, '0')}</span>
                      <span>{person.name}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="seating-screen">
      <div className="seating-stats">
        <Stat label="Mesas" value={tables.length} meta={stats.openSeats ? `${stats.openSeats} lugares vazios` : 'sem lugares vazios'} />
        <Stat
          label="Nomes no mapa"
          value={stats.filled}
          meta={
            stats.filled === 0
              ? 'nenhum nome ainda'
              : stats.freeText
                ? `${stats.freeText} fora da lista`
                : 'todos da lista'
          }
        />
        <Stat
          label="Sem mesa"
          value={stats.coming}
          meta={stats.declined ? `${stats.declined} não vão` : 'confirmados e sem resposta'}
        />
      </div>

      <div className="seating-toolbar">
        <p className="seating-save" aria-live="polite">
          {saveLabel}
          {saveError ? ` — ${saveError}` : ''}
        </p>
        <div className="seating-toolbar-actions">
          {saveState === 'error' && (
            <button type="button" className="admin-btn seating-text-btn" onClick={() => void persist(tablesRef.current)}>
              Tentar de novo
            </button>
          )}
          {saveState === 'pending' && !draft && (
            <button type="button" className="admin-btn admin-btn-gold seating-text-btn" onClick={() => void persist(tables)}>
              Salvar mapa
            </button>
          )}
          <button type="button" className="admin-btn seating-text-btn" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
      </div>

      {draft && (
        <div className="seating-banner">
          <p>
            {draft.kind === 'seed'
              ? `Montei ${draft.tables === 1 ? 'uma coluna' : `${draft.tables} colunas`} com a mesa que já estava no cadastro. Salve para guardar o mapa.`
              : `${draft.people === 1 ? 'Uma pessoa entrou' : `${draft.people} pessoas entraram`} na mesa que já estava no cadastro. Salve para guardar.`}
          </p>
          <button type="button" className="admin-btn admin-btn-gold seating-text-btn" onClick={() => void persist(tables)}>
            Salvar mapa
          </button>
        </div>
      )}

      {notice && (
        <p className="seating-notice" aria-live="polite">
          {notice}
        </p>
      )}

      <div className="seating-body">
        <aside className="seating-pool">
          <div className="seating-pool-head">
            <h2>Sem mesa</h2>
            <p>{activeTable ? `Um clique senta em ${activeTable.name || 'a mesa em foco'}.` : 'Crie uma mesa para começar a sentar.'}</p>
          </div>
          <input
            className="admin-input seating-search"
            type="search"
            value={query}
            placeholder="Buscar convidado"
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar convidado sem mesa"
          />
          <div className="seating-pool-list">
            {coming.length === 0 && declined.length === 0 && (
              <p className="seating-empty">
                {guests.length === 0
                  ? 'Nenhum convidado cadastrado.'
                  : poolQuery
                    ? 'Ninguém com esse nome fora das mesas.'
                    : 'Quem vem já tem lugar.'}
              </p>
            )}
            {coming.map((guest) => (
              <button
                key={guest.id}
                type="button"
                className="seating-person"
                onClick={() => seatGuest(guest)}
              >
                <span className="seating-person-name">
                  {guest.name}
                  {guest.companions > 0 && (
                    <span className="seating-plus" title={`${guest.companions} acompanhante(s) sem nome na lista`}>
                      +{guest.companions}
                    </span>
                  )}
                </span>
                <span className="seating-person-meta">
                  {guest.group || (guest.status === 'pending' ? 'sem resposta' : guest.status === 'yes' ? 'confirmou' : '')}
                  {guest.group && guest.status === 'pending' ? ' · sem resposta' : ''}
                </span>
              </button>
            ))}
            {declined.length > 0 && (
              <button type="button" className="seating-declined-toggle" onClick={() => setShowDeclined((open) => !open)}>
                {showDeclined ? 'Esconder' : 'Mostrar'} quem não vai ({declined.length})
              </button>
            )}
            {showDeclined &&
              declined.map((guest) => (
                <button key={guest.id} type="button" className="seating-person is-no" onClick={() => seatGuest(guest)}>
                  <span className="seating-person-name">{guest.name}</span>
                  <span className="seating-person-meta">{guest.group || 'não vai'}</span>
                </button>
              ))}
            {alreadySeated.length > 0 && (
              <div className="seating-found">
                {alreadySeated.map((guest) => (
                  <p key={guest.id}>
                    {guest.name} já está em {seatTableName(tables, guest.id)}.
                  </p>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="seating-board">
          {tables.map((table, tableIndex) => {
            const named = table.seats.filter((seat) => seat.guestId || seat.label.trim()).length;
            const duplicate =
              normalizeName(table.name) !== '' &&
              tables.filter((item) => normalizeName(item.name) === normalizeName(table.name)).length > 1;
            const active = table.id === activeTableId;
            return (
              <section
                key={table.id}
                className={active ? 'seating-col is-active' : 'seating-col'}
                data-table-id={table.id}
                onPointerDown={() => setActiveTableId(table.id)}
              >
                <header className="seating-col-head">
                  <div className="seating-col-tools">
                    <button
                      type="button"
                      aria-label="Mover mesa para a esquerda"
                      disabled={tableIndex === 0}
                      onClick={() => {
                        setTables((current) => moveTable(current, table.id, -1));
                        touch();
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label="Mover mesa para a direita"
                      disabled={tableIndex === tables.length - 1}
                      onClick={() => {
                        setTables((current) => moveTable(current, table.id, 1));
                        touch();
                      }}
                    >
                      ›
                    </button>
                    <button type="button" className="is-remove" aria-label={`Remover ${table.name || 'mesa'}`} onClick={() => removeTable(table.id)}>
                      ×
                    </button>
                  </div>
                  <input
                    className="seating-name"
                    aria-label="Nome da mesa"
                    value={table.name}
                    maxLength={80}
                    onChange={(event) => updateTable(table.id, (item) => ({ ...item, name: event.target.value }))}
                    onFocus={() => setActiveTableId(table.id)}
                    onBlur={() => {
                      const trimmed = table.name.trim().replace(/\s+/g, ' ') || `Mesa ${tableIndex + 1}`;
                      if (trimmed === table.name) return;
                      updateTable(table.id, (item) => ({ ...item, name: trimmed }));
                    }}
                  />
                  <input
                    className="seating-note"
                    aria-label="Nota da mesa"
                    value={table.note}
                    maxLength={160}
                    placeholder="nota da mesa"
                    onChange={(event) => updateTable(table.id, (item) => ({ ...item, note: event.target.value }))}
                    onBlur={() => {
                      const trimmed = table.note.trim().replace(/\s+/g, ' ');
                      if (trimmed === table.note) return;
                      updateTable(table.id, (item) => ({ ...item, note: trimmed }));
                    }}
                  />
                  <p className="seating-count">
                    {named} de {table.seats.length}
                    {duplicate ? ' · outra coluna usa este nome' : ''}
                  </p>
                </header>

                <div className="seating-seats">
                  {table.seats.map((seat, seatIndex) => {
                    const linked = seat.guestId ? guestById.get(seat.guestId) : undefined;
                    const conflict =
                      !seat.guestId &&
                      seat.label.trim() !== '' &&
                      guests.some(
                        (guest) =>
                          seatedIds.has(guest.id) && normalizeName(guest.name) === normalizeName(seat.label),
                      );
                    const tone = linked?.status === 'no' ? 'is-no' : linked?.status === 'pending' ? 'is-pending' : '';
                    return (
                      <div
                        key={seat.id}
                        className={[
                          'seating-seat',
                          tone,
                          conflict ? 'is-conflict' : '',
                          placedSeatId === seat.id ? 'is-placed' : '',
                          linked ? 'is-linked' : seat.label.trim() ? 'is-free' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="seating-index">{String(seatIndex + 1).padStart(2, '0')}</span>
                        <input
                          data-seat-id={seat.id}
                          value={seat.label}
                          maxLength={120}
                          placeholder="nome"
                          autoComplete="off"
                          spellCheck={false}
                          aria-label={`Lugar ${seatIndex + 1} de ${table.name || 'mesa'}`}
                          aria-autocomplete="list"
                          aria-expanded={menu?.seatId === seat.id}
                          aria-controls={menu?.seatId === seat.id ? menuId : undefined}
                          title={
                            conflict
                              ? 'Já existe alguém com esse nome em outra mesa'
                              : linked
                                ? 'Convidado da lista'
                                : seat.label.trim()
                                  ? 'Nome fora da lista'
                                  : undefined
                          }
                          onFocus={() => {
                            setActiveTableId(table.id);
                            openMenu(table.id, seat.id, seat.label);
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            setTables((current) =>
                              current.map((item) => {
                                if (item.id !== table.id) return item;
                                return {
                                  ...item,
                                  seats: item.seats.map((currentSeat) => {
                                    if (currentSeat.id !== seat.id) return currentSeat;
                                    const owner = currentSeat.guestId
                                      ? guestById.get(currentSeat.guestId)
                                      : undefined;
                                    const still =
                                      owner && normalizeName(owner.name) === normalizeName(value);
                                    return {
                                      ...currentSeat,
                                      label: value,
                                      guestId: still ? currentSeat.guestId : null,
                                    };
                                  }),
                                };
                              }),
                            );
                            touch();
                            window.requestAnimationFrame(() => openMenu(table.id, seat.id, value));
                          }}
                          onBlur={() => {
                            setMenu(null);
                            const next = commitSeatLabel(tablesRef.current, table.id, seat.id, guests);
                            if (next === tablesRef.current) return;
                            touch();
                            setTables(next);
                          }}
                          onKeyDown={(event) => onSeatKeyDown(event, table, seatIndex)}
                        />
                        <button
                          type="button"
                          className="seating-seat-remove"
                          aria-label={`Tirar lugar ${seatIndex + 1}`}
                          onClick={() => {
                            updateTable(table.id, (item) => {
                              const seats = item.seats.filter((currentSeat) => currentSeat.id !== seat.id);
                              return { ...item, seats: seats.length > 0 ? seats : [{ id: crypto.randomUUID(), guestId: null, label: '' }] };
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="seating-col-foot">
                  <button
                    type="button"
                    disabled={table.seats.length >= MAX_SEATS}
                    onClick={() =>
                      updateTable(table.id, (item) => ({
                        ...item,
                        seats: [...item.seats, { id: crypto.randomUUID(), guestId: null, label: '' }],
                      }))
                    }
                  >
                    + lugar
                  </button>
                </div>
              </section>
            );
          })}

          <button type="button" className="seating-add" onClick={addTable}>
            <span>+</span>
            Nova mesa
          </button>
        </div>
      </div>

      {mounted && menu &&
        createPortal(
          <ul id={menuId} className="seating-menu" role="listbox" style={{ top: menu.top, left: menu.left, width: menu.width }}>
            {menu.items.map((guest, index) => (
              <li key={guest.id} role="option" aria-selected={index === menu.activeIndex}>
                <button
                  type="button"
                  className={index === menu.activeIndex ? 'is-active' : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setMenu((current) => (current ? { ...current, activeIndex: index } : current))}
                  onClick={() => pickGuest(menu.tableId, menu.seatId, guest)}
                >
                  <span>{guest.name}</span>
                  <small>
                    {guest.status === 'no' ? 'não vai' : guest.status === 'pending' ? 'sem resposta' : 'confirmou'}
                    {guest.group ? ` · ${guest.group}` : ''}
                  </small>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
      </div>
    </div>
  );
}
