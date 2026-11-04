import {useRef} from 'react';
import {data as remixData, Outlet, useLoaderData} from 'react-router';
import type {Route} from './+types/account';
import {CUSTOMER_DETAILS_QUERY} from '~/graphql/customer-account/CustomerDetailsQuery';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {PENDING_PROFILE_KEY, type PendingProfile} from '~/lib/signup';
import {AccountHero} from '~/components/AccountHero';
import {memberNumber} from '~/lib/account';
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

  return (
    <div className="account" ref={root}>
      <AccountHero
        firstName={customer.firstName}
        memberNo={memberNumber(customer.id)}
        addressCount={customer.addresses.nodes.length}
      />
      <Outlet context={{customer}} />
    </div>
  );
}
