import {useRef} from 'react';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/account._index';
import {CUSTOMER_DASHBOARD_QUERY} from '~/graphql/customer-account/CustomerDashboardQuery';
import {
  MapArt,
  MemberPass,
  OrderRow,
  QuickLink,
  RankCard,
  SectionHead,
  StatTile,
  useAccountMotion,
} from '~/components/AccountKit';
import {EmptyState, TrustRow} from '~/components/PageKit';
import {
  ArrowRightIcon,
  BagIcon,
  CalendarIcon,
  PackageIcon,
  PinIcon,
  UserIcon,
} from '~/components/Icons';
import {displayName, formatDate, getRank, memberNumber} from '~/lib/account';

export const meta: Route.MetaFunction = () => [{title: 'Your vault | HYPEFORGE'}];

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DASHBOARD_QUERY, {
    variables: {language: customerAccount.i18n.language},
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  return {customer: data.customer};
}

export default function AccountDashboard() {
  const {customer} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);
  useAccountMotion(root);

  const orders = customer.orders.nodes;
  const hasMoreOrders = customer.orders.pageInfo.hasNextPage;
  const orderCount = orders.length;
  const currency = orders[0]?.totalPrice.currencyCode ?? 'USD';
  const spent = Math.round(
    orders
      .filter((order) => order.totalPrice.currencyCode === currency)
      .reduce((sum, order) => sum + Number(order.totalPrice.amount), 0),
  );
  const rank = getRank(orderCount);
  const address = customer.defaultAddress;
  const lastOrder = orders[0];

  return (
    <div ref={root} className="pb-8">
      {/* Pass + rank + stats overlap the hero for depth */}
      <section className="relative z-10 -mt-20 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
        <MemberPass
          name={displayName(customer)}
          number={memberNumber(customer.id)}
          since={formatDate(customer.creationDate, 'month')}
          rankName={rank.current.name}
        />
        <div className="grid gap-4">
          <RankCard orderCount={orderCount} />
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              icon={<PackageIcon className="h-5 w-5" />}
              label={hasMoreOrders ? 'Orders (latest 50)' : 'Orders'}
              count={orderCount}
            />
            <StatTile
              icon={<BagIcon className="h-5 w-5" />}
              label="Total spent"
              count={spent}
              currency={currency}
            />
            <StatTile
              icon={<PinIcon className="h-5 w-5" />}
              label="Saved addresses"
              count={customer.addresses.nodes.length}
            />
            <StatTile
              icon={<CalendarIcon className="h-5 w-5" />}
              label="Last order"
              value={lastOrder ? formatDate(lastOrder.processedAt, 'month') : 'None yet'}
            />
          </div>
        </div>
      </section>

      {/* Recent orders */}
      <section className="mt-20">
        <SectionHead
          eyebrow="Latest activity"
          title="Recent orders"
          action={orderCount ? {label: 'All orders', to: '/account/orders'} : undefined}
        />
        {orderCount ? (
          <div className="grid gap-4">
            {orders.slice(0, 3).map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div data-acc-rise className="border-2 border-dashed border-ink-3 bg-ink-2">
            <EmptyState
              compact
              sticker="NEW"
              title="No drops yet"
              message="Your first order will show up here with live tracking. Go grab something loud."
              primary={{label: 'Shop the drop', to: '/collections/all'}}
            />
          </div>
        )}
      </section>

      {/* Jump back in */}
      <section className="mt-20">
        <SectionHead eyebrow="Shortcuts" title="Jump back in" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            to="/collections/all"
            tone="volt"
            icon={<BagIcon className="h-5 w-5" />}
            title="Shop"
            copy="Fresh pairs, straight from the forge."
          />
          <QuickLink
            to="/account/orders"
            icon={<PackageIcon className="h-5 w-5" />}
            title="Orders"
            copy="Track, search and revisit every order."
          />
          <QuickLink
            to="/account/profile"
            icon={<UserIcon className="h-5 w-5" />}
            title="Profile"
            copy="Keep your name and details current."
          />
          <QuickLink
            to="/account/addresses"
            icon={<PinIcon className="h-5 w-5" />}
            title="Addresses"
            copy="Manage where your drops land."
          />
        </div>
      </section>

      {/* Ship-to */}
      <section className="mt-20">
        <SectionHead
          eyebrow="Delivery"
          title="Ship to"
          action={{label: address ? 'Manage' : 'Add address', to: '/account/addresses'}}
        />
        <div
          data-acc-rise
          className="grid overflow-hidden border-2 border-ink-3 bg-ink-2 md:grid-cols-[1.2fr_1fr]"
        >
          <MapArt className="block h-full min-h-56 w-full border-b-2 border-ink-3 object-cover md:border-r-2 md:border-b-0" />
          <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
            {address ? (
              <>
                <p className="m-0 text-xs font-bold tracking-[0.3em] text-volt uppercase">
                  Default address
                </p>
                <address className="not-italic">
                  {address.formatted.map((line) => (
                    <p key={line} className="m-0 text-lg leading-snug">
                      {line}
                    </p>
                  ))}
                </address>
              </>
            ) : (
              <>
                <p className="m-0 font-display text-4xl leading-none uppercase">No address yet</p>
                <p className="m-0 text-mute">Add one now and checkout gets a lot faster.</p>
                <Link
                  to="/account/addresses"
                  prefetch="intent"
                  className="btn-volt inline-flex w-fit items-center gap-2 shadow-brutal"
                >
                  Add address <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section data-acc-rise className="mt-16">
        <TrustRow />
      </section>
    </div>
  );
}
