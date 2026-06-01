'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { WordReveal } from '@/components/WordReveal';
import { Reveal } from '@/components/Reveal';
import { Ornament } from '@/components/Ornament';
import { Celebration } from '@/components/Celebration';
import { WEDDING_DATE } from '@/components/Countdown';
import { createClient } from '@/lib/supabase/client';
import './confirmar.css';
import '../rsvp/celebration.css';
import { Logo } from '@/components/Logo';

// Vídeo do monograma (retrato), servido de /public/AeF.mp4. Sem o arquivo,
// mostramos um placeholder elegante no lugar — nada quebra.
const VIDEO_SRC = '/AeF.mp4';

type Kind = 'adult' | 'child';
type Person = { id: number; name: string; kind: Kind };
type Status = 'idle' | 'submitting' | 'done';
type Decision = 'yes' | 'no';

let _pid = 1;
const newPerson = (): Person => ({ id: _pid++, name: '', kind: 'adult' });

export default function ConfirmarPage() {
  const [decision, setDecision] = useState<Decision>('yes');
  const [people, setPeople] = useState<Person[]>([newPerson()]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [savedNames, setSavedNames] = useState<Person[]>([]);

  const addPerson = () => setPeople((p) => (p.length >= 30 ? p : [...p, newPerson()]));

  const removePerson = (id: number) => {
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      setPeople((p) => (p.length <= 1 ? p : p.filter((x) => x.id !== id)));
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 300);
  };

  const update = (id: number, patch: Partial<Person>) =>
    setPeople((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const filled = people.filter((p) => p.name.trim().length > 0);

  const submit = async () => {
    setError(null);
    if (decision === 'yes' && filled.length === 0) {
      setError('Escreva ao menos um nome para confirmarmos. ✦');
      return;
    }
    setStatus('submitting');

    const supabase = createClient();
    const { error: err } = await supabase.rpc('submit_confirmation', {
      p_attending: decision === 'yes',
      p_names: filled.map((p) => ({ name: p.name.trim(), kind: p.kind })),
      p_contact: null,
      p_message: message.trim() || null,
    });

    if (err) {
      setError(err.message);
      setStatus('idle');
      return;
    }
    setSavedNames(filled);
    setStatus('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (status === 'done') {
    return <DoneScreen decision={decision} names={savedNames} />;
  }

  return (
    <main data-theme="light" className="cf-root">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="cf-hero">
        <Reveal y={0}>
          <div className="cf-float-orn" style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <Ornament color="var(--ink)" width={46} />
          </div>
        </Reveal>
        <Logo style={{ margin: '0 auto 12px', display: 'block', height: 120 }} />
        <Reveal delay={400} y={40}>
          <p className="cf-hero-sub">
           É com imensa alegria e gratidão a Deus que compartilhamos este momento tão especial de nossas vidas. Em novembro, diante de Deus e sob a proteção de Nossa Senhora, celebraremos nosso amor e teremos a honra de contar com sua presença nesse dia tão sonhado. Mal podemos esperar para viver esse momento único ao seu lado
          </p>
        </Reveal>

        <div className="cf-scroll-cue" aria-hidden>
          <span>role</span>
          <div className="cf-line" />
        </div>
      </section>

      {/* ─── VÍDEO 3D ─────────────────────────────────────────── */}
      <VideoBlock />

      {/* ─── CRONÔMETRO ───────────────────────────────────────── */}
      <CountdownBlock />

      {/* ─── TEXTO ────────────────────────────────────────────── */}
      <section className="cf-section">
        <Reveal y={40}>
          <div className="cf-eyebrow">um convite de coração</div>
        </Reveal>
        <Reveal delay={120} y={48}>
          <p className="cf-lede">
            “Os melhores momentos são os que dividimos com quem amamos.”
          </p>
        </Reveal>
        <Reveal delay={240} y={48}>
          <p className="cf-body">
            Esse é só o começo da festa. Antes do grande dia, precisamos saber quem poderá estar
            presente, assim preparamos cada detalhe pensando em você.
          </p>
        </Reveal>
        <Reveal delay={360} y={40}>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <Ornament color="var(--ink)" width={40} />
          </div>
        </Reveal>
      </section>

      {/* ─── FORM ─────────────────────────────────────────────── */}
      <section className="cf-form-shell">
        <Reveal y={40}>
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div className="cf-eyebrow">confirmação de presença</div>
            <h2 className="cf-lede" style={{ fontSize: 'clamp(24px,5vw,34px)' }}>
              quem vai com você?
            </h2>
          </div>
        </Reveal>

        <Reveal delay={120} y={50}>
          <div className="cf-card">
            {/* Sim / Não */}
            <div className="cf-seg">
              <button
                type="button"
                data-on="yes"
                aria-pressed={decision === 'yes'}
                onClick={() => setDecision('yes')}
              >
                <span className="cf-seg-tag">com alegria</span>
                sim, estaremos lá
              </button>
              <button
                type="button"
                data-on="no"
                aria-pressed={decision === 'no'}
                onClick={() => setDecision('no')}
              >
                <span className="cf-seg-tag">infelizmente</span>
                não poderei ir
              </button>
            </div>

            {decision === 'yes' && (
              <>
                <div className="cf-people-label">
                  <span className="cf-k">os nomes</span>
                  <span className="cf-count">
                    {filled.length} {filled.length === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </div>

                <p className="cf-hint">
                  Toque no selo <span className="cf-hint-pill">adulto</span> ao lado do nome para marcar
                  como <span className="cf-hint-pill cf-hint-pill-child">✿ criança</span>.
                </p>

                <div>
                  {people.map((p, i) => (
                    <PersonRow
                      key={p.id}
                      index={i}
                      person={p}
                      leaving={leaving.has(p.id)}
                      canRemove={people.length > 1}
                      onChange={(patch) => update(p.id, patch)}
                      onRemove={() => removePerson(p.id)}
                      onEnter={addPerson}
                    />
                  ))}
                </div>

                <button type="button" className="cf-add" onClick={addPerson} disabled={people.length >= 30}>
                  <span className="cf-plus">+</span>
                  adicionar pessoa ou criança
                </button>
              </>
            )}

            <div className="cf-field">
              <label>recado para os noivos — opcional</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="uma palavra de carinho…"
              />
            </div>

            {error && <div className="cf-error">{error}</div>}

            <button type="button" className="cf-submit" onClick={submit} disabled={status === 'submitting'}>
              {status === 'submitting'
                ? 'enviando…'
                : decision === 'yes'
                  ? 'confirmar presença'
                  : 'enviar resposta'}
            </button>
          </div>
        </Reveal>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 9,
            letterSpacing: '.18em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
          }}
        >
          uma confirmação por família · pode editar reenviando
        </p>
      </section>
    </main>
  );
}

/* ─── Linha de pessoa (container animado + tilt 3D) ──────────────────── */
function PersonRow({
  index,
  person,
  leaving,
  canRemove,
  onChange,
  onRemove,
  onEnter,
}: {
  index: number;
  person: Person;
  leaving: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Person>) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div
      ref={ref}
      className={`cf-person cf-tilt${leaving ? ' cf-leaving' : ''}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <div className="cf-person-idx">{index + 1}</div>
      <input
        id={fieldId}
        className="cf-person-input"
        value={person.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={index === 0 ? 'seu nome' : 'nome do acompanhante'}
        autoComplete="off"
      />
      <button
        type="button"
        className="cf-kind"
        data-kind={person.kind}
        onClick={() => onChange({ kind: person.kind === 'adult' ? 'child' : 'adult' })}
        title="Alternar entre adulto e criança"
      >
        {person.kind === 'child' ? '✿ criança' : 'adulto'}
      </button>
      {canRemove && (
        <button type="button" className="cf-remove" onClick={onRemove} aria-label="Remover pessoa">
          ×
        </button>
      )}
    </div>
  );
}

/* ─── Cronômetro até 28 de novembro de 2026 (meses de calendário) ─────── */
function calendarDiff(now: number, target: number) {
  if (now >= target) return { months: 0, days: 0, hours: 0, mins: 0, secs: 0 };
  const a = new Date(now);
  const b = new Date(target);

  // Meses cheios de calendário entre as duas datas.
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const anchor = new Date(a);
  anchor.setMonth(a.getMonth() + months);
  if (anchor.getTime() > target) {
    months -= 1;
    anchor.setMonth(anchor.getMonth() - 1);
  }

  let diff = target - anchor.getTime();
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);
  return { months, days, hours, mins, secs };
}

function CountdownBlock() {
  // SSR começa "zerado" (= data alvo) pra não dar mismatch de hidratação;
  // o cliente assume o tempo real no efeito.
  const [now, setNow] = useState(WEDDING_DATE);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const c = calendarDiff(now, WEDDING_DATE);
  const units: Array<[number, string]> = [
    [c.months, c.months === 1 ? 'mês' : 'meses'],
    [c.days, c.days === 1 ? 'dia' : 'dias'],
    [c.hours, 'horas'],
    [c.mins, 'min'],
    [c.secs, 'seg'],
  ];

  return (
    <section className="cf-count-section">
      <Reveal>
        <div className="cf-eyebrow">contagem regressiva</div>
      </Reveal>
      <div className="cf-count-grid">
        {units.map(([v, label], i) => (
          <Reveal key={label} className="cf-tick" y={36} delay={i * 90}>
            <span className="cf-tick-num" key={v}>
              {String(v).padStart(2, '0')}
            </span>
            <span className="cf-tick-label">{label}</span>
            {i < units.length - 1 && <span className="cf-tick-sep">·</span>}
          </Reveal>
        ))}
      </div>
      <Reveal delay={240} y={30}>
        <div className="cf-count-date">
          <div className="cf-count-line" />
          <span>28 de novembro de 2026 · sábado · 9h</span>
          <div className="cf-count-line" />
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Bloco de vídeo com parallax + tilt 3D ──────────────────────────── */
function VideoBlock() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const [muted, setMuted] = useState(true);

  // Liga o som. Navegadores só permitem autoplay com áudio após um gesto do
  // usuário, então começamos mudo e desmutamos no primeiro toque/clique/scroll.
  const enableSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    setMuted(false);
    void v.play().catch(() => {});
  };

  // React não aplica o atributo `muted` no DOM de forma confiável, e sem ele o
  // autoplay é bloqueado (vídeo trava no 1º frame). Forçamos mudo via ref e
  // disparamos o play no mount.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  // Desmuta automaticamente na primeira interação da página.
  useEffect(() => {
    if (!muted) return;
    const once = () => enableSound();
    const opts = { once: true, passive: true } as const;
    window.addEventListener('pointerdown', once, opts);
    window.addEventListener('keydown', once, opts);
    window.addEventListener('touchstart', once, opts);
    window.addEventListener('scroll', once, opts);
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
      window.removeEventListener('touchstart', once);
      window.removeEventListener('scroll', once);
    };
  }, [muted]);

  // Parallax suave conforme o scroll.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        const t = Math.max(-1, Math.min(1, -center / window.innerHeight));
        el.style.setProperty('--cf-parallax', `${(t * 26).toFixed(2)}px`);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(var(--cf-parallax)) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
  };
  const reset = () => {
    if (frameRef.current) frameRef.current.style.transform = 'translateY(var(--cf-parallax))';
  };

  return (
    <div ref={wrapRef} className="cf-video-wrap" style={{ '--cf-parallax': '0px' } as CSSProperties}>
      <Reveal y={48}>
        <div
          ref={frameRef}
          className="cf-video-frame"
          style={{ transform: 'translateY(var(--cf-parallax))' }}
          onPointerMove={onMove}
          onPointerLeave={reset}
        >
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                className="cf-video-media"
                src={VIDEO_SRC}
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="auto"
                onEnded={(e) => {
                  const v = e.currentTarget;
                  v.currentTime = 0;
                  void v.play().catch(() => {});
                }}
                onError={() => setHasVideo(false)}
              />
              {muted && (
                <button type="button" className="cf-video-sound" onClick={enableSound}>
                  🔊 ativar som
                </button>
              )}
            </>
          ) : (
            <div className="cf-video-placeholder">
              <div>
                <div style={{ fontSize: 26, marginBottom: 8 }}>✦</div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '.22em' }}>
                  NOSSO VÍDEO ENTRA AQUI
                </div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>
                  /public/AeF.mp4
                </div>
              </div>
            </div>
          )}
        </div>
      </Reveal>
      <Reveal delay={160} y={30}>
        <div className="cf-video-cap">um pedacinho da nossa história ✦ toque para ativar o som</div>
      </Reveal>
    </div>
  );
}

/* ─── Tela de agradecimento ──────────────────────────────────────────── */
function DoneScreen({ decision, names }: { decision: Decision; names: Person[] }) {
  return (
    <main data-theme="light" className="cf-root">
      {decision === 'yes' && <Celebration />}
      <section className={`cf-done ${decision === 'yes' ? 'celebration-done-wrap' : ''}`}>
        {decision === 'yes' && <div style={{ height: 240 }} aria-hidden />}
        <div className={decision === 'yes' ? 'celebration-panel' : ''}>
          <div className="cf-eyebrow">
            {decision === 'yes' ? '✦ presença confirmada ✦' : '✦ obrigado por avisar ✦'}
          </div>
          <h1 className="cf-hero-title" style={{ fontSize: 'clamp(34px,7vw,60px)' }}>
            {decision === 'yes' ? 'que alegria!' : 'sentiremos sua falta'}
          </h1>

          {decision === 'yes' && names.length > 0 && (
            <div className="cf-done-names">
              {names.map((p, i) => (
                <span key={p.id} className="cf-chip" style={{ animationDelay: `${i * 80}ms` }}>
                  {p.kind === 'child' ? '✿ ' : ''}
                  {p.name.trim().toLowerCase()}
                </span>
              ))}
            </div>
          )}

          <p className="cf-hero-sub">
            {decision === 'yes'
              ? `Anotamos com carinho ${names.length === 1 ? 'o seu nome' : 'todos os nomes'}. Mal podemos esperar para celebrar com vocês no dia 28 de novembro de 2026.`
              : 'Entendemos, e ficamos felizes pelo carinho de responder. Você fará falta — guardaremos um brinde a você.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <Ornament color="var(--ink)" width={44} />
          </div>

          <button
            type="button"
            className="cf-add"
            style={{ maxWidth: 280, margin: '34px auto 0' }}
            onClick={() => window.location.reload()}
          >
            confirmar outra família
          </button>
        </div>
      </section>
    </main>
  );
}
