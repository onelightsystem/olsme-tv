import {doc, getDoc} from 'firebase/firestore';
import {User} from 'firebase/auth';
import {db} from '@lib/firebase/config';

export type SubscriptionTier = 'tier1' | 'tier2' | null;

export type SubscriptionStatus = {
  isActive: boolean;
  tier: SubscriptionTier;
  status: string | null;
  liveId: string | null;
};

function deriveTierFromClaims(claims: Record<string, unknown>): SubscriptionTier {
  if (claims.subscriptionTier === 'tier1' || claims.subscriptionTier === 'tier2') {
    return claims.subscriptionTier as SubscriptionTier;
  }
  if (claims.isPremium === true) return 'tier2';
  return null;
}

/**
 * Returns the subscription status for the given Firebase user.
 *
 * Uses ID token custom claims as the authoritative source — these are
 * server-set by Cloud Functions and cannot be modified by the client.
 */
export async function getUserSubscriptionStatus(user: User): Promise<SubscriptionStatus> {
  const {claims} = await user.getIdTokenResult();

  const isActive =
    claims.isPremium === true ||
    claims.subscriptionTier === 'tier1' ||
    claims.subscriptionTier === 'tier2';

  const tier = deriveTierFromClaims(claims as Record<string, unknown>);
  const status = isActive ? 'active' : null;

  // liveId is a profile field (not a subscription gate) — still read from Firestore.
  let liveId: string | null = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const data = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : null;
    liveId =
      data && typeof data.decentralizedId === 'string'
        ? data.decentralizedId
        : data && typeof data.uid === 'string'
          ? data.uid
          : null;
  } catch {
    // Non-critical: liveId is a display field; subscription gating relies on claims above.
  }

  return {isActive, tier, status, liveId};
}
