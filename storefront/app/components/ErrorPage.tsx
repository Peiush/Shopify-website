import {useRef} from 'react';
import {Link} from 'react-router';
import {ScribbleArrow, SneakerArt, Starburst} from '~/components/Illustrations';
import {ArrowRightIcon} from '~/components/Icons';
import {usePageMotion} from '~/components/Motion';
import {BRAND} from '~/lib/brand';

/**
 * Branded error screen used by the root ErrorBoundary (404s and crashes).
 * It renders outside PageLayout, so it brings its own wordmark and links.
 */
export function ErrorPage({status, message}: {status: number; message?: string}) {
  const root = useRef<HTMLDivElement>(null);
  const notFound = status === 404;

  // No preloader runs on the error screen, so let page motion start right away.
  if (typeof window !== 'undefined') window.__hfPreloaded = true;
  usePageMotion(root);

  return (
    <div
      ref={root}
      className="relative flex min-h-screen flex-col overflow-hidden px-[var(--page-gutter)] py-8"
    >
      <Link to="/" className="font-display text-2xl tracking-wide">
        {BRAND.name}
        <span className="text-volt">.</span>
      </Link>

      <div className="relative grid flex-1 items-center gap-10 py-12 md:grid-cols-2">
        <div className="relative z-10">
          <p data-hero-fade className="mb-4 inline-block bg-heat px-2 py-1 text-xs font-bold tracking-[0.3em] text-bone uppercase">
            ● Error {status}
          </p>
          <h1 data-split className="m-0 text-[clamp(4rem,12vw,11rem)] leading-[0.82]">
            {notFound ? 'Lost' : 'Cooked'}
            <br />
            <span className="text-volt">{notFound ? 'the pair.' : 'it.'}</span>
          </h1>
          <p data-hero-fade className="mt-8 max-w-md text-lg text-mute">
            {notFound
              ? "This page sold out, moved, or never dropped. Let's get you back to the rack."
              : 'Something broke on our side. Give it a second and try again.'}
          </p>
          {message && !notFound && (
            <pre data-hero-fade className="mt-4 max-w-md overflow-auto border-2 border-ink-3 bg-ink-2 p-3 text-xs text-mute">
              {message}
            </pre>
          )}
          <div data-hero-fade className="mt-10 flex flex-wrap gap-3">
            <Link to="/" className="btn-volt inline-flex items-center gap-2 shadow-brutal">
              Back home <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/collections/all"
              className="border-2 border-bone px-6 py-[0.9rem] text-[0.85rem] font-bold tracking-[0.14em] uppercase transition-colors duration-200 hover:bg-bone hover:text-ink"
            >
              Shop all
            </Link>
          </div>
        </div>

        <div className="relative">
          <p
            aria-hidden="true"
            data-parallax="-10"
            className="text-stroke pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-[16rem] leading-none opacity-20 select-none md:text-[22rem]"
          >
            {status}
          </p>
          <SneakerArt className="relative w-full rotate-[-14deg] text-bone" data-draw="" />
          <Starburst label="???" className="absolute top-0 right-6 w-24" />
          <ScribbleArrow className="absolute -bottom-16 -left-6 hidden w-32 rotate-[200deg] text-volt md:block" />
        </div>
      </div>
    </div>
  );
}
