import {Suspense, useRef} from 'react';
import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  Image,
  Money,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import type {
  ProductFragment,
  ProductRecommendationsQuery,
} from 'storefrontapi.generated';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductForm} from '~/components/ProductForm';
import {ProductItem} from '~/components/ProductItem';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {CircleText, SneakerArt, Starburst} from '~/components/Illustrations';
import {PlusIcon} from '~/components/Icons';
import {Breadcrumbs, Eyebrow, TrustRow} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';
import {gsap, ScrollTrigger, useGSAP} from '~/lib/gsap';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {BRAND} from '~/lib/brand';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: `${data?.product.title ?? ''} | ${BRAND.name}`},
    {name: 'description', content: data?.product.seo?.description ?? data?.product.description},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
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
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  const recommendations = context.storefront
    .query(RECOMMENDATIONS_QUERY, {variables: {handle: params.handle!}})
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {recommendations};
}

export default function Product() {
  const {product, recommendations} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  usePageMotion(root, [product.id]);

  const {title, descriptionHtml, vendor} = product;
  const available = Boolean(selectedVariant?.availableForSale);

  return (
    <div className="pdp" ref={root}>
      <Breadcrumbs
        items={[
          {label: 'Home', to: '/'},
          {label: 'Shop', to: '/collections/all'},
          {label: title},
        ]}
      />

      <section className="mt-8 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <Gallery product={product} selectedImage={selectedVariant?.image} />

        <div className="lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start lg:transition-[top] lg:duration-300">
          <div data-hero-fade>
            <Eyebrow>
              {vendor} <span className="text-mute">/ Drop 07</span>
            </Eyebrow>
          </div>
          <h1 key={product.id} data-split className="m-0 text-[clamp(3rem,6vw,5.5rem)] leading-[0.88]">
            {title}
          </h1>

          <div data-hero-fade className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="font-display text-4xl text-volt">
              <ProductPrice
                price={selectedVariant?.price}
                compareAtPrice={selectedVariant?.compareAtPrice}
              />
            </div>
            <p className="pb-1 text-xs tracking-[0.15em] text-mute uppercase">
              Taxes included. Free shipping.
            </p>
          </div>

          <p data-hero-fade className="mt-5 flex items-center gap-2 text-sm font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                available ? 'animate-pulse bg-emerald-600' : 'bg-volt'
              }`}
            />
            {available ? 'In stock, dispatched within 48 hours' : 'Sold out, join the vault for restock alerts'}
          </p>

          <div data-hero-fade className="pdp-form mt-8 border-t-2 border-ink-3 pt-8">
            <ProductForm productOptions={productOptions} selectedVariant={selectedVariant} />
          </div>

          <div data-hero-fade className="mt-8">
            <TrustRow compact />
          </div>

          <div data-hero-fade className="mt-8 border-t-2 border-ink-3">
            <Accordion title="Details" defaultOpen>
              <div
                className="rich-text"
                dangerouslySetInnerHTML={{__html: descriptionHtml}}
              />
            </Accordion>
            <Accordion title="Shipping & returns">
              <p>
                Free tracked shipping on every order, dispatched within 48 hours.
                Changed your mind? Return unworn pieces within 30 days for a full
                refund.
              </p>
            </Accordion>
            <Accordion title="Authenticity guarantee">
              <p>
                Every pair is inspected by hand before it ships: stitching,
                materials, box and tags. If it isn't real, it isn't HYPEFORGE.
              </p>
            </Accordion>
          </div>
        </div>
      </section>

      <Anatomy />
      <TitleTape title={title} />
      <Recommendations recommendations={recommendations} />

      <StickyBuyBar
        title={title}
        image={selectedVariant?.image}
        selectedVariant={selectedVariant}
      />

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

type ProductImageData = NonNullable<ProductFragment['selectedOrFirstAvailableVariant']>['image'];

/** Lead image (follows the selected variant) plus the rest of the product's shots. */
function Gallery({
  product,
  selectedImage,
}: {
  product: ProductFragment;
  selectedImage: ProductImageData;
}) {
  const lead = selectedImage ?? product.images.nodes[0];
  const rest = product.images.nodes.filter((image) => image.id !== lead?.id).slice(0, 4);

  return (
    <div className="relative min-w-0">
      {/* Mobile: swipeable strip. Desktop: lead image + 2-column grid. */}
      <div className="-mx-[var(--page-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--page-gutter)] px-[var(--page-gutter)] lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0">
        {lead && (
          <figure className="relative m-0 w-[86vw] shrink-0 snap-start lg:col-span-2 lg:w-auto">
            <div className="overflow-hidden border-2 border-bone bg-ink-2 shadow-brutal-volt">
              <Image
                key={lead.id}
                data={lead}
                alt={lead.altText || product.title}
                aspectRatio="1/1"
                loading="eager"
                sizes="(min-width: 1024px) 55vw, 90vw"
                className="h-full w-full object-cover"
              />
            </div>
            <Starburst label="NEW" className="absolute -top-5 -left-3 w-20 md:w-24" />
            <CircleText
              text="• DROP 07 • HYPEFORGE • VERIFIED AUTHENTIC "
              className="spin-slow absolute -right-3 -bottom-6 w-24 md:w-32"
            />
          </figure>
        )}
        {rest.map((image) => (
          <figure
            key={image.id}
            data-reveal
            className="m-0 w-[70vw] shrink-0 snap-start overflow-hidden border-2 border-ink-3 bg-ink-2 lg:w-auto"
          >
            <Image
              data={image}
              alt={image.altText || product.title}
              aspectRatio="1/1"
              sizes="(min-width: 1024px) 27vw, 70vw"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </figure>
        ))}
      </div>
    </div>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-b-2 border-ink-3" open={defaultOpen}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-4 text-sm font-bold tracking-[0.18em] uppercase transition-colors duration-200 hover:text-volt [&::-webkit-details-marker]:hidden">
        {title}
        <PlusIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-45" />
      </summary>
      <div className="pb-6 leading-relaxed text-body">{children}</div>
    </details>
  );
}

const CALLOUTS = [
  {label: 'Premium upper', copy: 'Full-grain leather and engineered mesh.'},
  {label: 'Lightning stripe', copy: 'The HYPEFORGE signature, stitched not printed.'},
  {label: 'Forge-cush midsole', copy: 'All-day rebound for long city miles.'},
  {label: 'Grip outsole', copy: 'Herringbone tread for wet streets.'},
];

function Callout({
  label,
  copy,
  side,
}: {
  label: string;
  copy: string;
  side: 'left' | 'right';
}) {
  return (
    <li
      data-reveal
      className={`m-0 flex items-center gap-4 ${side === 'left' ? 'md:flex-row-reverse md:text-right' : ''}`}
    >
      <span className="hidden shrink-0 items-center md:flex" aria-hidden="true">
        {side === 'right' && <span className="h-3 w-3 rounded-full border-2 border-edge bg-volt" />}
        <span className="h-px w-12 bg-volt" />
        {side === 'left' && <span className="h-3 w-3 rounded-full border-2 border-edge bg-volt" />}
      </span>
      <div className="border-l-2 border-volt pl-4 md:border-0 md:pl-0">
        <p className="text-xs font-bold tracking-[0.15em] text-volt uppercase">{label}</p>
        <p className="mt-1 text-sm text-mute">{copy}</p>
      </div>
    </li>
  );
}

/** Annotated illustration: the sneaker draws itself and the callouts reveal. */
function Anatomy() {
  return (
    <section className="relative mt-28 border-y-2 border-ink-3 py-20">
      <Eyebrow>The forge standard</Eyebrow>
      <h2 data-reveal className="m-0 max-w-3xl text-5xl leading-none md:text-7xl">
        Anatomy of <span className="text-stroke">a drop</span>
      </h2>

      <div className="mt-14 grid items-center gap-10 md:grid-cols-[1fr_2fr_1fr]">
        <ul className="order-2 m-0 flex flex-col gap-10 md:order-1">
          {CALLOUTS.slice(0, 2).map((callout) => (
            <Callout key={callout.label} {...callout} side="left" />
          ))}
        </ul>
        <div className="order-1 md:order-2">
          <SneakerArt className="w-full text-bone" data-draw="" />
        </div>
        <ul className="order-3 m-0 flex flex-col gap-10">
          {CALLOUTS.slice(2).map((callout) => (
            <Callout key={callout.label} {...callout} side="right" />
          ))}
        </ul>
      </div>
    </section>
  );
}

function TitleTape({title}: {title: string}) {
  const items = Array.from({length: 16}, () => title);
  return (
    <div
      aria-hidden="true"
      className="-mx-[var(--page-gutter)] my-20 -rotate-2 overflow-hidden border-y-2 border-edge bg-volt py-3 text-on-volt"
    >
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {items.map((item, i) => (
          <span key={i} className="font-display text-3xl uppercase">
            {item} <span className="ml-10">✕</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Recommendations({
  recommendations,
}: {
  recommendations: Promise<ProductRecommendationsQuery | null>;
}) {
  return (
    <Suspense fallback={null}>
      <Await resolve={recommendations}>
        {(data) => {
          const products = data?.productRecommendations?.slice(0, 4) ?? [];
          if (!products.length) return null;
          return (
            <section aria-labelledby="also-cop" className="pb-10">
              <div className="mb-10 flex items-end justify-between gap-6">
                <div>
                  <Eyebrow>Complete the fit</Eyebrow>
                  <h2 id="also-cop" className="m-0 text-5xl leading-none md:text-7xl">
                    You may also cop
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                {products.map((product) => (
                  <ProductItem key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        }}
      </Await>
    </Suspense>
  );
}

/**
 * Slides up from the bottom once the main add-to-cart form scrolls out of view,
 * so the buy action is always one tap away on long product pages.
 */
function StickyBuyBar({
  title,
  image,
  selectedVariant,
}: {
  title: string;
  image: ProductImageData;
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const bar = useRef<HTMLDivElement>(null);
  const {open} = useAside();

  useGSAP(() => {
    const el = bar.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.set(el, {yPercent: 110, autoAlpha: 0});
    ScrollTrigger.create({
      trigger: '.pdp-form',
      start: 'bottom top',
      endTrigger: 'html',
      end: 'bottom bottom-=200',
      onToggle: (self) =>
        gsap.to(el, {
          yPercent: self.isActive ? 0 : 110,
          autoAlpha: self.isActive ? 1 : 0,
          duration: reduce ? 0 : 0.4,
          ease: 'power3.out',
        }),
    });
  });

  const available = Boolean(selectedVariant?.availableForSale);

  return (
    <div
      ref={bar}
      className="fixed inset-x-0 bottom-0 z-[6] border-t-2 border-bone bg-ink/95 px-[var(--page-gutter)] py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-4">
        {image && (
          <Image
            data={image}
            alt=""
            width={56}
            height={56}
            className="hidden h-14 w-14 border-2 border-ink-3 object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl uppercase">{title}</p>
          <p className="text-sm text-volt">
            {/* as="span": Money renders a <div> by default, which is invalid inside <p>
                and breaks hydration (the browser auto-closes the <p>). */}
            {selectedVariant?.price && <Money as="span" data={selectedVariant.price} />}
            {selectedVariant?.title && selectedVariant.title !== 'Default Title' && (
              <span className="ml-2 text-mute">{selectedVariant.title}</span>
            )}
          </p>
        </div>
        <div className="shrink-0">
          <AddToCartButton
            disabled={!available}
            onClick={() => open('cart')}
            lines={
              selectedVariant
                ? [{merchandiseId: selectedVariant.id, quantity: 1, selectedVariant}]
                : []
            }
          >
            {available ? 'Add to cart' : 'Sold out'}
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 6) {
      nodes {
        __typename
        id
        url
        altText
        width
        height
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const RECOMMENDATIONS_QUERY = `#graphql
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productHandle: $handle) {
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
  }
` as const;
