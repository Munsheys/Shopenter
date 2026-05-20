# ShopEnter: Lead Source & Prospecting Strategy

*Prepared: May 2026 | Confidential — Internal Strategy Document*

---

## Overview

ShopEnter starts with zero existing customer data, so lead sourcing infrastructure must be built from scratch. This document ranks prospecting channels by viability, cost-efficiency, and monthly volume potential, with specific tactical guidance for each.

**Monthly Lead Volume Target (Launch):** 500–1,500 qualified prospects/month by end of Month 1
**Definition of Qualified Prospect:** LINE OA merchant with 2K+ followers, 50+ monthly orders, and owner is reachable via email or ads

---

## 1. Lead Source Rankings

### Tier 1: Highest Viability (Launch Immediately)

---

#### 1.1 LINE OA Public Account Directory

**Overview:** LINE allows business accounts to be publicly searchable via the LINE app and LINE Official Account website. Accounts that have enabled "Search by Account ID" are publicly listed.

**Tactic:**
- Scrape public LINE OA directory (terms-compliant methods: manual research, public web pages)
- Thai LINE OA accounts are browsable at `lineoa.me` and similar aggregators
- Filter by category (fashion, food, beauty, services)
- Cross-reference with Facebook to find owner contact info

**Volume:** 8,000–15,000 raw leads/month (Thailand alone); after enrichment: ~2,000–4,000 qualified
**Cost/Lead:** $0.05–$0.20 (staff time for enrichment)
**Quality:** Medium (need enrichment to get email/contact)
**Difficulty:** Medium (requires enrichment workflow)

---

#### 1.2 Facebook Page Intelligence

**Overview:** Thai and Taiwanese LINE OA merchants almost universally maintain a Facebook Page. Facebook Pages have public contact info (email, website, phone) and can be filtered by category and follower count.

**Tactic:**
- Use tools like **Phantom Buster** (Facebook Pages Scraper) or **Apify** Facebook actors
- Filter pages with LINE OA link in bio (search `line.me/R/ti/p/` in page descriptions)
- Export page name, contact email, follower count, category
- Enrich with Apollo.io or Hunter.io for decision-maker email

**Volume:** 3,000–8,000 leads/month
**Cost/Lead:** $0.10–$0.40 (tool cost + enrichment)
**Quality:** High (LINE link = confirmed LINE OA user)
**Difficulty:** Low-Medium

**Tools:** Phantom Buster ($69–$159/mo), Apify ($49–$99/mo)

---

#### 1.3 Facebook Group Mining

**Overview:** Thailand and Taiwan have hundreds of Facebook Groups specifically for online sellers, LINE merchants, and e-commerce operators. These groups contain active merchants posting daily.

**Key Groups (Thailand):**
- "ขายของออนไลน์ LINE OA" (Sell online via LINE OA) — 180,000+ members
- "พ่อค้าแม่ค้าออนไลน์" (Online merchants) — 500,000+ members
- "LINE Official Account Community Thailand" — 45,000 members
- "ขายของออนไลน์ FB + LINE" — 220,000 members

**Key Groups (Taiwan):**
- LINE官方帳號行銷社群 — 35,000 members
- 網路開店交流 — 80,000 members

**Tactic:**
- Join groups, identify active posters (members asking for order management help = hot leads)
- Manual outreach via FB Messenger with value-first approach
- Offer free template/guide to collect emails

**Volume:** 200–500 warm leads/month (manual, high quality)
**Cost/Lead:** $2–$8 (staff time)
**Quality:** Very High (self-identified pain = immediate ICP match)
**Difficulty:** Low (manual but high-ROI early stage)

---

#### 1.4 Instagram & TikTok Shop Merchant Discovery

**Overview:** Many LINE OA merchants also run Instagram or TikTok shops. Instagram bio links and TikTok shop profiles often include LINE OA contact links.

**Tactic:**
- Search Instagram hashtags: #lineoa, #ร้านค้าไลน์ (Thai), #lineoaccount, #lineshop
- Use **Hype Auditor** or **PhantomBuster Instagram scraper** to extract accounts
- Filter: 1K–100K followers, product posts, LINE in bio
- TikTok: Search brand hashtags in Thai/Chinese; many sellers link LINE in profile

**Volume:** 1,500–3,500 leads/month
**Cost/Lead:** $0.15–$0.50
**Quality:** Medium-High
**Difficulty:** Medium

