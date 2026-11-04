import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {gsap, ScrollTrigger, useGSAP, MOTION_QUERIES} from '~/lib/gsap';
import {onPreloaded} from '~/components/Motion';
import {SneakerArt, Starburst} from '~/components/Illustrations';
import {ArrowRightIcon, BoltIcon, CheckIcon, PackageIcon} from '~/components/Icons';
import {
  ORDER_STEPS,
  RANKS,
  formatDate,
  getOrderProgress,
  getRank,
} from '~/lib/account';

/**
 * Building blocks for the account area. GSAP hooks onto data attributes:
 * - `data-acc-in`     rises in on load (staggered)
 * - `data-acc-rise`   rises in as it scrolls into view
 * - `data-count`      counts up (optional `data-currency`)
 * - `data-pass*`      member pass: entrance, sheen sweep, pointer tilt
 * - `data-rank-*`     rank ladder fills
 * - `data-tracker*`   order tracker fills
 * - `data-pin`        map pin drops in
 * - `data-float`      gentle idle bob
 */

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */

const COUNT_FORMAT = new Intl.NumberFormat('en-US');

export function useAccountMotion(root: React.RefObject<HTMLElement | null>) {
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
        const counts = q('[data-count]') as HTMLElement[];
        const writeCount = (el: HTMLElement, value: number) => {
          const currency = el.dataset.currency;
          el.textContent = currency
            ? new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                maximumFractionDigits: 0,
              }).format(value)
            : COUNT_FORMAT.format(value);
        };
        const finalCounts = () =>
          counts.forEach((el) => writeCount(el, Number(el.dataset.count)));

        const run = () => {
          const intro = gsap.timeline({defaults: {ease: 'expo.out'}});
          intro
            .from(q('[data-acc-in]'), {y: 36, autoAlpha: 0, stagger: 0.07, duration: 0.8}, 0)
            .from(
              q('[data-pass]'),
              {y: 90, rotationX: -40, autoAlpha: 0, duration: 1.2, transformPerspective: 1100},
              0.05,
            )
            .from(q('[data-pass-sheen]'), {xPercent: -140, duration: 1.6, ease: 'power2.inOut'}, 0.7)
            .from(
              q('[data-pass-draw] .draw'),
              {drawSVG: 0, duration: 1.6, stagger: 0.05, ease: 'power2.inOut'},
              0.4,
            )
            .from(q('[data-sticker]'), {scale: 0, rotation: -50, duration: 0.9, ease: 'back.out(2.2)'}, 0.9)
            .from(q('[data-rank-fill]'), {scaleX: 0, duration: 1.3, ease: 'power3.inOut'}, 0.6)
            .from(q('[data-rank-node]'), {scale: 0, stagger: 0.1, duration: 0.5, ease: 'back.out(2.4)'}, 0.7);

          counts.forEach((el) => {
            const end = Number(el.dataset.count);
            const state = {value: 0};
            writeCount(el, 0);
            gsap.to(state, {
              value: end,
              duration: 1.6,
              delay: 0.35,
              ease: 'power2.out',
              onUpdate: () => writeCount(el, Math.round(state.value)),
              onComplete: () => writeCount(el, end),
            });
          });

          gsap.to(q('[data-float]'), {
            y: -9,
            rotation: '+=3',
            duration: 2.4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            stagger: 0.4,
          });

          // Everything below the fold waits for the scroll.
          const rises = q('[data-acc-rise]');
          gsap.set(rises, {autoAlpha: 0, y: 44});
          ScrollTrigger.batch(rises, {
            start: 'top 92%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {autoAlpha: 1, y: 0, stagger: 0.09, overwrite: true}),
          });

          q('[data-tracker]').forEach((tracker) => {
            const fill = tracker.querySelector('[data-tracker-fill]');
            const dots = tracker.querySelectorAll('[data-tracker-dot]');
            const tl = gsap.timeline({
              scrollTrigger: {trigger: tracker, start: 'top 94%', once: true},
              defaults: {ease: 'power3.out'},
            });
            tl.from(fill, {scaleX: 0, duration: 1, ease: 'power2.inOut', transformOrigin: 'left center'})
              .from(dots, {scale: 0, stagger: 0.12, duration: 0.45, ease: 'back.out(2.4)'}, 0.1);
          });

          q('[data-pin]').forEach((pin) => {
            gsap
              .timeline({scrollTrigger: {trigger: pin, start: 'top 90%', once: true}})
              .from(pin, {y: -70, autoAlpha: 0, duration: 0.9, ease: 'bounce.out'})
              .fromTo(
                pin.parentElement?.querySelectorAll('[data-pin-ring]') ?? [],
                {scale: 0.3, autoAlpha: 0.9},
                {scale: 1.7, autoAlpha: 0, duration: 1.6, stagger: 0.5, repeat: 2, ease: 'power2.out'},
                0.6,
              );
          });
        };

        // Pointer tilt for the member pass (mouse/trackpad only).
        const cleanups: Array<() => void> = [];
        if (finePointer) {
          q('[data-pass-wrap]').forEach((wrap) => {
            const card = wrap.querySelector('[data-pass]') as HTMLElement | null;
            const sheen = wrap.querySelector('[data-pass-sheen]') as HTMLElement | null;
            if (!card) return;
            const rx = gsap.quickTo(card, 'rotationX', {duration: 0.6, ease: 'power3'});
            const ry = gsap.quickTo(card, 'rotationY', {duration: 0.6, ease: 'power3'});
            const sx = sheen ? gsap.quickTo(sheen, 'x', {duration: 0.8, ease: 'power3'}) : null;
            const onMove = (e: PointerEvent) => {
              const r = wrap.getBoundingClientRect();
              const px = (e.clientX - r.left) / r.width - 0.5;
              const py = (e.clientY - r.top) / r.height - 0.5;
              ry(px * 14);
              rx(-py * 14);
              sx?.(px * 140);
            };
            const onLeave = () => {
              rx(0);
              ry(0);
              sx?.(0);
            };
            wrap.addEventListener('pointermove', onMove as EventListener);
            wrap.addEventListener('pointerleave', onLeave);
            cleanups.push(() => {
              wrap.removeEventListener('pointermove', onMove as EventListener);
              wrap.removeEventListener('pointerleave', onLeave);
            });
          });
        }

        // On a full page load, wait for the intro; ctx.add keeps everything revertible.
        const stop = onPreloaded(() => ctx.add(run));
        return () => {
          stop();
          cleanups.forEach((fn) => fn());
          finalCounts();
        };
      });
    },
    {scope: root},
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: {label: string; to: string};
}) {
  return (
    <div data-acc-rise className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.3em] text-volt uppercase">{eyebrow}</p>
        <h2 className="m-0 text-4xl leading-none md:text-5xl">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          prefetch="intent"
          className="group inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase"
        >
          <span className="border-b-2 border-bone pb-0.5 transition-colors duration-200 group-hover:border-volt group-hover:text-volt">
            {action.label}
          </span>
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export function StatTile({
  icon,
  label,
  value,
  count,
  currency,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  /** Static text for the value (used when there's nothing to count). */
  value?: string;
  count?: number;
  currency?: string;
  hint?: string;
}) {
  return (
    <div
      data-acc-in
      className="group relative overflow-hidden border-2 border-ink-3 bg-ink-2 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-bone hover:shadow-brutal"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center border-2 border-edge bg-heat text-bone transition-transform duration-300 group-hover:-rotate-6">
          {icon}
        </span>
        {hint && <span className="text-xs font-bold tracking-[0.14em] text-mute uppercase">{hint}</span>}
      </div>
      <p className="m-0 font-display text-[2.6rem] leading-none tabular-nums">
        {count !== undefined ? (
          <span
            key={`${count}-${currency ?? ''}`}
            data-count={count}
            data-currency={currency}
          >
            {currency
              ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                  maximumFractionDigits: 0,
                }).format(count)
              : COUNT_FORMAT.format(count)}
          </span>
        ) : (
          value
        )}
      </p>
      <p className="mt-2 mb-0 text-xs font-bold tracking-[0.18em] text-mute uppercase">{label}</p>
    </div>
  );
}

