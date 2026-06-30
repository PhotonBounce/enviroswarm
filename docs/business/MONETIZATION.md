# ENViroSwarm Monetization Strategy

> **Version:** 1.0 | **Date:** June 2026 | **Status:** Draft for internal review

---

## Executive Summary

ENViroSwarm monetizes via a classic freemium SaaS model with a network-effect twist: the free tier requires users to contribute sensor data to the swarm, making every free user a net asset to the network. Revenue flows through three core streams: **subscription tiers** (Pro / Enterprise), **metered API overage**, and **data licensing**. Projected Year 1 ARR: **$180K–$420K**; Year 3 ARR: **$2.1M–$4.8M**.

---

## 1. Free Tier — "Swarm Contributor"

**Price:** $0 forever

### Limits

| Resource | Limit |
|---|---|
| API calls / month | 5,000 |
| Active sensors | Up to 3 per user |
| Historical data access | 7 days |
| Dashboards | 1 personal dashboard |
| Data export | CSV only, max 1,000 rows |
| Alerts | Email only, 1 location |
| Support | Community forum + documentation |
| SLA | None (best effort) |

### Included Features

- Real-time air quality dashboard (PM2.5, PM10, CO₂, VOC, temp, humidity)
- Basic map visualization with heatmap overlay
- REST API access (rate-limited: 10 req/min)
- Community forum access
- Mobile app (iOS/Android) read-only

### The Network-Effect Hook

**Free is not free — it is a data-for-access exchange.** Every free user must connect at least one physical sensor to the swarm. This means:

- Free users expand geographic coverage at zero marginal cost to ENViroSwarm.
- More sensors → richer dataset → higher value for paid users.
- Free users who build dashboards or integrations become sticky (switching cost = rebuild time).

### Conversion Hooks to Pro ($29/mo)

| Trigger | Hook |
|---|---|
| API hits 4,000 / 5,000 | In-app banner: "You’re at 80% of your limit. Unlock 100K calls on Pro." |
| Tries to add 4th sensor | Modal: "Sensor limit reached. Pro supports 25 sensors." |
| Needs 30-day history | Locked feature with tooltip: "Pro includes 12 months of history." |
| Wants SMS alerts | "SMS alerts are a Pro feature. Upgrade to get instant notifications." |
| Tries CSV export >1,000 rows | "Pro includes unlimited CSV + JSON + Parquet export." |
| 7-day streak of daily logins | Personalized email: "Power user detected — here’s 20% off your first Pro month." |

---

## 2. Pro Tier — "Swarm Operator"

**Price:** $29 / month / user (or $290 / year — 2 months free)

**Target:** Individual researchers, small environmental consultancies, urban planners, precision agriculture operators, health-conscious facility managers, school districts.

### Full Feature List

| Feature | Details |
|---|---|
| API calls / month | 100,000 |
| Active sensors | Up to 25 per user |
| Historical data | 12 months |
| Dashboards | Unlimited custom dashboards |
| Data export | CSV, JSON, Parquet — unlimited |
| Alerts | Email + SMS (up to 5 locations) + webhook |
| Support | Priority email (24h response) |
| SLA | 99.5% uptime |
| Advanced analytics | Trend forecasting, anomaly detection, correlation analysis |
| Custom integrations | Zapier, Slack, Google Sheets, IFTTT |
| Mobile app | Full read/write + push notifications |
| API rate limit | 100 req/min |
| Data attribution | Required ("Powered by ENViroSwarm") |
| Team seats | 1 (solo user) |

### Value Propositions

1. **For Researchers:** "Get 12 months of calibrated data across 25 sensors for $29 — less than one lab analysis."
2. **For Farmers:** "Replace a $2,000 weather station with 25 swarm sensors and real-time alerts."
3. **For City Planners:** "Monitor 25 microclimates for the cost of one parking meter."
4. **For Schools:** "Teach data science with live environmental data — $29/mo vs. $500+ for proprietary lab kits."

### Why $29?

- **BreezoMeter** (acquired by Google) — API access starts at ~$99/mo for basic; enterprise is custom.
- **AirVisual** (IQAir) — Premium is $9.99/mo but is consumer-only; no API.
- **PurpleAir** — Sensors are $200–$300; cloud dashboard is free but API is limited and data quality is raw (uncalibrated).
- **OpenAQ** — Free API but no SLA, no historical bulk, no support.
- **Positioning:** We are 3× cheaper than BreezoMeter API, 10× more useful than AirVisual, and vastly better data quality than PurpleAir alone. $29 hits the "no-brainer" threshold for any professional who currently spends >$100/mo on environmental data or hardware.

