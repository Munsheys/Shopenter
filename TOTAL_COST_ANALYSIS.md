# Complete Cost Analysis: Shopenter @ All Scales

**All 3rd party services, platforms, and integrations**  
**Scenarios: 5-15 customers | 100+ customers | 1000+ customers**

---

## **Service Inventory**

| Service | Type | Required | Current Status |
|---------|------|----------|-----------------|
| Vercel | Hosting | ✅ Yes | Using Now |
| MongoDB | Database | ✅ Yes | M0 (need upgrade) |
| Cloudflare R2 | Media Storage | ✅ Yes | Configured |
| Redis | Caching | ⚠️ Optional | Recommended |
| Sentry | Error Monitoring | ⚠️ Optional | Configured |
| Omise | Payment Processing | ✅ Yes | Only charge fees |
| LINE | Messaging API | ✅ Yes | Free |
| Telegram | Messaging Bot | ✅ Yes | Free |
| Instagram | Messaging Bot | ✅ Yes | Free |
| SlipOK | Payment Verification | ✅ Yes | May have fee |
| ER-API | Exchange Rates | ✅ Yes | Free |

---

# **SCENARIO 1: 5-15 Customers (Startup Launch)**

**Metrics:**
- 50-200 DAU (daily active users)
- 100-500 orders/month
- 1-10 GB media storage
- 100k messages/month
- Low API calls

---

## **Cost Breakdown: Startup Phase**

### **1. VERCEL (Hosting & Functions)**

```
Tier: Pro ($20/month)
Why: Free tier is too limited for production
- Deployments: Unlimited
- Functions: 1000 calls/month free + pay-per-use
- Bandwidth: 100 GB/month free + $0.50/GB overage
- Build minutes: 6000/month (ample)

Usage at this scale:
- API calls: ~500k/month (free tier covers 1M)
- Bandwidth: ~5-10 GB/month (free tier covers 100 GB)
- Build minutes: ~100/month (free tier covers 6000)

Cost: $20/month (flat, all included)
```

### **2. DATABASE**

**Option A: MongoDB M0 (Current)**
```
Cost: $0
Problem: Connections exhausted at 50+ DAU
Status: Will break, need M2
```

**Option B: MongoDB M2 (If staying MongoDB)**
```
Cost: $57/month
Includes: 10 GB storage, 100 connections, support

Total DB cost: $57/month
```

**Option C: DynamoDB (Recommended)**
```
Free tier: 25M reads + 25M writes + 25 GB storage
Your usage: ~50k reads + 60k writes + 2.45 MB

Cost: $0/month
```

**Option D: Firebase/Firestore**
```
Free tier: 50k reads/day, 1 GB storage
Your usage: Well within free

Cost: $0/month
```

### **3. CLOUDFLARE R2 (Media Storage)**

```
Storage pricing: $0.015/GB stored
Download pricing: $0.015/GB downloaded

Estimated usage:
- Product images: 1,000 products × 3 images × 500KB = 1.5 GB
- Order receipts: 500 orders × 200KB = 100 MB
- Chat media: 100k messages × 10% with media × 500KB = 5 GB
- Admin uploads: 500 MB
Total storage: ~7 GB

Storage cost: 7 GB × $0.015 = $0.11/month
Download cost: ~50 GB/month × $0.015 = $0.75/month

Total R2 cost: $1/month (minimal)
```

### **4. REDIS (Caching - Optional)**

```
Option A: No Redis (Use memory cache fallback)
Cost: $0

Option B: Upstash (Recommended for serverless)
- Free tier: 10k commands/month
- Paid: $7/month for small database
- Usage at this scale: ~10k commands/month (within free)

Cost: $0 (free tier covers it)
```

### **5. SENTRY (Error Monitoring - Optional)**

```
Free tier: 5k events/month
Paid: $29/month for 100k events

Usage at this scale:
- Errors: ~50-100/day = 1500-3000/month

Cost: $0 (free tier covers it)
```

### **6. OMISE (Payment Processing - Fee Only)**

