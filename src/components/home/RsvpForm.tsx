'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ornament } from '@/components/Ornament';
import { createClient } from '@/lib/supabase/client';
import { matchGuests } from '@/lib/rsvp-match';
import { readSavedRsvp, writeSavedRsvp, type SavedRsvp } from '@/lib/rsvp-storage';
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
    })();
  }, []);

  const result = useMemo(() => matchGuests(guests, q), [guests, q]);

  useEffect(() => {
    if (step !== 'search') return;
    if (result.kind === 'one') {
      setPicked(result.guest);
      setError(null);
    } else if (result.kind !== 'groups') {
      setPicked(null);
    }
  }, [result, step]);

  const continueWithGuest = async (guest: Guest) => {
    setError(null);
    const supabase = createClient();
    const { data, error: lookupError } = await supabase.rpc('lookup_guest_rsvp', {
      p_query: guest.full_name || guest.display_name,
    });
    if (!lookupError && data?.kind === 'one') {
      const status = data.rsvp_status as string | null;
      const name = (data.name as string) || guest.full_name || guest.display_name;
      if (status === 'yes') {
        writeSavedRsvp({ guestId: guest.id, name, status: 'yes', at: Date.now() });
        setSaved({ guestId: guest.id, name, status: 'yes', at: Date.now() });
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
    setStep('confirm');
  };

  const goGifts = () => {
    if (prefersReducedMotion()) {
      router.push('/presentes');
      return;
    }
    document.body.classList.add('scene-cut');
    window.setTimeout(() => router.push('/presentes'), 720);
  };

  const afterYes = (guest: Guest) => {
    setSaved({
      guestId: guest.id,
      name: guest.full_name || guest.display_name,
      status: 'yes',
      at: Date.now(),
    });
    window.setTimeout(goGifts, 1800);
  };

  const submit = async (status: 'yes' | 'no') => {
    if (!picked) return;
    setDecision(status);
    setStep('submitting');
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('submit_rsvp', {
      p_guest_id: picked.id,
      p_status: status,
      p_companions: status === 'yes' ? companions : 0,
      p_message: message.trim() || null,
    });
    if (rpcError) {
      setError(rpcError.message);
      setStep('confirm');
      return;
    }
    if (status === 'yes') {
      writeSavedRsvp({
        guestId: picked.id,
        name: picked.full_name || picked.display_name,
        status: 'yes',
        at: Date.now(),
      });
    }
    setStep('done');
    if (status === 'yes') afterYes(picked);
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
          <p className="italic" style={{ fontSize: 22, marginTop: 8, color: 'var(--texto)' }}>
            {saved.name}
          </p>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 22 }} onClick={goGifts}>
            Lista de presentes
          </button>
        </div>
      )}

      {step === 'search' && (
        <div>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 18 }}>
            Busque seu nome na lista de convidados. Cada convidado deve confirmar individualmente, por gentileza.
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
                  onClick={() => continueWithGuest(option.guest)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {result.kind === 'one' && picked && (
            <button
              type="button"
              onClick={() => continueWithGuest(picked)}
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
                é você?
              </span>
            </button>
          )}
        </div>
      )}

      {(step === 'confirm' || step === 'submitting') && picked && (
        <div>
          <p className="serif" style={{ fontSize: 40, color: 'var(--azul-profundo)', lineHeight: 1 }}>
            {picked.full_name || picked.display_name}
          </p>
          <div style={{ margin: '14px 0' }}>
            <Ornament />
          </div>
          {picked.greeting && (
            <p className="italic" style={{ fontSize: 18, marginBottom: 12 }}>
              {picked.greeting}
            </p>
          )}
          <p>Poderemos contar com sua presença no nosso grande dia?</p>

          {(picked.max_companions ?? 0) > 0 && (
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
                Obrigado, {picked.display_name}.
              </p>
              <p style={{ marginTop: 8, color: 'var(--texto-suave)' }}>
                {companions > 0
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
    </div>
  );
}
