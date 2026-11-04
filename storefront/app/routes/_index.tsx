import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  HomeCollectionFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {
  CircleText,
  ScribbleArrow,
  SneakerArt,
  Starburst,
} from '~/components/Illustrations';
import {Magnetic, onPreloaded} from '~/components/Motion';
import {gsap, ScrollTrigger, SplitText, useGSAP, MOTION_QUERIES} from '~/lib/gsap';
import {BRAND} from '~/lib/brand';

export const meta: Route.MetaFunction = () => {
  return [
    {title: `${BRAND.name} | Sneakers & Streetwear`},
    {name: 'description', content: BRAND.tagline},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. Products are critical
 * here (not deferred) because the pinned horizontal track changes page height, and
 * all ScrollTriggers must be created together, top to bottom, once the DOM is complete.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [home, {products}] = await Promise.all([
    context.storefront.query(HOME_COLLECTIONS_QUERY),
    context.storefront.query(RECOMMENDED_PRODUCTS_QUERY),
  ]);

  // Curated by handle: hero first, then the category grid. Missing ones are skipped.
  const collections = [home.featured, home.men, home.women, home.shoes].filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    collections,
    products: products.nodes,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 */
function loadDeferredData(_args: Route.LoaderArgs) {
  return {};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const [heroCollection, ...otherCollections] = data.collections;
  const root = useRef<HTMLDivElement>(null);

  useHomepageMotion(root);

  return (
    <div className="home" ref={root}>
      {data.isShopLinked ? null : <MockShopNotice />}
      <Hero
        collection={heroCollection}
        fallbackImage={data.products.find((p) => p.featuredImage)?.featuredImage}
      />
      <CrossedTapes />
      <DropsTrack products={data.products} />
      <ForgeProcess />
      <DropCountdown />
      <CollectionGrid collections={otherCollections} />
      <Manifesto />
      <Newsletter />
    </div>
  );
}

/**
 * Every homepage animation, created top to bottom in page order.
 * gsap.matchMedia() reverts and rebuilds them when breakpoints or the
 * reduced-motion preference change; useGSAP cleans everything up on unmount.
 */
function useHomepageMotion(root: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_QUERIES, (ctx) => {
        const {isDesktop, reduceMotion} = ctx.conditions as Record<
          keyof typeof MOTION_QUERIES,
          boolean
        >;
        if (reduceMotion) return; // Static, fully readable page.

        // 1. Hero intro: waits for the preloader, then plays once.
        const split = SplitText.create('.hero-title', {
          type: 'words,chars',
          mask: 'chars',
        });
        const intro = gsap
          .timeline({paused: true})
          .from(split.chars, {yPercent: 120, stagger: 0.035, duration: 1, ease: 'expo.out'})
          .from('.hero-fade', {y: 30, autoAlpha: 0, stagger: 0.1}, '-=0.6')
          .from('.hero-frame', {clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut'}, 0.1)
          .from('.hero-sneaker .draw', {drawSVG: 0, duration: 1.6, stagger: 0.08, ease: 'power2.inOut'}, 0.4)
          .from('.hero-sneaker .bolt', {scale: 0, transformOrigin: '50% 50%', ease: 'back.out(3)'}, '-=0.6')
          .from('.hero-sticker', {scale: 0, rotate: -90, ease: 'back.out(2.5)'}, '-=0.5')
          .from('.hero-arrow .draw', {drawSVG: 0, duration: 0.8}, '-=0.4');
        const stopWaiting = onPreloaded(() => intro.play());

        // Endless badge spin.
        gsap.to('.hero-badge', {rotate: 360, duration: 14, repeat: -1, ease: 'none'});

        // Hero parallax while scrolling away.
        gsap
          .timeline({
            scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true},
          })
          .to('.hero-frame img', {yPercent: 12, scale: 1.08, ease: 'none'}, 0)
          .to('.hero-sneaker', {xPercent: -18, rotate: -6, ease: 'none'}, 0)
          .to('.hero-copy', {yPercent: -25, autoAlpha: 0.2, ease: 'none'}, 0);

        // 2. Crossed tapes drift with scroll in opposite directions.
        gsap.to('.tape-a', {
          xPercent: -8,
          ease: 'none',
          scrollTrigger: {trigger: '.tapes', scrub: true},
        });
        gsap.to('.tape-b', {
          xPercent: 8,
          ease: 'none',
          scrollTrigger: {trigger: '.tapes', scrub: true},
        });

        // 3. Fresh drops: pinned horizontal journey on desktop.
        if (isDesktop) {
          const section = root.current!.querySelector<HTMLElement>('.drops')!;
          const track = section.querySelector<HTMLElement>('.drops-track')!;
          const distance = () => track.scrollWidth - window.innerWidth;
          gsap.set(track, {overflow: 'visible'});
          gsap
            .timeline({
              scrollTrigger: {
                trigger: section,
                pin: true,
                scrub: 1,
                start: 'top top',
                end: () => `+=${distance()}`,
                invalidateOnRefresh: true,
              },
            })
            .to(track, {x: () => -distance(), ease: 'none'}, 0)
            .to('.drops-progress', {scaleX: 1, ease: 'none'}, 0);
        } else {
          gsap.from('.drops-track > *', {
            x: 60,
            autoAlpha: 0,
            stagger: 0.08,
            scrollTrigger: {trigger: '.drops', start: 'top 75%'},
          });
        }

        // 4. Forge process: icons draw themselves, cards rise.
        gsap
          .timeline({scrollTrigger: {trigger: '.forge', start: 'top 70%'}})
          .from('.forge-card', {y: 80, autoAlpha: 0, stagger: 0.15})
          .from('.forge-card .draw', {drawSVG: 0, duration: 1.2, stagger: 0.05}, '-=0.6');

        // 5. Countdown tiles flip in.
        gsap.from('.count-tile', {
          rotateX: -90,
          transformOrigin: '50% 0%',
          autoAlpha: 0,
          stagger: 0.1,
          ease: 'back.out(1.6)',
          scrollTrigger: {trigger: '.countdown', start: 'top 70%'},
        });

        // 6. Collection tiles wipe open, images settle.
        gsap.utils.toArray<HTMLElement>('.collection-tile').forEach((tile) => {
          gsap
            .timeline({scrollTrigger: {trigger: tile, start: 'top 85%'}})
            .from(tile, {clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut'})
            .from(tile.querySelector('img'), {scale: 1.3, duration: 1.4}, 0);
        });

        // 7. Manifesto words light up as you scroll through.
        const words = SplitText.create('.manifesto-text', {type: 'words'});
        gsap.from(words.words, {
          opacity: 0.12,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.manifesto-text',
            start: 'top 80%',
            end: 'bottom 45%',
            scrub: true,
          },
        });

        // Stats count up once.
        gsap.utils.toArray<HTMLElement>('.stat-value').forEach((el) => {
          const target = Number(el.dataset.value);
          const counter = {value: 0};
          gsap.to(counter, {
            value: target,
            duration: 1.6,
            ease: 'power2.out',
            scrollTrigger: {trigger: el, start: 'top 90%', once: true},
            onUpdate: () => {
              el.textContent = Math.round(counter.value).toString();
            },
          });
        });

        // 8. Newsletter sticker pops.
        gsap.from('.news-sticker', {
          scale: 0,
          rotate: -45,
          ease: 'back.out(2)',
          scrollTrigger: {trigger: '.newsletter', start: 'top 70%'},
        });

        // Web fonts change text metrics: re-measure once they're in.
        void document.fonts?.ready.then(() => ScrollTrigger.refresh());

        return () => {
          stopWaiting();
          split.revert();
          words.revert();
        };
      });
    },
    {scope: root},
  );
}

function Eyebrow({children, tone = 'volt'}: {children: React.ReactNode; tone?: 'volt' | 'heat'}) {
  return (
    <p
      className={`mb-4 text-xs font-bold tracking-[0.3em] uppercase ${
        tone === 'volt' ? 'text-volt' : 'inline-block bg-heat px-2 py-1 text-bone'
      }`}
    >
      {children}
    </p>
  );
}

function Hero({
  collection,
  fallbackImage,
}: {
  collection?: HomeCollectionFragment;
  fallbackImage?: RecommendedProductFragment['featuredImage'];
}) {
  // Collections often have no image in a fresh store; fall back to a product shot.
  const image = collection?.image ?? fallbackImage;
  return (
    <section className="hero relative overflow-hidden p-0">
      {/* Giant outlined word behind everything */}
      <p
        aria-hidden="true"
        className="text-stroke pointer-events-none absolute -bottom-6 left-0 font-display text-[22vw] leading-none whitespace-nowrap opacity-10 select-none"
      >
        FORGED
      </p>

      <div className="relative grid min-h-[min(calc(100svh-var(--header-height)),900px)] grid-cols-1 items-center gap-10 px-[var(--page-gutter)] py-16 md:grid-cols-[1.1fr_1fr]">
        <div className="hero-copy relative z-10">
          <div className="hero-fade mb-6 inline-flex items-center gap-2 border border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-bold tracking-[0.25em] uppercase">
            <span className="h-2 w-2 animate-pulse rounded-full bg-heat" />
            Drop 07 — Live now
          </div>
          <h1 className="hero-title m-0 text-[clamp(4.5rem,12vw,11rem)] leading-[0.82]">
            Move
            <br />
            <span className="text-volt">Loud.</span>
          </h1>
          <p className="hero-fade mt-8 max-w-md text-lg leading-relaxed text-mute">
            Limited sneakers and heavyweight streetwear, forged in small batches.
            Restocks never guaranteed.
          </p>
          <div className="hero-fade relative mt-10 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link to="/collections/all" className="btn-volt inline-block shadow-brutal">
                Shop the drop
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                to="/collections"
                className="inline-block border-2 border-bone px-7 py-[0.9rem] text-[0.85rem] font-bold tracking-[0.14em] uppercase transition-colors duration-200 hover:bg-bone hover:text-ink"
              >
                Collections
              </Link>
            </Magnetic>
            <ScribbleArrow className="hero-arrow absolute -top-16 left-40 hidden w-28 -scale-x-100 rotate-[160deg] text-volt md:block" />
          </div>
        </div>

        <div className="relative">
          <div className="hero-frame relative aspect-[4/5] overflow-hidden border-2 border-bone bg-ink-2 shadow-brutal-volt md:aspect-square">
            {image ? (
              <Image
                data={image}
                sizes="(min-width: 768px) 45vw, 100vw"
                alt={image.altText || collection?.title || 'Featured product'}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <p className="absolute right-4 bottom-4 bg-bone px-2 py-1 text-[0.65rem] font-bold tracking-[0.2em] text-ink uppercase">
              {collection?.title ?? 'Featured'} / 07
            </p>
          </div>

          <SneakerArt className="hero-sneaker absolute -bottom-6 -left-10 w-[80%] text-bone drop-shadow-[0_12px_24px_rgba(24,33,77,0.18)] md:-left-24" />

          <Starburst label="NEW" className="hero-sticker absolute -top-8 -left-2 w-24 md:-left-6 md:w-28" />

          {collection && (
            <Link
              to={`/collections/${collection.handle}`}
              aria-label={`Shop ${collection.title}`}
              className="absolute -top-10 -right-1 block w-28 md:-right-4 md:w-40"
            >
              <CircleText
                text="• SHOP THE DROP • HYPEFORGE • 100% AUTHENTIC "
                className="hero-badge w-full"
              />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function Tape({
  className,
  tone,
  reverse = false,
}: {
  className: string;
  tone: 'volt' | 'bone';
  reverse?: boolean;
}) {
  const items = [...BRAND.ticker, ...BRAND.ticker];
  return (
    <div
      className={`${className} absolute left-[-5%] w-[110%] overflow-hidden border-y-2 border-edge py-3 ${
        tone === 'volt' ? 'bg-volt' : 'bg-bone'
      } text-on-volt`}
    >
      <div
        className="animate-marquee flex w-max gap-10 whitespace-nowrap"
        style={reverse ? {animationDirection: 'reverse'} : undefined}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-2xl tracking-wide uppercase">
            {item}
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

function CrossedTapes() {
  return (
    <div className="tapes relative h-40 overflow-hidden md:h-48" aria-hidden="true">
      <Tape className="tape-b top-1/2 -translate-y-1/2 rotate-[3deg]" tone="bone" reverse />
      <Tape className="tape-a top-1/2 -translate-y-1/2 -rotate-[3deg]" tone="volt" />
    </div>
  );
}

function DropsTrack({products}: {products: RecommendedProductFragment[]}) {
  return (
    <section className="drops relative overflow-hidden p-0 md:h-screen" aria-labelledby="fresh-drops">
      <div className="drops-track flex h-full snap-x snap-mandatory items-center gap-6 overflow-x-auto scroll-px-[var(--page-gutter)] px-[var(--page-gutter)] py-20 md:snap-none md:py-0">
        <div className="w-[78vw] shrink-0 snap-start md:w-[34vw]">
          <Eyebrow>Just landed</Eyebrow>
          <h2 id="fresh-drops" className="m-0 text-[clamp(3.5rem,8vw,7.5rem)] leading-[0.85]">
            Fresh
            <br />
            <span className="text-stroke">Drops</span>
          </h2>
          <p className="mt-6 max-w-xs text-mute">
            {products.length} pieces in this release. Scroll the rack, cop before
            they're gone.
          </p>
          <ScribbleArrow className="mt-8 hidden w-32 text-volt md:block" />
        </div>

        {products.map((product, i) => (
          <div key={product.id} className="w-[64vw] shrink-0 snap-start md:w-[24vw]">
            <p className="mb-3 font-display text-sm text-mute">
              {String(i + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')}
            </p>
            <ProductItem product={product} loading={i < 3 ? 'eager' : 'lazy'} />
          </div>
        ))}

        <Link
          to="/collections/all"
          className="group flex aspect-square w-[60vw] shrink-0 snap-start flex-col items-center justify-center rounded-full border-2 border-bone text-center transition-colors duration-300 hover:bg-volt hover:text-on-volt md:w-[22vw]"
        >
          <span className="font-display text-5xl uppercase md:text-6xl">View all</span>
          <span className="mt-2 text-xs font-bold tracking-[0.25em] uppercase">The full rack →</span>
        </Link>
      </div>

      {/* Scroll progress (desktop pin) */}
      <div className="absolute inset-x-[var(--page-gutter)] bottom-10 hidden h-0.5 bg-ink-3 md:block motion-reduce:md:hidden">
        <div className="drops-progress h-full origin-left scale-x-0 bg-volt" />
      </div>
    </section>
  );
}

const FORGE_STEPS = [
  {
    title: 'Verified',
    copy: 'Every pair is inspected by hand: stitching, materials, box and tags.',
    icon: (
      <>
        <path className="draw" d="M32 6 L54 14 L54 30 C54 44 44 54 32 58 C20 54 10 44 10 30 L10 14 Z" />
        <path className="draw" d="M22 32 L29 39 L43 24" />
      </>
    ),
  },
  {
    title: 'Forged',
    copy: 'Double-boxed in our heavyweight packaging. Built to arrive pristine.',
    icon: (
      <>
        <path className="draw" d="M8 20 L32 8 L56 20 L56 46 L32 58 L8 46 Z" />
        <path className="draw" d="M8 20 L32 32 L56 20 M32 32 L32 58" />
      </>
    ),
  },
  {
    title: 'Delivered',
    copy: 'Dispatched within 48 hours, tracked all the way to your door.',
    icon: (
      <>
        <path className="draw" d="M4 18 L38 18 L38 44 L4 44 Z" />
        <path className="draw" d="M38 26 L50 26 L58 36 L58 44 L38 44" />
        <circle className="draw" cx="16" cy="48" r="5" />
        <circle className="draw" cx="48" cy="48" r="5" />
      </>
    ),
  },
];

function ForgeProcess() {
  return (
    <section className="forge px-[var(--page-gutter)] py-24">
      <Eyebrow>Why HYPEFORGE</Eyebrow>
      <h2 className="m-0 mb-12 text-5xl leading-none md:text-7xl">
        From vault <span className="text-stroke">to feet</span>
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {FORGE_STEPS.map((step, i) => (
          <div
            key={step.title}
            className="forge-card group relative border-2 border-ink-3 bg-ink-2 p-8 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-volt hover:shadow-brutal-volt"
          >
            <span className="absolute top-6 right-6 font-display text-5xl text-ink-3 transition-colors duration-300 group-hover:text-volt">
              0{i + 1}
            </span>
            <svg
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-16 w-16 text-volt"
              aria-hidden="true"
            >
              {step.icon}
            </svg>
            <h3 className="mt-8 mb-3 text-3xl">{step.title}</h3>
            <p className="text-mute">{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Next Friday at 19:00 local time (or today if it's Friday before 19:00). */
function getNextDrop(now: Date) {
  const drop = new Date(now);
  drop.setHours(19, 0, 0, 0);
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  drop.setDate(now.getDate() + daysUntilFriday);
  if (drop <= now) drop.setDate(drop.getDate() + 7);
  return drop;
}

function DropCountdown() {
  // Rendered only on the client: the server doesn't know the visitor's clock,
  // so rendering the time on the server would cause a hydration mismatch.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setRemaining(getNextDrop(now).getTime() - now.getTime());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const parts = remaining === null ? null : splitDuration(remaining);

  return (
    <section className="countdown relative overflow-hidden border-y-2 border-ink-3 bg-ink-2 px-[var(--page-gutter)] py-24">
      <p
        aria-hidden="true"
        className="text-stroke pointer-events-none absolute -right-8 -bottom-20 font-display text-[20rem] leading-none opacity-30 select-none"
      >
        08
      </p>
      <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <Eyebrow tone="heat">● Next drop</Eyebrow>
          <h2 className="m-0 text-5xl leading-none md:text-7xl">
            Drop 08 lands
            <br />
            <span className="text-volt">Friday, 7PM</span>
          </h2>
          <p className="mt-6 max-w-md text-mute">
            Members get a 15-minute head start. Set your alarm, sizes go fast.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 [perspective:800px]" role="timer" aria-live="off">
          {(['Days', 'Hrs', 'Min', 'Sec'] as const).map((label, i) => (
            <div key={label} className="count-tile border-2 border-bone bg-ink py-6 text-center shadow-brutal">
              <p className="font-display text-5xl tabular-nums md:text-7xl">
                {parts ? String(parts[i]).padStart(2, '0') : '--'}
              </p>
              <p className="mt-2 text-xs tracking-[0.2em] text-mute uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function splitDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    Math.floor(s / 86400),
    Math.floor((s % 86400) / 3600),
    Math.floor((s % 3600) / 60),
    s % 60,
  ];
}

function CollectionGrid({collections}: {collections: HomeCollectionFragment[]}) {
  if (!collections.length) return null;
  return (
    <section className="px-[var(--page-gutter)] py-24">
      <div className="mb-12 flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Find your fit</Eyebrow>
          <h2 className="m-0 text-5xl leading-none md:text-7xl">Shop by category</h2>
        </div>
        <Link
          to="/collections"
          className="hidden shrink-0 border-b-2 border-bone pb-1 text-sm font-bold tracking-[0.15em] uppercase transition-colors duration-200 hover:border-volt hover:text-volt md:block"
        >
          All collections →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
        {collections.slice(0, 3).map((collection, i) => (
          <Link
            key={collection.id}
            to={`/collections/${collection.handle}`}
            className={`collection-tile group relative block min-h-72 overflow-hidden border-2 border-ink-3 bg-ink-2 transition-colors duration-300 hover:border-volt ${
              i === 0 ? 'md:col-span-2 md:row-span-2 md:min-h-[38rem]' : ''
            }`}
          >
            {collection.image && (
              <Image
                data={collection.image}
                sizes="(min-width: 768px) 66vw, 100vw"
                alt={collection.image.altText || collection.title}
                className="absolute inset-0 h-full w-full object-cover grayscale transition-[filter,transform] duration-700 group-hover:scale-105 group-hover:grayscale-0"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
            <span className="absolute top-5 left-5 bg-volt px-2 py-1 font-display text-sm text-on-volt">
              0{i + 1}
            </span>
            <div className="absolute inset-x-6 bottom-6 flex items-end justify-between">
              <h3 className="m-0 text-4xl md:text-6xl">{collection.title}</h3>
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-bone bg-ink text-xl transition-colors duration-300 group-hover:border-volt group-hover:bg-volt group-hover:text-on-volt">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Manifesto() {
  const stats = [
    {value: 100, suffix: '%', label: 'Authentic, every pair'},
    {value: 48, suffix: 'H', label: 'Dispatch on all orders'},
    {value: 50, suffix: 'K+', label: 'Members in the vault'},
  ];
  return (
    <section className="px-[var(--page-gutter)] py-28">
      <p className="manifesto-text m-0 max-w-6xl font-display text-[clamp(2.5rem,6.5vw,6rem)] leading-[0.95] uppercase">
        Built for the streets. Engineered for the culture. No restocks.{' '}
        <span className="text-volt">No compromise.</span>
      </p>
      <div className="mt-20 grid gap-8 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="border-t-2 border-ink-3 pt-6">
            <p className="font-display text-7xl text-volt">
              <span className="stat-value" data-value={stat.value}>
                {stat.value}
              </span>
              {stat.suffix}
            </p>
            <p className="mt-2 text-sm tracking-[0.15em] text-mute uppercase">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  // UI only for now: wire this to Shopify customer marketing in a later step.
  const [joined, setJoined] = useState(false);
  return (
    <section className="newsletter px-[var(--page-gutter)] pb-28">
      <div className="relative border-2 border-bone bg-volt px-6 py-20 text-center text-on-volt shadow-brutal md:px-16">
        <Starburst label="VIP" className="news-sticker absolute -top-10 -right-4 w-24 md:-right-8 md:w-32" />
        <SneakerArt className="pointer-events-none absolute bottom-4 left-4 hidden w-64 rotate-[-8deg] text-on-volt opacity-20 md:block" />
        <p className="mb-3 text-xs font-bold tracking-[0.3em] uppercase">Early access</p>
        <h2 className="m-0 text-6xl leading-none text-on-volt md:text-8xl">Join the vault</h2>
        <p className="mx-auto mt-6 max-w-md text-on-volt/75">
          Drop alerts, members-only releases and zero spam.
        </p>
        {joined ? (
          <p className="mt-10 font-display text-3xl uppercase">You're in. Watch your inbox.</p>
        ) : (
          <form
            className="relative mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setJoined(true);
            }}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@email.com"
              className="m-0 flex-1 border-2 border-edge bg-ink px-5 py-4 text-bone placeholder:text-mute"
            />
            <button
              type="submit"
              className="cursor-pointer border-2 border-edge !bg-ink px-7 py-4 text-sm font-bold tracking-[0.14em] !text-volt uppercase transition-transform duration-200 hover:-translate-y-0.5"
            >
              Notify me
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

const HOME_COLLECTIONS_QUERY = `#graphql
  fragment HomeCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query HomeCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    featured: collection(handle: "featured") {
      ...HomeCollection
    }
    men: collection(handle: "men") {
      ...HomeCollection
    }
    women: collection(handle: "women") {
      ...HomeCollection
    }
    shoes: collection(handle: "shoes") {
      ...HomeCollection
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    # Only the current drop: tag products "hypeforge-drop-07" in the admin to feature them
    products(first: 8, sortKey: CREATED_AT, reverse: true, query: "tag:hypeforge-drop-07") {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
