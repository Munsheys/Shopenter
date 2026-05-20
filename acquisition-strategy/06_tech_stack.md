# ShopEnter: Automation & Tech Stack Recommendations

*Prepared: May 2026 | Confidential — Internal Strategy Document*

---

## Stack Design Principles

1. **Lean at launch** — minimize tool sprawl; each tool must earn its place
2. **Connected** — tools must integrate (avoid data silos)
3. **Automatable** — every manual process should have an automation path within 90 days
4. **Scalable** — architecture should handle 10× growth without re-platforming
5. **Observable** — full attribution from first touch to paid customer

---

## Complete Tech Stack

### Layer 1: CRM & Pipeline

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **HubSpot CRM** | Contact management, deal pipeline, email tracking, sequences | Starter ($20/mo) → Professional ($90/mo) at 200+ customers | $20–$90 | **Essential** |
| **HubSpot Sales Hub** | Sequence automation, meeting booking, call logging | Starter included | Included | **Essential** |

**Why HubSpot over alternatives:**
- Pipedrive is better UX but weaker marketing automation
- Salesforce is overkill until 500+ customers
- HubSpot gives free CRM + affordable marketing automation in one platform
- Native integrations with Instantly.ai, Slack, Zapier

**CRM Pipeline Stages:**
1. Raw Lead (scraped, unvalidated)
2. Qualified Lead (email validated, ICP verified)
3. Email Contacted (sequence started)
4. Replied (positive response)
5. Trial Started
6. Trial Active (logged in 3+ times in 7 days)
7. Trial Churned (no activity 7 days)
8. Paid Customer
9. Churned Customer

---

### Layer 2: Email Outreach

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Instantly.ai** | Cold email outreach, domain warm-up, multi-sender rotation | Growth ($37/mo) | $37 | **Essential** |
| **Smartlead.ai** | Alternative/backup sender for volume scaling | Basic ($39/mo) | $39 | Optional (Month 2+) |
| **Hunter.io** | Email finding + verification | Starter ($49/mo) | $49 | **Essential** |
| **NeverBounce** | Bulk email validation before outreach | Pay-as-you-go | $8–$40/mo | **Essential** |
| **Mailwarm** | Additional domain warm-up | Growth ($39/mo) | $39 | Month 1 only |

**Email Infrastructure Setup:**
- Buy 3–5 domains similar to shopenter.com (e.g., shopenter-hq.com, tryshopentr.com, shopenter-app.com)
- Set up Google Workspace ($6/mo per email) or Zoho Mail ($1/mo per email) on each
- Create 2–3 mailboxes per domain (6–15 total sending addresses)
- Warm all simultaneously: 21-day warm-up → then 50–100 emails/day per mailbox
- Rotate sending across all mailboxes to maintain deliverability

**Email Sequence Tooling within Instantly.ai:**
- Multi-step sequences with conditional branches (if no reply → step 2)
- A/B test subject lines automatically
- Auto-pause sending when reply received (prevent awkward follow-ups)
- Webhook to HubSpot when reply detected

---

### Layer 3: Lead Generation & Enrichment

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Phantom Buster** | Facebook Page scraper, Instagram scraper, LinkedIn scraper | Growth ($69/mo) | $69 | **Essential** |
| **Apify** | Advanced web scraping (LINE OA directory, Thai registries) | Developer ($49/mo) | $49 | **Essential** |
| **Clay.com** | Data enrichment, waterfall email finding, AI personalization | Starter ($149/mo) | $149 | Recommended |
| **Apollo.io** | Secondary email database (for Japan/Singapore English leads) | Basic ($49/mo) | $49 | Month 2+ |
| **Bardeen.ai** | Job posting monitoring (Jobtopgun, 104 Job Bank) | Free–$40/mo | $0–$40 | Month 2+ |