```
Pricing: 3.5% + 10 THB per charge
Thai credit card: 3.5% + 10 THB
International: Up to 5.5% + 10 THB

Example (500 orders/month × 1000 THB average):
- Total transaction value: 500,000 THB
- Fee: (500,000 × 0.035) + (500 × 10) = 17,500 + 5,000 = 22,500 THB ($600)

BUT: Only charged when customer pays
Also: Fee is paid by customer (you implement surcharge)

Cost: $0 to you (customer covers it)
Or: 0% if you don't use for payments yet
```

### **7. APIs (FREE)**

```
LINE Messaging API: FREE
- No monthly cost
- Pay only if exceed 500k messages/month: $0.01/message after

Telegram Bot API: FREE
- No cost at any volume

Instagram API: FREE
- No cost at any volume

SlipOK (Payment Verification): 
- Check their pricing (likely 0-5 THB per verification)
- At 500 orders: ~2,500 THB = $70
- Usually optional/included

ER-API (Exchange Rates):
- Free tier: 1500 calls/month
- Your usage: ~10/day = 300/month
Cost: $0 (free tier)
```

### **8. DOMAIN (Not in your current stack, but needed)**

```
Domain name: $10-15/year (one-time setup)
Amortized: ~$1/month
```

---

## **STARTUP TOTAL MONTHLY COST**

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $20 | Pro tier (required) |
| Database | $0-57 | DynamoDB $0 or MongoDB M2 $57 |
| R2 Storage | $1 | Minimal media usage |
| Redis | $0 | Free tier sufficient |
| Sentry | $0 | Free tier sufficient |
| Omise | $0 | Fee by customer |
| APIs | $0 | All free |
| Domain | $1 | Amortized |
| **TOTAL** | **$22-78/month** | **DynamoDB path: $22** |

---

# **SCENARIO 2: 100+ Customers (Growing)**

**Metrics:**
- 5,000-20,000 DAU
- 10,000-50,000 orders/month
- 100-500 GB media storage
- 10M messages/month
- Heavy API usage

---

## **Cost Breakdown: Growing Phase**

### **1. VERCEL**

```
Usage growth:
- API calls: 50M/month
- Bandwidth: 100-200 GB/month
- Build minutes: 1,000/month

Vercel Pro breakdown:
- Base: $20/month
- API calls overage: (50M - 1M) × $0.50/M = $24.50
- Bandwidth overage: (150 - 100) × $0.50/GB = $25

Cost: $70/month

Alternative: Vercel Team: $200/month (easier scaling)
Or: Split cost among team if needed
```

### **2. DATABASE**

**MongoDB M2:**
```
Base: $57/month
Storage usage: ~50 GB
Connections: 100 (adequate)

Cost: $57/month
```

**DynamoDB:**
```
Free tier: 25M reads + 25M writes
Your usage:
- Reads: ~6.5M/month (within free)
- Writes: 650k/month (within free)
- Storage: 50 GB (within free 25GB tier? No - exceeds)

Storage overage: (50 - 25) × $0.25/GB = $6.25
Total cost: $6.25/month

FAR CHEAPER
```

**Aurora Serverless:**
```
Small instance: 2 ACU × $0.06/hour = ~$90/month
Storage: $0.10/GB × 50GB = $5
Total: ~$95/month
```

### **3. R2 STORAGE**

```
Estimated usage at 100+ customers:
- Product images: 50,000 products × 3 images × 500KB = 75 GB
- Order receipts: 50,000 orders × 200KB = 10 GB
- Chat media: 10M messages × 15% with media × 500KB = 750 GB
- Admin uploads: 5 GB
- Backups: 20 GB
Total storage: ~860 GB

Storage cost: 860 GB × $0.015 = $12.90/month
Download cost: ~5 TB/month × $0.015 = $75/month

Total R2 cost: $88/month

(Compare to S3: ~$250/month for same usage)
```

### **4. REDIS**

```
Usage growth:
- Cache operations: 100k/month (still within Upstash free)
- Or: Consider Vercel Redis $7/month for better integration

Cost: $0-7/month
```

### **5. SENTRY**