/** Cosmetic ladder (Rookie > Regular > Insider > Legend) driven by order count. */
export function RankCard({orderCount}: {orderCount: number}) {
  const rank = getRank(orderCount);
  const fillPct = ((rank.index + (rank.next ? rank.progress : 0)) / (RANKS.length - 1)) * 100;

  return (
    <div data-acc-in className="border-2 border-ink-3 bg-ink-2 p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.3em] text-volt uppercase">Vault rank</p>
          <p className="m-0 font-display text-5xl leading-none uppercase">{rank.current.name}</p>
        </div>
        <p className="m-0 max-w-[11rem] text-right text-sm text-mute">
          {rank.next
            ? `${rank.remaining} more ${rank.remaining === 1 ? 'order' : 'orders'} to reach ${rank.next.name}.`
            : "You've reached the top. Legend status."}
        </p>
      </div>

      <div className="relative px-3">
        <div className="absolute top-[11px] right-3 left-3 h-[3px] bg-ink-3" />
        <div
          data-rank-fill
          className="absolute top-[11px] left-3 h-[3px] origin-left bg-volt"
          style={{width: `calc((100% - 1.5rem) * ${fillPct / 100})`}}
        />
        <ol className="relative m-0 flex list-none justify-between p-0">
          {RANKS.map((r, i) => {
            const reached = i <= rank.index;
            return (
              <li key={r.name} className="m-0 flex flex-col items-center gap-2">
                <span
                  data-rank-node
                  className={`grid h-6 w-6 place-items-center rounded-full border-2 border-edge ${
                    i === rank.index ? 'bg-heat ring-4 ring-heat/30' : reached ? 'bg-volt text-on-volt' : 'bg-ink-2'
                  }`}
                >
                  {reached && i !== rank.index && <CheckIcon className="h-3.5 w-3.5" />}
                </span>
                <span
                  className={`text-xs font-bold tracking-[0.14em] uppercase ${
                    reached ? 'text-bone' : 'text-mute'
                  }`}
                >
                  {r.name}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member pass                                                         */
/* ------------------------------------------------------------------ */

export function MemberPass({
  name,
  number,
  since,
  rankName,
}: {
  name: string;
  number: string;
  since: string;
  rankName: string;
}) {
  // Decorative barcode: deterministic bar widths from the member number.
  const bars = Array.from(number).flatMap((ch, i) => {
    const n = ch.charCodeAt(0);
    return [1 + (n % 3), 1 + ((n + i) % 2)];
  });
  let cursor = 0;

  return (
    <div data-pass-wrap className="relative [perspective:1100px]">
      <div
        data-pass
        className="relative overflow-hidden border-2 border-edge bg-bone p-6 pl-9 text-ink shadow-[10px_10px_0_0_var(--color-volt)] [transform-style:preserve-3d] will-change-transform sm:p-8 sm:pl-12"
      >
        {/* Colour spine */}
        <div className="absolute inset-y-0 left-0 w-3 bg-volt" />
        <div className="absolute inset-y-0 left-3 w-1.5 bg-heat" />

        {/* Line-drawn sneaker watermark */}
        <SneakerArt
          data-pass-draw=""
          className="pointer-events-none absolute -right-8 -bottom-6 w-[72%] -rotate-6 text-ink/20"
        />

        {/* Holographic sheen (swept on load, follows the pointer) */}
        <div
          data-pass-sheen
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,rgba(255,255,255,0.28)_46%,rgba(239,180,63,0.2)_54%,transparent_70%)]"
        />

        <div className="relative flex items-center justify-between">
          <p className="m-0 flex items-center gap-2 text-xs font-bold tracking-[0.3em] uppercase">
            <BoltIcon className="h-4 w-4 text-heat" /> HYPEFORGE
          </p>
          <p className="m-0 text-xs font-bold tracking-[0.3em] text-heat uppercase">Member pass</p>
        </div>

        <p className="relative mt-10 mb-10 line-clamp-2 font-display text-5xl leading-[0.92] break-words uppercase sm:text-7xl">
          {name}
        </p>

        <div className="relative flex items-end justify-between gap-6">
          <dl className="m-0 grid gap-3 text-xs font-bold tracking-[0.18em] uppercase">
            <div>
              <dt className="text-ink/60">Member no.</dt>
              <dd className="m-0 text-base tracking-[0.2em] tabular-nums">{number}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Since</dt>
              <dd className="m-0 text-base">{since}</dd>
            </div>
          </dl>
          <svg
            viewBox="0 0 120 40"
            className="h-10 w-28 shrink-0 text-ink"
            aria-hidden="true"
            fill="currentColor"
          >
            {bars.map((w, i) => {
              const x = cursor;
              cursor += w + 1.5;
              return i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="40" /> : null;
            })}
          </svg>
        </div>
      </div>

      <div data-float className="pointer-events-none absolute -top-6 -right-3 z-10 w-24 rotate-12 sm:-right-5 sm:w-28">
        <div data-sticker>
          <Starburst label={rankName.toUpperCase()} className="w-full" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function StatusChip({label, tone}: {label: string; tone: 'good' | 'gold' | 'mute'}) {
  const styles = {
    good: 'bg-emerald-700 text-white border-emerald-700',
    gold: 'bg-heat text-bone border-edge',
    mute: 'bg-ink-3 text-bone border-ink-3',
  }[tone];
  return (
    <span
      className={`inline-block border-2 px-2.5 py-1 text-xs font-bold tracking-[0.14em] uppercase ${styles}`}
    >
      {label}
    </span>
  );
}

export function OrderTracker({step}: {step: number}) {
  if (step < 0) return null;
  const last = ORDER_STEPS.length - 1;
  return (
    <div data-tracker className="relative px-3" role="img" aria-label={`Order status: ${ORDER_STEPS[step]}`}>
      <div className="absolute top-[11px] right-3 left-3 h-[3px] bg-ink-3" />
      <div
        data-tracker-fill
        className="absolute top-[11px] left-3 h-[3px] bg-volt"
        style={{width: `calc((100% - 1.5rem) * ${step / last})`}}
      />
      <ol className="relative m-0 flex list-none justify-between p-0">
        {ORDER_STEPS.map((label, i) => (
          <li key={label} className="m-0 flex flex-col items-center gap-1.5">
            <span
              data-tracker-dot
              className={`grid h-6 w-6 place-items-center rounded-full border-2 border-edge ${
                i < step ? 'bg-volt text-on-volt' : i === step ? 'bg-heat ring-4 ring-heat/30' : 'bg-ink-2'
              }`}
            >
              {i < step && <CheckIcon className="h-3.5 w-3.5" />}
            </span>
            <span
              className={`text-xs font-bold tracking-[0.12em] uppercase ${
                i <= step ? 'text-bone' : 'text-mute'
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type OrderRowData = {
  id: string;
  number: number;
  processedAt: string;
  confirmationNumber?: string | null;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  totalPrice: React.ComponentProps<typeof Money>['data'] & {amount: string};
  lineItems?: {
    nodes: Array<{
      title: string;
      quantity: number;
      image?: {url: string; altText?: string | null} | null;
    }>;
  };
};

export function OrderRow({order}: {order: OrderRowData}) {
  const progress = getOrderProgress(order);
  const items = order.lineItems?.nodes ?? [];
  const href = `/account/orders/${btoa(order.id)}`;
  const summary = items.length
    ? items.map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ''}${item.title}`).join(', ')
    : (order.confirmationNumber ? `Confirmation ${order.confirmationNumber}` : 'View order details');

  return (
    <article
      data-acc-rise
      className="group relative border-2 border-ink-3 bg-ink-2 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-bone hover:shadow-brutal"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4 p-5">
        <div className="flex shrink-0 -space-x-3">
          {(items.length ? items : [null]).map((item, i) => (
            <span
              key={i}
              className="grid h-16 w-16 place-items-center overflow-hidden border-2 border-edge bg-ink"
            >
              {item?.image ? (
                <img
                  src={item.image.url}
                  alt={item.image.altText ?? item.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <PackageIcon className="h-7 w-7 text-mute" />
              )}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 basis-48">
          <p className="m-0 flex flex-wrap items-center gap-3">
            <Link
              to={href}
              prefetch="intent"
              className="font-display text-3xl leading-none after:absolute after:inset-0"
            >
              #{order.number}
            </Link>
            <StatusChip label={progress.label} tone={progress.tone} />
          </p>
          <p className="mt-2 mb-0 truncate text-sm text-mute">{summary}</p>
          <p className="mt-1 mb-0 text-xs font-bold tracking-[0.14em] text-mute uppercase">
            {formatDate(order.processedAt)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Money data={order.totalPrice} className="font-display text-3xl tabular-nums" />
          <ArrowRightIcon className="h-5 w-5 text-volt transition-transform duration-200 group-hover:translate-x-1.5" />
        </div>
      </div>

      {progress.step >= 0 && (
        <div className="border-t-2 border-dashed border-ink-3 px-5 py-4">
          <OrderTracker step={progress.step} />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Quick links + map                                                   */
/* ------------------------------------------------------------------ */

export function QuickLink({
  to,
  icon,
  title,
  copy,
  tone = 'plain',
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
  tone?: 'plain' | 'volt';
}) {
  return (
    <Link
      to={to}
      prefetch="intent"
      data-acc-rise
      className={`group relative flex min-h-44 flex-col justify-between overflow-hidden border-2 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-brutal ${
        tone === 'volt'
          ? 'border-edge bg-volt text-on-volt'
          : 'border-ink-3 bg-ink-2 hover:border-bone'
      }`}
    >
      <span
        className={`grid h-11 w-11 place-items-center border-2 transition-transform duration-300 group-hover:rotate-6 ${
          tone === 'volt' ? 'border-on-volt' : 'border-edge bg-heat text-bone'
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="m-0 font-display text-3xl leading-none uppercase">{title}</p>
        <p className={`mt-2 mb-0 text-sm ${tone === 'volt' ? 'text-on-volt/85' : 'text-mute'}`}>{copy}</p>
      </div>
      <ArrowRightIcon className="absolute top-5 right-5 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1.5" />
    </Link>
  );
}

/** Hand-built street map with a dropping pin, for the default address. */
export function MapArt({className = ''}: {className?: string}) {
  return (
    <svg viewBox="0 0 400 240" className={className} role="img" aria-label="Illustrated map of your delivery area">
      <rect width="400" height="240" fill="var(--color-ink)" />
      {/* parks + water */}
      <rect x="24" y="22" width="92" height="66" fill="#CFE3C4" stroke="var(--color-edge)" strokeWidth="2" />
      <path d="M300 160c30-10 60 6 100-4v84H280c8-30 8-58 20-76z" fill="#BFD6EA" stroke="var(--color-edge)" strokeWidth="2" />
      {/* streets */}
      <g stroke="var(--color-edge)" strokeWidth="2" fill="var(--color-ink-2)">
        <rect x="140" y="22" width="64" height="66" />
        <rect x="224" y="22" width="130" height="66" />
        <rect x="24" y="112" width="92" height="40" />
        <rect x="140" y="112" width="64" height="40" />
        <rect x="224" y="112" width="52" height="40" />
        <rect x="24" y="176" width="116" height="42" />
        <rect x="160" y="176" width="100" height="42" />
      </g>
      <path d="M0 100 L400 100 M128 0 V240 M212 0 V240 M0 164 H280" stroke="var(--color-ink-3)" strokeWidth="2" strokeDasharray="10 8" />
      <path d="M0 198 C80 170 160 210 240 150 S360 120 400 60" fill="none" stroke="var(--color-heat)" strokeWidth="9" strokeLinecap="round" opacity=".9" />
      {/* pulse rings + pin */}
      <g transform="translate(212 100)">
        <circle data-pin-ring r="34" fill="none" stroke="var(--color-volt)" strokeWidth="3" />
        <circle data-pin-ring r="34" fill="none" stroke="var(--color-volt)" strokeWidth="3" />
        <g data-pin>
          <path d="M0 0C-14-16-22-26-22-38a22 22 0 0 1 44 0C22-26 14-16 0 0z" fill="var(--color-volt)" stroke="var(--color-edge)" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="0" cy="-38" r="8" fill="var(--color-on-volt)" stroke="var(--color-edge)" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}
