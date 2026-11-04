import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {CloseIcon, MinusIcon, PlusIcon} from './Icons';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="cart-line m-0">
      <div
        className={`flex gap-4 border-2 border-ink-3 bg-ink-2 transition-colors duration-300 hover:border-bone ${
          layout === 'page' ? 'p-4 md:gap-6' : 'p-3'
        }`}
      >
        {image && (
          <div className="shrink-0 self-start overflow-hidden border-2 border-ink-3 bg-ink">
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={layout === 'page' ? 140 : 88}
              loading="lazy"
              width={layout === 'page' ? 140 : 88}
              className={layout === 'page' ? 'h-24 w-24 md:h-36 md:w-36' : 'h-20 w-20'}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') {
                  close();
                }
              }}
              className="min-w-0 transition-colors duration-200 hover:text-volt"
            >
              <p
                className={`m-0 font-display leading-none uppercase ${
                  layout === 'page' ? 'text-2xl md:text-3xl' : 'text-xl'
                }`}
              >
                {product.title}
              </p>
            </Link>
            <div className="shrink-0 text-sm font-bold text-volt">
              <ProductPrice price={line?.cost?.totalAmount} />
            </div>
          </div>
          <ul className="m-0 mt-2 flex flex-wrap gap-1.5">
            {selectedOptions
              .filter((option) => option.value !== 'Default Title')
              .map((option) => (
                <li
                  key={option.name}
                  className="m-0 border border-ink-3 px-2 py-0.5 text-[0.7rem] tracking-[0.1em] text-mute uppercase"
                >
                  {option.name}: <span className="text-bone">{option.value}</span>
                </li>
              ))}
          </ul>
          <div className="mt-auto pt-3">
            <CartLineQuantity line={line} />
          </div>
        </div>
      </div>

      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="cart-line-children">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity flex items-center justify-between gap-3">
      <div className="flex items-center border-2 border-ink-3">
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || !!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className="qty-btn"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
        </CartLineUpdateButton>
        <span aria-live="polite" className="min-w-10 text-center text-sm font-bold tabular-nums">
          <span className="sr-only">Quantity: </span>
          {quantity}
        </span>
        <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
          <button
            aria-label="Increase quantity"
            name="increase-quantity"
            value={nextQuantity}
            disabled={!!isOptimistic}
            className="qty-btn"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        disabled={disabled}
        type="submit"
        aria-label="Remove item"
        className="qty-btn remove-btn"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Increase quantity"
 * and "Decrease quantity" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}
