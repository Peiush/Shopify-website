import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {
  AddressFragment,
  CustomerFragment,
} from 'customer-accountapi.generated';
import {useRef} from 'react';
import {useAccountMotion} from '~/components/AccountKit';
import {EmptyState} from '~/components/PageKit';
import {ArrowRightIcon, CheckIcon, PinIcon} from '~/components/Icons';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  type Fetcher,
} from 'react-router';
import type {Route} from './+types/account.addresses';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Addresses'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;
  const root = useRef<HTMLDivElement>(null);
  useAccountMotion(root);

  return (
    <div ref={root} className="account-addresses pb-8">
      <div data-acc-in className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.3em] text-volt uppercase">Delivery</p>
          <h2 className="m-0 text-5xl leading-none md:text-6xl">Address book</h2>
        </div>
        <span className="border-2 border-edge bg-heat px-3 py-1.5 text-xs font-bold tracking-[0.2em] text-bone uppercase">
          {addresses.nodes.length} saved
        </span>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr]">
        <section aria-label="Saved addresses" className="grid gap-6">
          {addresses.nodes.length ? (
            addresses.nodes.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                defaultAddress={defaultAddress}
              />
            ))
          ) : (
            <div data-acc-in className="border-2 border-dashed border-ink-3 bg-ink-2">
              <EmptyState
                compact
                sticker="HOME"
                title="No addresses yet"
                message="Save where your drops should land and checkout gets a lot faster."
                primary={{label: 'Shop the drop', to: '/collections/all'}}
              />
            </div>
          )}
        </section>

        <section
          aria-labelledby="new-address-title"
          data-acc-in
          className="border-2 border-edge bg-ink-2 shadow-brutal lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]"
        >
          <div className="flex items-center gap-4 border-b-2 border-edge bg-bone p-5 text-ink">
            <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-edge bg-heat text-bone">
              <PinIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="m-0 text-xs font-bold tracking-[0.3em] text-heat uppercase">
                New destination
              </p>
              <h3 id="new-address-title" className="m-0 font-display text-3xl leading-none uppercase">
                Add an address
              </h3>
            </div>
          </div>
          <div className="p-5 md:p-6">
            <NewAddressForm key={addresses.nodes.length} />
          </div>
        </section>
      </div>
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  } as CustomerAddressInput;

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <button
          disabled={stateForMethod('POST') !== 'idle'}
          formMethod="POST"
          type="submit"
          className="w-full sm:w-fit"
        >
          {stateForMethod('POST') !== 'idle' ? 'Creating…' : 'Create address'}
        </button>
      )}
    </AddressForm>
  );
}

