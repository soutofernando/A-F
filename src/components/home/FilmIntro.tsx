'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { setScrollLocked } from '@/lib/scroll';

type Props = { onDone?: () => void };

export function FilmIntro({ onDone }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [alive, setAlive] = useState(true);
  const done = useRef(onDone);
  const settled = useRef(false);
  done.current = onDone;

  const close = (remember: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (remember) window.sessionStorage.setItem('aef-intro', '1');
    document.documentElement.classList.remove('intro-lock');
    setScrollLocked(false);
    setAlive(false);
    window.dispatchEvent(new CustomEvent('aef-film-intro-done'));
    done.current?.();
  };

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const seen = window.sessionStorage.getItem('aef-intro') === '1';
    if (reduced || seen) {
      close(false);
      return;
    }

    const node = root.current;
    if (!node) return;
    document.documentElement.classList.add('intro-lock');
    setScrollLocked(true);

    const veil = node.querySelector<HTMLElement>('.film-veil');
    const stain = { v: -22 };
    const ctx = gsap.context(() => {
      const strokes = node.querySelectorAll<SVGPathElement>('.af-stroke');
      strokes.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      });
      gsap
        .timeline({ onComplete: () => close(true) })
        .to(strokes, { strokeDashoffset: 0, duration: 1.15, stagger: 0.12, ease: 'power2.inOut' })
        .to(stain, {
          v: 150,
          duration: 1.05,
          ease: 'power2.inOut',
          onUpdate: () => veil?.style.setProperty('--stain', `${stain.v}%`),
        }, '-=0.15')
        .to('.letterbox', { scaleY: 0, duration: 0.7, ease: 'power3.inOut' }, '<0.15')
        .to('.intro-skip', { autoAlpha: 0, duration: 0.3 }, '<');
    }, node);

    const lock = window.setTimeout(() => setScrollLocked(true), 80);

    return () => {
      window.clearTimeout(lock);
      ctx.revert();
      document.documentElement.classList.remove('intro-lock');
      setScrollLocked(false);
    };
    // close is stable enough for this mount-once intro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!alive) return null;

  return (
    <div className="film-intro" ref={root} role="dialog" aria-label="Abertura">
      <div className="film-veil" aria-hidden>
        <svg className="af-mark" viewBox="0 0 180 110" fill="none">
          <path className="af-stroke" d="M28 96 L54 16 L80 96" />
          <path className="af-stroke" d="M40 64 H68" />
          <path className="af-stroke" d="M104 16 H152" />
          <path className="af-stroke" d="M104 16 V96" />
          <path className="af-stroke" d="M104 56 H142" />
        </svg>
      </div>
      <button type="button" className="intro-skip" onClick={() => close(true)}>
        Pular
      </button>
      <div className="letterbox letterbox-top" aria-hidden />
      <div className="letterbox letterbox-bottom" aria-hidden />
    </div>
  );
}
