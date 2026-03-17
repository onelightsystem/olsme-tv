import {doc, getDoc} from 'firebase/firestore';
import {db} from '@lib/firebase/config';

export type SubscriptionTier = 'tier1' | 'tier2' | null;

export type SubscriptionStatus = {
  isActive: boolean;
  tier: SubscriptionTier;
  status: string | null;
  liveId: string | null;
};

function deriveTier(data: Record<string, unknown>): SubscriptionTier {
  if (data.subscriptionTier === 'tier1' || data.subscriptionTier === 'tier2') {
    return data.subscriptionTier;
  }

  if (data.package === 'premium') return 'tier2';
  if (data.package === 'starter' || data.package === 'basic') return 'tier1';

  return null;
}

export function isSubscriptionActiveFromData(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;

  const status = data.subscriptionStatus ?? data.status;
  if (status === 'active') return true;

  // Legacy fallback for accounts already marked as premium before tier rollout.
  return data.package === 'premium';
}

export async function getUserSubscriptionStatus(uid: string): Promise<SubscriptionStatus> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) {
    return {isActive: false, tier: null, status: null, liveId: null};
  }

  const data = userSnap.data() as Record<string, unknown>;
  return {
    isActive: isSubscriptionActiveFromData(data),
    tier: deriveTier(data),
    status: typeof data.subscriptionStatus === 'string' ? data.subscriptionStatus : (typeof data.status === 'string' ? data.status : null),
    liveId: typeof data.decentralizedId === 'string' ? data.decentralizedId : (typeof data.uid === 'string' ? data.uid : null),
  };
}
