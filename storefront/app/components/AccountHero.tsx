import {useRef} from 'react';
import {Form, NavLink, useLocation} from 'react-router';
import {gsap, useGSAP, MOTION_QUERIES} from '~/lib/gsap';
import {onPreloaded} from '~/components/Motion';
import {Breadcrumbs} from '~/components/PageKit';
import {CircleText, SneakerArt, Starburst} from '~/components/Illustrations';
import {
  BoltIcon,
  GridIcon,
  LogoutIcon,
  PackageIcon,
  PinIcon,
  UserIcon,
} from '~/components/Icons';

const TABS = [
  {to: '/account', label: 'Overview', Icon: GridIcon, end: true},
  {to: '/account/orders', label: 'Orders', Icon: PackageIcon},
  {to: '/account/profile', label: 'Profile', Icon: UserIcon},
  {to: '/account/addresses', label: 'Addresses', Icon: PinIcon},
];

const TICKER = [
  'Member of the vault',
  'Free 48h dispatch',
  'Verified authentic',
  '30-day returns',
  'Early drop access',
];

/**
 * Account hero. Hooks (all GSAP, reduced-motion aware):
 * - `data-ticker`  none (CSS marquee)
 * - `data-hero-spin`   rotating badge
 * - `data-hero-bob`    idle float on the sneaker
 * - `data-hero-depth`  pointer parallax (value = pixel travel)
 * - `data-marker`      gold highlighter swipes in behind the name
 * - the tab indicator slides to the active route
 * Title/fade/draw/parallax attributes are handled by `usePageMotion` in the layout.
 */
