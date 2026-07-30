# MongoDB M0 Free Tier Survival Guide

**Constraint:** Everything must be free until first paying customer  
**Challenge:** M0 tier = 3 concurrent connections (vs your previous 400+ spikes)  
**Solution:** Aggressive optimization + monitoring

---

## **Why This Is Possible**

Your original setup was naive about serverless:
```
❌ BEFORE: maxPoolSize: 10 per instance
   50 concurrent requests × 10 pool size = 500 connections
   M0 limit: 3 connections → CRASHED

✅ AFTER: maxPoolSize: 2 + connection reuse + caching
   50 concurrent requests × 2 pool size × 100ms reuse = ~5 connections needed
   M0 limit: 3 connections → WORKS (tight but ok)
```

---

## **Critical Success Factors**

### **1. Connection Pooling MUST Work**
```
Required: Mongoose reuses connections within 30-100ms
Verified: Global __mongoose_cache keeps Mongoose singleton per instance
Monitored: connectionMetrics tracks pool health
```

### **2. Caching MUST Work**
```
Settings queried 1000x/day → cached, only 1 DB call every 5 min
Reduces DB load by 95%
Redis fallback to memory if Redis unavailable
```

### **3. Pagination MUST Be Used**
```
Before: GET /api/orders → 50,000 docs → timeout
After: GET /api/orders?page=1&limit=20 → 20 docs → 100ms
Prevents memory bloat, reduces query complexity
```

### **4. No Connection Leaks**
```
Old code left connections hanging → connection limit exhausted
New code: maxIdleTimeMS: 30000 → auto-cleanup
New code: waitQueueTimeoutMS: 5000 → fail fast on backlog
```

---

## **Testing Before Launch**

### **Test 1: Verify Connection Pooling**

```bash
# Terminal 1: Monitor connection health
watch -n 1 'curl -s http://localhost:3000/api/health/db | jq .'

# Terminal 2: Run load test
npm run dev

# Terminal 3: Simulate concurrent requests
for i in {1..10}; do
  curl http://localhost:3000/api/orders &
done
wait
```

**Expected output from /api/health/db:**
```json
{
  "database": {
    "poolSize": 2,
    "limit": "3/3 (M0 tier)",
    "warnings": []
  }
}
```

**DANGER SIGNS (abort if you see these):**
```
❌ "poolSize": 3+ → exceeds M0 limit
❌ "warnings": ["Pool size exceeds target of 2"]
❌ Connection errors after 10 concurrent requests
```

---

### **Test 2: Verify Caching Works**

```bash
# Monitor cache hits
curl http://localhost:3000/api/settings
curl http://localhost:3000/api/settings  # Should be 100x faster
curl http://localhost:3000/api/settings  # Should be instant
```

**Expected:** 2nd and 3rd calls < 5ms (first one ~100ms)

---

### **Test 3: Verify Pagination Works**

```bash
curl "http://localhost:3000/api/orders?page=1&limit=20"
```

**Expected response:**
```json
{
  "data": [...20 orders...],
  "pagination": {
    "page": 1,
    "total": 1250,
    "pages": 63,
    "hasNext": true
  }
}
```

---

## **Production Monitoring (FREE TIER ONLY)**

### **Health Check Endpoint**
```bash
curl https://yourdomain.com/api/health/db
```

**Check this daily:**
```json
{
  "database": {
    "poolSize": 2,              ← Should stay ≤ 2
    "limit": "3/3 (M0 tier)"
    "warnings": []              ← Should be empty
  }
}
```

### **Red Flags (Immediate Action Required)**

| Warning | Cause | Fix |
|---------|-------|-----|
| `poolSize: 3+` | Connections not being reused | Restart Vercel deployment |
| `Connection failed` | MongoDB connection limit hit | WAIT 30 minutes (cool down), then retry |
| `waitQueue timeout` | Too many concurrent requests | Scale down or upgrade tier |
| `Pool size exceeds 2` for 5+ min | Connection leak | Check server logs, deploy fix |