```
Events per month: 50k-100k
Free tier: 5k events

Sentry Pro: $29/month (100k events)

Cost: $29/month (if using)
Or: $0 if not using
```

### **6. OMISE (Payment Processing)**

```
Transaction volume: 30,000 orders × 2,000 THB average = 60M THB

Cost if customer pays fee:
- 60M × 3.5% = 2.1M THB ($60,000)
- But distributed to customers

Cost to you if you absorb:
- Same as above
- Or: ~3-5% of total revenue

Usually: $0 (customer pays fee)
```

### **7. ADDITIONAL SERVICES**

```
Monitoring/Analytics (optional):
- Mixpanel: $29/month
- Amplitude: $25/month
- Or: Free alternatives (Plausible $9/month)

Error Tracking (if upgrading Sentry):
- Sentry Pro: $29/month

SMS/Email (if adding notifications):
- Twilio: $0.0075-0.50 per message
- SendGrid: $20/month
- Amazon SES: Minimal

Estimated: $20-50/month (optional)
```

---

## **GROWING TOTAL MONTHLY COST**

| Service | MongoDB | DynamoDB | Notes |
|---------|---------|----------|-------|
| Vercel | $70 | $70 | Increased usage |
| Database | $57 | $6.25 | **DynamoDB wins** |
| R2 Storage | $88 | $88 | Same cost |
| Redis | $7 | $7 | Optional |
| Sentry | $29 | $29 | Optional monitoring |
| Omise | $0 | $0 | Customer pays |
| APIs | $10-20 | $10-20 | LINE limits, Telegram |
| Optional | $20-50 | $20-50 | Analytics, etc |
| **TOTAL** | **$281-334** | **$228-281** | **Save $53/month** |

---

# **SCENARIO 3: 1000+ Customers (Enterprise)**

**Metrics:**
- 50,000-200,000 DAU
- 500,000-2,000,000 orders/month
- 2-10 TB media storage
- 500M+ messages/month

---

## **Cost Breakdown: Enterprise Phase**

### **1. VERCEL**

```
Massive usage:
- API calls: 500M/month
- Bandwidth: 1-2 TB/month
- Build minutes: 5,000/month

Options:
A) Vercel Pro overage: $20 + massive overage charges (~$500+)
B) Vercel Enterprise: Custom pricing $500-2000+/month
C) Self-hosted/alternative

Recommendation: Custom contract with Vercel or migrate to AWS Lambda
Cost estimate: $500-1500/month
```

### **2. DATABASE**

**MongoDB M5:**
```
Base: $209/month
Storage: 2 TB
Connections: 500
Dedicated infrastructure

Cost: $209/month
```

**DynamoDB:**
```
Free tier: 25M reads + 25M writes
Your usage:
- Reads: ~400M/month (overage: 375M × $1.25 = $468.75)
- Writes: ~200M/month (overage: 175M × $6.25 = $1,093.75)
- Storage: 5 TB (overage: 4.975 TB × $1.25 = $6,218.75)

Total: $7,781/month

This is expensive! At this scale, consider:
- Provisioned capacity: Can be cheaper
- Or: Migrate to traditional database
```

**Aurora Serverless v2:**
```
Heavy load: 10-20 ACUs
Cost: 10 ACUs × $0.06/hour × 730 hours = $4,380
Storage: 5 TB × $0.10 = $500

Total: ~$4,880/month
More predictable than DynamoDB at this scale
```

**Self-hosted Postgres on EC2:**
```
Large instance: $0.30-0.50/hour = $220-365/month
Backup/monitoring: $50/month

Total: ~$270-415/month
But requires ops team ($2000-5000 salary equivalent)
```

### **3. R2 STORAGE**

```
Storage: 5 TB = 5,000 GB
- Storage cost: 5,000 × $0.015 = $75/month
- Download cost: 50 TB/month × $0.015 = $750/month

Total R2: $825/month

(vs S3: ~$2500+/month for same)
```

### **4. REDIS**

```
Heavy caching: Use Upstash Premium or Redis Labs
Redis Labs Cloud: 30 GB database = $150/month
Or: Elasticache: ~$100-200/month

Cost: $150-200/month
```

