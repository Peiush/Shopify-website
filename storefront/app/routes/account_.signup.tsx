import {useRef} from 'react';
import {data, Form, redirect, useActionData, useNavigation} from 'react-router';
import type {Route} from './+types/account_.signup';
import {PageHero} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';
import {PENDING_PROFILE_KEY, type PendingProfile} from '~/lib/signup';

export const meta: Route.MetaFunction = () => [{title: 'Join the vault | HYPEFORGE'}];

export async function loader({context}: Route.LoaderArgs) {
  if (await context.customerAccount.isLoggedIn()) {
    return redirect('/account');
  }
  return {};
}

type ActionError = {
  error: string;
  fields: {firstName: string; lastName: string; email: string};
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shopify's customer accounts have no signup mutation: an account is created
 * the first time an email is verified on Shopify's hosted login. So we collect
 * the details here, park the name in the session, and hand off to that login
 * with the email pre-filled. `account.tsx` saves the name once the buyer is back.
 */
export async function action({request, context}: Route.ActionArgs) {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? '').trim();
  const fields = {
    firstName: field('firstName'),
    lastName: field('lastName'),
    email: field('email').toLowerCase(),
  };

  if (fields.firstName.length < 2 || fields.lastName.length < 2) {
    return data<ActionError>(
      {error: 'Please enter your first and last name.', fields},
      {status: 400},
    );
  }
  if (!EMAIL_PATTERN.test(fields.email)) {
    return data<ActionError>(
      {error: 'Please enter a valid email address.', fields},
      {status: 400},
    );
  }

  const profile: PendingProfile = {
    firstName: fields.firstName,
    lastName: fields.lastName,
  };
  context.session.set(PENDING_PROFILE_KEY, profile);

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    loginHint: fields.email,
    loginHintMode: 'submit',
  });
}

export default function Signup() {
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);
  const actionData = useActionData<ActionError>();
  const {state} = useNavigation();
  const busy = state !== 'idle';
  const values = actionData?.fields;

  return (
    <div ref={root}>
      <PageHero
        title="Join the vault"
        eyebrow="Create an account"
        backdrop="JOIN"
        description="Early drops, order tracking and faster checkout. We'll email you a one-time code, so there's no password to remember."
        crumbs={[{label: 'Home', to: '/'}, {label: 'Sign up'}]}
      />

      <section className="mx-auto max-w-xl pb-16">
        <Form method="POST" className="grid gap-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              autoComplete="given-name"
              defaultValue={values?.firstName}
            />
            <Field
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              defaultValue={values?.lastName}
            />
          </div>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values?.email}
          />

          {actionData?.error && (
            <p role="alert" className="border-2 border-heat px-4 py-3 text-sm font-bold text-heat">
              {actionData.error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="px-6 py-4 text-sm font-bold tracking-[0.2em] uppercase disabled:opacity-60"
          >
            {busy ? 'Sending you to verify…' : 'Create account'}
          </button>

          <p className="text-sm text-mute">
            Already a member?{' '}
            <a href="/account/login" className="font-bold text-bone underline">
              Sign in
            </a>
          </p>
        </Form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold tracking-[0.18em] uppercase">
      {label}
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className="border-2 border-ink-3 px-4 py-3 text-base font-normal tracking-normal normal-case"
      />
    </label>
  );
}
