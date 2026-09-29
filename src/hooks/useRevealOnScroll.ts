'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setHeroDolly } from '@/lib/hero-bridge';

gsap.registerPlugin(ScrollTrigger);

function whenIntroReady(run: () => void) {
  if (!document.documentElement.classList.contains('intro-lock')) {
    requestAnimationFrame(() => requestAnimationFrame(run));
    return;
  }
  window.addEventListener(
    'aef-film-intro-done',
    () => {
      requestAnimationFrame(() => requestAnimationFrame(run));
    },
    { once: true },
  );
}

function mountHeroScroll(mobile: boolean) {
  const hero = document.querySelector<HTMLElement>('.hero-stage');
  if (!hero || hero.offsetHeight < 80) return;

  const scrollDistance = Math.max(Math.round(hero.offsetHeight * 0.62), 320);

  if (mobile) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => setHeroDolly(self.progress * 0.55),
    });
    return;
  }

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => `+=${scrollDistance}`,
    pin: true,
    scrub: 0.65,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => setHeroDolly(self.progress),
  });
}

export function useRevealOnScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const mobile = window.matchMedia('(max-width: 767px)').matches;
    let ctx: gsap.Context | null = null;

    const boot = () => {
      ctx = gsap.context(() => {
        mountHeroScroll(mobile);

        const como = document.querySelector('#como');
        const start = mobile ? 'top 92%' : 'top 75%';

        if (como) {
          gsap.from('.how-step', {
            scrollTrigger: { trigger: como, start, invalidateOnRefresh: true },
            opacity: 0.35,
            duration: 0.6,
            stagger: 0.35,
            ease: 'power2.out',
          });

          const line = document.querySelector<SVGPathElement>('.how-line');
          if (line) {
            const length = line.getTotalLength();
            gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(line, {
              strokeDashoffset: 0,
              duration: 0.9,
              ease: 'power2.out',
              scrollTrigger: { trigger: como, start, invalidateOnRefresh: true },
              delay: 0.2,
            });
          }
        }

        document.querySelectorAll<SVGPathElement>('.brush').forEach((path) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          gsap.to(path, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: path,
              start: mobile ? 'top 95%' : 'top 80%',
              end: 'bottom 30%',
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>('.arch-reveal').forEach((el) => {
          gsap.fromTo(
            el,
            { clipPath: 'inset(40% 18% 40% 18% round 80px)' },
            {
              clipPath: 'inset(0% 0% 0% 0% round 180px)',
              ease: 'power2.out',
              scrollTrigger: {
                trigger: el,
                start: mobile ? 'top 92%' : 'top 80%',
                end: 'top 40%',
                scrub: 0.4,
                invalidateOnRefresh: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>('.reveal-line').forEach((el) => {
          gsap.from(el, {
            y: 22,
            autoAlpha: 0,
            duration: 0.85,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: mobile ? 'top 90%' : 'top 78%', invalidateOnRefresh: true },
          });
        });

        const credits = document.querySelector('.film-credits');
        if (credits) {
          gsap.from('.film-credits p', {
            y: 36,
            autoAlpha: 0,
            duration: 1.5,
            ease: 'power2.out',
            scrollTrigger: { trigger: credits, start: 'top 88%', invalidateOnRefresh: true },
          });
        }
      });

      ScrollTrigger.refresh();
    };

    whenIntroReady(boot);

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      window.clearTimeout(refresh);
      setHeroDolly(0);
      ctx?.revert();
    };
  }, []);
}
