'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Hero } from '@/components/home/Hero';
import { StoryBand } from '@/components/home/StoryBand';
import { BigDay } from '@/components/home/BigDay';
import { RsvpForm } from '@/components/home/RsvpForm';
import { GiftsBand } from '@/components/home/GiftsBand';
import { AlbumBand, NotesBand } from '@/components/home/AlbumNotes';
import { HomeMotion } from '@/components/home/HomeMotion';
import { FilmIntro } from '@/components/home/FilmIntro';
import { BotanicalRule } from '@/components/home/BotanicalRule';
import { FieldBackdrop } from '@/components/FieldBackdrop';

type SiteConfig = {
  coupleNames: string;
  heroSubtitle: string;
  weddingDate: string | null;
};

const DEFAULTS: SiteConfig = {
  coupleNames: 'Alicia & Fernando',
  heroSubtitle: '— pelos olhares que não desviaram, até virarem destino.',
  weddingDate: null,
};

export default function HomePage() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULTS);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: cfg } = await supabase.from('config').select('key, value');
      const map = new Map<string, string>();
      (cfg ?? []).forEach((row: { key: string; value: string | null }) => map.set(row.key, row.value ?? ''));
      setConfig({
        coupleNames: map.get('couple_names') || DEFAULTS.coupleNames,
        heroSubtitle: map.get('hero_subtitle') || DEFAULTS.heroSubtitle,
        weddingDate: map.get('wedding_date') || null,
      });
    })();
  }, []);

  const [name1, name2] = useMemo(() => {
    const parts = config.coupleNames.split(/\s*&\s*/).filter(Boolean);
    return [parts[0] ?? 'Alicia', parts[1] ?? 'Fernando'] as const;
  }, [config.coupleNames]);

  const weddingTimestamp = useMemo(() => {
    if (!config.weddingDate) return undefined;
    const time = new Date(config.weddingDate).getTime();
    return Number.isFinite(time) ? time : undefined;
  }, [config.weddingDate]);

  const whenLine = useMemo(() => {
    if (!config.weddingDate) return 'sábado · 28.11.2026 · 09:00';
    try {
      const date = new Date(config.weddingDate);
      const weekday = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][date.getDay()];
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      return `${weekday} · ${dd}.${mm}.${date.getFullYear()} · 09:00`;
    } catch {
      return 'sábado · 28.11.2026 · 09:00';
    }
  }, [config.weddingDate]);

  return (
    <div>
      <FilmIntro />
      <HomeMotion />
      <Hero name1={name1} name2={name2} subtitle={config.heroSubtitle} whenLine={whenLine} target={weddingTimestamp} />
      <BotanicalRule />
      <StoryBand />
      <Bleed />
      <BigDay />
      <BotanicalRule />
      <section id="confirmar" className="has-field" style={{ padding: '72px 22px 88px' }}>
        <FieldBackdrop tone="sky" />
        <div className="paper-sheet" style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 className="serif reveal-line" style={{ fontSize: 'clamp(40px, 6vw, 64px)', color: 'var(--ink-blue)', fontWeight: 400, lineHeight: 0.95, marginBottom: 8 }}>
            Confirmar presença
          </h2>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 22, maxWidth: 460 }}>
            É o primeiro passo. Depois, se quiser, a lista de presentes abre no mesmo fôlego.
          </p>
          <RsvpForm embedded />
        </div>
      </section>
      <GiftsBand />
    </div>
  );
}

function Bleed() {
  return (
    <div aria-hidden style={{ lineHeight: 0, color: 'var(--ceu)', marginTop: -1 }}>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 56 }}>
        <path d="M0 40 C 180 10, 320 60, 520 28 C 760 0, 980 64, 1440 22 L 1440 70 L 0 70 Z" fill="var(--bg-alt)" />
        <path className="brush" d="M0 36 C 200 8, 420 58, 700 24 C 980 0, 1200 48, 1440 18" fill="none" stroke="var(--ceu)" strokeWidth="3" />
      </svg>
    </div>
  );
}
