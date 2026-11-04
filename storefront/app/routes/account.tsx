import {useRef} from 'react';
import {
  data as remixData,
  Form,
  NavLink,
  Outlet,
  useLoaderData,
} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {PENDING_PROFILE_KEY, type PendingProfile} from '~/lib/signup';
import {PageHero} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';

export function shouldRevalidate() {
  return true;
}

export async function loader({context}: Route.LoaderArgs) {
  const {customerAccount, session} = context;
  const {data, errors} = await customerAccount.query(CUSTOMER_DETAILS_QUERY, {
    variables: {
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !data?.customer) {
    throw new Error('Customer not found');
  }

  let customer = data.customer;

  // Brand-new member coming back from /account/signup: save the name they typed.
  const pending = session.get(PENDING_PROFILE_KEY) as PendingProfile | undefined;
  if (pending) {
    session.unset(PENDING_PROFILE_KEY);
    if (!customer.firstName && !customer.lastName) {
      const update = await customerAccount.mutate(CUSTOMER_UPDATE_MUTATION, {
        variables: {
          customer: {firstName: pending.firstName, lastName: pending.lastName},
          language: customerAccount.i18n.language,
        },
      });
      const saved = update.data?.customerUpdate?.customer;
      if (saved) {
        customer = {
          ...customer,
          firstName: saved.firstName,
          lastName: saved.lastName,
        };
      }
    }
  }

  return remixData(
    {customer},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export default function AccountLayout() {
  const {customer} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);

  const heading = customer
    ? customer.firstName
      ? `Welcome, ${customer.firstName}`
      : `Welcome back`
    : 'Your account';

  return (
    <div className="account" ref={root}>
      <PageHero
        title={heading}
        eyebrow="Member of the vault"
        backdrop="VAULT"
        crumbs={[{label: 'Home', to: '/'}, {label: 'Account'}]}
      >
        <div data-hero-fade className="mt-10">
          <AccountMenu />
        </div>
      </PageHero>
      <Outlet context={{customer}} />
    </div>
  );
}

function AccountMenu() {
  const tab = ({isActive}: {isActive: boolean}) =>
    `border-2 px-4 py-2.5 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-200 ${
      isActive ? 'border-volt bg-volt text-on-volt' : 'border-ink-3 hover:border-bone'
    }`;

  return (
    <nav role="navigation" aria-label="Account" className="flex flex-wrap items-center gap-2">
      <NavLink to="/account/orders" className={tab}>
        Orders
      </NavLink>
      <NavLink to="/account/profile" className={tab}>
        Profile
      </NavLink>
      <NavLink to="/account/addresses" className={tab}>
        Addresses
      </NavLink>
      <Logout />
    </nav>
  );
}

function Logout() {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
      &nbsp;<button type="submit">Sign out</button>
    </Form>
  );
}
