'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './nossa-historia.css';

gsap.registerPlugin(ScrollTrigger);

type Momento = {
  iso: string;
  data: string;
  titulo: string;
  texto: string;
  /** Public path, e.g. `/olhares.png`. Empty shows the striped placeholder. */
  foto?: string;
  alt?: string;
};

const MOMENTOS: Momento[] = [
  {
    iso: '2022-10-03',
    data: '3 de outubro de 2022',
    titulo: 'O primeiro olhar',
    texto: '',
    foto: '/olhares.png',
    alt: 'Aquarela em close dos olhos castanhos de Alicia, sem óculos, e de Fernando, com armação fina',
  },
  {
    iso: '2022-11-08',
    data: '8 de novembro de 2022',
    titulo: 'O primeiro beijo',
    texto: '',
    foto: '/primeiro-beijo.png',
    alt: 'Aquarela de Fernando de costas e Alicia sorrindo para ele, com a mão no ombro',
  },
  {
    iso: '2022-12-28',
    data: '28 de dezembro de 2022',
    titulo: 'O nosso primeiro sim',
    texto: '',
    foto: '/pedido-namoro.png',
    alt: 'Aquarela do pedido na quadra de tênis: Fernando ajoelhado com a caixinha e Alicia cobrindo o rosto',
  },
  {
    iso: '2025-09-26',
    data: '26 de setembro de 2025',
    titulo: 'O noivado',
    texto: '',
    foto: '/noivado.png',
    alt: 'Aquarela do beijo de noivado, em frente ao clube com palmeiras ao fim da tarde',
  },
  {
    iso: '2026-11-28',
    data: '28 de novembro de 2026',
    titulo: 'O casamento',
    texto: '',
    foto: '/aliancas.png',
    alt: 'Aquarela das duas alianças de ouro na caixa aberta, entre flores brancas e eucalipto',
  },
];

export function NossaHistoria() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const fill = root.querySelector<HTMLElement>('.nh-line-fill');
        const list = root.querySelector<HTMLElement>('.nh-list');

        if (fill && list) {
          gsap.fromTo(
            fill,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: list,
                start: 'top 70%',
                end: 'bottom 65%',
                scrub: true,
              },
            },
          );
        }

        gsap.utils.toArray<HTMLElement>('.nh-item', root).forEach((item) => {
          const marker = item.querySelector<HTMLElement>('.nh-marker');
          const frame = item.querySelector<HTMLElement>('.nh-frame');
          const zoom = item.querySelector<HTMLElement>('.nh-zoom');
          const bits = item.querySelectorAll<HTMLElement>('.nh-date, .nh-heading, .nh-text');

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: item,
              start: 'top 72%',
              once: true,
            },
          });

          if (marker) {
            tl.from(marker, { scale: 0, autoAlpha: 0, duration: 0.55, ease: 'back.out' }, 0);
          }
          if (frame) {
            tl.fromTo(
              frame,
              { clipPath: 'inset(100% 0% 0% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.inOut' },
              0.08,
            );
          }
          if (zoom) {
            tl.fromTo(zoom, { scale: 1.08 }, { scale: 1, duration: 1.1, ease: 'power4.inOut' }, 0.08);
          }
          if (bits.length) {
            tl.from(
              bits,
              { y: 18, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' },
              1.18,
            );
          }

        });
      });
    }, root);

    const refresh = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(refresh);
      ctx.revert();
    };
  }, []);

  return (
    <section id="historia" className="nh" ref={rootRef} aria-labelledby="nossa-historia-titulo">
      <div className="nh-inner">
        <h2 id="nossa-historia-titulo" className="nh-title">
          Nossa história
        </h2>
        <div className="nh-rule" aria-hidden="true" />

        <div className="nh-track">
          <div className="nh-line" aria-hidden="true">
            <div className="nh-line-fill" />
          </div>

          <ol className="nh-list">
            {MOMENTOS.map((momento) => (
              <li key={momento.iso} className="nh-item">
                <div className="nh-media">
                  <div className="nh-arch">
                    <div className="nh-frame">
                      <div className="nh-zoom">
                        <div className="nh-fit">
                        {momento.foto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="nh-photo"
                            src={momento.foto}
                            alt={momento.alt ?? momento.titulo}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="nh-placeholder" aria-hidden="true" />
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="nh-marker" aria-hidden="true" />

                <div className="nh-copy">
                  <time className="nh-date" dateTime={momento.iso}>
                    {momento.data}
                  </time>
                  <h3 className="nh-heading">{momento.titulo}</h3>
                  <p className="nh-text">{momento.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