---

### Tier 2: Solid Secondary Sources (Launch in Month 2)

---

#### 2.1 B2B Lead Databases

| Database | LINE OA Targeting | Data for APAC | Cost | Quality | Verdict |
|----------|-----------------|---------------|------|---------|---------|
| **Apollo.io** | Poor (US-centric) | Limited for TH/TW | $99–$499/mo | Low for this ICP | Limited use |
| **Hunter.io** | No specific targeting | Email discovery only | $49–$149/mo | Medium | Use for enrichment |
| **ZoomInfo** | Very poor SE Asia | Minimal | $15K+/yr | Poor | Skip |
| **RocketReach** | Poor SE Asia | Some JP data | $70–$300/mo | Low | Skip |
| **Lusha** | Very poor SE Asia | Minimal | $40–$160/mo | Poor | Skip |
| **Leadfeeder** | Website visitor ID | Global | $99–$500/mo | High (intent) | Use for retargeting |

**Regional Alternatives (More Valuable):**

| Database | Region | Coverage | Cost | Notes |
|----------|--------|----------|------|-------|
| **Getlead.in.th** | Thailand | 500K+ TH businesses | $50–$200/mo | Best TH-specific |
| **DBD (Thai Dept. Business Dev.)** | Thailand | Public business registry | Free | Exportable; needs enrichment |
| **J-Net21** | Japan | SMB contacts | $200–$800/mo | Japanese |
| **Hiretual/HireEZ** | Asia-Pacific | Professional data | $150–$500/mo | Good for ops roles |
| **OKIDATA** | Taiwan | TW business data | $100–$300/mo | Traditional Chinese |

**Bottom line:** Global databases have poor coverage for SE Asian LINE OA merchants. Prioritize regional Thai and Taiwanese data sources + Facebook/LINE scraping.

---

#### 2.2 Shopify & WooCommerce App Data

**Tactic:**
- Search Shopify App Store reviews for LINE-related apps (LINE Login, LINE Notify integrations)
- Extract merchant names from reviews → find their LINE/Facebook → enrich for contact
- WooCommerce plugin directory: search "LINE" plugins, look at recent reviewers

**Volume:** 200–600 leads/month
**Cost/Lead:** $0.50–$2.00
**Quality:** High (already using LINE integration = confirmed use case)
**Difficulty:** Medium (manual research)

---

#### 2.3 Thai Business Registries

**Thailand DBD (Department of Business Development):**
- All registered Thai companies are publicly searchable at `dbd.go.th`
- Filter by business type (retail, fashion, food service)
- Export company names → enrich via Facebook/Google to find LINE OA

**Taiwan Business Registry:**
- Ministry of Economic Affairs (MOEA) offers company search
- Similar enrichment workflow

**Volume:** 3,000–8,000 raw leads/month; ~500–1,200 qualified after enrichment
**Cost/Lead:** $0.20–$0.80
**Quality:** Low-Medium (many will be offline businesses)
**Difficulty:** Medium-High (heavy enrichment needed)

---

#### 2.4 YouTube & Content Creator Mining

**Overview:** Thai and Taiwanese content creators often have LINE OA for fan management and product sales. Many have 10K–500K followers and sell via LINE.

**Tactic:**
- Search YouTube for Thai beauty/fashion merchants with LINE OA links in descriptions
- Extract and enrich contact info
- These are high-visibility prospects for referral/testimonial potential

**Volume:** 300–800 leads/month
**Cost/Lead:** $0.50–$2.00
**Quality:** High (influencer-merchants with large audiences = high LTV)
**Difficulty:** Medium

---

### Tier 3: Intent-Signal Sources (Launch Month 2–3)

---

#### 3.1 Job Posting Intent Signals

**Signal:** Companies posting for "LINE OA Manager," "E-commerce Operations," "Customer Service (LINE)" are actively scaling LINE commerce operations.