**Clay.com is particularly powerful for ShopEnter:**
- Waterfall enrichment: try Hunter → Apollo → RocketReach in sequence
- AI-generated personalization: auto-write first line based on LinkedIn/Facebook data
- Integrates directly with Instantly.ai for seamless pipeline
- Can enrich Thai business names with website, social profiles, order volume estimates

---

### Layer 4: Marketing Automation

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Make.com** (formerly Integromat) | Workflow automation hub | Pro ($16/mo) | $16 | **Essential** |
| **Zapier** | Backup automation for tools with no Make connector | Starter ($20/mo) | $20 | Optional |
| **Customer.io** | Behavioral email marketing (in-app triggers) | Essentials ($100/mo) | $100 | Month 2+ |
| **Intercom** | In-app messaging, onboarding, trial activation | Starter ($74/mo) | $74 | Month 1 (trial activation) |

**Key Automation Workflows (Make.com):**

*Workflow 1: Lead Capture → CRM*
- Trigger: New row in lead spreadsheet (Google Sheets)
- Action: Validate email (NeverBounce) → Create contact in HubSpot → Add to Instantly.ai sequence

*Workflow 2: Trial Signup → Activation*
- Trigger: New trial signup in ShopEnter database
- Action: Create deal in HubSpot → Send to Intercom → Start activation email sequence (Customer.io) → Notify Slack

*Workflow 3: Trial → Paid Conversion*
- Trigger: Payment webhook from Stripe
- Action: Update HubSpot deal to "Won" → Send welcome email → Add to customer Slack channel → Start onboarding sequence

*Workflow 4: Lead Scoring*
- Trigger: Daily (scheduled)
- Action: Pull all leads from HubSpot → Score based on: email opened (+5), link clicked (+10), trial started (+40), logged in (+20 each), used feature (+15) → Update HubSpot score field

*Workflow 5: Churn Alert*
- Trigger: Customer not logged in for 10 days
- Action: Alert in Slack → Send re-engagement email → Create task in HubSpot for manual follow-up

---

### Layer 5: Paid Advertising

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Meta Ads Manager** | Facebook + Instagram ads (Thailand, Taiwan) | Pay per impression | $3K–$10K/mo ad spend | **Essential** |
| **Google Ads** | Search + YouTube ads | Pay per click | $1.5K–$5K/mo ad spend | **Essential** |
| **LINE Ads Platform** | LINE Smart Channel, Timeline ads | Pay per impression | $1K–$4K/mo ad spend | **Essential** |
| **TikTok Ads Manager** | TikTok ads for Thai/TW merchants | Pay per click | $500–$2K/mo ad spend | Month 2+ |
| **Supermetrics** | Pull all ad data into one Google Sheets dashboard | Solo ($29/mo) | $29 | Recommended |

**Ad Attribution Setup:**
- Meta Conversion API (server-side) — bypass iOS 14+ signal loss
- Google Enhanced Conversions — match trial signups to Google users
- UTM parameters on all ad URLs (utm_source, utm_medium, utm_campaign, utm_content)
- GA4 event: `trial_started`, `payment_completed` as conversion events

---

### Layer 6: Analytics & Attribution

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Google Analytics 4** | Website traffic, conversion funnels | Free | $0 | **Essential** |
| **Mixpanel** | Product analytics (in-app behavior, feature usage) | Starter (free to 20M events) | $0 | **Essential** |
| **Google Looker Studio** | Custom dashboards (pull from GA4, HubSpot, Sheets) | Free | $0 | **Essential** |
| **Hotjar** | Heatmaps + session recordings on landing pages | Basic (free) | $0 | Recommended |
| **PostHog** | Product analytics alternative (open source option) | Free tier | $0 | Alternative to Mixpanel |

**Key Dashboards to Build (Looker Studio):**

*Dashboard 1: Daily Acquisition*
- Leads added (by source)
- Emails sent / opened / replied
- Ad spend by channel
- Trial signups by channel
- CAC by channel (updated daily)

