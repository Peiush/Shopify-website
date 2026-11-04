import {
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {useRef} from 'react';
import {getPaginationVariables} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
  ORDER_FILTER_FIELDS,
  type OrderFilterParams,
} from '~/lib/orderFilters';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import type {CustomerOrdersFragment} from 'customer-accountapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {OrderRow, useAccountMotion} from '~/components/AccountKit';
import {EmptyState} from '~/components/PageKit';
import {CloseIcon, PackageIcon, SearchIcon} from '~/components/Icons';

type OrdersLoaderData = {
  customer: CustomerOrdersFragment;
  filters: OrderFilterParams;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Orders'}];
};

export async function loader({request, context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw Error('Customer orders not found');
  }

  return {customer: data.customer, filters};
}

export default function Orders() {
  const {customer, filters} = useLoaderData<OrdersLoaderData>();
  const {orders} = customer;
  const root = useRef<HTMLDivElement>(null);
  useAccountMotion(root);

  return (
    <div className="orders" ref={root}>
      <OrderSearchForm currentFilters={filters} />
      <OrdersTable orders={orders} filters={filters} />
    </div>
  );
}

function OrdersTable({
  orders,
  filters,
}: {
  orders: CustomerOrdersFragment['orders'];
  filters: OrderFilterParams;
}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="acccount-orders mt-8" aria-live="polite">
      {orders?.nodes.length ? (
        <PaginatedResourceSection connection={orders} resourcesClassName="grid gap-4">
          {({node: order}) => <OrderRow key={order.id} order={order} />}
        </PaginatedResourceSection>
      ) : (
        <EmptyOrders hasFilters={hasFilters} />
      )}
    </div>
  );
}

function EmptyOrders({hasFilters = false}: {hasFilters?: boolean}) {
  return (
    <div data-acc-in className="border-2 border-dashed border-ink-3 bg-ink-2">
      {hasFilters ? (
        <EmptyState
          compact
          sticker="HMM"
          title="No matches"
          message="No orders match that search. Try a different order or confirmation number."
          primary={{label: 'Clear filters', to: '/account/orders'}}
        />
      ) : (
        <EmptyState
          compact
          sticker="NEW"
          title="No drops yet"
          message="You haven't placed any orders. Your first one will show up here with live tracking."
          primary={{label: 'Start shopping', to: '/collections/all'}}
        />
      )}
    </div>
  );
}

function OrderSearchForm({
  currentFilters,
}: {
  currentFilters: OrderFilterParams;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const isSearching =
    navigation.state !== 'idle' &&
    navigation.location?.pathname?.includes('orders');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const name = formData.get(ORDER_FILTER_FIELDS.NAME)?.toString().trim();
    const confirmationNumber = formData
      .get(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER)
      ?.toString()
      .trim();

    if (name) params.set(ORDER_FILTER_FIELDS.NAME, name);
    if (confirmationNumber)
      params.set(ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER, confirmationNumber);

    setSearchParams(params);
  };

  const removeFilter = (field: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(field);
    setSearchParams(params);
  };

  const active = [
    currentFilters.name && {
      field: ORDER_FILTER_FIELDS.NAME,
      label: `Order ${currentFilters.name}`,
    },
    currentFilters.confirmationNumber && {
      field: ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER,
      label: `Confirmation ${currentFilters.confirmationNumber}`,
    },
  ].filter(Boolean) as Array<{field: string; label: string}>;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="order-search-form mb-8 border-2 border-edge bg-ink-2 shadow-brutal"
      aria-label="Search orders"
      data-acc-in
    >
      <div className="flex items-center gap-4 border-b-2 border-edge bg-bone px-5 py-4 text-ink">
        <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-edge bg-heat text-bone">
          <SearchIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="m-0 text-xs font-bold tracking-[0.3em] text-heat uppercase">
            Order lookup
          </p>
          <p className="m-0 font-display text-3xl leading-none uppercase">Find an order</p>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <SearchField
          label="Order number"
          name={ORDER_FILTER_FIELDS.NAME}
          placeholder="e.g. 1001"
          defaultValue={currentFilters.name || ''}
          icon={<PackageIcon className="h-4 w-4" />}
        />
        <SearchField
          label="Confirmation number"
          name={ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER}
          placeholder="e.g. A1B2C3D4E"
          defaultValue={currentFilters.confirmationNumber || ''}
          icon={<SearchIcon className="h-4 w-4" />}
        />
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex w-full items-center justify-center gap-2 md:w-auto"
        >
          <SearchIcon className="h-4 w-4" />
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-ink-3 px-5 py-4">
          <span className="text-xs font-bold tracking-[0.2em] text-mute uppercase">
            Filtering by
          </span>
          {active.map(({field, label}) => (
            <button
              key={field}
              type="button"
              disabled={isSearching}
              onClick={() => {
                removeFilter(field);
                formRef.current?.reset();
              }}
              aria-label={`Remove filter: ${label}`}
              className="inline-flex cursor-pointer items-center gap-2 border-2 border-edge bg-heat px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-bone uppercase transition-colors duration-200 hover:bg-bone hover:text-ink"
            >
              {label}
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          ))}
          <button
            type="button"
            disabled={isSearching}
            onClick={() => {
              setSearchParams(new URLSearchParams());
              formRef.current?.reset();
            }}
            className="ml-auto cursor-pointer text-xs font-bold tracking-[0.18em] uppercase underline underline-offset-4 hover:text-volt"
          >
            Clear all
          </button>
        </div>
      )}
    </form>
  );
}

function SearchField({
  label,
  name,
  placeholder,
  defaultValue,
  icon,
}: {
  label: string;
  name: string;
  placeholder: string;
  defaultValue: string;
  icon: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold tracking-[0.18em] uppercase">
      {label}
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mute">
          {icon}
        </span>
        <input
          type="search"
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full border-2 border-ink-3 py-3 pr-3 pl-10 text-base font-normal tracking-normal normal-case transition-colors duration-200 placeholder:text-mute/70 focus:border-volt"
        />
      </span>
    </label>
  );
}
