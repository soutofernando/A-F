'use client';

import { useEffect, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { Countdown } from '@/components/Countdown';
import { Logo } from '@/components/Logo';
import { Magnet } from '@/components/Magnet';
import { Ornament } from '@/components/Ornament';
import { RusticIcon } from '@/components/RusticIcon';
import { useHeroScene } from '@/hooks/useHeroScene';
import { HERO_IMAGE } from '@/lib/site';

const HeroCanvas = dynamic(() => import('./HeroCanvas').then((m) => m.HeroCanvas), { ssr: false });

type Props = {
  name1: string;
  name2: string;
  subtitle: string;
  whenLine: string;
  target?: number;
};

function SplitName({ text }: { text: string }) {
  return (
    <span className="hero-name-part">
      {Array.from(text).map((char, index) => (
        <span key={`${char}-${index}`} className="hero-char">
          {char === ' ' ? '\u00a0' : char}
        </span>
      ))}
    </span>
  );
}

function revealHeroRest() {
  document.querySelector('.hero-stage')?.classList.remove('hero-intro-pending');
  gsap.to('.hero-char, .hero-amp', {
    y: 0,
    autoAlpha: 1,
    filter: 'blur(0px)',
    duration: 0.7,
    stagger: 0.035,
    ease: 'power3.out',
    delay: 0.08,
  });
  gsap.to('.hero-phrase-mask span', {
    yPercent: 0,
    duration: 0.9,
    ease: 'power3.out',
    delay: 0.42,
  });
  gsap.to('.hero-meta', {
    y: 0,
    autoAlpha: 1,
    duration: 0.75,
    stagger: 0.1,
    ease: 'power3.out',
    delay: 0.58,
  });
}

function playAfIntro() {
  gsap
    .timeline({ onComplete: revealHeroRest })
    .set('.hero-logo-stage', { autoAlpha: 1 })
    .fromTo(
      '.hero-logo-inner',
      { rotationY: 0, scale: 0.9 },
      { rotationY: 360, scale: 1, duration: 1.75, ease: 'power2.inOut' },
    );
}

export function Hero({ name1, name2, subtitle, whenLine, target }: Props) {
  const { paint, shift } = useHeroScene();
  const phrase = subtitle.replace(/^[—–-]\s*/, '');

  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      document.querySelector('.hero-stage')?.classList.remove('hero-intro-pending');
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set('.hero-logo-stage', { autoAlpha: 0 });
      gsap.set('.hero-logo-inner', { rotationY: 0, transformPerspective: 900 });
      gsap.set('.hero-char, .hero-amp', { y: 16, autoAlpha: 0, filter: 'blur(8px)' });
      gsap.set('.hero-phrase-mask span', { yPercent: 110 });
      gsap.set('.hero-meta', { y: 14, autoAlpha: 0 });
    });

    const onIntroDone = () => playAfIntro();
    window.addEventListener('aef-hero-intro-done', onIntroDone);

    return () => {
      window.removeEventListener('aef-hero-intro-done', onIntroDone);
      ctx.revert();
    };
  }, [name1, name2]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || paint) return;

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      if (cancelled || paint) return;

      const signalDone = () => window.dispatchEvent(new CustomEvent('aef-hero-intro-done'));
      if (document.documentElement.classList.contains('intro-lock')) {
        window.addEventListener('aef-film-intro-done', signalDone, { once: true });
      } else {
        signalDone();
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [paint]);

  return (
    <section className="hero-stage hero-intro-pending" style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', background: 'var(--paper)' }}>
      {/* Static watercolor is the LCP. The canvas paints over it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt="Aquarela da igreja, com arcos terracota, cruz dourada e céu azul"
        fetchPriority="high"
        decoding="async"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: paint ? undefined : `translate3d(${shift.x * 12}px, ${shift.y * 8}px, 0) scale(1.04)`,
        }}
      />
      {paint && <HeroCanvas />}
      <div className="hero-grade" aria-hidden />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          textAlign: 'center',
          padding: '120px 20px 36px',
          background: 'linear-gradient(180deg, rgba(248,245,238,0) 28%, rgba(248,245,238,.55) 62%, var(--bg) 100%)',
        }}
      >
        <div className="hero-logo-stage">
          <div className="hero-logo-inner">
            <Logo priority className="hero-logo hero-logo-mark" height={120} />
          </div>
        </div>
        <h1
          aria-label={`${name1} e ${name2}`}
          style={{
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            className="hero-names serif"
            style={{
              fontSize: 'clamp(28px, 5vw, 56px)',
              fontWeight: 400,
              letterSpacing: '0.04em',
              lineHeight: 1.05,
            }}
          >
            <SplitName text={name1} />
            <span className="hero-amp serif"> &amp; </span>
            <SplitName text={name2} />
          </span>
        </h1>

        <div className="hero-meta" style={{ marginTop: 18 }}>
          <Ornament color="var(--cruz-dourada)" />
        </div>
        <p className="hero-phrase-mask italic" style={{ marginTop: 14, maxWidth: 460, fontSize: 'clamp(18px, 2.4vw, 22px)', color: 'var(--ink-blue)' }}>
          <span>{phrase}</span>
        </p>
        <p className="hero-meta micro hero-when" style={{ marginTop: 14 }}>
          {whenLine}
        </p>
        <div className="hero-meta" style={{ marginTop: 22, width: '100%' }}>
          <Countdown target={target} />
        </div>
        <div className="hero-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 26 }}>
          <Magnet href="/#confirmar" className="btn btn-primary btn-magnet">
            <RusticIcon name="seal" size={16} />
            Confirmar presença
          </Magnet>
          <Magnet href="/presentes" className="btn btn-secondary btn-magnet">
            <RusticIcon name="gift" size={16} />
            Lista de presentes
          </Magnet>
        </div>
      </div>
    </section>
  );
}