/** One saved address, styled like a shipping label, with an expandable editor. */
function AddressCard({
  address,
  defaultAddress,
}: {
  address: AddressFragment;
  defaultAddress: CustomerFragment['defaultAddress'];
}) {
  const action = useActionData<ActionResponse>();
  const hasError = !!action?.error?.[address.id];
  const isDefault = defaultAddress?.id === address.id;
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');

  return (
    <article
      data-acc-rise
      className="relative border-2 border-edge bg-ink-2 shadow-brutal transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="airmail" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-ink-3 px-5 py-3">
        <p className="m-0 flex items-center gap-2 text-xs font-bold tracking-[0.3em] text-mute uppercase">
          <PinIcon className="h-4 w-4 text-volt" /> Ship to
        </p>
        {isDefault && (
          <span className="flex rotate-2 items-center gap-1.5 border-2 border-edge bg-heat px-2.5 py-1 text-xs font-bold tracking-[0.18em] text-bone uppercase">
            <CheckIcon className="h-3.5 w-3.5" /> Default
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        <p className="m-0 font-display text-3xl leading-none uppercase">{name || 'Unnamed'}</p>
        <address className="mt-3 text-body not-italic">
          {address.formatted.map((line) => (
            <p key={line} className="m-0 leading-snug">
              {line}
            </p>
          ))}
        </address>
        {address.phoneNumber && (
          <p className="mt-3 mb-0 text-sm font-bold tracking-[0.1em] text-mute tabular-nums">
            {address.phoneNumber}
          </p>
        )}
      </div>

      <details open={hasError} className="group border-t-2 border-edge">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-xs font-bold tracking-[0.18em] uppercase transition-colors duration-200 hover:bg-ink [&::-webkit-details-marker]:hidden">
          <span>Edit or delete</span>
          <ArrowRightIcon className="h-4 w-4 rotate-90 transition-transform duration-200 group-open:-rotate-90" />
        </summary>
        <div className="border-t-2 border-dashed border-ink-3 p-5">
          <AddressForm
            addressId={address.id}
            address={address}
            defaultAddress={defaultAddress}
          >
            {({stateForMethod}) => (
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={stateForMethod('PUT') !== 'idle'}
                  formMethod="PUT"
                  type="submit"
                >
                  {stateForMethod('PUT') !== 'idle' ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  disabled={stateForMethod('DELETE') !== 'idle'}
                  formMethod="DELETE"
                  type="submit"
                  className="border-2! border-volt! bg-transparent! text-volt! hover:bg-volt! hover:text-on-volt!"
                >
                  {stateForMethod('DELETE') !== 'idle' ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
          </AddressForm>
        </div>
      </details>
    </article>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wide?: boolean;
};

function Field({label, wide, id, ...input}: FieldProps) {
  return (
    <label
      htmlFor={id}
      className={`grid gap-1.5 text-xs font-bold tracking-[0.16em] uppercase ${wide ? 'sm:col-span-2' : ''}`}
    >
      <span>
        {label}
        {input.required && <span className="text-volt"> *</span>}
      </span>
      <input
        id={id}
        {...input}
        className="w-full border-2 border-ink-3 px-3.5 py-3 text-base font-normal tracking-normal normal-case transition-colors duration-200 placeholder:text-mute/70 focus:border-volt"
      />
    </label>
  );
}

export function AddressForm({
  addressId,
  address,
  defaultAddress,
  children,
}: {
  addressId: AddressFragment['id'];
  address: CustomerAddressInput;
  defaultAddress: CustomerFragment['defaultAddress'];
  children: (props: {
    stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
  }) => React.ReactNode;
}) {
  const {state, formMethod} = useNavigation();
  const action = useActionData<ActionResponse>();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  // Unique ids per form: several address forms share one page.
  const fid = (name: string) => `${addressId}-${name}`;

  return (
    <Form id={addressId} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="addressId" defaultValue={addressId} />
      <Field
        label="First name"
        id={fid('firstName')}
        name="firstName"
        autoComplete="given-name"
        defaultValue={address?.firstName ?? ''}
        placeholder="First name"
        required
        type="text"
      />
      <Field
        label="Last name"
        id={fid('lastName')}
        name="lastName"
        autoComplete="family-name"
        defaultValue={address?.lastName ?? ''}
        placeholder="Last name"
        required
        type="text"
      />
      <Field
        wide
        label="Company"
        id={fid('company')}
        name="company"
        autoComplete="organization"
        defaultValue={address?.company ?? ''}
        placeholder="Company (optional)"
        type="text"
      />
      <Field
        wide
        label="Address line 1"
        id={fid('address1')}
        name="address1"
        autoComplete="address-line1"
        defaultValue={address?.address1 ?? ''}
        placeholder="Street and number"
        required
        type="text"
      />
      <Field
        wide
        label="Address line 2"
        id={fid('address2')}
        name="address2"
        autoComplete="address-line2"
        defaultValue={address?.address2 ?? ''}
        placeholder="Apartment, suite, etc."
        type="text"
      />
      <Field
        label="City"
        id={fid('city')}
        name="city"
        autoComplete="address-level2"
        defaultValue={address?.city ?? ''}
        placeholder="City"
        required
        type="text"
      />
      <Field
        label="State / Province"
        id={fid('zoneCode')}
        name="zoneCode"
        autoComplete="address-level1"
        defaultValue={address?.zoneCode ?? ''}
        placeholder="State / Province"
        required
        type="text"
      />
      <Field
        label="Zip / Postal code"
        id={fid('zip')}
        name="zip"
        autoComplete="postal-code"
        defaultValue={address?.zip ?? ''}
        placeholder="Zip / Postal code"
        required
        type="text"
      />
      <Field
        label="Country code"
        id={fid('territoryCode')}
        name="territoryCode"
        autoComplete="country"
        defaultValue={address?.territoryCode ?? ''}
        placeholder="US"
        required
        type="text"
        maxLength={2}
      />
      <Field
        wide
        label="Phone"
        id={fid('phoneNumber')}
        name="phoneNumber"
        autoComplete="tel"
        defaultValue={address?.phoneNumber ?? ''}
        placeholder="+16135551111"
        pattern="^\+?[1-9]\d{3,14}$"
        type="tel"
      />

      <label
        htmlFor={fid('defaultAddress')}
        className="flex cursor-pointer items-center gap-3 border-2 border-ink-3 px-4 py-3 text-sm font-bold sm:col-span-2"
      >
        <input
          defaultChecked={isDefaultAddress}
          id={fid('defaultAddress')}
          name="defaultAddress"
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-volt)]"
        />
        Set as my default address
      </label>

      {error && (
        <p
          role="alert"
          className="m-0 border-2 border-volt px-4 py-3 text-sm font-bold text-volt sm:col-span-2"
        >
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        {children({
          stateForMethod: (method) => (formMethod === method ? state : 'idle'),
        })}
      </div>
    </Form>
  );
}
