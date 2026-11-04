/**
 * Pure helpers for the account area. Formatting is pinned to en-US / UTC so the
 * server render and the browser always produce identical text (no hydration drift).
 */

/** Cosmetic "vault rank", derived from how many orders the customer has placed. */
export const RANKS = [
  {name: 'Rookie', min: 0},
  {name: 'Regular', min: 2},
  {name: 'Insider', min: 5},
  {name: 'Legend', min: 10},
] as const;

export function getRank(orderCount: number) {
  let index = 0;
  RANKS.forEach((rank, i) => {
    if (orderCount >= rank.min) index = i;
  });
  const current = RANKS[index];
  const next = RANKS[index + 1] as (typeof RANKS)[number] | undefined;
  return {
    index,
    current,
    next,
    progress: next ? (orderCount - current.min) / (next.min - current.min) : 1,
    remaining: next ? next.min - orderCount : 0,
  };
}

export const ORDER_STEPS = ['Placed', 'Paid', 'Packing', 'Shipped'] as const;

type OrderStatusInput = {
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
};

/**
 * Maps Shopify's two status fields onto one 4-step tracker.
 * `step` is the index of the latest reached step, or -1 for refunded/voided orders.
 */
export function getOrderProgress({financialStatus, fulfillmentStatus}: OrderStatusInput) {
  if (financialStatus === 'REFUNDED' || financialStatus === 'VOIDED') {
    return {step: -1, label: financialStatus === 'REFUNDED' ? 'Refunded' : 'Voided', tone: 'mute' as const};
  }
  if (fulfillmentStatus === 'RESTOCKED') {
    return {step: -1, label: 'Returned', tone: 'mute' as const};
  }
  let step = 0;
  if (
    financialStatus === 'PAID' ||
    financialStatus === 'PARTIALLY_PAID' ||
    financialStatus === 'AUTHORIZED' ||
    financialStatus === 'PARTIALLY_REFUNDED'
  ) {
    step = 1;
  }
  if (fulfillmentStatus === 'IN_PROGRESS' || fulfillmentStatus === 'PARTIALLY_FULFILLED') {
    step = 2;
  }
  if (fulfillmentStatus === 'FULFILLED') step = 3;
  return {step, label: ORDER_STEPS[step], tone: step === 3 ? ('good' as const) : ('gold' as const)};
}

export function formatDate(iso: string, style: 'short' | 'month' = 'short') {
  return new Date(iso).toLocaleDateString(
    'en-US',
    style === 'month'
      ? {month: 'short', year: 'numeric', timeZone: 'UTC'}
      : {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'},
  );
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "gid://shopify/Customer/8123456" -> "HF-123456" */
export function memberNumber(id: string) {
  const digits = id.split('/').pop()?.replace(/\D/g, '') ?? '';
  return `HF-${digits.slice(-6).padStart(6, '0')}`;
}

export function displayName(
  customer: {
    firstName?: string | null;
    lastName?: string | null;
    emailAddress?: {emailAddress?: string | null} | null;
  },
) {
  const full = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return full || customer.emailAddress?.emailAddress?.split('@')[0] || 'Member';
}
