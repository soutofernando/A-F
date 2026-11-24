'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';
import { festaImageUrl, festaVideoEmbed } from '@/lib/festa/media';
import { pontosLabel } from '@/lib/festa/names';
import { readPlayer, writePlayer } from '@/lib/festa/player-storage';
import { FestaUploadError, sendFestaMedia } from '@/lib/festa/send-media';
import type { FestaChallenge, FestaFeedItem, FestaPlayer } from '@/lib/festa/types';

type Tab = 'desafios' | 'ranking' | 'galeria';
type Filter = 'tudo' | 'desafios' | 'soltas';

const FEED_COLUMNS = 'id, player_id, display_name, kind, media_type, drive_file_id, points, challenge_id, challenge_title, created_at';

function sameFeed(a: FestaFeedItem[], b: FestaFeedItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].display_name !== b[i].display_name || a[i].drive_file_id !== b[i].drive_file_id) {
      return false;
    }
  }
  return true;
}

function sameChallenges(a: FestaChallenge[], b: FestaChallenge[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].title !== b[i].title || a[i].hint !== b[i].hint || a[i].sort_order !== b[i].sort_order) {
      return false;
    }
  }
  return true;
}

function rankingOf(feed: FestaFeedItem[]) {
  const map = new Map<string, { id: string; name: string; points: number; firstAt: string }>();
  const chronological = [...feed].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const item of chronological) {
    if (item.kind !== 'challenge') continue;
    const row = map.get(item.player_id) ?? {
      id: item.player_id,
      name: item.display_name,
      points: 0,
      firstAt: item.created_at,
    };
    row.name = item.display_name;
    row.points += item.points;
    map.set(item.player_id, row);
  }
  return [...map.values()].sort((a, b) => b.points - a.points || a.firstAt.localeCompare(b.firstAt) || a.name.localeCompare(b.name, 'pt'));
}

function leadLine(rows: ReturnType<typeof rankingOf>, me: string | undefined) {
  if (rows.length === 0) return 'Ninguém pontuou ainda.';
  const top = rows[0];
  const points = pontosLabel(top.points);
  if (top.id === me) return `Você está na frente, com ${points}.`;
  return `${top.name} está na frente, com ${points}.`;
}