### **5. SENTRY**

```
Events: 500k-1M/month
Sentry Team: $100+/month (higher tiers)

Cost: $100+/month
```

### **6. OMISE**

```
Transaction volume: 1.5M orders × 2,000 THB = 3B THB

Cost if customer pays:
- 3B THB × 3.5% = 105M THB ($3M)
- Distributed to customers

Cost to you: $0 (or % of revenue if you absorb)
```

### **7. CDN/EDGE (New requirement at this scale)**

```
Cloudflare Enterprise: $200/month
Or: AWS CloudFront: ~$500/month

Needed for: Global speed, DDoS protection, caching

Cost: $200-500/month
```

### **8. ADDITIONAL INFRASTRUCTURE**

```
Message Queue (for broadcasts):
- AWS SQS: $1-5/month
- Redis Streams: Included in Redis

Worker/Cron Jobs:
- AWS Lambda: $0-20/month
- Vercel Functions: Included

Monitoring/Ops:
- Datadog: $200-500/month
- New Relic: $300-500/month
- Or: Open source (Prometheus): $100/month ops

Email/SMS at scale:
- SendGrid: $100-300/month
- Twilio: $100-500/month

Estimated: $500-1500/month (full stack)
```

---

## **ENTERPRISE TOTAL MONTHLY COST**

| Service | MongoDB | DynamoDB | Aurora | Self-Host |
|---------|---------|----------|--------|-----------|
| Vercel | $500-1500 | $500-1500 | $500-1500 | $0 (AWS) |
| Database | $209 | $7,781 | $4,880 | $270 + ops |
| R2/S3 | $825 | $825 | $825 | $825 |
| Redis | $150 | $150 | $150 | $150 |
| Sentry | $100 | $100 | $100 | $100 |
| CDN | $200-500 | $200-500 | $200-500 | $500 |
| Infrastructure | $500-1500 | $500-1500 | $500-1500 | $500-2000 |
| **TOTAL** | **$2,484-5,084** | **$10,056-12,656** | **$7,155-9,755** | **$3,245-6,245** |

**At enterprise scale, DynamoDB becomes expensive. Consider Aurora or self-hosted.**

---

# **COMPLETE COMPARISON TABLE**

## **Scenario 1: 5-15 Customers**

| Service | Best Value | Cost | Alternative |
|---------|-----------|------|-------------|
| **Hosting** | Vercel Pro | $20 | AWS ($10-30) |
| **Database** | DynamoDB | $0 | Firebase $0, MongoDB M2 $57 |
| **Storage** | R2 | $1 | S3 ($5-10) |
| **Caching** | Memory (free) | $0 | Upstash $0 |
| **Monitoring** | Sentry Free | $0 | Datadog $15 |
| **TOTAL** | **DynamoDB Path** | **$21/month** | MongoDB Path: $78/month |

---

## **Scenario 2: 100+ Customers**

| Service | Best Value | Cost | Alternative |
|---------|-----------|------|-------------|
| **Hosting** | Vercel Pro | $70 | AWS $50-100 |
| **Database** | DynamoDB | $6 | MongoDB M2 $57, Aurora $95 |
| **Storage** | R2 | $88 | S3 $250 |
| **Caching** | Upstash Free | $0 | Redis Labs $50 |
| **Monitoring** | Sentry Pro | $29 | Datadog $100 |
| **TOTAL** | **DynamoDB Path** | **$193/month** | MongoDB Path: $244, AWS Aurora $352 |

---

## **Scenario 3: 1000+ Customers**

| Service | Best Value | Cost | Note |
|---------|-----------|------|------|
| **Hosting** | AWS Lambda | $0 | vs Vercel $500-1500 |
| **Database** | Aurora Serverless | $4,880 | DynamoDB $7,781 too expensive |
| **Storage** | R2 | $825 | vs S3 $2500 |
| **Caching** | Redis Labs | $150 | Needed at scale |
| **Monitoring** | Datadog | $300 | Now critical |
| **CDN** | Cloudflare Ent. | $200 | Required |
| **Infrastructure** | Lambda/ECS | $500-2000 | Full ops stack |
| **TOTAL** | **Aurora Self-Hosted** | **$3,245-6,245** | Pre-enterprise customization |

