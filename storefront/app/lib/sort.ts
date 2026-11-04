import type {SortOption} from '~/components/PageKit';

/** Sort choices shown in the SortBar; the first one is the default. */
export const SORT_OPTIONS: SortOption[] = [
  {label: 'Featured', value: 'featured'},
  {label: 'Newest', value: 'newest'},
  {label: 'Price: low', value: 'price-asc'},
  {label: 'Price: high', value: 'price-desc'},
];

type SortVars<K extends string> = {sortKey: K; reverse: boolean};

/** `?sort=` -> Storefront API sort variables for `collection.products`. */
export function collectionSort(
  request: Request,
): SortVars<'COLLECTION_DEFAULT' | 'CREATED' | 'PRICE'> {
  switch (new URL(request.url).searchParams.get('sort')) {
    case 'newest':
      return {sortKey: 'CREATED', reverse: true};
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    default:
      return {sortKey: 'COLLECTION_DEFAULT', reverse: false};
  }
}

/** `?sort=` -> Storefront API sort variables for the top-level `products` query. */
export function catalogSort(
  request: Request,
): SortVars<'BEST_SELLING' | 'CREATED_AT' | 'PRICE'> {
  switch (new URL(request.url).searchParams.get('sort')) {
    case 'newest':
      return {sortKey: 'CREATED_AT', reverse: true};
    case 'price-asc':
      return {sortKey: 'PRICE', reverse: false};
    case 'price-desc':
      return {sortKey: 'PRICE', reverse: true};
    default:
      return {sortKey: 'BEST_SELLING', reverse: false};
  }
}