---

## 3. Enterprise Tier — "Swarm Infrastructure"

**Price:** $299 / month / organization (or $2,990 / year — 2 months free)

**Target:** Municipal governments, large NGOs, corporate ESG teams, IoT platform integrators, academic consortia, healthcare networks.

### Full Feature List

| Feature | Details |
|---|---|
| API calls / month | 2,000,000 |
| Active sensors | Unlimited |
| Historical data | Unlimited (full archive) |
| Dashboards | Unlimited + white-label option |
| Data export | All formats + direct S3 / GCS / Azure Blob export |
| Alerts | Email + SMS + webhook + PagerDuty + Opsgenie (unlimited locations) |
| Support | Dedicated Slack channel + phone (4h response for P1) |
| SLA | 99.9% uptime with financially backed credits |
| Custom integrations | Direct DB replication, Kafka stream, GraphQL endpoint |
| Advanced analytics | Full suite + custom ML model training on your data |
| Mobile app | White-label ready (your logo, your colors) |
| API rate limit | 1,000 req/min + burst capacity |
| Data attribution | Optional removal (white-label) |
| Team seats | Unlimited |
| SSO / SAML | Included (Okta, Azure AD, Google Workspace) |
| Audit logs | 7-year retention, SOC-2 compliant |
| Compliance | GDPR, CCPA, HIPAA-ready BAA available |
| Onboarding | 2-hour dedicated setup call + architecture review |
| Success manager | Quarterly business reviews |

### Enterprise SLA Details

| Uptime | Credit |
|---|---|
| < 99.9% | 10% monthly credit |
| < 99.5% | 25% monthly credit |
| < 99.0% | 50% monthly credit + mandatory post-mortem |
| < 95.0% | 100% monthly credit + option to terminate without penalty |

### Custom Integrations (Enterprise Only)

- **Kafka / Kinesis real-time stream:** Push calibrated sensor data directly into your data lake.
- **GraphQL endpoint:** Query exactly the fields you need, reducing bandwidth and cost.
- **Direct DB replication:** PostgreSQL read replica in your VPC.
- **Custom ML models:** We train anomaly detection or forecasting models on your specific sensor topology.
- **GIS layer exports:** Shapefile, GeoJSON, KML for ArcGIS / QGIS integration.

---

## 4. API Overage Pricing

**Price:** $0.001 per API call (=$1 per 1,000 calls)

### Mechanics

- When a user hits their monthly limit, we do **not** cut them off. Instead, we:
  1. Send a real-time alert: "You’ve exceeded your 100K Pro limit. Overage is $0.001/call."
  2. Bill overage at month-end, rounded to the nearest $0.01.
  3. Cap overage at 2× the base tier price to prevent bill shock (Pro max overage = $58/mo; Enterprise max = $598/mo). After that, we require a plan upgrade.

### Overage Tiers (Pre-Paid Blocks)

Users can pre-purchase overage blocks at a discount to avoid per-call billing anxiety:

| Block | Price | Effective Rate | Discount vs. Pay-As-You-Go |
|---|---|---|---|
| 100K calls | $80 | $0.0008/call | 20% |
| 500K calls | $350 | $0.0007/call | 30% |
| 1M calls | $600 | $0.0006/call | 40% |
| 5M calls | $2,500 | $0.0005/call | 50% |

### Comparison to Competitors

| Provider | Price per 1K calls | Notes |
|---|---|---|
| BreezoMeter (Google) | ~$0.50–$2.00 | Tiered by volume; enterprise custom |
| OpenWeather Air Pollution | ~$0.10–$0.50 | Limited endpoints; no sensor network |
| PurpleAir | Free (limited) | No SLA; raw data only |
| AirVisual | N/A | No API for consumers |
| **ENViroSwarm** | **$0.10–$1.00** | **Calibrated swarm data; 10× cheaper at scale** |

---

## 5. Data Licensing — Bulk Historical Data

Not every user wants a subscription. Some just need a one-time dataset. We monetize this via **Data Licensing Tiers**.

### Tier 1: "Snapshot" — $49

- One city / region, 30 days of data
- CSV format only
- Single user license, non-commercial
- ~50K data points

### Tier 2: "Research Dataset" — $299

