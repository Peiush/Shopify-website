import type {Route} from './+types/collections.all';
import {Fragment, useRef} from 'react';
import {useLoaderData} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import type {CollectionItemFragment} from 'storefrontapi.generated';
import {HeroArt, PageHero, PromoTile, SortBar} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';
import {catalogSort, SORT_OPTIONS} from '~/lib/sort';
import {BRAND} from '~/lib/brand';

export const meta: Route.MetaFunction = () => {
  return [{title: `Shop all | ${BRAND.name}`}];
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
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {
      variables: {...paginationVariables, ...catalogSort(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);
  return {products};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {products} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);

  usePageMotion(root);

  return (
    <div className="collection" ref={root}>
      <PageHero
        title="The full rack"
        backdrop="SHOP ALL"
        eyebrow="Shop all"
        description="Every piece from every drop that's still standing. Sneakers, fleece, headwear and eyewear."
        crumbs={[{label: 'Home', to: '/'}, {label: 'Shop all'}]}
        meta={['Drop 07', 'Free shipping', '30-day returns']}
        art={<HeroArt sticker="ALL" />}
      />
      <SortBar options={SORT_OPTIONS} count={`${products.nodes.length} pieces loaded`} />
      <PaginatedResourceSection<CollectionItemFragment>
        connection={products}
        resourcesClassName="grid grid-flow-dense grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4"
      >
        {({node: product, index}) => (
          <Fragment key={product.id}>
            {index === 5 && <PromoTile />}
            <div data-reveal>
              <ProductItem
                product={product}
                loading={index < 8 ? 'eager' : undefined}
              />
            </div>
          </Fragment>
        )}
      </PaginatedResourceSection>
    </div>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...CollectionItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_ITEM_FRAGMENT}
` as const;
