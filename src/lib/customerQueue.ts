import { CustomerRepo } from '@/lib/repos/customer';

// --- Customer Write Queue (debounce pattern) ---
// Collapses concurrent webhook hits into fewer DB round trips.
//
// The original Mongo bulkWrite filtered by `{userId}` alone, omitting merchantId — a latent
// cross-tenant bug where two merchants both having a customer record for the same LINE
// userId (a real person who messaged two different shop OAs) could clobber each other's
// data, since the filter didn't scope to one merchant's Customer doc. DynamoDB's composite
// key (merchantId, userId) makes that impossible by construction — merchantId is now
// required to address a write at all.

interface CustomerUpdate {
  merchantId: string;
  userId: string;
  data: {
    displayName?: string;
    pictureUrl?: string;
    lastSeen?: string;
    profileCachedAt?: string;
  };
}

let queue: CustomerUpdate[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function queueKey(u: Pick<CustomerUpdate, 'merchantId' | 'userId'>) {
  return `${u.merchantId}#${u.userId}`;
}

export function enqueueCustomerUpdate(update: CustomerUpdate) {
  // Merge any existing queued update for the same merchant+user
  const existing = queue.find(q => queueKey(q) === queueKey(update));
  if (existing) {
    existing.data = { ...existing.data, ...update.data };
  } else {
    queue.push(update);
  }

  // Schedule a flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(flushQueue, 50); // 50ms debounce window
  }
}

async function flushQueue() {
  flushTimer = null;
  if (queue.length === 0) return;

  const batch = queue.splice(0, 100);

  try {
    await Promise.all(
      batch.map((u) => CustomerRepo.upsert(u.merchantId, u.userId, u.data))
    );
  } catch (err) {
    console.error('[CustomerQueue] Flush failed:', err);
  }
}