*Dashboard 2: Weekly Revenue*
- MRR (new + churned + expansion)
- Trials started this week
- Trials → Paid this week
- Conversion rate by cohort

*Dashboard 3: Marketing Efficiency*
- CAC by channel (30-day rolling)
- LTV:CAC ratio
- Payback period by channel
- Top-performing email sequences (reply rate, trial rate)

---

### Layer 7: Customer Success & Retention

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **Intercom** | In-app chat, onboarding tours, help center | Starter ($74/mo) | $74 | **Essential** |
| **Loom** | Async video support (send personalized video to churning customers) | Free | $0 | Recommended |
| **ChurnKey** | Cancellation flow that recovers churning customers | $100–$200/mo | $100 | Month 3+ |
| **Delighted / Typeform** | NPS surveys + feedback | Free tier | $0 | **Essential** |

---

### Layer 8: Affiliate & Referral

| Tool | Purpose | Plan | Monthly Cost | Priority |
|------|---------|------|-------------|----------|
| **FirstPromoter** | Affiliate tracking + payout management | Starter ($49/mo) | $49 | Month 2+ |
| **ReferralHero** | In-product referral program | $49/mo | $49 | Month 2+ |

**Affiliate Program Structure:**
- Affiliates earn 20% recurring commission for lifetime of referred customer
- Partners: Thai business coaches, LINE OA educators, digital marketing agencies
- Track via FirstPromoter — unique link per affiliate, automatic Stripe payout

---

## Integration Architecture

```
Lead Sources (Facebook, LINE Dir, Instagram)
         ↓
    Phantom Buster / Apify
         ↓
    Google Sheets (staging)
         ↓
  Make.com: Validate + Enrich (Hunter + NeverBounce + Clay)
         ↓
    HubSpot CRM (contacts + deals)
         ↓
  Instantly.ai (email sequences)
         ↓
  Reply detected → HubSpot task + Slack alert
         ↓
  Trial signup → Intercom (onboarding) + Customer.io (activation emails)
         ↓
  Payment → Stripe → HubSpot "Closed Won" + Customer Slack
         ↓
  Mixpanel (product behavior) → LTV tracking + churn signals
         ↓
  All data → Looker Studio dashboards
```

---

## Total Monthly Tool Cost

| Category | Monthly Cost |
|----------|-------------|
| CRM (HubSpot Starter) | $20–$90 |
| Email Outreach (Instantly.ai + Hunter + NeverBounce) | $135 |
| Lead Generation (Phantom Buster + Apify + Clay) | $267 |
| Automation (Make.com) | $16 |
| Analytics (GA4 + Mixpanel + Looker Studio) | $0 |
| Customer Success (Intercom) | $74 |
| Paid Ad Attribution (Supermetrics) | $29 |
| Referral (FirstPromoter — Month 2+) | $49 |
| Miscellaneous (email domains, Loom, NPS) | $50 |
| **Total Tools Budget** | **~$640–$710/mo** |

**This is extremely lean** — under $750/month for the full acquisition tech stack. The major costs are in ad spend, not tools.

---

## Competitor Monitoring Tools

| Tool | Purpose | Cost |
|------|---------|------|
| **Google Alerts** | Monitor mentions of competitors + "LINE OA" topics | Free |
| **Mention.com** | Social listening (Thai/Japanese/Chinese language) | $29–$99/mo |
| **SimilarWeb** | Competitor traffic analysis | Free (limited) |
| **Semrush** | Competitor keyword + backlink monitoring | $120/mo |
| **AppFollow** | Monitor competitor app store reviews | $23/mo |

**Competitor alerts to set up:**
- Sellsuki, Zwiz.ai, Readyplanet, Maichat (Thailand)
- Crescendo Lab, LINE官方帳號 management tools (Taiwan)
- L-Step (Lステップ), エルメ (Japan)

---

*End of Section 6: Tech Stack*
