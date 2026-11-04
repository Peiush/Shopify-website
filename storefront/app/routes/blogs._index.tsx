import {useRef} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/blogs._index';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import type {BlogsQuery} from 'storefrontapi.generated';
import {HeroArt, PageHero} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';
import {ArrowRightIcon} from '~/components/Icons';

type BlogNode = BlogsQuery['blogs']['nodes'][0];

export const meta: Route.MetaFunction = () => {
  return [{title: `HYPEFORGE | Blogs`}];
};

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
    pageBy: 10,
  });

  const [{blogs}] = await Promise.all([
    context.storefront.query(BLOGS_QUERY, {
      variables: {
        ...paginationVariables,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {blogs};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Blogs() {
  const {blogs} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);

  return (
    <div className="blogs" ref={root}>
      <PageHero
        title="Journal"
        eyebrow="Stories from the vault"
        description="Drop notes, culture and the people behind the pairs."
        crumbs={[{label: 'Home', to: '/'}, {label: 'Journal'}]}
        art={<HeroArt sticker="READ" />}
      />
      <PaginatedResourceSection<BlogNode> connection={blogs} resourcesClassName="border-t-2 border-ink-3">
        {({node: blog}) => (
          <Link
            key={blog.handle}
            prefetch="intent"
            to={`/blogs/${blog.handle}`}
            data-reveal
            className="group flex items-center justify-between border-b-2 border-ink-3 py-8 transition-colors duration-300 hover:text-volt"
          >
            <span className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-none uppercase transition-transform duration-500 group-hover:translate-x-4">
              {blog.title}
            </span>
            <ArrowRightIcon className="h-8 w-8 shrink-0" />
          </Link>
        )}
      </PaginatedResourceSection>
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/blog
const BLOGS_QUERY = `#graphql
  query Blogs(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    blogs(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        title
        handle
        seo {
          title
          description
        }
      }
    }
  }
` as const;