**Platforms to Monitor:**
- Jobtopgun (Thailand's #1 job board)
- JobsDB Thailand & Taiwan
- 104 Job Bank (Taiwan)
- Naukri (Singapore)
- LinkedIn (regional filter)

**Tactic:**
- Set up automated scraping via Apify or Bardeen.ai
- Flag job postings with keywords: LINE OA, LINE Official Account, ออเดอร์, LINE CRM
- Alert sales team for immediate outreach to hiring company

**Volume:** 50–200 high-intent leads/month
**Cost/Lead:** $2–$10 (tool + staff)
**Quality:** Very High (hiring = actively solving the problem ShopEnter solves)
**Difficulty:** Low (automation-friendly)

---

#### 3.2 Google Search Intent (SEO-Sourced Leads)

**High-Intent Search Queries by Region:**

*Thailand (Thai language):*
- "ระบบจัดการออเดอร์ LINE OA" (Order management LINE OA)
- "CRM LINE Official Account"
- "โปรแกรมจัดการลูกค้า LINE"
- "ร้านค้าออนไลน์ LINE"
- "เว็บไซต์ขายของ LINE OA"

*Taiwan (Traditional Chinese):*
- "LINE官方帳號 CRM"
- "LINE OA 訂單管理"
- "LINE官方帳號 電商系統"

*Japan:*
- "LINE公式アカウント CRM"
- "LINE公式アカウント 注文管理"
- "LINEビジネス 管理システム"

*English (Singapore/International):*
- "LINE OA order management software"
- "LINE Official Account CRM for merchants"
- "LINE business tools for online store"

**Volume from SEO (Month 6–12 after launch):** 200–800 organic leads/month
**Cost/Lead:** $5–$20 (content cost amortized)

---

#### 3.3 Review Mining (Competitor Reviews)

**Tactic:**
- Monitor reviews on G2, Capterra, Product Hunt for direct competitors (Sellsuki, Zwiz, Readyplanet)
- Negative reviews = frustrated customers = hot ShopEnter prospects
- Reach out with specific value proposition addressing their stated pain

**Platforms:** G2.com, Capterra, ProductHunt, AppFollow (for LINE Mini App reviews)

**Volume:** 50–200 leads/month
**Cost/Lead:** $1–$5
**Quality:** Very High (already buying in category, unhappy with current solution)
**Difficulty:** Low-Medium

---

## 2. Monthly Lead Volume Projections at Launch

| Lead Source | Month 1 | Month 2 | Month 3 | Cost/Lead | Quality |
|-------------|---------|---------|---------|-----------|---------|
| Facebook Group Mining (manual) | 150 | 300 | 400 | $4 | Very High |
| Facebook Page Scraping | 800 | 1,500 | 2,000 | $0.25 | High |
| LINE OA Directory | 300 | 600 | 900 | $0.15 | Medium |
| Instagram Hashtag Mining | 400 | 700 | 1,000 | $0.30 | Medium-High |
| Regional DB Enrichment | 0 | 500 | 800 | $0.60 | Medium |
| Job Posting Signals | 0 | 80 | 150 | $5 | Very High |
| Review Mining | 30 | 80 | 120 | $3 | Very High |
| SEO/Content Leads | 0 | 20 | 80 | $15 | High |
| Shopify/WooCommerce Research | 0 | 150 | 250 | $1.50 | High |
| **TOTAL (Raw)** | **1,680** | **3,930** | **5,700** | — | — |
| **Qualified (after filtering)** | **~400** | **~900** | **~1,400** | **~$1.80 avg** | — |

---

## 3. Lead Source Recommendations

### Priority 1 — Do This Week 1
1. **Facebook Page Scraper setup** (Phantom Buster or Apify) — highest volume, easiest automation
2. **Manual Facebook Group outreach** — join 5 key Thai merchant groups, begin relationship-building
3. **LINE OA directory research** — build initial list for first email campaign

### Priority 2 — Do Week 2–3
4. **Instagram hashtag mining** — supplement Facebook with visual-commerce merchants
5. **Competitor review monitoring** — set up G2/Capterra alerts
6. **Thai DBD enrichment workflow** — bulk prospecting from business registry

### Priority 3 — Do Month 2
7. **Job posting monitoring** — Jobtopgun + 104 Job Bank automated alerts
8. **Shopify/WooCommerce review mining** — higher quality, lower volume
9. **Regional database subscriptions** — Getlead.in.th for Thailand

### Lead Enrichment Stack
- **Primary email finding:** Hunter.io ($49/mo) + Clay.com ($149/mo)
- **Phone/LINE contact:** Manual enrichment via Facebook + Google
- **Company enrichment:** Clearbit (for Singapore/Japan English-speaking companies)
- **Validation:** NeverBounce or ZeroBounce for email validation before outreach ($0.003–$0.008/email)

---

*End of Section 2: Lead Source Strategy*
