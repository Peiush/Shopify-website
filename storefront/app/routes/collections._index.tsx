import {useRef, useState} from 'react';
import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {HeroArt, PageHero} from '~/components/PageKit';
import {ArrowRightIcon} from '~/components/Icons';
import {usePageMotion} from '~/components/Motion';
import {gsap, useGSAP} from '~/lib/gsap';
import {BRAND} from '~/lib/brand';

export const meta: Route.MetaFunction = () => [{title: `Collections | ${BRAND.name}`}];

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const [{collections}] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY, {
      variables: paginationVariables,
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {collections};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<CollectionFragment | null>(null);

  usePageMotion(root);

  // Floating image that trails the cursor over the list (fine pointers only).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const el = preview.current!;
        const xTo = gsap.quickTo(el, 'x', {duration: 0.6, ease: 'power3'});
        const yTo = gsap.quickTo(el, 'y', {duration: 0.6, ease: 'power3'});
        const onMove = (e: PointerEvent) => {
          xTo(e.clientX);
          yTo(e.clientY);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
      });
    },
    {scope: root},
  );

  useGSAP(
    () => {
      gsap.to(preview.current, {
        autoAlpha: active?.image ? 1 : 0,
        scale: active?.image ? 1 : 0.8,
        rotate: active?.image ? -4 : 0,
        duration: 0.35,
        ease: 'power3.out',
      });
    },
    {dependencies: [active], scope: root},
  );

  return (
    <div className="collections" ref={root}>
      <PageHero
        title="Collections"
        eyebrow="Find your fit"
        description="Every category in the vault. Hover a line to preview, tap to dive in."
        crumbs={[{label: 'Home', to: '/'}, {label: 'Collections'}]}
        meta={[`${collections.nodes.length} categories`, 'Updated every drop']}
        art={<HeroArt sticker="FIT" />}
      />
      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        resourcesClassName="border-t-2 border-ink-3"
      >
        {({node: collection, index}) => (
          <CollectionRow
            key={collection.id}
            collection={collection}
            index={index}
            onHover={setActive}
          />
        )}
      </PaginatedResourceSection>

      <div
        ref={preview}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[7] -mt-36 -ml-28 hidden w-56 opacity-0 md:block"
      >
        {active?.image && (
          <div className="overflow-hidden border-2 border-bone shadow-brutal-volt">
            <Image data={active.image} alt="" aspectRatio="4/5" sizes="224px" className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionRow({
  collection,
  index,
  onHover,
}: {
  collection: CollectionFragment;
  index: number;
  onHover: (collection: CollectionFragment | null) => void;
}) {
  return (
    <Link
      data-reveal
      to={`/collections/${collection.handle}`}
      prefetch="intent"
      onPointerEnter={() => onHover(collection)}
      onPointerLeave={() => onHover(null)}
      className="group flex cursor-pointer items-center gap-4 border-b-2 border-ink-3 py-6 transition-colors duration-300 hover:bg-volt hover:text-on-volt md:gap-10 md:py-8"
    >
      <span className="w-10 shrink-0 pl-2 font-display text-lg text-mute transition-colors duration-300 group-hover:text-on-volt md:w-16 md:text-2xl">
        {String(index + 1).padStart(2, '0')}
      </span>
      {collection.image && (
        <span className="block h-16 w-14 shrink-0 overflow-hidden border-2 border-ink-3 md:hidden">
          <Image data={collection.image} alt="" aspectRatio="4/5" sizes="56px" className="h-full object-cover" />
        </span>
      )}
      <span className="flex-1 font-display text-[clamp(2.5rem,8vw,7rem)] leading-none uppercase transition-transform duration-500 group-hover:translate-x-4">
        {collection.title}
      </span>
      <span className="mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-current transition-transform duration-300 group-hover:-rotate-45 md:h-16 md:w-16">
        <ArrowRightIcon className="h-5 w-5 md:h-6 md:w-6" />
      </span>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;
