import {useRef} from 'react';
import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/policies._index';
import type {PoliciesQuery, PolicyItemFragment} from 'storefrontapi.generated';
import {PageHero} from '~/components/PageKit';
import {usePageMotion} from '~/components/Motion';
import {ArrowRightIcon} from '~/components/Icons';

export async function loader({context}: Route.LoaderArgs) {
  const data: PoliciesQuery = await context.storefront.query(POLICIES_QUERY);

  const shopPolicies = data.shop;
  const policies: PolicyItemFragment[] = [
    shopPolicies?.privacyPolicy,
    shopPolicies?.shippingPolicy,
    shopPolicies?.termsOfService,
    shopPolicies?.refundPolicy,
    shopPolicies?.subscriptionPolicy,
  ].filter((policy): policy is PolicyItemFragment => policy != null);

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return {policies};
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();
  const root = useRef<HTMLDivElement>(null);
  usePageMotion(root);

  return (
    <div className="policies" ref={root}>
      <PageHero
        title="The fine print"
        backdrop="POLICIES"
        eyebrow="Policies"
        description="Shipping, returns, privacy and terms. Straight talk, no small text tricks."
        crumbs={[{label: 'Home', to: '/'}, {label: 'Policies'}]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((policy, i) => (
          <Link
            key={policy.id}
            to={`/policies/${policy.handle}`}
            data-reveal
            className="group flex min-h-40 flex-col justify-between border-2 border-ink-3 bg-ink-2 p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-volt hover:shadow-brutal-volt"
          >
            <span className="font-display text-2xl text-mute transition-colors duration-300 group-hover:text-volt">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex items-end justify-between gap-4">
              <span className="font-display text-4xl leading-none uppercase">{policy.title}</span>
              <ArrowRightIcon className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