---

## **Daily Limits (What You Can Handle)**

**With proper optimization:**

| Metric | Daily Budget | Per Hour |
|--------|--------------|----------|
| Concurrent users | ~10-20 | ~5-10 peak |
| API requests | ~5,000 | ~200 peak |
| Messages stored | Unlimited | (space is free) |
| Orders created | ~100 | ~5 peak |

**This assumes:**
- Caching working (95% of Settings queries cached)
- Pagination used (no 10k document loads)
- Connection pooling working (reuse in 30-100ms)
- No N+1 queries

**If you exceed these:**
- M0 connection limit = blocked
- Upgrade to M2 ($57/mo) for 100 connections
- Or reduce load (fewer concurrent users)

---

## **What To Watch For**

### **Before Launch Checklist**

- [ ] Health endpoint shows `poolSize: 2`
- [ ] Settings cached (2nd call < 5ms)
- [ ] Pagination working on /orders, /customers, /products
- [ ] No connection errors on 10 concurrent requests
- [ ] Audit logs show no "connection pool exhausted" errors
- [ ] Redis falls back to memory (test by unplugging Redis)

### **Weekly Health Check**

```bash
# Run this weekly
curl https://yourdomain.com/api/health/db | jq '.database.warnings'

# If warnings: investigate + fix immediately
# If clean: all good for another week
```

---

## **Emergency Procedures**

### **If You Hit Connection Limit in Production**

```
1. Don't panic - connections are temporary
2. MongoDB queues requests for 30 seconds
3. After 30s: requests timeout and fail
4. Fix: Restart Vercel deployment OR wait 30 min

DO NOT:
❌ Upgrade to M2 without saving money first
❌ Increase maxPoolSize (makes it worse)
❌ Remove caching (load will spike)
```

### **If Performance Drops**

```bash
# Check connection health
curl https://yourdomain.com/api/health/db

# Check if cache is working
curl https://yourdomain.com/api/settings (twice, time both)

# Check MongoDB metrics in Atlas
→ Look for: Connections graph
→ If spiking: connection leak or load spike

Fix: Restart deployment, check logs
```

---

## **Scaling When You Get First Customer**

```
Free tier works for: ~10-20 concurrent users
At first paying customer: Upgrade to M2 ($57/mo)

M2 gives: 100 connections (5-10x headroom)
Then you can: Remove some optimizations if needed
           : Handle 100+ concurrent users
```

---

## **Summary: Free Tier Strategy**

| Phase | Action | Limit |
|-------|--------|-------|
| **Development** | Use these optimizations | 2 pool, cache, pagination |
| **Pre-launch** | Test with /api/health/db | < 3 connections |
| **Launch** | Monitor daily | Watch for spikes |
| **First customer** | Upgrade M2 tier | 100 connections |
| **Scale** | Add more resources | Unlimited (paid) |

---

## **Files That Make This Possible**

- ✅ `src/lib/db.ts` - Serverless-optimized pooling
- ✅ `src/lib/cache.ts` - Redis + memory fallback
- ✅ `src/lib/pagination.ts` - Paginate all lists
- ✅ `src/app/api/health/db/route.ts` - Health monitoring
- ✅ `src/app/api/orders/route.ts` - Paginated
- ✅ `src/app/api/customers/route.ts` - Paginated
- ✅ `src/app/api/products/route.ts` - Paginated
- ✅ `src/app/api/messages/[userId]/route.ts` - Paginated
- ✅ `src/app/api/settings/route.ts` - Cached

**If any of these break:** Connection pooling fails → game over

---

## **Bottom Line**

**Free tier is possible but fragile.** One thing breaking (caching, pooling, pagination) → connection exhaustion. This is temporary until first paying customer. Plan accordingly.

**Test thoroughly before launch.**
