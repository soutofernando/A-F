import gsap from 'gsap';
import type Lenis from 'lenis';

let lenis: Lenis | null = null;

export function bindLenis(instance: Lenis | null) {
  lenis = instance;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function headerScrollOffset() {
  const header = document.querySelector('header');
  if (!header) return -84;
  return -(header.getBoundingClientRect().height + 12);
}

export function setScrollLocked(locked: boolean) {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (prefersReducedMotion() || !lenis) {
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    return;
  }
  const ease = gsap.parseEase('power3.inOut');
  lenis.scrollTo(el, { offset: headerScrollOffset(), duration: 1.8, easing: ease });
}
