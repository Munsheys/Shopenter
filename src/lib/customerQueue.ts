import { Customer } from '@/models';

// --- Customer Write Queue (BulkWrite debounce pattern) ---
// Collapses concurrent webhook hits into single DB round trips

interface CustomerUpdate {
  userId: string;
  data: {
    displayName?: string;
    pictureUrl?: string;
    lastSeen?: Date;
    profileCachedAt?: Date;
  };
}

let queue: CustomerUpdate[] = [];
let flushTimer: NodeJS.Timeout | null = null;

export function enqueueCustomerUpdate(update: CustomerUpdate) {
  // Merge any existing queued update for the same userId
  const existing = queue.find(q => q.userId === update.userId);
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
    await Customer.bulkWrite(
      batch.map(u => ({
        updateOne: {
          filter: { userId: u.userId },
          update: { $set: u.data },
          upsert: true
        }
      })),
      { ordered: false } // Allow parallel writes; don't stop on first error
    );
  } catch (err) {
    console.error('[CustomerQueue] BulkWrite failed:', err);
  }
}
