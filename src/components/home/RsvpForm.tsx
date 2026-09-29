'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ornament } from '@/components/Ornament';
import { createClient } from '@/lib/supabase/client';
import {
  guestsFromPartyRows,
  isFamilyParty,
  partyRowsFromRpc,
  type PartyMemberRow,
} from '@/lib/guest-party';
import { matchGuests } from '@/lib/rsvp-match';
import { clearSavedRsvp, readSavedRsvp, writeSavedRsvp, type SavedRsvp } from '@/lib/rsvp-storage';
import { useRouter } from 'next/navigation';
import { prefersReducedMotion } from '@/lib/scroll';

type Guest = {
  id: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
  greeting: string | null;
  max_companions: number | null;
};

type Step = 'search' | 'confirm' | 'submitting' | 'done' | 'saved';

type Props = { embedded?: boolean };

export function RsvpForm({ embedded = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Guest | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companions, setCompanions] = useState(0);
  const [message, setMessage] = useState('');
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);
  const [saved, setSaved] = useState<SavedRsvp | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => new Set());
  const [partyMembers, setPartyMembers] = useState<Guest[]>([]);
  const [partyRows, setPartyRows] = useState<PartyMemberRow[]>([]);
  const [partyTitle, setPartyTitle] = useState<string | null>(null);
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyPickerLocked, setPartyPickerLocked] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const partyModalTitleId = useId();

  const loadParty = async (anchor: Guest, catalog: Guest[]) => {
    const supabase = createClient();
    const { data, error: partyError } = await supabase.rpc('resolve_guest_party', {
      p_anchor_guest_id: anchor.id,
    });
    if (partyError) return { members: [anchor], rows: [] as PartyMemberRow[], data: null };
    const rows = partyRowsFromRpc(data);
    const members = guestsFromPartyRows(rows, catalog) as Guest[];
    return { members: members.length > 0 ? members : [anchor], rows, data };
  };

  useEffect(() => {
    const existing = readSavedRsvp();
    if (existing?.status === 'yes') {
      setSaved(existing);
      setStep('saved');
    }
    const supabase = createClient();
    (async () => {
      const { data, error: loadError } = await supabase
        .from('guests')
        .select('id, display_name, full_name, group_name, greeting, max_companions')
        .order('display_name');
      if (loadError) setError('Não foi possível carregar a lista. Tente novamente em instantes.');
      else setGuests((data ?? []) as Guest[]);
      setLoading(false);

      if (existing?.status === 'yes' && data?.length) {
        const anchor = (data as Guest[]).find((g) => g.id === existing.guestId);
        if (!anchor) return;
        const { members, rows, data: partyData } = await loadParty(anchor, data as Guest[]);
        const yesMembers = members.filter((m) =>
          rows.find((row) => row.guest_id === m.id && row.rsvp_status === 'yes'),
        );
        if (yesMembers.length === 0) {
          const { data: one } = await supabase.rpc('lookup_guest_rsvp', {
            p_query: anchor.full_name || anchor.display_name,
          });
          if (one?.kind === 'one' && one.rsvp_status === 'yes') yesMembers.push(anchor);
        }
        if (yesMembers.length === 0) return;
        const groupLabel =
          (partyData as { group_name?: string } | null)?.group_name?.trim() ||
          anchor.group_name?.trim() ||
          null;
        const entry: SavedRsvp = {
          guestId: anchor.id,
          name:
            yesMembers.length > 1
              ? groupLabel || yesMembers.map((m) => m.full_name || m.display_name).join(', ')
              : yesMembers[0].full_name || yesMembers[0].display_name,
          confirmedNames: yesMembers.map((m) => m.full_name || m.display_name),
          status: 'yes',
          at: existing.at,
        };
        writeSavedRsvp(entry);
        setSaved(entry);
      }
    })();
  }, []);

  const result = useMemo(() => matchGuests(guests, q), [guests, q]);

  const isFamily = partyMembers.length > 1;

  useEffect(() => {
    if (step !== 'search') return;
    if (result.kind === 'one') {
      setPicked(result.guest);
      setError(null);
    } else if (result.kind !== 'groups') {
      setPicked(null);
    }
  }, [result, step]);

  useEffect(() => {
    if (!picked || guests.length === 0) {
      setPartyMembers([]);
      setPartyRows([]);
      setPartyTitle(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { members, rows, data } = await loadParty(picked, guests);
      if (cancelled) return;
      setPartyMembers(members);
      setPartyRows(rows);
      const groupLabel =
        (data as { group_name?: string } | null)?.group_name?.trim() ||
        picked.group_name?.trim() ||
        (isFamilyParty(data, members.length) ? 'sua família' : null);
      setPartyTitle(groupLabel);
    })();
    return () => {
      cancelled = true;
    };
  }, [picked, guests]);

  const buildSavedEntry = (anchor: Guest, yesMembers: Guest[]): SavedRsvp => {
    const confirmedNames = yesMembers.map((m) => m.full_name || m.display_name);
    const isGroup = yesMembers.length > 1;
    return {
      guestId: anchor.id,
      name: isGroup
        ? partyTitle || anchor.group_name?.trim() || confirmedNames.join(', ')
        : (confirmedNames[0] ?? anchor.full_name ?? anchor.display_name),
      confirmedNames,
      status: 'yes',
      at: Date.now(),
    };
  };

  const openPartyModal = async (guest: Guest) => {
    setError(null);
    setModalError(null);
    const { members, rows, data } = await loadParty(guest, guests);
    setPartyMembers(members);
    setPartyRows(rows);
    const groupLabel =
      (data as { group_name?: string } | null)?.group_name?.trim() ||
      guest.group_name?.trim() ||
      (isFamilyParty(data, members.length) ? 'sua família' : null);
    setPartyTitle(groupLabel);
    setPicked(guest);

    if (members.length <= 1) {
      await continueWithGuest(guest);
      return;
    }

    const yesMembers = members.filter((m) =>
      rows.find((row) => row.guest_id === m.id && row.rsvp_status === 'yes'),
    );
    const declined = members.some((m) =>
      rows.find((row) => row.guest_id === m.id && row.rsvp_status === 'no'),
    );

    if (declined && yesMembers.length === 0) {
      setError('Sua família já respondeu que não poderá vir. Se mudou de ideia, fale com os noivos.');
      setPicked(null);
      return;
    }

    setSelectedMemberIds(
      new Set(yesMembers.length > 0 ? yesMembers.map((m) => m.id) : members.map((m) => m.id)),
    );
    setPartyPickerLocked(false);
    setPartyModalOpen(true);
  };

  const confirmPartyModal = () => {
    if (selectedMemberIds.size === 0) {
      setModalError('Marque ao menos uma pessoa que irá à festa.');
      return;
    }
    setModalError(null);
    setPartyModalOpen(false);
    setPartyPickerLocked(true);
    setCompanions(0);
    setMessage('');
    setStep('confirm');
  };

  useEffect(() => {
    if (!partyModalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPartyModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [partyModalOpen]);

  const continueWithGuest = async (guest: Guest) => {
    setError(null);
    const supabase = createClient();
    const { members, rows } = await loadParty(guest, guests);
    setPartyMembers(members);
    setPartyRows(rows);

    if (members.length > 1) {
      await openPartyModal(guest);
      return;
    }

    const { data, error: lookupError } = await supabase.rpc('lookup_guest_rsvp', {
      p_query: guest.full_name || guest.display_name,
    });
    if (!lookupError && data?.kind === 'one') {
      const status = data.rsvp_status as string | null;
      const name = (data.name as string) || guest.full_name || guest.display_name;
      if (status === 'yes') {
        const entry: SavedRsvp = {
          guestId: guest.id,
          name,
          confirmedNames: [name],
          status: 'yes',
          at: Date.now(),
        };
        writeSavedRsvp(entry);
        setSaved(entry);
        setStep('saved');
        return;
      }
      if (status === 'no') {
        setError('Você já respondeu que não poderá vir. Se mudou de ideia, fale com os noivos.');
        setPicked(null);
        return;
      }
    }
    setCompanions(0);
    setMessage('');
    setPicked(guest);
    setSelectedMemberIds(new Set(members.map((m) => m.id)));
    setStep('confirm');
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAllMembers = (on: boolean) => {
    setSelectedMemberIds(on ? new Set(partyMembers.map((m) => m.id)) : new Set());
  };

  const editConfirmation = () => {
    clearSavedRsvp();
    setSaved(null);
    setStep('search');
    setQ('');
    setPicked(null);
    setSelectedMemberIds(new Set());
    setPartyModalOpen(false);
    setPartyPickerLocked(false);
  };

  const goGifts = () => {
    if (prefersReducedMotion()) {
      router.push('/presentes');
      return;
    }
    document.body.classList.add('scene-cut');
    window.setTimeout(() => router.push('/presentes'), 720);
  };

  const afterYes = (entry: SavedRsvp) => {
    setSaved(entry);
    window.setTimeout(goGifts, 1800);
  };

  const submit = async (status: 'yes' | 'no') => {
    if (!picked) return;

    const targets =
      isFamily
        ? status === 'yes'
          ? partyMembers.filter((m) => selectedMemberIds.has(m.id))
          : partyMembers
        : [picked];

    if (status === 'yes' && targets.length === 0) {
      setError('Selecione ao menos uma pessoa da família.');
      return;
    }

    setDecision(status);
    setStep('submitting');
    setError(null);
    const supabase = createClient();
    const note = message.trim() || null;

    for (const guest of targets) {
      const { error: rpcError } = await supabase.rpc('submit_rsvp', {
        p_guest_id: guest.id,
        p_status: status,
        p_companions: isFamily ? 0 : status === 'yes' ? companions : 0,
        p_message: note,
      });
      if (rpcError) {
        setError(rpcError.message);
        setStep('confirm');
        return;
      }
    }

    let savedEntry: SavedRsvp | null = null;
    if (status === 'yes') {
      savedEntry = buildSavedEntry(picked, targets);
      writeSavedRsvp(savedEntry);
    }
    setStep('done');
    if (status === 'yes' && savedEntry) afterYes(savedEntry);
  };

  const hint =
    result.kind === 'many'
      ? 'Há mais de uma pessoa com esse nome. Continue com o sobrenome.'
      : result.kind === 'none'
        ? 'Esse nome não está na lista do casamento.'
        : null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {!embedded && (
        <h2 className="serif" style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 400, color: 'var(--azul-profundo)', lineHeight: 0.95 }}>
          confirme sua presença
        </h2>
      )}

      {step === 'saved' && saved && (
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <p className="serif" style={{ fontSize: 36, color: 'var(--azul-profundo)' }}>
            Você já confirmou
          </p>
          {saved.confirmedNames.length > 1 && (
            <p className="italic" style={{ fontSize: 20, marginTop: 8, color: 'var(--texto-suave)' }}>
              {saved.name}
            </p>
          )}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '16px auto 0',
              maxWidth: 360,
              textAlign: 'left',
            }}
          >
            {saved.confirmedNames.map((person) => (
              <li
                key={person}
                className="serif"
                style={{
                  fontSize: 22,
                  color: 'var(--azul-profundo)',
                  padding: '10px 14px',
                  marginBottom: 8,
                  borderRadius: 12,
                  border: '1px solid var(--linha)',
                  background: 'var(--surface)',
                }}
              >
                {person}
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={goGifts}>
              Lista de presentes
            </button>
            <button
              type="button"
              onClick={editConfirmation}
              style={{ background: 'none', border: 0, color: 'var(--texto-suave)', cursor: 'pointer', fontSize: 16 }}
            >
              alterar confirmação
            </button>
          </div>
        </div>
      )}

      {step === 'search' && (
        <div>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 18 }}>
            Busque seu nome na lista. Se sua família já fez a pré-confirmação, aparecerão juntos para você
            marcar quem vai à festa.
          </p>
          <label className="micro" htmlFor="rsvp-name" style={{ color: 'var(--texto-suave)' }}>
            Seu nome
          </label>
          <input
            id="rsvp-name"
            className="field"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={loading ? 'carregando lista...' : 'digite seu nome...'}
            disabled={loading}
            autoComplete="name"
            style={{ marginTop: 8 }}
          />
          {error && (
            <p role="alert" style={{ color: 'var(--terracota-esc)', marginTop: 12 }}>
              {error}
            </p>
          )}
          {hint && (
            <p role="status" className="italic" style={{ marginTop: 16, color: 'var(--texto-suave)', fontSize: 18 }}>
              {hint}
            </p>
          )}
          {result.kind === 'groups' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p className="italic" style={{ color: 'var(--texto)' }}>
                Há mais de uma pessoa com esse nome. Qual é o seu grupo?
              </p>
              {result.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openPartyModal(option.guest)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {result.kind === 'one' && picked && (
            <button
              type="button"
              onClick={() => openPartyModal(picked)}
              style={{
                marginTop: 18,
                width: '100%',
                textAlign: 'left',
                background: 'var(--surface)',
                border: '1px solid var(--linha)',
                borderRadius: 18,
                padding: '18px 18px',
                cursor: 'pointer',
                color: 'var(--texto)',
              }}
            >
              <span className="serif" style={{ display: 'block', fontSize: 28, color: 'var(--azul-profundo)' }}>
                {picked.full_name || picked.display_name}
              </span>
              <span className="italic" style={{ color: 'var(--texto-suave)' }}>
                {partyMembers.length > 1
                  ? `${partyMembers.length} na pré-confirmação · toque para escolher quem vai`
                  : 'é você?'}
              </span>
            </button>
          )}
        </div>
      )}

      {(step === 'confirm' || step === 'submitting') && picked && (
        <div>
          {isFamily ? (
            <>
              <p className="serif" style={{ fontSize: 40, color: 'var(--azul-profundo)', lineHeight: 1.05 }}>
                {partyTitle || picked.group_name?.trim() || 'Sua família'}
              </p>
              <p className="italic" style={{ marginTop: 10, color: 'var(--texto-suave)', fontSize: 18 }}>
                Encontramos {partyMembers.length} pessoas na pré-confirmação. Marque quem estará presente na festa.
              </p>
            </>
          ) : (
            <p className="serif" style={{ fontSize: 40, color: 'var(--azul-profundo)', lineHeight: 1 }}>
              {picked.full_name || picked.display_name}
            </p>
          )}
          <div style={{ margin: '14px 0' }}>
            <Ornament />
          </div>
          {!isFamily && picked.greeting && (
            <p className="italic" style={{ fontSize: 18, marginBottom: 12 }}>
              {picked.greeting}
            </p>
          )}
          <p>{isFamily ? 'Quem poderá estar conosco no grande dia?' : 'Poderemos contar com sua presença no nosso grande dia?'}</p>

          {isFamily && partyPickerLocked && (
            <div
              style={{
                marginTop: 16,
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid var(--linha)',
                background: 'var(--surface)',
              }}
            >
              <p className="micro" style={{ color: 'var(--texto-suave)', marginBottom: 8 }}>Presença confirmada para</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {partyMembers
                  .filter((m) => selectedMemberIds.has(m.id))
                  .map((m) => (
                    <li key={m.id} className="serif" style={{ fontSize: 20, color: 'var(--azul-profundo)' }}>
                      {partyRows.find((row) => row.guest_id === m.id)?.kind === 'child' ? '✿ ' : ''}
                      {m.full_name || m.display_name}
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setPartyPickerLocked(false);
                  setPartyModalOpen(true);
                }}
                style={{
                  marginTop: 12,
                  background: 'none',
                  border: 0,
                  color: 'var(--dourado-esc)',
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                alterar quem vai
              </button>
            </div>
          )}

          {isFamily && !partyPickerLocked && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {partyMembers.map((member) => {
                const on = selectedMemberIds.has(member.id);
                const label = member.full_name || member.display_name;
                const kind = partyRows.find((row) => row.guest_id === member.id)?.kind;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    aria-pressed={on}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: `1px solid ${on ? 'var(--azul-profundo)' : 'var(--linha)'}`,
                      background: on ? 'rgba(26, 58, 92, 0.06)' : 'var(--surface)',
                      cursor: 'pointer',
                      color: 'var(--texto)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${on ? 'var(--azul-profundo)' : 'var(--linha)'}`,
                        background: on ? 'var(--azul-profundo)' : 'transparent',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                        fontSize: 14,
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="serif" style={{ fontSize: 22, color: 'var(--azul-profundo)' }}>
                      {kind === 'child' ? '✿ ' : ''}
                      {label}
                    </span>
                  </button>
                );
              })}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setAllMembers(true)}
                  style={{ background: 'none', border: 0, color: 'var(--dourado-esc)', cursor: 'pointer', fontSize: 15 }}
                >
                  marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => setAllMembers(false)}
                  style={{ background: 'none', border: 0, color: 'var(--texto-suave)', cursor: 'pointer', fontSize: 15 }}
                >
                  desmarcar todos
                </button>
              </div>
            </div>
          )}

          {!isFamily && (picked.max_companions ?? 0) > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="micro" style={{ color: 'var(--texto-suave)' }}>
                Acompanhantes
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {Array.from({ length: (picked.max_companions ?? 0) + 1 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCompanions(n)}
                    aria-pressed={companions === n}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: '1px solid var(--linha)',
                      background: companions === n ? 'var(--azul-profundo)' : 'var(--surface)',
                      color: companions === n ? '#fff' : 'var(--texto)',
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="italic" style={{ marginTop: 8, color: 'var(--texto-suave)' }}>
                além de você. máximo: {picked.max_companions}.
              </p>
            </div>
          )}

          <label className="micro" htmlFor="rsvp-note" style={{ display: 'block', marginTop: 20, color: 'var(--texto-suave)' }}>
            Recado para os noivos (opcional)
          </label>
          <textarea
            id="rsvp-note"
            className="field"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="uma palavra de carinho..."
            rows={3}
            style={{ marginTop: 8, fontSize: 18 }}
          />
          {error && (
            <p role="alert" style={{ color: 'var(--terracota-esc)', marginTop: 12 }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
            <button type="button" className="btn btn-primary" disabled={step === 'submitting'} onClick={() => submit('yes')}>
              {step === 'submitting' && decision === 'yes' ? 'enviando...' : 'sim, estarei lá'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={step === 'submitting'} onClick={() => submit('no')}>
              {step === 'submitting' && decision === 'no' ? 'enviando...' : 'infelizmente não poderei'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep('search');
              setPicked(null);
              setSelectedMemberIds(new Set());
            }}
            style={{ marginTop: 16, background: 'none', border: 0, color: 'var(--texto-suave)', cursor: 'pointer', fontSize: 16 }}
          >
            voltar à busca
          </button>
        </div>
      )}

      {step === 'done' && picked && (
        <div style={{ textAlign: 'center' }}>
          {decision === 'yes' ? (
            <>
              <div className="petal-rain" aria-hidden>
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index} style={{ left: `${6 + index * 8}%`, animationDelay: `${index * 0.08}s` }} />
                ))}
              </div>
              <p className="btn btn-confirmed" style={{ pointerEvents: 'none' }}>
                Presença confirmada
              </p>
              <p className="serif" style={{ fontSize: 36, marginTop: 22, color: 'var(--azul-profundo)' }}>
                {isFamily ? 'Obrigado, família!' : `Obrigado, ${picked.display_name}.`}
              </p>
              <p style={{ marginTop: 8, color: 'var(--texto-suave)' }}>
                {isFamily
                  ? `estamos animados pra ver ${selectedMemberIds.size} ${selectedMemberIds.size === 1 ? 'pessoa' : 'pessoas'}: ${partyMembers
                      .filter((m) => selectedMemberIds.has(m.id))
                      .map((m) => m.display_name)
                      .join(', ')}.`
                  : companions > 0
                    ? `estamos animados pra ver você e mais ${companions} ${companions === 1 ? 'pessoa' : 'pessoas'}.`
                    : 'estamos animados pra te ver no nosso dia.'}
              </p>
              <button type="button" onClick={goGifts} className="italic" style={{ marginTop: 18, background: 'none', border: 0, color: 'var(--dourado-esc)', fontSize: 20, cursor: 'pointer' }}>
                Que tal escolher um presente para nós?
              </button>
            </>
          ) : (
            <>
              <p className="serif" style={{ fontSize: 32, color: 'var(--azul-profundo)' }}>
                {picked.display_name}
              </p>
              <p className="italic" style={{ marginTop: 10 }}>
                você fará falta, mas entendemos. obrigado pelo carinho.
              </p>
            </>
          )}
        </div>
      )}

      {partyModalOpen &&
        picked &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="gift-modal"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPartyModalOpen(false);
            }}
          >
            <div
              className="gift-modal__sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={partyModalTitleId}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id={partyModalTitleId} className="serif gift-modal__title" style={{ fontSize: 'clamp(28px, 5vw, 34px)' }}>
                Quem vai à festa?
              </h2>
              <p className="italic" style={{ fontSize: 17, color: 'var(--texto-suave)' }}>
                {partyTitle || 'Sua família'} · marque quem estará presente.
              </p>

              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partyMembers.map((member) => {
                  const on = selectedMemberIds.has(member.id);
                  const label = member.full_name || member.display_name;
                  const kind = partyRows.find((row) => row.guest_id === member.id)?.kind;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member.id)}
                      aria-pressed={on}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: `1px solid ${on ? 'var(--azul-profundo)' : 'var(--linha)'}`,
                        background: on ? 'rgba(26, 58, 92, 0.06)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `2px solid ${on ? 'var(--azul-profundo)' : 'var(--linha)'}`,
                          background: on ? 'var(--azul-profundo)' : 'transparent',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      >
                        {on ? '✓' : ''}
                      </span>
                      <span className="serif" style={{ fontSize: 20, color: 'var(--azul-profundo)' }}>
                        {kind === 'child' ? '✿ ' : ''}
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setAllMembers(true)}
                  style={{ background: 'none', border: 0, color: 'var(--dourado-esc)', cursor: 'pointer', fontSize: 14 }}
                >
                  marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => setAllMembers(false)}
                  style={{ background: 'none', border: 0, color: 'var(--texto-suave)', cursor: 'pointer', fontSize: 14 }}
                >
                  desmarcar todos
                </button>
              </div>

              {modalError && (
                <p role="alert" style={{ color: 'var(--terracota-esc)', marginTop: 14, fontSize: 15 }}>
                  {modalError}
                </p>
              )}

              <div className="gift-modal__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPartyModalOpen(false)}>
                  cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmPartyModal}>
                  continuar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