- One metropolitan area, 12 months of data
- CSV + JSON + Parquet
- Academic / non-profit license (publish with attribution)
- ~5M data points
- Includes data quality report (completeness, calibration flags)

### Tier 3: "Commercial Archive" — $1,499

- National-level dataset, 24 months
- All formats + direct DB dump (PostgreSQL)
- Commercial license, no attribution required
- ~100M data points
- Includes API access to updates for 6 months
- Dedicated support for data integration

### Tier 4: "Global Corpus" — $4,999

- All sensors, full historical archive (from launch)
- All formats + real-time streaming updates for 12 months
- Enterprise commercial license, redistribution rights
- ~500M+ data points and growing
- Quarterly data quality reports
- Custom aggregation and anonymization on request

### Data Marketplace Split

When the data originates from a **Premium Data Provider** (e.g., a university with research-grade sensors), the revenue split is:
- **ENViroSwarm:** 30% platform fee
- **Data Provider:** 70% royalty

This creates a **residual income flywheel** for high-quality sensor hosts (see `RESIDUAL_INCOME_MECHANICS.md`).

---

## 6. White-Label / Reseller Program

### White-Label Program

**Target:** IoT manufacturers, smart city platforms, environmental consultancies that want to offer "their own" air quality platform.

| Component | Price |
|---|---|
| White-label setup fee | $2,999 one-time |
| White-label monthly license | $499 / month (minimum 12 months) |
| Unlimited API calls | Included |
| Custom domain + SSL | Included |
| Branded mobile app | $4,999 one-time (iOS + Android) |
| Custom feature development | $150 / hour |

**Example Customer:** A smart home manufacturer wants to offer "Air Quality by [Their Brand]" in their app. They pay $2,999 setup + $499/mo + $4,999 for branded mobile app. Total Year 1: **$13,986**. They charge their users $5/mo — break-even at 100 customers, profitable at 200+.

### Reseller Program

| Reseller Tier | Discount | Minimum Commitment | Target |
|---|---|---|---|
| Affiliate | 20% recurring commission | None | Bloggers, YouTubers, educators |
| Authorized Reseller | 30% discount + 10% commission | $500/mo in sales | Small consultancies, VARs |
| Premier Partner | 40% discount + co-marketing | $5,000/mo in sales | Large IoT distributors, telcos |

**Reseller terms:**
- Reseller handles first-line support for their customers.
- ENViroSwarm provides technical documentation, API keys, and escalation path.
- Reseller can bundle their own services (installation, calibration, consulting).
- Net-30 payment terms for Premier Partners.

---

## 7. Add-Ons

Add-ons allow users to customize their plan without forcing a full tier upgrade.

### SMS Alerts — $9 / month / 5 locations

- **Why:** Pro includes 5 SMS locations. Users with 20 sensors need more.
- **Pricing:** $9 for each additional 5-location pack.
- **Comparison:** BreezoMeter does not offer consumer SMS. AirVisual Premium ($9.99/mo) includes alerts but no API. We are competitively priced with vastly more utility.

### Advanced Analytics Pack — $19 / month

- **Includes:**
  - Predictive forecasting (7-day air quality prediction per location)
  - Anomaly detection with root-cause suggestions (e.g., "PM2.5 spike correlates with local construction permit")
  - Correlation analysis (cross-reference with weather, traffic, satellite fire data)
  - Custom alerting rules (e.g., "Alert me only if PM2.5 > 35 μg/m³ for 3 consecutive hours")
  - PDF report generation (weekly / monthly automated reports)
- **Target:** Consultants who need to produce client reports; researchers who need forecasting.

### Custom Dashboards Pack — $15 / month

- **Includes:**
  - 5 additional white-label embeddable dashboards (iframe / widget)
  - Custom CSS/theming per dashboard
  - Public sharing link with password protection
  - Real-time visitor analytics on shared dashboards
- **Target:** Schools displaying air quality in hallways; cities showing public dashboards; bloggers embedding live data.

### Dedicated Sensor Hosting — $49 / month

- **Includes:**
  - We host and manage your sensor (you ship it to us, or we provision one)
  - Guaranteed 99.9% uptime for that sensor
  - Monthly calibration and maintenance
  - Priority data processing (no queueing)
- **Target:** Users in remote locations without reliable internet; organizations that need guaranteed uptime for compliance.

---

## 8. Annual Discount Strategy

**Rule:** Annual plans are **2 months free** (≈ 16.7% discount).

