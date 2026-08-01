# DynamoDB Schema Design

**Approach:** One table per collection (23 tables), not single-table design.
Trades a small amount of RCU/WCU efficiency for something far more valuable
here: each table maps almost 1:1 to the existing Mongoose model, so the
migration is mechanical and reviewable instead of a from-scratch redesign.
On-demand billing mode throughout (pay-per-request, no capacity planning).

**Naming convention:** `Shopenter_<ModelName>` (env-prefixed in practice —
see `src/lib/dynamodb.ts`).

**ID strategy:** Replace Mongo ObjectIds with ULIDs (`ulid` package) as the
primary id — they're lexicographically sortable by creation time, so using
one as a Sort Key gives chronological ordering for free, the same property
several routes currently get from `.sort({ createdAt: -1 })`.

---

## Tables

### 1. Merchants
```
PK: id (ULID)
GSI1 "email-index":         PK email
GSI2 "slug-index":          PK slug (sparse — only items with a slug)
GSI3 "lineUserId-index":    PK lineUserId (sparse)
GSI4 "referralCode-index":  PK referralCode (sparse)
GSI5 "referredBy-index":    PK referredByMerchantId, SK id (sparse)
```
`deletionScheduledFor` and `lastLoginAt` cron sweeps (inactivity-check,
purge-deleted-accounts) use a table Scan with a FilterExpression instead of
a dedicated GSI — these run once daily and merchant counts are small enough
(thousands, not millions) that a scan is simpler and cheaper than
maintaining two more sparse indexes. Revisit if merchant count exceeds ~50k.

### 2. Settings
```
PK: merchantId (1:1 with Merchant — no SK needed)
```
Encryption-at-rest hooks (`maybeEncrypt`/`maybeDecrypt` on
lineChannelAccessToken, lineChannelSecret, slipokApiKey, telegram.botToken,
instagram.pageAccessToken) move from Mongoose pre/post hooks into explicit
encrypt-before-put / decrypt-after-get calls in the repo layer.

### 3. Products
```
PK: merchantId
SK: id (ULID)
```
List-by-merchant is a single Query on PK — pagination via `ExclusiveStartKey`
instead of Mongoose `.skip()/.limit()`.

### 4. Customers
```
PK: merchantId
SK: userId
GSI1 "lastSeen-index": PK merchantId, SK lastSeen   (customer list, sorted)
```
The Mongoose unique index on (merchantId, userId) is enforced for free —
that pair *is* the primary key.

### 5. CustomerProfiles
```
PK: merchantId
SK: id (ULID)
GSI1 "phone-index": PK merchantId, SK phone
```
`linkedAccounts[].userId` lookup (find which profile a platform userId
belongs to) can't be a GSI on an array element. Needs a second small lookup
table:

### 5b. CustomerProfileLinks (new — supports linkedAccounts lookup)
```
PK: merchantId#userId  (composite string)
Attributes: profileId
```
Written alongside every CustomerProfile linkedAccounts update.

### 6. Orders
```
PK: merchantId
SK: id (ULID — chronological by construction)
GSI1 "userId-index":      PK userId, SK id
GSI2 "orderToken-index":  PK orderToken (sparse — public order-status page)
```
Status filtering (`status: 'pending'`) is a Query on PK + FilterExpression,
not a separate index — order counts per merchant are small enough that
filtering post-query is cheap. Revisit only if a single merchant's order
volume gets very large.

### 7. Messages
```
PK: merchantId#userId  (composite string)
SK: id (ULID)
```
Matches the one real query pattern exactly
(`Message.find({merchantId, userId}).sort({createdAt: 1})`).

### 8. ProcessedEvents (webhook idempotency)
```
PK: webhookEventId
TTL: expiresAt (24h from creation)
```

### 9. Campaigns
```
PK: merchantId
SK: id (ULID)
```
Status filter via FilterExpression (small per-merchant counts).

### 10. BroadcastJobs
```
PK: merchantId
SK: id (ULID)
GSI1 "status-index":    PK status, SK createdAt   (worker drains ALL pending, cross-merchant)
GSI2 "campaign-index":  PK campaignId, SK id
```

### 11. AutoReplies
```
PK: merchantId
SK: id (ULID)
```
`isActive`/`priority` filter/sort done app-side after the Query (per-merchant
counts are small — tens of rules, not thousands).

### 12. MediaFiles
```
PK: id (ULID — used directly in the public /api/media/[id] URL)
GSI1 "merchant-index": PK merchantId, SK id   (admin R2-usage estimate)
```
No TTL — matches current behavior (permanent content).

### 13. Feedback
```
PK: merchantId
SK: id (ULID)
```

### 14. Coupons
```
PK: merchantId
SK: code
```
Mongoose's unique (merchantId, code) index is the primary key itself.

