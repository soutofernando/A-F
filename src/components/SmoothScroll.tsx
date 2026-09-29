'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { bindLenis, getLenis, headerScrollOffset } from '@/lib/scroll';

gsap.registerPlugin(ScrollTrigger);

export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const lenis = new Lenis({
      autoRaf: false,
      allowNestedScroll: true,
      anchors: true,
      stopInertiaOnNavigate: true,
    });
    bindLenis(lenis);
    if (document.documentElement.classList.contains('intro-lock')) lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value?: number) {
        const instance = getLenis();
        if (!instance) return 0;
        if (value !== undefined) {
          instance.scrollTo(value, { immediate: true });
        }
        return instance.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: document.documentElement.style.transform ? 'transform' : 'fixed',
    });
    ScrollTrigger.addEventListener('refresh', () => getLenis()?.resize());
    const onNativeScroll = () => ScrollTrigger.update();
    window.addEventListener('scroll', onNativeScroll, { passive: true });
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const hash = window.location.hash.replace('#', '');
    if (hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) lenis.scrollTo(el, { offset: headerScrollOffset(), immediate: true });
      });
    }

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    window.addEventListener('orientationchange', refresh);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('scroll', onNativeScroll);
      window.removeEventListener('load', refresh);
      window.removeEventListener('orientationchange', refresh);
      lenis.destroy();
      bindLenis(null);
    };
  }, []);

  return null;
}
