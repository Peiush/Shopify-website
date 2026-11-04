import {Link} from 'react-router';
import {Pagination} from '@shopify/hydrogen';
import type {RecommendedProductFragment} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {LoadMoreLabel} from '~/components/PageKit';
import {ArrowRightIcon} from '~/components/Icons';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Pages = SearchResultsPages;
SearchResults.Products = SearchResultsProducts;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result mt-16">
      <h2 className="text-4xl">Journal</h2>
      <div>
        {articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <Link
              key={article.id}
              prefetch="intent"
              to={articleUrl}
              data-reveal
              className="group flex items-center justify-between border-b-2 border-ink-3 py-5 font-display text-3xl uppercase transition-colors duration-200 hover:text-volt"
            >
              {article.title}
              <ArrowRightIcon className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result mt-16">
      <h2 className="text-4xl">Pages</h2>
      <div>
        {pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <Link
              key={page.id}
              prefetch="intent"
              to={pageUrl}
              data-reveal
              className="group flex items-center justify-between border-b-2 border-ink-3 py-5 font-display text-3xl uppercase transition-colors duration-200 hover:text-volt"
            >
              {page.title}
              <ArrowRightIcon className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          );
        })}
      </div>
      <br />
    </div>
  );
}

function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2 className="sr-only">Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });
            const variant = product.selectedOrFirstAvailableVariant;
            // Shape the search hit like a card product so every grid shares one card.
            const card = {
              id: product.id,
              title: product.title,
              handle: product.handle,
              featuredImage: variant?.image
                ? {...variant.image, id: product.id}
                : null,
              priceRange: {minVariantPrice: variant?.price},
            } as unknown as RecommendedProductFragment;

            return (
              <div key={product.id} data-reveal>
                <ProductItem product={card} to={productUrl} />
              </div>
            );
          });

          return (
            <div>
              <PreviousLink>
                <LoadMoreLabel isLoading={isLoading} direction="previous" />
              </PreviousLink>
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
                {ItemsMarkup}
              </div>
              <NextLink>
                <LoadMoreLabel isLoading={isLoading} direction="next" />
              </NextLink>
            </div>
          );
        }}
      </Pagination>
      <br />
    </div>
  );
}

function SearchResultsEmpty() {
  return <p>No results, try a different search.</p>;
}
