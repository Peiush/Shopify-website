/** Session key holding the name typed on /account/signup until the buyer returns from login. */
export const PENDING_PROFILE_KEY = 'pendingProfile';

export type PendingProfile = {firstName: string; lastName: string};