| Tier | Monthly | Annual | Savings | Effective Monthly |
|---|---|---|---|---|
| Pro | $29 | $290 | $58 | $24.17 |
| Enterprise | $299 | $2,990 | $598 | $249.17 |
| White-Label | $499 | $4,990 | $998 | $415.83 |

### Psychology & Tactics

1. **Default to annual on checkout:** Pre-select annual; user must switch to monthly.
2. **Highlight savings:** "$58 saved — that’s a sensor module."
3. **Annual-only for first 30 days:** During public launch, offer Pro annual at $240 (extra $50 off) for the first 100 customers. This creates urgency and locks in cash.
4. **Annual lock-in residual:** Annual subscribers have 12× lower churn than monthly. Even with the discount, LTV increases by ~40%.
5. **Mid-cycle upgrades:** If a monthly user upgrades mid-month, we prorate and offer to convert to annual at the moment of upgrade (they’re already in "buying mode").

---

## 9. Trial Strategy

### 14-Day Pro Trial — No Credit Card Required

| Element | Detail |
|---|---|
| Duration | 14 days |
| Credit card | Not required |
| Access | Full Pro features (100K API, 25 sensors, 12-month history, SMS, analytics) |
| Onboarding | Day 1: Welcome email + quick-start guide. Day 3: "Connect your first sensor" nudge. Day 7: "You’re halfway through — here’s what others build." Day 12: "2 days left. Here’s how to keep your data." Day 14: Trial ends; downgrade to Free OR upgrade to Pro/Enterprise. |
| Data retention | If they don’t convert, data is retained for 30 days in case they return. After 30 days, historical data is purged but sensor contributions remain in the swarm. |
| Limitations | No API overage billing during trial (hard cap at 100K). No team invites. No white-label. |

### Trial Conversion Mechanics

1. **Day 1 — Quick Win:** Guide them to connect a sensor and see their first data point within 10 minutes. Users who connect a sensor in the first 24h convert at 3× the rate of those who don’t.
2. **Day 3 — Social Proof:** Email with 3 case studies matched to their signup persona (researcher / farmer / city planner / school).
3. **Day 7 — Usage Milestone:** "You’ve made 12,000 API calls. Here’s what you could do with 100,000 on Pro."
4. **Day 12 — Urgency + Offer:** "2 days left. Upgrade now and get your first month at 20% off."
5. **Day 14 — Graceful Downgrade:** If no conversion, they become Free tier users. We keep their sensors in the swarm (they still get basic dashboard access), making re-conversion easy.

### Trial Metrics to Track

| Metric | Target |
|---|---|
| Trial-to-signup rate | > 15% |
| Trial activation (sensor connected in 24h) | > 40% |
| Trial activation (API call made in 48h) | > 60% |
| Time-to-first-value | < 10 minutes |
| Day-14 upgrade rate | > 10% |
| Day-30 upgrade rate (post-downgrade) | > 5% |

---

## 10. Revenue Model Summary

| Stream | Year 1 Projection | Year 3 Projection | Margin |
|---|---|---|---|
| Pro Subscriptions ($29/mo) | $120K | $1.5M | ~85% gross |
| Enterprise Subscriptions ($299/mo) | $36K | $1.2M | ~90% gross |
| API Overage | $12K | $600K | ~95% gross |
| Data Licensing | $8K | $300K | ~98% gross |
| Add-ons (SMS, Analytics, Dashboards) | $4K | $200K | ~90% gross |
| White-Label / Reseller | $0 | $200K | ~75% gross |
| **Total ARR** | **$180K** | **$4.0M** | **~88% blended** |

---

## 11. Pricing Guardrails & Anti-Patterns

1. **Never compete on price with raw sensor networks.** PurpleAir is "free" because users paid $300 for hardware. Our value is calibration, aggregation, and API quality — not hardware.
2. **Never discount Enterprise by more than 20%.** Enterprise buyers expect to negotiate; build 20% headroom into the list price. A $299 list price becomes $239 with a "non-profit discount" or "annual prepay."
3. **Never grandfather forever.** Offer 12-month price locks. After that, users migrate to current pricing. This prevents zombie revenue.
4. **Never allow unlimited API on Pro.** 100K is generous but bounded. If a user needs 500K, they belong in Enterprise or on overage blocks. Unlimited API invites abuse and destroys margins.
5. **Always show competitor pricing during checkout.** "BreezoMeter charges $99/mo for basic API. You’re getting 10× more for $29." Anchoring works.

---

*Document Owner:* Business Strategy Team | *Next Review:* September 2026