export function AccountHero({
  firstName,
  memberNo,
  addressCount,
}: {
  firstName?: string | null;
  memberNo: string;
  addressCount: number;
}) {
  const root = useRef<HTMLElement>(null);
  const nav = useRef<HTMLElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const {pathname} = useLocation();

  // Tab indicator: measures the active tab and slides to it on every route change.
  useGSAP(
    () => {
      const navEl = nav.current;
      const bar = indicator.current;
      if (!navEl || !bar) return;
      const reduce = window.matchMedia(MOTION_QUERIES.reduceMotion).matches;

      const place = (animate: boolean) => {
        const active = navEl.querySelector<HTMLElement>('[aria-current="page"]');
        if (!active) {
          gsap.set(bar, {autoAlpha: 0});
          return;
        }
        navEl.dataset.ready = 'true';
        const vars = {x: active.offsetLeft, width: active.offsetWidth, autoAlpha: 1};
        if (animate && !reduce) {
          gsap.to(bar, {...vars, duration: 0.55, ease: 'expo.out', overwrite: true});
        } else {
          gsap.set(bar, vars);
        }
      };

      const first = !bar.dataset.placed;
      bar.dataset.placed = 'true';
      place(!first);

      const onResize = () => place(false);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    },
    {scope: root, dependencies: [pathname]},
  );

  // Decorative motion.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({...MOTION_QUERIES, finePointer: '(pointer: fine)'}, (ctx) => {
        const {reduceMotion, finePointer} = ctx.conditions as {
          reduceMotion: boolean;
          finePointer: boolean;
        };
        if (reduceMotion) return;
        const q = gsap.utils.selector(root);

        const run = () => {
          gsap.to(q('[data-hero-spin]'), {
            rotation: 360,
            duration: 22,
            ease: 'none',
            repeat: -1,
            transformOrigin: '50% 50%',
          });
          gsap.to(q('[data-hero-bob]'), {
            y: -12,
            rotation: -3,
            duration: 2.6,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
          gsap.from(q('[data-hero-pop]'), {
            scale: 0,
            rotation: -40,
            duration: 0.9,
            stagger: 0.12,
            delay: 0.5,
            ease: 'back.out(2.2)',
          });
          gsap.from(q('[data-marker]'), {
            scaleX: 0,
            transformOrigin: 'left center',
            duration: 0.9,
            delay: 0.7,
            ease: 'power3.inOut',
          });
          gsap.from(q('[data-hero-tabs]'), {y: 30, autoAlpha: 0, duration: 0.8, delay: 0.45});
        };

        const cleanups: Array<() => void> = [];
        if (finePointer && root.current) {
          const el = root.current;
          const layers = q('[data-hero-depth]') as HTMLElement[];
          const setters = layers.map((layer) => ({
            amount: Number(layer.dataset.heroDepth) || 20,
            x: gsap.quickTo(layer, 'x', {duration: 0.9, ease: 'power3'}),
            y: gsap.quickTo(layer, 'y', {duration: 0.9, ease: 'power3'}),
          }));
          const onMove = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            setters.forEach(({amount, x, y}) => {
              x(px * amount);
              y(py * amount);
            });
          };
          el.addEventListener('pointermove', onMove);
          cleanups.push(() => el.removeEventListener('pointermove', onMove));
        }

        const stop = onPreloaded(() => ctx.add(run));
        return () => {
          stop();
          cleanups.forEach((fn) => fn());
        };
      });
    },
    {scope: root},
  );

  return (
    <header
      ref={root}
      className="account-hero relative -mx-[var(--page-gutter)] -mt-8 mb-12 overflow-hidden border-b-2 border-edge"
    >
      {/* Ticker */}
      <div className="overflow-hidden border-b-2 border-edge bg-bone py-2.5 text-ink" aria-hidden="true">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <ul key={copy} className="m-0 flex shrink-0 list-none items-center p-0">
              {TICKER.map((item) => (
                <li
                  key={item}
                  className="m-0 flex items-center gap-6 pr-6 text-xs font-bold tracking-[0.3em] whitespace-nowrap uppercase"
                >
                  {item}
                  <BoltIcon className="h-3.5 w-3.5 text-heat" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <div className="relative px-[var(--page-gutter)] pt-10 pb-16 md:pb-24">
        {/* Backdrop: paper grid, colour blobs, outlined word */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--color-ink-3)_1px,transparent_1px),linear-gradient(90deg,var(--color-ink-3)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_30%_40%,#000_20%,transparent_75%)]"
        />
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-volt/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-heat/30 blur-3xl" />
        <p
          aria-hidden="true"
          data-parallax="-25"
          className="text-stroke pointer-events-none absolute right-0 -bottom-[4vw] font-display text-[20vw] leading-none whitespace-nowrap opacity-10 select-none"
        >
          VAULT
        </p>

        <div className="relative grid items-center gap-10 md:grid-cols-[1.35fr_1fr]">
          {/* Left: greeting, chips, tabs */}
          <div>
            <Breadcrumbs items={[{label: 'Home', to: '/'}, {label: 'Account'}]} />

            <p
              data-hero-fade
              className="mt-8 mb-0 inline-flex items-center gap-3 border-2 border-edge bg-ink-2 px-3 py-1.5 text-xs font-bold tracking-[0.3em] uppercase shadow-[3px_3px_0_0_var(--color-bone)]"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt" />
              </span>
              Member of the vault
            </p>

            <p data-hero-fade className="mt-6 mb-1 font-display text-3xl leading-none uppercase md:text-4xl">
              Welcome back,
            </p>
            <div className="relative inline-block max-w-full">
              <span
                aria-hidden="true"
                className="absolute inset-x-[-0.4rem] bottom-[0.12em] h-[0.34em] -skew-x-6"
              >
                <span data-marker className="block h-full w-full bg-heat" />
              </span>
              <h1
                key={firstName ?? 'member'}
                data-split
                className="relative m-0 text-[clamp(3.5rem,10vw,8rem)] leading-[0.9] break-words"
              >
                {firstName || 'Member'}
              </h1>
            </div>
            <svg
              data-draw=""
              viewBox="0 0 320 22"
              fill="none"
              className="mt-3 block h-5 w-56 text-volt md:w-72"
              aria-hidden="true"
            >
              <path
                className="draw"
                d="M4 14C40 4 62 20 100 10S168 4 204 13 276 18 316 6"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>

            <ul data-hero-fade className="m-0 mt-6 flex list-none flex-wrap gap-3 p-0">
              <li className="m-0 border-2 border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-bold tracking-[0.18em] tabular-nums uppercase">
                <span className="text-mute">No.</span> {memberNo}
              </li>
              <li className="m-0 border-2 border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-bold tracking-[0.18em] uppercase">
                <span className="text-mute">Addresses</span> {addressCount}
              </li>
            </ul>

            {/* Tabs */}
            <div data-hero-tabs className="mt-10 flex flex-wrap items-center gap-3">
              <nav
                ref={nav}
                role="navigation"
                aria-label="Account"
                className="relative flex max-w-full overflow-x-auto border-2 border-edge bg-ink-2 p-1 shadow-brutal [scrollbar-width:none] [&[data-ready]_a[aria-current=page]]:bg-transparent"
              >
                <span
                  ref={indicator}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 bottom-1 left-0 w-0 bg-volt opacity-0 shadow-[3px_3px_0_0_var(--color-bone)]"
                />
                {TABS.map(({to, label, Icon, end}) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    prefetch="intent"
                    className={({isActive}) =>
                      `relative z-10 flex min-h-11 items-center gap-2 px-4 text-xs font-bold tracking-[0.16em] whitespace-nowrap uppercase transition-colors duration-200 ${
                        isActive ? 'bg-volt text-on-volt' : 'hover:text-volt'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              <Form method="POST" action="/account/logout" className="m-0">
                <button
                  type="submit"
                  className="flex min-h-11 cursor-pointer items-center gap-2 border-2 border-edge bg-transparent px-4 text-xs font-bold tracking-[0.16em] text-bone uppercase transition-colors duration-200 hover:bg-bone hover:text-ink"
                >
                  <LogoutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </Form>
            </div>
          </div>

          {/* Right: illustration cluster */}
          <div className="relative hidden min-h-[22rem] md:block" aria-hidden="true">
            <div
              data-hero-depth="-26"
              className="absolute inset-x-0 top-1/2 h-64 -translate-y-1/2 border-2 border-edge bg-heat shadow-[10px_10px_0_0_var(--color-bone)]"
            />
            <div data-hero-depth="22" className="absolute inset-x-[-1.5rem] top-1/2 -translate-y-[55%]">
              <div data-hero-bob>
                <SneakerArt data-draw="" className="w-full -rotate-6 text-bone drop-shadow-[6px_8px_0_rgba(24,33,77,0.18)]" />
              </div>
            </div>
            <div data-hero-depth="38" className="absolute -top-2 right-2 w-28">
              <div data-hero-pop>
                <div data-hero-spin>
                  <CircleText text="HYPEFORGE · MEMBERS ONLY · " className="w-full" />
                </div>
              </div>
            </div>
            <div data-hero-depth="-34" className="absolute bottom-2 left-0 w-24 -rotate-12">
              <div data-hero-pop>
                <Starburst label="VIP" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