function Still({ src, alt, video }: { src: string; alt: string; video?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (video) {
    return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" aria-label={alt} />;
  }
  if (failed) return <span className="festa-fallback">{alt}</span>;
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export function FestaApp({
  challenges: initialChallenges,
  feed: initialFeed,
}: {
  challenges: FestaChallenge[];
  feed: FestaFeedItem[];
}) {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<FestaPlayer | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [tab, setTab] = useState<Tab>('desafios');
  const [filter, setFilter] = useState<Filter>('tudo');
  const [challenges, setChallenges] = useState(initialChallenges);
  const [feed, setFeed] = useState(initialFeed);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState('');
  const [joinError, setJoinError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadAt, setUploadAt] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [needName, setNeedName] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const pullGen = useRef(0);
  const challengeTarget = useRef<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPlayer(readPlayer());
    setReady(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let stop = false;

    const pull = async () => {
      if (document.hidden) return;
      const gen = ++pullGen.current;
      const [challengeRes, feedRes] = await Promise.all([
        supabase
          .from('festa_challenges')
          .select('id, title, hint, sort_order, active')
          .eq('active', true)
          .order('sort_order')
          .order('created_at'),
        supabase.from('festa_feed').select(FEED_COLUMNS).order('created_at', { ascending: false }),
      ]);
      if (stop || gen !== pullGen.current) return;
      if (challengeRes.data) {
        const next = challengeRes.data as FestaChallenge[];
        setChallenges((current) => (sameChallenges(current, next) ? current : next));
      }
      if (feedRes.data) {
        const next = feedRes.data as FestaFeedItem[];
        setFeed((current) => (sameFeed(current, next) ? current : next));
      }
    };

    const timer = window.setInterval(() => void pull(), 8000);
    const onVisible = () => {
      if (!document.hidden) void pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    const channel = supabase
      .channel('festa-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'festa_feed' }, () => void pull())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'festa_challenges' }, () => void pull())
      .subscribe();

    return () => {
      stop = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  const doneByChallenge = useMemo(() => {
    const map = new Map<string, FestaFeedItem>();
    if (!player) return map;
    for (const item of feed) {
      if (item.player_id === player.id && item.kind === 'challenge' && item.challenge_id) {
        map.set(item.challenge_id, item);
      }
    }
    return map;
  }, [feed, player]);

  const rows = useMemo(() => rankingOf(feed), [feed]);
  const mine = player ? rows.find((row) => row.id === player.id)?.points ?? 0 : 0;
  const done = doneByChallenge.size;

  const visible = useMemo(() => {
    if (filter === 'desafios') return feed.filter((item) => item.kind === 'challenge');
    if (filter === 'soltas') return feed.filter((item) => item.kind === 'gallery');
    return feed;
  }, [feed, filter]);

  const viewerIndex = visible.findIndex((item) => item.id === viewerId);
  const viewer = viewerIndex >= 0 ? visible[viewerIndex] : null;

  useEffect(() => {
    if (!viewer) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewerId(null);
      if (event.key === 'ArrowRight') {
        const next = visible[viewerIndex + 1];
        if (next) setViewerId(next.id);
      }
      if (event.key === 'ArrowLeft') {
        const prev = visible[viewerIndex - 1];
        if (prev) setViewerId(prev.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, viewerIndex, visible]);

  const remember = (item: FestaFeedItem) => {
    pullGen.current += 1;
    setFeed((current) => (current.some((row) => row.id === item.id) ? current : [item, ...current]));
  };

  const join = async (name: string) => {
    setPending(true);
    setJoinError('');
    try {
      const res = await fetch('/api/festa/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, token: player?.token }),
      });
      const data = await res.json().catch(() => null) as { error?: string; id?: string; token?: string; displayName?: string } | null;
      if (!res.ok || !data?.id || !data.token || !data.displayName) {
        setJoinError(data?.error || 'Não consegui entrar.');
        return;
      }
      const next = { id: data.id, token: data.token, displayName: data.displayName };
      writePlayer(next);
      setPlayer(next);
      setBrowsing(false);
      setRenaming(false);
      setNeedName(false);
    } catch {
      setJoinError('Não consegui entrar. Tente outra vez.');
    } finally {
      setPending(false);
    }
  };

  const uploadFiles = async (files: File[], kind: 'challenge' | 'gallery', challengeId: string | null) => {
    if (!player) {
      setNeedName(true);
      return;
    }
    setUploadError('');
    setUploadAt(challengeId ?? 'gallery');
    setBusy(challengeId ?? 'gallery');
    try {
      for (let index = 0; index < files.length; index += 1) {
        setBusy(files.length > 1 ? `${index + 1}/${files.length}` : (challengeId ?? 'gallery'));
        const item = await sendFestaMedia({
          token: player.token,
          file: files[index],
          kind,
          challengeId,
        });
        remember(item);
      }
    } catch (caught) {
      if (caught instanceof FestaUploadError && caught.message.includes('Entre de novo')) {
        writePlayer(null);
        setPlayer(null);
      }
      setUploadError(caught instanceof Error ? caught.message : 'Não consegui enviar. Tente outra vez.');
    } finally {
      setBusy('');
    }
  };

  const onChallengeFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    const challengeId = challengeTarget.current;
    if (!challengeId || files.length === 0) return;
    void uploadFiles(files.slice(0, 1), 'challenge', challengeId);
  };

  const onGalleryFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0) return;
    void uploadFiles(files, 'gallery', null);
  };

  const openGallery = () => {
    if (!player) {
      setNeedName(true);
      setTab('galeria');
      return;
    }
    galleryRef.current?.click();
  };

  if (!ready) {
    return (
      <div className="festa">
        <div className="festa-frame festa-door">
          <Logo height={54} priority />
        </div>
      </div>
    );
  }

  if (!player && !browsing) {
    return (
      <div className="festa">
        <div className="festa-frame festa-door">
          <Logo height={54} priority />
          <h1>A festa tem uma brincadeira.</h1>
          <NameForm initial="" submitLabel="Entrar" pending={pending} error={joinError} onSubmit={join} />
          <p className="festa-note">Cada desafio vale 1 ponto. O ranking muda na hora.</p>
          <button type="button" className="festa-text" onClick={() => { setBrowsing(true); setTab('galeria'); }}>
            Ver a galeria sem participar
          </button>
        </div>
      </div>
    );
  }

  const progress = challenges.length > 0 ? `${done} de ${challenges.length} desafios` : pontosLabel(mine);

  return (
    <div className="festa festa-app">
      <header className="festa-head">
        <div className="festa-frame festa-head-row">
          <div>
            <Logo height={36} />
            <div className="festa-who">{player ? player.displayName : 'A festa'}</div>
            {player && <p className="festa-progress">{progress}</p>}
          </div>
          {player && !renaming && (
            <button type="button" className="festa-text" onClick={() => setRenaming(true)}>
              Trocar nome
            </button>
          )}
          {!player && (
            <button type="button" className="festa-text" onClick={() => setBrowsing(false)}>
              Participar
            </button>
          )}
        </div>
        <div className="festa-frame">
          {renaming && player && (
            <div className="festa-rename">
              <NameForm
                initial={player.displayName}
                submitLabel="Salvar"
                pending={pending}
                error={joinError}
                onSubmit={join}
              />
            </div>
          )}
          <p className="festa-live" aria-live="polite">{leadLine(rows, player?.id)}</p>
        </div>
      </header>

      <main className="festa-scroll">
        {tab === 'desafios' && (
          <div className="festa-frame">
            {challenges.length === 0 && <p className="festa-note">Os desafios ainda não foram publicados.</p>}
            <ol className="festa-list">
              {challenges.map((challenge) => {
                const shot = doneByChallenge.get(challenge.id);
                return (
                  <li key={challenge.id} className={shot ? 'festa-mission is-done' : 'festa-mission'}>
                    {shot && (
                      <button type="button" className="festa-shot" onClick={() => setViewerId(shot.id)}>
                        <Still src={festaImageUrl(shot.drive_file_id, 800)} alt={challenge.title} />
                      </button>
                    )}
                    <div>
                      <h2>{challenge.title}</h2>
                      {!shot && challenge.hint && <p>{challenge.hint}</p>}
                      {shot ? (
                        <p className="festa-point">1 ponto</p>
                      ) : (
                        <div className="festa-actions">
                          <button
                            type="button"
                            className="festa-go"
                            disabled={Boolean(busy)}
                            onClick={() => {
                              challengeTarget.current = challenge.id;
                              if (!player) {
                                setNeedName(true);
                                return;
                              }
                              cameraRef.current?.click();
                            }}
                          >
                            {busy === challenge.id ? 'Enviando…' : 'Tirar foto'}
                          </button>
                          <button
                            type="button"
                            className="festa-text"
                            disabled={Boolean(busy)}
                            onClick={() => {
                              challengeTarget.current = challenge.id;
                              if (!player) {
                                setNeedName(true);
                                return;
                              }
                              libraryRef.current?.click();
                            }}
                          >
                            Já tenho a foto
                          </button>
                        </div>
                      )}
                      {uploadError && uploadAt === challenge.id && (
                        <p className="festa-error">{uploadError}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <section className="festa-loose">
              <h2>A galeria da noite</h2>
              <p>Mande fotos e vídeos do casamento sem entrar no ranking.</p>
              {needName && !player && (
                <NameForm initial="" submitLabel="Entrar" pending={pending} error={joinError} onSubmit={join} />
              )}
              <button type="button" className="festa-go" disabled={Boolean(busy)} onClick={openGallery}>
                {galleryButtonLabel(busy)}
              </button>
              {uploadError && uploadAt === 'gallery' && <p className="festa-error">{uploadError}</p>}
            </section>
          </div>
        )}

        {tab === 'ranking' && (
          <div className="festa-frame">
            {rows.length === 0 ? (
              <p className="festa-note">O ranking começa na primeira foto.</p>
            ) : (
              <ol className="festa-rank">
                {rows.map((row, index) => {
                  const mineRow = row.id === player?.id;
                  if (index === 0) {
                    return (
                      <li key={row.id} className={mineRow ? 'is-lead is-me' : 'is-lead'}>
                        <div className="festa-lead-score">{row.points}</div>
                        <div className="festa-lead-name">
                          {row.name}
                          {mineRow && <em className="festa-you">você</em>}
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li key={row.id} className={mineRow ? 'is-me' : undefined}>
                      <span className="festa-place">{index + 1}</span>
                      <span className="festa-rank-name">
                        {row.name}
                        {mineRow && <em className="festa-you">você</em>}
                      </span>
                      <span className="festa-rank-points">{pontosLabel(row.points)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        {tab === 'galeria' && (
          <div className="festa-gallery">
            <div className="festa-gallery-bar">
              {needName && !player && (
                <NameForm initial="" submitLabel="Entrar" pending={pending} error={joinError} onSubmit={join} />
              )}
              <button type="button" className="festa-go" disabled={Boolean(busy)} onClick={openGallery}>
                {galleryButtonLabel(busy)}
              </button>
              {uploadError && uploadAt === 'gallery' && <p className="festa-error">{uploadError}</p>}
            </div>
            <div className="festa-filters">
              {([
                ['tudo', 'Tudo'],
                ['desafios', 'Desafios'],
                ['soltas', 'Soltas'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="festa-count">{galleryCount(visible)}</p>
            {visible.length === 0 ? (
              <p className="festa-note">As fotos da noite aparecem aqui.</p>
            ) : (
              <div className="festa-grid">
                {visible.map((item) => (
                  <button key={item.id} type="button" className="festa-cell" onClick={() => setViewerId(item.id)}>
                    <Still
                      src={festaImageUrl(item.drive_file_id, 800)}
                      alt={item.display_name}
                      video={item.media_type === 'video'}
                    />
                    {item.media_type === 'video' && <span>vídeo</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="festa-tabs" aria-label="Festa">
        <div className="festa-frame festa-tabs-grid" role="tablist">
          {([
            ['desafios', 'desafios'],
            ['ranking', 'ranking'],
            ['galeria', 'galeria'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="festa-tab"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <input ref={cameraRef} className="festa-file" type="file" accept="image/*" capture="environment" onChange={onChallengeFiles} />
      <input ref={libraryRef} className="festa-file" type="file" accept="image/*" onChange={onChallengeFiles} />
      <input ref={galleryRef} className="festa-file" type="file" accept="image/*,video/*" multiple onChange={onGalleryFiles} />

      {viewer && (
        <div className="festa-view" role="dialog" aria-modal="true" aria-label={viewer.display_name}>
          <div className="festa-view-bar">
            <button ref={closeRef} type="button" onClick={() => setViewerId(null)}>fechar</button>
          </div>
          <figure>
            {viewer.media_type === 'video' ? (
              <iframe
                src={festaVideoEmbed(viewer.drive_file_id)}
                title={viewer.display_name}
                allow="autoplay"
                allowFullScreen
              />
            ) : (
              <img src={festaImageUrl(viewer.drive_file_id)} alt={viewer.display_name} />
            )}
            <figcaption>
              {viewer.display_name}
              <small>{viewer.challenge_title || 'Galeria'}</small>
            </figcaption>
          </figure>
          {visible.length > 1 && (
            <div className="festa-view-nav">
              <button
                type="button"
                onClick={() => viewerIndex > 0 && setViewerId(visible[viewerIndex - 1].id)}
                disabled={viewerIndex <= 0}
              >
                anterior
              </button>
              <button
                type="button"
                onClick={() => viewerIndex < visible.length - 1 && setViewerId(visible[viewerIndex + 1].id)}
                disabled={viewerIndex >= visible.length - 1}
              >
                próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function galleryButtonLabel(busy: string) {
  if (busy === 'gallery') return 'Enviando…';
  if (busy.includes('/')) return `Enviando ${busy}`;
  return 'Enviar para a galeria';
}

function galleryCount(items: FestaFeedItem[]) {
  const photos = items.filter((item) => item.media_type === 'image').length;
  const videos = items.filter((item) => item.media_type === 'video').length;
  if (photos === 0 && videos === 0) return 'Nenhuma foto ainda';
  const photoLabel = photos === 1 ? '1 foto' : `${photos} fotos`;
  const videoLabel = videos === 1 ? '1 vídeo' : `${videos} vídeos`;
  if (videos === 0) return photoLabel;
  if (photos === 0) return videoLabel;
  return `${photoLabel} e ${videoLabel}`;
}

function NameForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: {
  initial: string;
  submitLabel: string;
  pending: boolean;
  error: string;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <label className="festa-label" htmlFor={`festa-name-${submitLabel}`}>Seu nome</label>
      <input
        id={`festa-name-${submitLabel}`}
        className="festa-input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="name"
        enterKeyHint="done"
        maxLength={40}
        required
        placeholder="Maria Silva"
      />
      {error && <p className="festa-error">{error}</p>}
      <button className="festa-go" type="submit" disabled={pending || name.trim().length < 2}>
        {pending ? 'Entrando…' : submitLabel}
      </button>
    </form>
  );
}
