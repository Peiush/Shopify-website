import {useEffect, useRef} from 'react';
import {useNavigation} from 'react-router';
import {gsap, ScrollTrigger, SplitText, useGSAP, MOTION_QUERIES} from '~/lib/gsap';
import {BRAND} from '~/lib/brand';

/** Fired on window when the intro preloader has finished. */
export const PRELOADED_EVENT = 'hf:preloaded';

declare global {
  interface Window {
    __hfPreloaded?: boolean;
  }
}

/** Runs `callback` once the preloader is done (immediately on client-side navigations). */
export function onPreloaded(callback: () => void) {
  if (window.__hfPreloaded) {
    callback();
    return () => {};
  }
  window.addEventListener(PRELOADED_EVENT, callback, {once: true});
  return () => window.removeEventListener(PRELOADED_EVENT, callback);
}

function finishPreload() {
  window.__hfPreloaded = true;
  window.dispatchEvent(new Event(PRELOADED_EVENT));
}

/**
 * Full-screen intro: counter 0 -> 100, wordmark rises, then the panel wipes up.
 * Server-rendered so it covers the page before hydration; a CSS failsafe hides
 * it after a few seconds if JavaScript never runs.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      // A one-time check (not gsap.matchMedia) so a resize never replays the intro.
      if (window.matchMedia(MOTION_QUERIES.reduceMotion).matches) {
        gsap.to(root.current, {
          autoAlpha: 0,
          duration: 0.3,
          onComplete: finishPreload,
        });
        return;
      }
      const counter = {value: 0};
      gsap
        .timeline({onComplete: finishPreload})
        .to(counter, {
          value: 100,
          duration: 1.2,
          ease: 'power2.inOut',
          onUpdate: () => {
            if (count.current) {
              count.current.textContent = String(Math.round(counter.value));
            }
          },
        })
        .from('.preloader-letter', {yPercent: 110, stagger: 0.04, duration: 0.6}, 0.2)
        .to('.preloader-bar', {scaleX: 1, duration: 1.2, ease: 'power2.inOut'}, 0)
        .to(root.current, {yPercent: -100, duration: 0.8, ease: 'expo.inOut'}, '+=0.15')
        .set(root.current, {display: 'none'});
    },
    {scope: root},
  );

  return (
    <div
      ref={root}
      className="preloader fixed inset-0 z-[100] flex flex-col justify-between bg-ink p-[var(--page-gutter)] text-bone"
      aria-hidden="true"
    >
      <p className="text-xs font-bold tracking-[0.3em] text-mute uppercase">
        Loading drop 07
      </p>
      <p className="flex overflow-hidden font-display text-[clamp(4rem,16vw,14rem)] leading-none">
        {BRAND.name.split('').map((letter, i) => (
          <span key={i} className="preloader-letter inline-block">
            {letter}
          </span>
        ))}
        <span className="preloader-letter inline-block text-volt">.</span>
      </p>
      <div className="flex items-end justify-between gap-6">
        <div className="h-px flex-1 bg-ink-3">
          <div className="preloader-bar h-px origin-left scale-x-0 bg-volt" />
        </div>
        <p className="font-display text-6xl tabular-nums">
          <span ref={count}>0</span>
          <span className="text-volt">%</span>
        </p>
      </div>
    </div>
  );
}

/**
 * A lime ring that trails the pointer and grows over links/buttons.
 * Desktop pointers only; disabled for reduced motion.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(
      '(pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        const el = ring.current!;
        const volt = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-volt')
          .trim();
        // rgba() (not color-mix) so GSAP can interpolate the fade
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(volt.slice(i, i + 2), 16) || 0);
        const tint = (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
        const xTo = gsap.quickTo(el, 'x', {duration: 0.35, ease: 'power3'});
        const yTo = gsap.quickTo(el, 'y', {duration: 0.35, ease: 'power3'});

        const onMove = (e: PointerEvent) => {
          gsap.to(el, {autoAlpha: 1, duration: 0.2, overwrite: 'auto'});
          xTo(e.clientX);
          yTo(e.clientY);
        };
        const onOver = (e: PointerEvent) => {
          const interactive = (e.target as Element).closest(
            'a, button, [role="button"], input, label',
          );
          gsap.to(el, {
            scale: interactive ? 2.4 : 1,
            backgroundColor: interactive ? tint(0.15) : tint(0),
            duration: 0.25,
          });
        };
        const onLeave = () => gsap.to(el, {autoAlpha: 0, duration: 0.2});

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerover', onOver);
        document.addEventListener('pointerleave', onLeave);
        return () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerover', onOver);
          document.removeEventListener('pointerleave', onLeave);
        };
      },
    );
  });

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[90] -mt-4 -ml-4 h-8 w-8 rounded-full border-2 border-volt opacity-0"
    />
  );
}

/** Wraps a child so it is pulled toward the pointer while hovered. */
export function Magnetic({
  children,
  strength = 0.35,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add(
        '(pointer: fine) and (prefers-reduced-motion: no-preference)',
        () => {
          const el = root.current!;
          const xTo = gsap.quickTo(el, 'x', {duration: 0.6, ease: 'elastic.out(1, 0.4)'});
          const yTo = gsap.quickTo(el, 'y', {duration: 0.6, ease: 'elastic.out(1, 0.4)'});

          const onMove = contextSafe!((e: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            xTo((e.clientX - rect.left - rect.width / 2) * strength);
            yTo((e.clientY - rect.top - rect.height / 2) * strength);
          });
          const onLeave = contextSafe!(() => {
            xTo(0);
            yTo(0);
          });

          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerleave', onLeave);
          return () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
          };
        },
      );
    },
    {scope: root},
  );

  return (
    <span ref={root} className="inline-block will-change-transform">
      {children}
    </span>
  );
}

