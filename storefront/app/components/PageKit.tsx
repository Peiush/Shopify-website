import {Link, useLocation} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {CircleText, SneakerArt, Starburst} from '~/components/Illustrations';
import {ArrowRightIcon, ReturnIcon, ShieldIcon, TruckIcon} from '~/components/Icons';

/**
 * Shared building blocks for inner pages (see design-system/MASTER.md).
 * Animations are attached by `usePageMotion` through the data-* attributes used here.
 */

export function Eyebrow({
  children,
  tone = 'volt',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'volt' | 'heat' | 'mute';
  className?: string;
}) {
  const color = {
    volt: 'text-volt',
    heat: 'inline-block bg-heat px-2 py-1 text-bone',
    mute: 'text-mute',
  }[tone];
  return (
    <p className={`mb-4 text-xs font-bold tracking-[0.3em] uppercase ${color} ${className}`}>
      {children}
    </p>
  );
}

export type Crumb = {label: string; to?: string};

export function Breadcrumbs({items}: {items: Crumb[]}) {
  return (
    <nav aria-label="Breadcrumb" data-hero-fade>
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.15em] text-mute uppercase">
        {items.map((item, i) => (
          <li key={item.label} className="m-0 flex items-center gap-2">
            {item.to ? (
              <Link
                to={item.to}
                prefetch="intent"
                className="transition-colors duration-200 hover:text-volt"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-bone">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Inner-page header: breadcrumb, eyebrow, giant split-letter title, an outlined
 * background word and an optional illustration on the right.
 */
export function PageHero({
  title,
  eyebrow,
  description,
  crumbs,
  backdrop,
  meta,
  art,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string | null;
  crumbs?: Crumb[];
  /** Big outlined word behind the hero (defaults to the title). */
  backdrop?: string;
  /** Small stats shown under the description, e.g. "8 pieces". */
  meta?: string[];
  art?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-hero relative -mx-[var(--page-gutter)] -mt-8 mb-12 overflow-hidden border-b-2 border-ink-3 px-[var(--page-gutter)] pt-10 pb-14 md:pb-20">
      <p
        aria-hidden="true"
        data-parallax="-25"
        className="text-stroke pointer-events-none absolute right-0 -bottom-[4vw] font-display text-[18vw] leading-none whitespace-nowrap opacity-10 select-none"
      >
        {(backdrop ?? title).toUpperCase()}
      </p>
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-volt/10 blur-3xl" />

      <div className="relative grid items-end gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          {crumbs && <Breadcrumbs items={crumbs} />}
          {eyebrow && (
            <div data-hero-fade className="mt-8">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
          )}
          <h1
            key={title}
            data-split
            className={`m-0 text-[clamp(3.25rem,9vw,8.5rem)] leading-[0.85] ${eyebrow ? '' : 'mt-8'}`}
          >
            {title}
          </h1>
          {description && (
            <p data-hero-fade className="mt-6 max-w-xl text-lg leading-relaxed text-mute">
              {description}
            </p>
          )}
          {meta && meta.length > 0 && (
            <div data-hero-fade className="mt-8 flex flex-wrap gap-3">
              {meta.map((item) => (
                <span
                  key={item}
                  className="border-2 border-ink-3 bg-ink-2 px-3 py-1.5 text-xs font-bold tracking-[0.2em] uppercase"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
          {children}
        </div>
        {art && <div className="relative hidden md:block">{art}</div>}
      </div>
    </header>
  );
}

/** The default hero illustration: a sneaker sketch with a sticker. */
export function HeroArt({sticker = 'NEW'}: {sticker?: string}) {
  return (
    <div className="relative mx-auto max-w-md">
      <SneakerArt className="w-full -rotate-6 text-bone" data-draw="" />
      <Starburst label={sticker} className="absolute -top-6 right-4 w-24" />
    </div>
  );
}

/** Illustrated empty state: never leave the shopper on a blank screen. */
export function EmptyState({
  title,
  message,
  primary,
  secondary,
  sticker = 'OOPS',
  onNavigate,
  compact = false,
}: {
  title: string;
  message: string;
  primary: {label: string; to: string};
  secondary?: {label: string; to: string};
  sticker?: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`relative text-center ${compact ? 'py-6' : 'py-16'}`}>
      <div className={`relative mx-auto ${compact ? 'max-w-[15rem]' : 'max-w-sm'}`}>
        <SneakerArt className="w-full -rotate-6 text-mute" data-draw="" />
        <Starburst label={sticker} className="absolute -top-4 -right-2 w-20" />
      </div>
      <h2 className={`mx-auto mt-8 mb-3 leading-none ${compact ? 'text-4xl' : 'text-5xl md:text-6xl'}`}>
        {title}
      </h2>
      <p className="mx-auto max-w-sm text-mute">{message}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to={primary.to}
          onClick={onNavigate}
          prefetch="intent"
          className="btn-volt inline-flex items-center gap-2 shadow-brutal"
        >
          {primary.label} <ArrowRightIcon className="h-4 w-4" />
        </Link>
        {secondary && (
          <Link
            to={secondary.to}
            onClick={onNavigate}
            prefetch="intent"
            className="border-2 border-bone px-6 py-[0.9rem] text-[0.85rem] font-bold tracking-[0.14em] uppercase transition-colors duration-200 hover:bg-bone hover:text-ink"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}

const TRUST = [
  {Icon: ShieldIcon, title: 'Verified authentic', copy: 'Inspected by hand'},
  {Icon: TruckIcon, title: 'Free 48h dispatch', copy: 'Tracked to your door'},
  {Icon: ReturnIcon, title: '30-day returns', copy: 'No questions asked'},
];

export function TrustRow({compact = false}: {compact?: boolean}) {
  return (
    <ul className={`grid gap-3 ${compact ? 'grid-cols-3' : 'sm:grid-cols-3'}`}>
      {TRUST.map(({Icon, title, copy}) => (
        <li
          key={title}
          className={`m-0 flex border-2 border-ink-3 bg-ink-2 ${
            compact ? 'flex-col items-center gap-2 p-3 text-center' : 'items-center gap-3 p-4'
          }`}
        >
          <Icon className="h-6 w-6 shrink-0 text-volt" />
          <div>
            <p className="text-xs font-bold tracking-wide uppercase">{title}</p>
            {!compact && <p className="text-xs text-mute">{copy}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export type SortOption = {label: string; value: string};

/**
 * Sort as plain links: shareable URLs, works without JavaScript, and the
 * current choice is always visible (UX: deep linking + active state).
 */
export function SortBar({options, count}: {options: SortOption[]; count?: string}) {
  const {pathname, search} = useLocation();
  const params = new URLSearchParams(search);
  const current = params.get('sort') ?? options[0].value;

  return (
    <div className="sticky top-[var(--header-offset)] z-[4] -mx-[var(--page-gutter)] -mt-12 mb-10 flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink-3 bg-ink/90 px-[var(--page-gutter)] py-3 backdrop-blur-md">
      {count && (
        <p className="text-xs font-bold tracking-[0.2em] text-mute uppercase">{count}</p>
      )}
      <nav aria-label="Sort products" className="flex flex-wrap gap-2">
        {options.map((option) => {
          const next = new URLSearchParams(search);
          next.delete('cursor');
          next.delete('direction');
          if (option.value === options[0].value) next.delete('sort');
          else next.set('sort', option.value);
          const query = next.toString();
          const active = option.value === current;
          return (
            <Link
              key={option.value}
              to={`${pathname}${query ? `?${query}` : ''}`}
              preventScrollReset
              prefetch="intent"
              aria-current={active ? 'true' : undefined}
              className={`cursor-pointer border-2 px-3 py-2 text-xs font-bold tracking-[0.15em] uppercase transition-colors duration-200 ${
                active
                  ? 'border-volt bg-volt text-on-volt'
                  : 'border-ink-3 text-bone hover:border-bone'
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Brutal "load more / previous" styling for Hydrogen's pagination links. */
export function LoadMoreLabel({
  isLoading,
  direction,
}: {
  isLoading: boolean;
  direction: 'next' | 'previous';
}) {
  return (
    <span className="mx-auto my-12 flex w-fit cursor-pointer items-center gap-3 border-2 border-bone px-8 py-4 text-sm font-bold tracking-[0.2em] uppercase shadow-brutal transition-colors duration-200 hover:bg-volt hover:text-on-volt">
      {isLoading ? 'Loading the rack…' : direction === 'next' ? 'Load more drops' : 'Load previous'}
      <span aria-hidden="true">{direction === 'next' ? '↓' : '↑'}</span>
    </span>
  );
}

/** Editorial tile dropped into product grids to break the rhythm. */
export function PromoTile() {
  return (
    <Link
      to="/account"
      data-reveal
      className="group relative col-span-2 flex min-h-80 flex-col justify-between overflow-hidden border-2 border-bone bg-volt p-6 md:col-span-1 text-on-volt shadow-brutal transition-transform duration-300 hover:-translate-y-1"
    >
      <CircleText
        text="• MEMBERS ONLY • EARLY ACCESS • HYPEFORGE "
        className="spin-slow absolute -top-8 -right-8 w-36 opacity-90"
      />
      <p className="text-xs font-bold tracking-[0.3em] uppercase">The vault</p>
      <div>
        <p className="font-display text-5xl leading-[0.9] uppercase">
          15 min
          <br />
          head start
        </p>
        <p className="mt-3 text-sm text-on-volt/75">
          Members shop every drop before everyone else.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 border-b-2 border-edge pb-1 text-xs font-bold tracking-[0.2em] uppercase">
          Join free <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
      <SneakerArt className="pointer-events-none absolute -right-10 bottom-24 w-56 -rotate-12 text-on-volt opacity-15" />
    </Link>
  );
}

type ShopifyImage = React.ComponentProps<typeof Image>['data'];

/** Hero art for collections: the collection image in a tilted brutal frame. */
export function CollectionArt({image, label}: {image?: ShopifyImage | null; label: string}) {
  if (!image) return <HeroArt />;
  return (
    <div data-hero-fade className="relative mx-auto max-w-sm rotate-3">
      <div className="overflow-hidden border-2 border-bone shadow-brutal-volt">
        <Image data={image} alt={label} aspectRatio="4/5" sizes="30vw" loading="eager" className="object-cover" />
      </div>
      <Starburst label="HOT" className="absolute -top-6 -left-6 w-20" />
      <span className="absolute -bottom-4 left-6 -rotate-6 border-2 border-edge bg-bone px-3 py-1 font-display text-lg text-ink uppercase">
        {label}
      </span>
    </div>
  );
}
