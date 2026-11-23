'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { consumeEntryPass } from '@/app/admin/entrada/actions';
import type { EntryGuest, EntryScan } from '@/lib/admin/entry-pass-types';

const READER_ID = 'entry-reader';
const SAME_CODE_COOLDOWN_MS = 1400;

function cameraMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? '');
  if (/notallowed|permission|denied/i.test(text)) {
    return 'Libere a câmera nas configurações do celular e tente de novo.';
  }
  if (/notfound|no camera|device not found/i.test(text)) {
    return 'Não achei uma câmera neste aparelho.';
  }
  return 'Não consegui abrir a câmera. Tente de novo.';
}

function formatUsedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} às ${time}`;
}

function buzz(kind: 'ok' | 'bad') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (kind === 'ok') navigator.vibrate(70);
  else navigator.vibrate([40, 50, 40]);
}

function sortGuests(guests: EntryGuest[]) {
  return [...guests].sort((a, b) => {
    const used = Number(Boolean(a.usedAt)) - Number(Boolean(b.usedAt));
    if (used !== 0) return used;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });
}

export function EntryScanner({ guests: initialGuests }: { guests: EntryGuest[] }) {
  const [guests, setGuests] = useState(initialGuests);
  const [result, setResult] = useState<EntryScan | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const statesRef = useRef<{ scanning: number; paused: number } | null>(null);
  const lifeRef = useRef(0);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const busyRef = useRef(false);
  const lastTokenRef = useRef('');
  const cooldownUntilRef = useRef(0);
  const onDecodeRef = useRef<(value: string) => void>(() => {});
  const nextRef = useRef<HTMLButtonElement>(null);

  const enqueue = (job: () => Promise<void>) => {
    const run = chainRef.current.then(job, job);
    chainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const holdCamera = () => {
    const scanner = scannerRef.current;
    const states = statesRef.current;
    if (!scanner || !states) return;
    try {
      if (scanner.getState() === states.scanning) scanner.pause(true);
    } catch {
      /* already paused or stopped */
    }
  };

  const stopCamera = () => {
    lifeRef.current += 1;
    return enqueue(async () => {
      const scanner = scannerRef.current;
      const states = statesRef.current;
      if (!scanner || !states) return;
      const state = scanner.getState();
      if (state !== states.scanning && state !== states.paused) return;
      try {
        await scanner.stop();
      } catch {
        /* camera already closed */
      }
    });
  };

  const startCamera = () => {
    const life = ++lifeRef.current;
    setCameraError(null);
    return enqueue(async () => {
      if (life !== lifeRef.current) return;
      try {
        const { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (life !== lifeRef.current) return;
        statesRef.current = {
          scanning: Html5QrcodeScannerState.SCANNING,
          paused: Html5QrcodeScannerState.PAUSED,
        };

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(READER_ID, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          });
        }
        const scanner = scannerRef.current;
        const state = scanner.getState();
        if (state === Html5QrcodeScannerState.PAUSED) {
          scanner.resume();
          return;
        }
        if (state === Html5QrcodeScannerState.SCANNING) return;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.max(180, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72));
              return { width: size, height: size };
            },
          },
          (decoded) => onDecodeRef.current(decoded),
          () => {},
        );

        if (life !== lifeRef.current) {
          try {
            await scanner.stop();
          } catch {
            /* closed during navigation */
          }
        }
      } catch (error) {
        if (life !== lifeRef.current) return;
        setCameraError(cameraMessage(error));
      }
    });
  };

  onDecodeRef.current = (raw: string) => {
    const token = raw.trim();
    if (!token || busyRef.current) return;
    if (token === lastTokenRef.current && Date.now() < cooldownUntilRef.current) return;
    busyRef.current = true;
    lastTokenRef.current = token;
    holdCamera();
    void (async () => {
      let scan: EntryScan;
      try {
        scan = await consumeEntryPass(token);
      } catch {
        scan = { ok: false, reason: 'error' };
      }
      setResult(scan);
      if (scan.reason === 'ok' || scan.reason === 'used') {
        setGuests((current) => {
          const nextGuest: EntryGuest = {
            id: scan.guestId,
            name: scan.name,
            tableName: scan.tableName,
            usedAt: scan.usedAt,
          };
          if (!scan.guestId) return current;
          if (!current.some((guest) => guest.id === scan.guestId)) return sortGuests([...current, nextGuest]);
          return current.map((guest) => (guest.id === scan.guestId ? { ...guest, ...nextGuest } : guest));
        });
      }
      buzz(scan.reason === 'ok' ? 'ok' : 'bad');
    })();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera();
    }, 200);
    return () => {
      window.clearTimeout(timer);
      void stopCamera();
    };
    // Camera starts once. Later opens go through resume().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) nextRef.current?.focus({ preventScroll: true });
  }, [result]);

  const resume = () => {
    cooldownUntilRef.current = Date.now() + SAME_CODE_COOLDOWN_MS;
    busyRef.current = false;
    setResult(null);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scanner = scannerRef.current;
        const states = statesRef.current;
        try {
          if (scanner && states && scanner.getState() === states.paused) {
            scanner.resume();
            return;
          }
        } catch {
          /* start a fresh camera below */
        }
        void startCamera();
      });
    });
  };

  const ordered = useMemo(() => sortGuests(guests), [guests]);
  const needle = query.trim().toLocaleLowerCase('pt-BR');
  const visible = needle
    ? ordered.filter((guest) => guest.name.toLocaleLowerCase('pt-BR').includes(needle))
    : ordered;
  const arrived = guests.filter((guest) => guest.usedAt).length;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '12px 16px calc(20px + env(safe-area-inset-bottom))' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <Link href="/admin" style={{ color: 'rgba(239,231,219,.7)', fontSize: 13, textDecoration: 'none' }}>
          admin
        </Link>
        <div className="micro" style={{ color: 'var(--gold-soft)' }}>
          entrada
        </div>
        <Link href="/admin/entrada/qrs" style={{ color: 'rgba(239,231,219,.7)', fontSize: 13, textDecoration: 'none' }}>
          qrs
        </Link>
      </header>

      <div style={{ position: 'relative' }}>
        <div
          id={READER_ID}
          className="entry-reader"
          style={
            result
              ? {
                  position: 'absolute',
                  width: '100%',
                  height: 320,
                  minHeight: 320,
                  visibility: 'hidden',
                  pointerEvents: 'none',
                }
              : undefined
          }
        />
        {result ? (
          <ScanResult result={result} nextRef={nextRef} onNext={resume} />
        ) : (
          <>
            {cameraError && (
              <div style={{ padding: '28px 8px 8px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(239,231,219,.8)', lineHeight: 1.45 }}>{cameraError}</p>
                <button type="button" onClick={() => void startCamera()} style={ghostButton}>
                  tentar de novo
                </button>
              </div>
            )}
            {!cameraError && (
              <p style={{ textAlign: 'center', margin: '10px 0 0', fontSize: 13, color: 'rgba(239,231,219,.45)' }}>
                Aponte para o QR
              </p>
            )}
          </>
        )}
      </div>

      <section style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <h2 className="serif italic" style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>
            lista
          </h2>
          <div className="micro" style={{ color: 'rgba(239,231,219,.6)' }}>
            entraram {arrived} de {guests.length}
          </div>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="buscar nome"
          autoCapitalize="none"
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px 14px',
            background: '#141110',
            border: '1px solid rgba(239,231,219,.16)',
            color: 'var(--cream)',
            fontSize: 16,
          }}
        />
        <ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, maxHeight: '46vh', overflow: 'auto' }}>
          {visible.map((guest) => (
            <li
              key={guest.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid rgba(239,231,219,.08)',
                opacity: guest.usedAt ? 0.45 : 1,
              }}
            >
              <span>
                <span style={{ textDecoration: guest.usedAt ? 'line-through' : 'none', fontSize: 16 }}>{guest.name}</span>
                {guest.tableName && (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: 'rgba(239,231,219,.5)' }}>
                    {guest.tableName}
                  </span>
                )}
              </span>
              <span className="micro" style={{ color: guest.usedAt ? '#8dceb0' : 'rgba(239,231,219,.4)', flexShrink: 0 }}>
                {guest.usedAt ? 'entrou' : 'aguardando'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ScanResult({
  result,
  nextRef,
  onNext,
}: {
  result: EntryScan;
  nextRef: RefObject<HTMLButtonElement | null>;
  onNext: () => void;
}) {
  const tone =
    result.reason === 'ok'
      ? { bg: '#143024', border: '#3d9a62', kicker: 'entrada liberada', title: result.name }
      : result.reason === 'used'
        ? { bg: '#3a1614', border: '#c45c4a', kicker: 'já utilizado', title: result.name }
        : result.reason === 'error'
          ? { bg: '#1c1917', border: 'rgba(239,231,219,.28)', kicker: 'falha na leitura', title: 'Aponte de novo' }
          : result.reason === 'unauthorized'
            ? { bg: '#1c1917', border: 'rgba(239,231,219,.28)', kicker: 'sessão expirada', title: 'Entre de novo no admin' }
            : { bg: '#1c1917', border: 'rgba(239,231,219,.28)', kicker: 'qr inválido', title: 'Este código não vale' };

  return (
    <div
      role="status"
      style={{
        minHeight: 280,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 18,
        padding: '28px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      <div>
        <div className="micro" style={{ color: 'rgba(239,231,219,.72)' }}>
          {tone.kicker}
        </div>
        <div className="serif italic" style={{ fontSize: 'clamp(36px, 8vw, 56px)', lineHeight: 1.05, marginTop: 10 }}>
          {tone.title}
        </div>
        {result.reason === 'ok' && result.tableName && (
          <div style={{ marginTop: 14, fontSize: 18, color: 'rgba(239,231,219,.8)' }}>{result.tableName}</div>
        )}
        {result.reason === 'used' && (
          <div style={{ marginTop: 14, fontSize: 18, color: 'rgba(239,231,219,.8)' }}>
            Entrou {formatUsedAt(result.usedAt)}
            {result.tableName ? ` · ${result.tableName}` : ''}
          </div>
        )}
        {result.reason === 'unauthorized' && (
          <Link href="/admin/login" style={{ display: 'inline-block', marginTop: 16, color: 'var(--gold-soft)' }}>
            ir para o login
          </Link>
        )}
      </div>
      <button ref={nextRef} type="button" onClick={onNext} style={nextButton}>
        próximo
      </button>
    </div>
  );
}

const nextButton: CSSProperties = {
  width: '100%',
  minHeight: 72,
  border: 0,
  background: 'var(--gold-soft)',
  color: '#1a140f',
  fontFamily: 'var(--font-inter), Inter, sans-serif',
  fontSize: 18,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  touchAction: 'manipulation',
};

const ghostButton: CSSProperties = {
  marginTop: 16,
  background: 'transparent',
  border: '1px solid rgba(239,231,219,.3)',
  color: 'var(--cream)',
  padding: '12px 18px',
  letterSpacing: '.16em',
  textTransform: 'uppercase',
  fontSize: 12,
  cursor: 'pointer',
};
