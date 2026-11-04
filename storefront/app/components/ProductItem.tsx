import {useRef} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {
  ProductItemFragment,
  CollectionItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';
import {gsap, useGSAP} from '~/lib/gsap';
import {SneakerArt} from '~/components/Illustrations';

export function ProductItem({
  product,
  loading,
  to,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment;
  loading?: 'eager' | 'lazy';
  /** Override the link (e.g. search results keep their tracking params). */
  to?: string;
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  const card = useRef<HTMLAnchorElement>(null);

  useTilt(card);

  return (
    <Link
      ref={card}
      className="product-item group block cursor-pointer [perspective:900px]"
      key={product.id}
      prefetch="intent"
      to={to ?? variantUrl}
    >
      <div className="tilt relative overflow-hidden border-2 border-ink-3 bg-ink-2 transition-[border-color,box-shadow] duration-300 group-hover:border-bone group-hover:shadow-brutal-volt [transform-style:preserve-3d]">
        {!image && (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-ink p-8 text-center">
            <SneakerArt className="w-4/5 -rotate-6 text-mute" />
            <span className="text-[0.65rem] font-bold tracking-[0.2em] text-mute uppercase">
              Photo dropping soon
            </span>
          </div>
        )}
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="4/5"
            data={image}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        {/* Light sheen that sweeps across on hover */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="absolute top-3 left-3 border-2 border-edge bg-volt px-2 py-1 text-[0.65rem] font-bold tracking-[0.15em] text-on-volt uppercase">
          New
        </span>
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-bone py-3 text-center text-xs font-bold tracking-[0.2em] text-ink uppercase transition-transform duration-300 group-hover:translate-y-0">
          View product →
        </span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <h4 className="m-0 text-sm font-medium tracking-wide uppercase transition-colors duration-200 group-hover:text-volt">
          {product.title}
        </h4>
        <span className="shrink-0 text-sm font-bold">
          <Money as="span" data={product.priceRange.minVariantPrice} />
        </span>
      </div>
    </Link>
  );
}

/** Tilts the card's `.tilt` layer toward the pointer (fine pointers, motion allowed). */
function useTilt(card: React.RefObject<HTMLAnchorElement | null>) {
  useGSAP(
    (_ctx, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const el = card.current!;
        const layer = el.querySelector<HTMLElement>('.tilt')!;
        const rx = gsap.quickTo(layer, 'rotationX', {duration: 0.5, ease: 'power3'});
        const ry = gsap.quickTo(layer, 'rotationY', {duration: 0.5, ease: 'power3'});

        const onMove = contextSafe!((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 14);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
        });
        const onLeave = contextSafe!(() => {
          rx(0);
          ry(0);
        });

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        };
      });
    },
    {scope: card},
  );
}