### 15. LoyaltyTransactions
```
PK: merchantId
SK: id (ULID)
GSI1 "customer-index": PK merchantId#userId, SK id
```

### 15b. LoyaltyEarnLocks (new — replaces the partial unique index)
```
PK: orderId
```
DynamoDB has no equivalent of Mongo's partial unique index
(`{orderId, type:'earn'}` unique only when type is 'earn'). The idempotency
guarantee — "at most one earn per order, across manual PATCH / mark-paid /
batch mark-paid / slip verification racing each other" — is reimplemented as
a conditional write: `PutItem` with
`ConditionExpression: attribute_not_exists(orderId)` against this lock
table, done *before* writing the LoyaltyTransaction. A `ConditionalCheckFailedException`
means points were already awarded; the caller skips crediting. This is the
one place in the whole migration where correctness depends on getting the
conditional-write pattern right — flagged for extra test coverage.

### 16. ProcessedSlips
```
PK: merchantId
SK: transRef
TTL: expiresAt (90 days from creation)
```
Unique (merchantId, transRef) is the primary key itself.

### 17. Fulfilments
```
PK: orderId
SK: id (ULID)
GSI1 "merchant-index": PK merchantId, SK createdAt
```

### 18. AffiliateCommissions
```
PK: referrerMerchantId
SK: id (ULID)
GSI1 "referred-index": PK referredMerchantId, SK id
```
Status filter via FilterExpression.

### 19. FailedLoginAttempts
```
PK: email
SK: timestamp (ULID or ISO string + random suffix for uniqueness)
GSI1 "merchant-index": PK merchantId, SK timestamp (sparse)
TTL: expiresAt (24h)
```

### 20. AuditLogs
```
PK: merchantId
SK: timestamp#id  (composite — timestamp alone isn't unique enough)
GSI1 "action-index": PK action, SK timestamp
TTL: retentionExpiresAt (7 years from creation)
```

### 21. BillingReceipts
```
PK: merchantId
SK: id (ULID)
GSI1 "charge-index": PK omiseChargeId   (unique — idempotency on charge processing)
```

### 22. AdminUsers
```
PK: email   (login is the only real lookup pattern — email as PK directly,
             no separate id/GSI needed)
```

### 23. AbuseReports
```
PK: reportedMerchantId
SK: id (ULID)
GSI1 "status-index": PK status, SK createdAt
```
Severity filter via FilterExpression on the status-index query (admin
dashboard volume is low — this is not a hot path).

### 24. ViolationHistories
```
PK: merchantId   (1:1, unique — matches Mongoose unique index)
GSI1 "level-index": PK currentLevel, SK suspensionExpiresAt (sparse — cron
                     that auto-expires suspensions)
```

---

## Cross-cutting notes

**IDs:** All new documents get a ULID (`import { ulid } from 'ulid'`)
instead of a Mongo ObjectId. Existing code that does `order._id.toString()`
becomes `order.id` — every route touching `_id` needs updating for this
rename, not just the query layer.

**Pagination:** Mongoose `.skip(n).limit(m)` becomes DynamoDB's
`ExclusiveStartKey` cursor pattern. The `paginate()` helper in
`src/lib/pagination.ts` (added for the earlier MongoDB optimization pass)
gets replaced with a DynamoDB-flavored equivalent that returns an opaque
`nextCursor` token instead of a page number — DynamoDB doesn't support
"give me page 4" the way skip/limit does, only "give me the next page after
this cursor." This is a small API-shape change for any frontend code already
built against `{ data, pagination: { page, hasNext } }`.

**Transactions:** DynamoDB supports `TransactWriteItems` (up to 100 items,
was 25 in older versions) for the handful of places that touch two tables
atomically (e.g. crediting loyalty points + writing the earn-lock). Used
sparingly — most of the codebase doesn't need cross-table atomicity.

**Aggregations:** The one real aggregation in the codebase
(`Fulfilment.aggregate([...])` in `src/app/api/orders/route.ts`, grouping
fulfilment counts by orderId) becomes an application-side reduce over a
Query result — DynamoDB has no aggregation pipeline. Fine at current data
volumes; would need a different approach (DynamoDB Streams + a
maintained counter item) if fulfilment volume per merchant got very large.

**Encryption:** Moves from Mongoose schema hooks to explicit calls in the
Settings repo (`src/lib/repos/settings.ts`) — same `maybeEncrypt`/
`maybeDecrypt` functions from `src/lib/encryption.ts`, just called directly
instead of via `pre('save')`/`post('find')` middleware.

---

## Migration order (matches TaskList)

1. Merchant, Settings — highest traffic, and resolves the known
   `settings/route.ts` conflict with the LIFF auto-provisioning work already
   on `main`.
2. Product, Order — next highest traffic, exercises pagination + the
   Fulfilment aggregation rewrite.
3. Everything else, roughly in the order listed above.
