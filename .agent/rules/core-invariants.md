# Core App Invariants (DO NOT REMOVE)

When modifying `src/app/page.tsx`, `src/app/shop/page.tsx`, or any API routes, you **MUST NOT** delete or overwrite the following core functionality unless explicitly instructed by the user:

1. **LIFF Smart Router Identity Auth**
   - The root `page.tsx` contains a `liff.init()` hook inside a `useEffect`. This acts as a "Smart Router" that authenticates the user's LINE ID.
   - If they are the admin (matching `NEXT_PUBLIC_ADMIN_LINE_ID`), they see the Dashboard.
   - If they are a customer, they are instantly redirected to `/shop`.
   - **Never remove this routing logic.**

2. **Foreign Exchange (KRW) Rate Locking**
   - When an order is moved from "Pending" to "Shipped", the current global `krwRate` is calculated and hard-saved to the database as `rateUsed`.
   - The `HistoryItem` component relies on this `order.rateUsed` to accurately calculate profit margins historically, completely independent of future fluctuations in the global shop KRW rate.
   - **Never convert shipped orders to dynamically recalculate profit based on the global state.**

3. **Orphaned Preparing Orders Fallback**
   - In the Parcel Builder, if an order is marked as `preparing` but its visual draft parcel card is missing (due to local state reset), `OrdersView` `refreshData` automatically constructs a draft card for it. 
   - The "Remove from Parcel" button has an orphaned item fallback to forcibly patch the database back to `pending`.
   - **Never simplify or remove the `else` fallback inside the button's `onClick` handler.**

4. **SEO Stealth Switch (Robots.txt)**
   - The `src/app/robots.ts` explicitly returns `Disallow: /` based on the `NEXT_PUBLIC_ALLOW_INDEXING` environment variable.
   - **Never hardcode `noindex` directly into layout meta tags in a way that overrides this dynamic capability.**

*If you are tasked with a heavy refactor, extract these invariants carefully without breaking them.*
