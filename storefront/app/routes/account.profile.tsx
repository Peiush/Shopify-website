import type {CustomerFragment} from 'customer-accountapi.generated';
import type {CustomerUpdateInput} from '@shopify/hydrogen/customer-account-api-types';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {useRef} from 'react';
import {useAccountMotion} from '~/components/AccountKit';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import type {Route} from './+types/account.profile';

export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Profile'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  if (request.method !== 'PUT') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const form = await request.formData();

  try {
    const customer: CustomerUpdateInput = {};
    const validInputKeys = ['firstName', 'lastName'] as const;
    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        customer[key as (typeof validInputKeys)[number]] = value;
      }
    }

    // update customer and possibly password
    const {data, errors} = await customerAccount.mutate(
      CUSTOMER_UPDATE_MUTATION,
      {
        variables: {
          customer,
          language: customerAccount.i18n.language,
        },
      },
    );

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    if (!data?.customerUpdate?.customer) {
      throw new Error('Customer profile update failed.');
    }

    return {
      error: null,
      customer: data?.customerUpdate?.customer,
    };
  } catch (error: any) {
    return data(
      {error: error.message, customer: null},
      {
        status: 400,
      },
    );
  }
}

export default function AccountProfile() {
  const account = useOutletContext<{customer: CustomerFragment}>();
  const {state} = useNavigation();
  const action = useActionData<ActionResponse>();
  const customer = action?.customer ?? account?.customer;
  const root = useRef<HTMLDivElement>(null);
  useAccountMotion(root);
  const busy = state !== 'idle';
  const initials =
    [customer.firstName, customer.lastName]
      .filter(Boolean)
      .map((part) => part![0])
      .join('')
      .toUpperCase() || '?';

  return (
    <div ref={root} className="account-profile mx-auto max-w-2xl pb-8">
      <div
        data-acc-in
        className="border-2 border-edge bg-ink-2 shadow-brutal"
      >
        <div className="flex items-center gap-5 border-b-2 border-edge bg-bone p-6 text-ink">
          <span
            aria-hidden="true"
            className="grid h-16 w-16 shrink-0 place-items-center border-2 border-edge bg-heat font-display text-3xl text-bone"
          >
            {initials}
          </span>
          <div>
            <p className="m-0 text-xs font-bold tracking-[0.3em] text-heat uppercase">
              Personal information
            </p>
            <h2 className="m-0 font-display text-4xl leading-none uppercase">My profile</h2>
          </div>
        </div>

        <Form method="PUT" className="grid gap-5 p-6 md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <ProfileField
              label="First name"
              name="firstName"
              autoComplete="given-name"
              defaultValue={customer.firstName ?? ''}
            />
            <ProfileField
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              defaultValue={customer.lastName ?? ''}
            />
          </div>

          {action?.error && (
            <p role="alert" className="m-0 border-2 border-volt px-4 py-3 text-sm font-bold text-volt">
              {action.error}
            </p>
          )}
          {action?.customer && !action.error && (
            <p
              role="status"
              className="m-0 border-2 border-emerald-700 px-4 py-3 text-sm font-bold text-emerald-700"
            >
              Saved. Your profile is up to date.
            </p>
          )}

          <button type="submit" disabled={busy} className="w-full sm:w-fit">
            {busy ? 'Updating…' : 'Save changes'}
          </button>
        </Form>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  name,
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  autoComplete: string;
  defaultValue: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold tracking-[0.18em] uppercase">
      {label}
      <input
        name={name}
        type="text"
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        minLength={2}
        className="border-2 border-ink-3 px-4 py-3 text-base font-normal tracking-normal normal-case transition-colors duration-200 focus:border-volt"
      />
    </label>
  );
}
