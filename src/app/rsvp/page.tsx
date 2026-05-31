'use client';

import { useEffect, useMemo, useState } from 'react';
import { WordReveal } from '@/components/WordReveal';
import { Ornament } from '@/components/Ornament';
import { Btn } from '@/components/Btn';
import { Celebration } from '@/components/Celebration';
import { createClient } from '@/lib/supabase/client';
import './celebration.css';

type Guest = {
  id: string;
  slug: string;
  display_name: string;
  full_name: string | null;
  group_name: string | null;
  table_name: string | null;
  greeting: string | null;
  max_companions: number | null;
};

type Step = 'search' | 'confirm' | 'submitting' | 'done';
type Decision = 'yes' | 'no' | null;

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export default function RsvpPage() {
  const [step, setStep] = useState<Step>('search');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Guest | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [companions, setCompanions] = useState(0);
  const [message, setMessage] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('id, slug, display_name, full_name, group_name, table_name, greeting, max_companions')
        .order('display_name');
      if (error) {
        setError('Não foi possível carregar a lista. Tente novamente em instantes.');
      } else {
        setGuests((data ?? []) as Guest[]);
      }
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    const needle = normalize(q);
    if (needle.length < 2) return [] as Guest[];
    return guests.filter((g) => {
      const a = normalize(g.display_name);
      const b = g.full_name ? normalize(g.full_name) : '';
      return a.includes(needle) || b.includes(needle);
    });
  }, [q, guests]);

  const reset = () => {
    setStep('search');
    setQ('');
    setPicked(null);
    setDecision(null);
    setCompanions(0);
    setMessage('');
    setError(null);
  };

  const submit = async (status: 'yes' | 'no') => {
    if (!picked) return;
    setDecision(status);
    setStep('submitting');
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.rpc('submit_rsvp', {
      p_guest_id: picked.id,
      p_status: status,
      p_companions: status === 'yes' ? companions : 0,
      p_message: message.trim() || null,
    });

    if (error) {
      setError(error.message);
      setStep('confirm');
      return;
    }
    setStep('done');
  };

  return (
    <div
      data-theme="light"
      style={{ minHeight: '100vh', background: 'var(--cream)', color: 'var(--ink)', paddingBottom: 40 }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 22px 8px' }}>
        <div className="micro" style={{ color: 'var(--muted)' }}>
          CAPÍTULO V
        </div>
        <WordReveal
          as="div"
          text="confirme sua presença"
          stagger={80}
          className="serif italic"
          style={{ fontSize: 36, lineHeight: 1, marginTop: 8, color: 'var(--ink)' }}
        />
      </div>

      {step === 'search' && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 22px 40px' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, maxWidth: 320 }}>
            Busque seu nome na lista de convidados. Cada convidado deve confirmar individualmente, por gentileza.
          </div>

          <div style={{ position: 'relative' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={loading ? 'carregando lista...' : 'digite seu nome...'}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 16px 14px 40px',
                border: 0,
                borderBottom: '1px solid var(--ink)',
                background: 'transparent',
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                color: 'var(--ink)',
                outline: 'none',
                fontStyle: q ? 'normal' : 'italic',
              }}
            />
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: 'absolute', left: 10, top: 18 }}>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" fill="none" />
              <path d="M11 11L15 15" stroke="currentColor" />
            </svg>
          </div>

          <div style={{ marginTop: 20 }}>
            {error && (
              <div className="italic" style={{ fontSize: 13, color: '#9b3b3b', padding: '10px 0' }}>
                {error}
              </div>
            )}
            {!loading && q.length >= 2 && results.length === 0 && (
              <div className="italic" style={{ fontSize: 14, color: 'var(--muted)', padding: '20px 0' }}>
                nenhum convidado encontrado. verifique a grafia ou nos envie uma mensagem.
              </div>
            )}
            {results.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setPicked(g);
                  setCompanions(0);
                  setMessage('');
                  setStep('confirm');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 0,
                  borderBottom: '1px solid rgba(14,11,9,.12)',
                  padding: '14px 2px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--ink)',
                }}
              >
                <div>
                  <div className="serif italic" style={{ fontSize: 18 }}>
                    {g.display_name.toLowerCase()}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, letterSpacing: '.1em' }}>
                    {(g.full_name ?? g.display_name).toUpperCase()}
                    {g.group_name ? ` · ${g.group_name.toUpperCase()}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 14 }}>→</div>
              </button>
            ))}
          </div>

          {q.length < 2 && !loading && (
            <div
              style={{
                marginTop: 30,
                padding: '18px',
                background: 'rgba(14,11,9,.03)',
                border: '1px solid rgba(14,11,9,.1)',
              }}
            >
              <div className="micro" style={{ color: 'var(--ink)' }}>
                DICA
              </div>
              <div className="italic" style={{ fontSize: 14, marginTop: 6 }}>
                tente o primeiro nome como aparece no convite.
              </div>
            </div>
          )}
        </div>
      )}

      {(step === 'confirm' || step === 'submitting') && picked && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 22px 40px' }}>
          <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
            <div className="serif italic" style={{ fontSize: 32 }}>
              {picked.display_name.toLowerCase()}
            </div>
            {picked.full_name && (
              <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 6, letterSpacing: '.15em' }}>
                {picked.full_name.toUpperCase()}
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
              <Ornament color="var(--ink)" width={40} />
            </div>
          </div>

          {picked.greeting ? (
            <div
              className="italic"
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: 380,
                margin: '0 auto 24px',
                color: 'var(--ink)',
              }}
            >
              {picked.greeting}
            </div>
          ) : null}

          <div style={{ fontSize: 14, lineHeight: 1.6, textAlign: 'center', maxWidth: 320, margin: '0 auto' }}>
            Poderemos contar com sua presença no nosso grande dia?
          </div>

          {(picked.max_companions ?? 0) > 0 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '.2em', color: 'var(--muted)' }}>
                ACOMPANHANTES
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                {Array.from({ length: (picked.max_companions ?? 0) + 1 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    onClick={() => setCompanions(n)}
                    style={{
                      width: 38,
                      height: 38,
                      border: `1px solid ${companions === n ? 'var(--ink)' : 'rgba(14,11,9,.25)'}`,
                      background: companions === n ? 'var(--ink)' : 'transparent',
                      color: companions === n ? 'var(--cream)' : 'var(--ink)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
                além de você. máximo: {picked.max_companions}.
              </div>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <label
              className="mono"
              style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.18em' }}
            >
              RECADO PARA OS NOIVOS (OPCIONAL)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="uma palavra de carinho..."
              rows={2}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '10px 12px',
                background: 'transparent',
                border: '1px solid rgba(14,11,9,.2)',
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                color: 'var(--ink)',
                outline: 'none',
                resize: 'vertical',
                fontStyle: 'italic',
                lineHeight: 1.5,
              }}
            />
          </div>

          {error && (
            <div className="italic" style={{ marginTop: 14, fontSize: 13, color: '#9b3b3b', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              disabled={step === 'submitting'}
              onClick={() => submit('yes')}
              style={{
                padding: '18px',
                background: 'var(--ink)',
                color: 'var(--cream)',
                border: 0,
                cursor: step === 'submitting' ? 'wait' : 'pointer',
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                letterSpacing: '.04em',
                opacity: step === 'submitting' ? 0.6 : 1,
              }}
            >
              {step === 'submitting' && decision === 'yes' ? 'enviando...' : 'sim, estarei lá'}
            </button>
            <button
              disabled={step === 'submitting'}
              onClick={() => submit('no')}
              style={{
                padding: '18px',
                background: 'transparent',
                color: 'var(--ink)',
                border: '1px solid var(--ink)',
                cursor: step === 'submitting' ? 'wait' : 'pointer',
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                letterSpacing: '.04em',
                fontStyle: 'italic',
                opacity: step === 'submitting' ? 0.6 : 1,
              }}
            >
              {step === 'submitting' && decision === 'no' ? 'enviando...' : 'infelizmente não poderei'}
            </button>
          </div>

          <button
            onClick={() => setStep('search')}
            disabled={step === 'submitting'}
            style={{
              marginTop: 20,
              background: 'transparent',
              border: 0,
              color: 'var(--muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
            }}
          >
            ← voltar à busca
          </button>
        </div>
      )}

      {step === 'done' && picked && decision === 'yes' && <Celebration />}

      {step === 'done' && picked && (
        <div
          className={decision === 'yes' ? 'celebration-done-wrap' : ''}
          style={{ maxWidth: 480, margin: '0 auto', padding: '60px 22px 40px', textAlign: 'center' }}
        >
          {decision === 'yes' && <div style={{ height: 240 }} aria-hidden />}
          <div className={decision === 'yes' ? 'celebration-panel' : ''}>
            <div className="serif italic" style={{ fontSize: 32 }}>
              {picked.display_name.toLowerCase()}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="micro" style={{ color: 'var(--ink)', fontSize: 10 }}>
                ✦ {decision === 'yes' ? 'OBRIGADO! CONTAMOS COM VOCÊ' : 'SENTIREMOS SUA FALTA'} ✦
              </span>
            </div>

            <div style={{ margin: '28px auto', maxWidth: 320 }}>
              <div className="hairline-dark" />
              <div style={{ padding: '20px 0' }}>
                {decision === 'yes' ? (
                  <>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: '.2em' }}>
                      CONFIRMADO!
                    </div>
                    <div className="italic" style={{ fontSize: 16, marginTop: 10 }}>
                      {companions > 0
                        ? `estamos animados pra ver você e mais ${companions} ${companions === 1 ? 'pessoa' : 'pessoas'}.`
                        : 'estamos animados pra te ver no nosso dia.'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.2em' }}>
                      OBRIGADO POR AVISAR
                    </div>
                    <div className="italic" style={{ fontSize: 16, marginTop: 10 }}>
                      você fará falta, mas entendemos. obrigado pelo carinho.
                    </div>
                  </>
                )}
              </div>
              <div className="hairline-dark" />
            </div>

            {picked.table_name && (
              <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '.15em' }}>
                {picked.table_name.toUpperCase()}
              </div>
            )}

            <div style={{ marginTop: 30 }}>
              <Btn small variant="ghost" onClick={reset}>
                CONFIRMAR OUTRO CONVIDADO
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