---

# **YEARLY COST COMPARISON**

## **Path 1: MongoDB Route**

```
Startup (months 1-3):
- Stuck on M0 (broken) OR upgrade to M2 ($57)
- If M2: $57 × 3 = $171
- Vercel: $20 × 3 = $60
- Storage: $1 × 3 = $3
Subtotal: ~$234

Growing (months 4-9):
- MongoDB M2: $57 × 6 = $342
- Vercel: $70 × 6 = $420
- Storage: $88 × 6 = $528
Subtotal: ~$1,290

Scaling (months 10-12):
- MongoDB M5: $209 × 3 = $627
- Vercel Enterprise: $800 × 3 = $2,400
- Storage + infrastructure: $500 × 3 = $1,500
Subtotal: ~$4,527

YEARLY TOTAL: $6,051
```

## **Path 2: DynamoDB Route**

```
Startup (months 1-3):
- DynamoDB: $0 × 3 = $0
- Vercel Pro: $20 × 3 = $60
- Storage: $1 × 3 = $3
Subtotal: ~$63

Growing (months 4-9):
- DynamoDB: $6 × 6 = $36
- Vercel: $70 × 6 = $420
- Storage: $88 × 6 = $528
Subtotal: ~$984

Scaling (months 10-12):
- Aurora (migrate): $4,880 × 3 = $14,640
- Vercel: $800 × 3 = $2,400
- Storage: $825 × 3 = $2,475
Subtotal: ~$19,515

YEARLY TOTAL: $20,562
(But only if reaching 1000+ customers - most don't)

More realistic (stay at 100-200 customers):
- Yearly: $63 + $984 + ($244 × 3) = $2,031
```

## **Path 3: Firebase Route**

```
Startup: $0 × 3 = $0 (free tier)
Growing: $15 × 6 = $90 (still mostly free)
Scaling: $100 × 3 = $300 (approaching limits)

Yearly: ~$390 (if staying under 100 customers)
Or: ~$500-800/month if scaling to 1000+ (expensive)
```

---

# **RECOMMENDATION BY SCENARIO**

## **For Next 3 Months (Launch)**
```
Best: DynamoDB Path
- Vercel Pro: $20
- DynamoDB: $0
- R2: $1
- Total: $21/month (save $57/month vs MongoDB)

Total 3 months: $63
```

## **For 6-12 Months (Growing)**
```
Best: DynamoDB + Vercel Pro
- Vercel: $70
- DynamoDB: $6
- R2: $88
- Redis Upstash: $0
- Sentry: $0
- Total: $164/month

Total 6 months: ~$1,000
```

## **For 12+ Months (If Scaling to 1000+)**
```
Trigger: When exceeding $300/month database costs

Options:
1. Migrate Aurora (cheaper than DynamoDB at scale)
2. Self-host Postgres on EC2
3. Consider MongoDB M5 if already invested

Expected: $3,000-6,000/month
(But only if extremely successful)
```

---

## **BOTTOM LINE: Total Cost Journey**

```
STARTUP PATH (First paying customer):
Month 1-3: $63 (DynamoDB path)

GROWING PATH (100+ customers):
Month 4-12: $164/month × 9 = $1,476

TOTAL FIRST YEAR: $1,539 (incredibly cheap!)

ENTRY COST: $0 until first customer pays

If using MongoDB instead:
First year: $6,051 (4x more expensive!)
```

---

## **Cost Optimization Tips**

```
1. R2 over S3: Save 60% on storage
2. Upstash free tier: Save $7-10/month on Redis
3. DynamoDB (early): $0 until 500+ customers
4. Free Sentry: Covers errors until $100k ARR
5. Omise fee: Customer absorbs (usually)
6. Free APIs: LINE, Telegram, Instagram free
7. ER-API free: No cost for exchange rates
```

**Every $1 saved per month = $12 yearly revenue you don't need**