/**
 * Shared motion for every inner page, driven by data attributes:
 * - `data-split`      title letters rise in
 * - `data-hero-fade`  supporting copy fades up after the title
 * - `data-reveal`     elements fade up in batches as they scroll into view
 * - `data-draw`       an SVG whose `.draw` strokes draw themselves on scroll
 * - `data-parallax`   drifts vertically while its parent scrolls (value = yPercent)
 * Content added later (e.g. "Load more") simply stays visible.
 */
export function usePageMotion(
  root: React.RefObject<HTMLElement | null>,
  dependencies: unknown[] = [],
) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, (ctx) => {
        if ((ctx.conditions as {reduceMotion: boolean}).reduceMotion) return;
        const q = gsap.utils.selector(root);
        const splits: SplitText[] = [];

        const run = () => {
          q('[data-split]').forEach((el) => {
            // words + chars: words stay intact when the title wraps onto two lines
            const split = SplitText.create(el, {type: 'words,chars', mask: 'chars'});
            splits.push(split);
            gsap.from(split.chars, {
              yPercent: 120,
              stagger: 0.025,
              duration: 0.9,
              ease: 'expo.out',
              delay: 0.05,
            });
          });

          gsap.from(q('[data-hero-fade]'), {y: 24, autoAlpha: 0, stagger: 0.08, delay: 0.25});

          q('[data-draw]').forEach((svg) => {
            gsap.from(svg.querySelectorAll('.draw'), {
              drawSVG: 0,
              duration: 1.4,
              stagger: 0.06,
              ease: 'power2.inOut',
              scrollTrigger: {trigger: svg, start: 'top 90%'},
            });
          });

          const reveals = q('[data-reveal]');
          gsap.set(reveals, {autoAlpha: 0, y: 50});
          ScrollTrigger.batch(reveals, {
            start: 'top 92%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {autoAlpha: 1, y: 0, stagger: 0.08, overwrite: true}),
          });

          q('[data-parallax]').forEach((el) => {
            gsap.to(el, {
              yPercent: Number((el as HTMLElement).dataset.parallax) || -15,
              ease: 'none',
              scrollTrigger: {trigger: el.parentElement, scrub: true},
            });
          });
        };

        // On a full page load, wait for the intro; ctx.add keeps everything revertible.
        const stop = onPreloaded(() => ctx.add(run));
        return () => {
          stop();
          splits.forEach((split) => split.revert());
        };
      });
    },
    {scope: root, dependencies, revertOnUpdate: true},
  );
}

/** Thin volt bar at the top of the viewport while a route is loading. */
export function NavigationProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const {state} = useNavigation();

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (state !== 'idle') {
      gsap.set(el, {autoAlpha: 1});
      gsap.fromTo(el, {scaleX: 0}, {scaleX: 0.8, duration: 2.5, ease: 'power2.out'});
    } else if (gsap.getProperty(el, 'opacity') !== 0) {
      gsap
        .timeline()
        .to(el, {scaleX: 1, duration: 0.2, ease: 'power1.out'})
        .to(el, {autoAlpha: 0, duration: 0.3});
    }
  }, [state]);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[95] h-1 origin-left scale-x-0 bg-volt opacity-0 shadow-[0_0_12px_var(--color-volt)]"
    />
  );
}
