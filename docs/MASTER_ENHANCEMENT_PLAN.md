# ENViroSwarm Master Enhancement Plan

> **Document Version:** 1.0  
> **Date:** 2025-07-30  
> **Platform:** React + Tailwind (SaaS) | Expo React Native (Android) | FastAPI Backend  
> **Repo:** https://github.com/PhotonBounce/enviroswarm  
> **Status:** Draft — Awaiting Review

---

## Table of Contents

1. [Google Play Store Asset Checklist](#1-google-play-store-asset-checklist)
2. [New Scientific Features (20+)](#2-new-scientific-features-20)
3. [Collaboration Hub Architecture](#3-collaboration-hub-architecture)
4. [Visual Design System](#4-visual-design-system)
5. [Responsive Design Fix Checklist](#5-responsive-design-fix-checklist)
6. [Implementation Phases](#6-implementation-phases)
7. [Technology Choices](#7-technology-choices)

---

## 1. Google Play Store Asset Checklist

### 1.1 Account & Compliance Requirements

| Requirement | Specification | Status |
|-------------|---------------|--------|
| Developer Account | Google Play Console ($25 USD one-time fee) | ☐ |
| Identity Verification | Required for personal accounts (ID/business docs) | ☐ |
| Two-Factor Authentication | Mandatory on associated Google account | ☐ |
| App Bundle Format | **Android App Bundle (AAB)** only — APK not accepted for new apps | ☐ |
| App Signing | **Play App Signing** mandatory | ☐ |
| Target API Level | **API Level 35 (Android 15)** — required from August 31, 2025 | ☐ |
| Minimum API Level | **API Level 26 (Android 8.0)** | ☐ |
| 64-bit Architecture | **ARM64** mandatory | ☐ |
| Package Name | Unique reverse-domain format; immutable after first upload | ☐ |
| Closed Testing (Personal Accounts) | **12 opted-in testers for 14 consecutive days** before production access | ☐ |

### 1.2 Store Listing Assets (Exact Specifications)

| Asset | Dimensions | Format | Size Limit | Notes |
|-------|-----------|--------|------------|-------|
| **App Icon** | 512 × 512 px | PNG | 1 MB | No transparency (alpha) recommended; single shape |
| **Feature Graphic** | 1024 × 500 px | PNG | 1 MB | Promotional banner shown at top of store listing |
| **Phone Screenshots** | 1080–7680 px per side | PNG or JPEG | 8 MB each | Min 2, max 8; 16:9 or 9:16 ratio preferred; 1080×1920 standard |
| **7-inch Tablet Screenshots** | 1080–7680 px per side | PNG or JPEG | 8 MB each | Optional but recommended |
| **10-inch Tablet Screenshots** | 1080–7680 px per side | PNG or JPEG | 8 MB each | Optional but recommended |
| **Promo Video** | N/A | YouTube URL | — | 30 sec – 2 min; optional but strongly recommended |
| **App Name / Title** | Max 30 characters | Text | — | Cannot change from free to paid later |
| **Short Description** | Max 80 characters | Text | — | Concise value proposition |
| **Full Description** | Max 4,000 characters | Text | — | Rich formatting and emojis allowed |

### 1.3 Policy & Legal Declarations

| Form | Requirement | Notes |
|------|-------------|-------|
| **Data Safety Form** | Required for all apps | Disclose data collection, sharing, encryption, deletion |
| **Privacy Policy URL** | Required if app collects any personal data | Must be a live, accessible URL |
| **Content Rating Questionnaire** | Required | IARC questionnaire; determines age rating (PEGI/ESRB) |
| **Target Audience Declaration** | Required | If targeting children, additional COPPA/Family policies apply |
| **Permissions Declaration** | Required for sensitive permissions | SMS, call log, background location, etc. |
| **Health & Safety Declaration** | Required for health-related apps | May apply to AQI/health advice features |
| **News App Declaration** | Only if applicable | — |

### 1.4 Testing Track Sequence

```
Internal Testing → Closed Testing (12 testers, 14 days) → Open Testing → Production
         ↑                    ↑ (mandatory for personal accounts)           ↑
      Up to 100 testers    Invite-link only                            Public release
```

### 1.5 In-App Purchase (IAP) Setup

| Aspect | Recommendation |
|--------|----------------|
| IAP Need | If offering premium features, cloud storage, or advanced analytics |
| Google Play Billing | Use Google Play Billing Library v7+ |
| Product Types | Subscriptions (recommended for SaaS) or one-time consumables |
| Backend Verification | Required — verify purchases server-side via Google Play Developer API |
| Tax & Compliance | Automatic VAT/sales tax handled by Google in most regions |

---

## 2. New Scientific Features (20+)

### 2.1 Regulatory & Standards Integration

| # | Feature | Description | Data Source |
|---|---------|-------------|-------------|
| 1 | **EPA AQI Real-Time Calculator** | Calculate EPA-compliant AQI from raw sensor values using official piecewise-linear breakpoints for PM2.5, PM10, O3, CO, SO2, NO2 | `api.airnow.gov` / `www.airnowapi.org` |
| 2 | **EPA NowCast Algorithm** | Implement NowCast weighted averaging for PM2.5 and O3 to provide real-time health guidance instead of 24-hour averages | EPA Technical Specification |
| 3 | **EU EAQI Integration** | European Air Quality Index with EU-specific breakpoints and CAQI (Common Air Quality Index) | EEA / Copernicus CAMS |
| 4 | **Canadian AQHI** | Air Quality Health Index — multi-pollutant linear combination of O3, PM2.5, NO2 | Environment and Climate Change Canada |
| 5 | **Multi-Standard Comparison** | Side-by-side AQI display using EPA, EU, Chinese MEE, and Indian CPCB standards simultaneously | Internal calculation |
| 6 | **WHO 2021 Guidelines** | Compare readings against WHO 2021 Air Quality Guidelines (PM2.5: 5 µg/m³ annual, 15 µg/m³ 24h) | WHO AQG 2021 |
| 7 | **AirNow API Sync** | Pull official regulatory monitor data from the nearest government station for cross-validation | `airnowapi.org` |
| 8 | **OpenAQ Feed Integration** | Ingest and display data from 300+ global air quality monitoring networks via OpenAQ API | `api.openaq.org` |

### 2.2 Weather & Meteorological Overlays

| # | Feature | Description | Data Source |
|---|---------|-------------|-------------|
| 9 | **OpenWeatherMap Air Pollution API** | Current, forecast, and historical air quality data + weather overlays | `api.openweathermap.org/data/2.5/air_pollution` |
| 10 | **NOAA Meteorological Data** | Temperature, humidity, wind speed, barometric pressure, precipitation | NOAA NWS API / NCEI |
| 11 | **Weather-Informed Pollution Modeling** | Correlate sensor readings with meteorological conditions (inversion layers, wind dispersion) | Internal ML + weather APIs |
| 12 | **Wildfire Smoke Integration** | PM2.5 spike detection with NOAA HMS smoke plume overlay | NOAA HMS / NASA FIRMS |
| 13 | **UV Index & Solar Radiation** | Track UV exposure alongside air quality for outdoor activity recommendations | OpenWeatherMap / Copernicus |

### 2.3 Satellite & Remote Sensing Data

| # | Feature | Description | Data Source |
|---|---------|-------------|-------------|
| 14 | **NASA Earthdata MODIS AOD** | Aerosol Optical Depth overlay from MODIS/VIIRS for regional validation | `search.earthdata.nasa.gov` (LAADS DAAC) |
| 15 | **Copernicus Atmosphere Monitoring Service (CAMS)** | Global atmospheric composition forecasts and reanalysis | `ads.atmosphere.copernicus.eu` |
| 16 | **Sentinel-5P TROPOMI NO2 / SO2** | Satellite-derived trace gas column densities | Copernicus Open Access Hub |
| 17 | **NASA Earth Engine Export** | Push user-collected data to Google Earth Engine for large-scale analysis | Google Earth Engine API |
| 18 | **VIIRS Nighttime Lights Layer** | Human activity proxy overlay | `coedata.mines.edu/products/vnl/` |

### 2.4 Calibration, Validation & Data Quality

| # | Feature | Description | Methodology |
|---|---------|-------------|-------------|
| 19 | **Co-Location Calibration Wizard** | Step-by-step guide to co-locate sensor with reference instrument for 24–72 hours and generate correction factors | EPA Sensor Toolbox methodology |
| 20 | **R² & RMSE Validation Dashboard** | Compare user sensor data against nearest regulatory monitor with correlation coefficients | Statistical validation |
| 21 | **Drift Detection Algorithm** | Time-series anomaly detection to flag sensor drift using control charts (Cusum, EWMA) | Statistical process control |
| 22 | **Outlier Flagging & Interpolation** | Auto-flag physically impossible values; use forward-fill + spatiotemporal kriging for gaps | Z-score + Kriging |
| 23 | **Sensor Metadata Logging** | Automatic capture of temperature, humidity, firmware version, and calibration date for each measurement | Internal logging |
| 24 | **Cross-Sensor Network Validation** | When multiple ENViroSwarm sensors are near each other, compare readings and flag discrepancies | Peer validation algorithm |
| 25 | **Unit Conversion Engine** | Automatic conversion between µg/m³, ppm, ppb, AQI values, and custom national standards | Internal calculator |
| 26 | **Data Completeness Scoring** | Percentage of valid readings per hour/day; quality grade A–F based on completeness and validation | ISO 8000-inspired |

### 2.5 Citizen Science & Collaboration

| # | Feature | Description | Integration |
|---|---------|-------------|-------------|
| 27 | **iNaturalist Bio-Observation Overlay** | Show species observations near sensor locations to correlate biodiversity with air quality | iNaturalist API |
| 28 | **Safecast Data Contribution** | Export radiation/environmental data in Safecast-compatible format for open data sharing | Safecast API format |
| 29 | **Public Lab Community Sync** | Integration with Public Lab’s open research notes and community toolkits | Public Lab API / RSS |
| 30 | **Open Data Export (NetCDF / GeoJSON)** | Export datasets in standardized scientific formats for GIS and research tools | NetCDF4, GeoJSON, GeoTIFF |
| 31 | **FAIR Data Compliance** | Ensure data is Findable, Accessible, Interoperable, Reusable with DOI-ready metadata | FAIR principles |
| 32 | **Research Notebook** | Markdown-based digital field notebook with timestamped observations, photos, and sensor readings | Internal |
| 33 | **Institutional Dashboard Sharing** | One-click sharing of datasets to institutional repositories (Zenodo, Figshare) | Zenodo API, Figshare API |

---

## 3. Collaboration Hub Architecture

### 3.1 Vision: The ENViroSwarm Portal

A **"GitHub for Environmental Data"** — a web-based collaboration hub where scientists, policymakers, citizen scientists, and educators can share, visualize, and analyze environmental datasets together.

### 3.2 Hub Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                    ENViroSwarm Portal                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Explore │  │  Datasets│  │  Projects│  │ Community│  │
│  │   Map    │  │  Library │  │  / Teams │  │  Forum   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Shared Visualization Workspace              │   │
│  │  • Layered map with togglable data sources           │   │
│  │  • Time-series comparison charts                     │   │
│  │  • Correlation matrices (pollutant vs. weather)      │   │
│  │  • Heatmaps & spatial interpolation (Kriging)        │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Analysis  │  │   Export   │  │  Citation & DOI    │  │
│  │  Notebooks │  │  Pipeline  │  │  Attribution       │  │
│  │ (Python/R) │  │(NetCDF/CSV)│  │  (Data Provenance) │  │
│  └────────────┘  └────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Core Collaboration Features

| Feature | Inspiration | Description |
|---------|-------------|-------------|
| **Dataset Forking** | GitHub | Clone any public dataset into your own workspace for independent analysis |
| **Versioned Data** | Git | Track changes to datasets over time; view diffs between measurement campaigns |
| **Pull Requests** | GitHub | Propose corrections or calibrations to community datasets; peer review required |
| **Shared Map Layers** | ArcGIS Online | Publish sensor networks as shareable web map layers with custom symbology |
| **Interactive Dashboards** | Tableau Public | Build drag-and-drop dashboards from shared datasets; embed anywhere |
| **Project Workspaces** | Google Earth Engine | Group datasets, notebooks, and collaborators into bounded research projects |
| **Annotation Layers** | Google Earth | Add comments, photos, and research notes pinned to specific geospatial coordinates |
| **Real-Time Collaboration** | Figma | Multiple users view and annotate the same map/chart simultaneously |
| **API Access Tokens** | GitHub PAT | Generate scoped API keys for institutional access to raw and processed data |
| **Data Provenance Graph** | Provenance standards | Visual chain of custody from sensor → calibration → analysis → publication |

### 3.4 User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Observer** | View public datasets and maps; no login required |
| **Contributor** | Upload sensor data; create personal dashboards; join public projects |
| **Analyst** | Run analysis notebooks; export data; create shared projects |
| **Project Lead** | Manage project members; curate datasets; publish findings |
| **Institutional Admin** | Bulk user management; SSO integration; custom data retention policies |
| **Platform Admin** | Full access; content moderation; feature flags; system health |

### 3.5 Portal Data Model

```
Organization → Projects → Datasets → Measurements
                    ↓
               Notebooks (Jupyter-like)
                    ↓
               Dashboards (shared/embeddable)
                    ↓
               Publications (DOI-linked)
```

---

## 4. Visual Design System

### 4.1 Design Philosophy

Shift from **emerald green** (growth/nature) to **teal/blue** (science/technology/water/atmosphere) to communicate precision, trustworthiness, and scientific credibility.

### 4.2 Primary Color Palette

| Token | Hex Code | Usage | Tailwind Class |
|-------|----------|-------|----------------|
| **Teal 50** | `#f0fdfa` | Light backgrounds, hover states | `bg-teal-50` |
| **Teal 100** | `#ccfbf1` | Subtle highlights, badges | `bg-teal-100` |
| **Teal 200** | `#99f6e4` | Borders, dividers | `border-teal-200` |
| **Teal 300** | `#5eead4` | Secondary accents | `text-teal-300` |
| **Teal 400** | `#2dd4bf` | Active states, icons | `text-teal-400` |
| **Teal 500** | `#14b8a6` | **Primary brand color** | `bg-teal-500` |
| **Teal 600** | `#0d9488` | Primary buttons, CTAs | `bg-teal-600` |
| **Teal 700** | `#0f766e` | Hover on primary buttons | `hover:bg-teal-700` |
| **Teal 800** | `#115e59` | Dark accents, headings | `text-teal-800` |
| **Teal 900** | `#134e4a` | Deep backgrounds | `bg-teal-900` |

### 4.3 Secondary Blue Palette

| Token | Hex Code | Usage | Tailwind Class |
|-------|----------|-------|----------------|
| **Sky 50** | `#f0f9ff` | Alternate light backgrounds | `bg-sky-50` |
| **Sky 200** | `#bae6fd` | Info alerts, info borders | `border-sky-200` |
| **Sky 400** | `#38bdf8` | Links, interactive elements | `text-sky-400` |
| **Sky 500** | `#0ea5e9` | **Secondary accent** | `bg-sky-500` |
| **Sky 600** | `#0284c7` | Secondary buttons | `bg-sky-600` |
| **Sky 700** | `#0369a1` | Hover on secondary | `hover:bg-sky-700` |
| **Sky 800** | `#075985` | Deep text, headings | `text-sky-800` |
| **Sky 900** | `#0c4a6e` | Dark mode backgrounds | `bg-sky-900` |

### 4.4 Semantic & AQI Color Mapping

| Level | EPA AQI Range | Hex Code | Tailwind | Usage |
|-------|---------------|----------|----------|-------|
| Good | 0–50 | `#22c55e` | `text-green-500` | Safe air quality |
| Moderate | 51–100 | `#eab308` | `text-yellow-500` | Caution for sensitive groups |
| Unhealthy (Sens.) | 101–150 | `#f97316` | `text-orange-500` | Sensitive groups at risk |
| Unhealthy | 151–200 | `#ef4444` | `text-red-500` | Everyone at risk |
| Very Unhealthy | 201–300 | `#a855f7` | `text-purple-500` | Health alert |
| Hazardous | 301–500 | `#7f1d1d` | `text-red-900` | Emergency conditions |

### 4.5 Typography & Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Font Family | `Inter`, `Roboto Mono` (for data) | Body, headings, monospace data tables |
| Base Size | 16px (1 rem) | Default body text |
| Heading Scale | 1.25 ratio (modular scale) | H1: 3.052rem, H2: 2.441rem, H3: 1.953rem |
| Line Height | 1.5 (body), 1.2 (headings) | Readability optimized |
| Border Radius | 8px (`rounded-lg`) | Cards, buttons, inputs |
| Shadow System | `shadow-sm`, `shadow-md`, `shadow-lg` | Depth hierarchy |
| Grid System | 8px base unit | All spacing in multiples of 8px |

### 4.6 Component Token Mapping (Tailwind Examples)

```jsx
// Primary Button
<button className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-colors">
  Connect Sensor
</button>

// Data Card
<div className="bg-white border border-teal-100 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
  <h3 className="text-teal-800 font-semibold">PM2.5</h3>
  <span className="text-3xl font-bold text-teal-600">12.4</span>
  <span className="text-sm text-sky-600">µg/m³</span>
</div>

// Alert Banner (Unhealthy AQI)
<div className="bg-orange-50 border-l-4 border-orange-500 text-orange-800 p-4 rounded-r">
  ⚠️ Air quality is unhealthy for sensitive groups.
</div>
```

### 4.7 Dark Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0f172a` (`slate-900`) | App background |
| Card | `#1e293b` (`slate-800`) | Elevated surfaces |
| Primary Text | `#f0fdfa` (`teal-50`) | Headings |
| Secondary Text | `#99f6e4` (`teal-200`) | Body text |
| Accent | `#2dd4bf` (`teal-400`) | Interactive elements |
| Border | `#115e59` (`teal-800`) | Subtle dividers |

---

## 5. Responsive Design Fix Checklist

### 5.1 Known Issues (Current State)

| Issue | Severity | Root Cause | Fix |
|-------|----------|------------|-----|
| Overlapping dashboard cards on <1280px | High | Fixed `min-width` on grid items without responsive breakpoints | Replace with `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` |
| Sidebar truncation on mobile | High | Absolute-width sidebar without collapse | Implement collapsible hamburger menu with `transform translate-x` |
| Map controls off-screen on 320px | Medium | Fixed-position controls at viewport edge | Use `bottom-4 right-4` with safe-area padding |
| Chart axes labels overlapping | Medium | Fixed font sizes without rotation | Add `rotate-45` on x-axis labels for mobile; reduce font size |
| Sensor table horizontal scroll | Medium | Table without responsive wrapper | Wrap in `overflow-x-auto`; use card-based layout on mobile |
| Modal overflow on small screens | High | Fixed-height modals | Use `max-h-[90vh] overflow-y-auto` with flex-shrink content |
| Touch targets < 44px | High | Small buttons and icons | Ensure minimum 44×44px touch targets per WCAG 2.5.5 |
| Font scaling issues on zoom | Low | px-based font sizes | Convert to rem-based sizes with `html { font-size: 16px }` |
| Landscape mode layout breaks | Medium | Portrait-optimized grids | Add `landscape:` Tailwind variants or CSS media queries |
| Notification toasts off-screen | Low | Fixed top-right without safe area | Use `top-4 right-4 left-4 sm:left-auto` |

### 5.2 Breakpoint Strategy

| Breakpoint | Tailwind Prefix | Target Devices | Layout Changes |
|------------|-----------------|----------------|----------------|
| < 640px | Default | Mobile phones | Single column, collapsed nav, full-width cards |
| 640px+ | `sm:` | Large phones | Two-column grids, larger touch targets |
| 768px+ | `md:` | Tablets | Sidebar visible, three-column grids |
| 1024px+ | `lg:` | Small laptops | Full dashboard layout, expanded nav |
| 1280px+ | `xl:` | Desktops | Four-column grids, side-by-side charts |
| 1536px+ | `2xl:` | Large monitors | Max-width container, additional widgets |

### 5.3 Expo React Native Specific Fixes

| Issue | Fix |
|-------|-----|
| Status bar overlap | Use `react-native-safe-area-context` (`SafeAreaView`) |
| Keyboard pushing inputs | Use `KeyboardAvoidingView` with `behavior="padding"` |
| FlatList performance on long sensor lists | Implement `windowSize={10}`, `removeClippedSubviews={true}` |
| Touch feedback inconsistency | Standardize on `TouchableOpacity` or `Pressable` with `min-height: 44` |
| Android back button handling | Use `BackHandler` with route-aware `useFocusEffect` |
| Orientation lock vs. responsive | Support both portrait and landscape with `Dimensions` listener |

### 5.4 Verification Checklist

- [ ] Test on iPhone SE (375×667) — smallest common viewport
- [ ] Test on iPhone 14 Pro Max (430×932) — large phone
- [ ] Test on iPad Mini (768×1024) — tablet portrait
- [ ] Test on iPad Pro 12.9" (1024×1366) — tablet landscape
- [ ] Test on desktop 1920×1080, 2560×1440, 3840×2160
- [ ] Test with browser zoom 200%
- [ ] Test with system font size increased (accessibility)
- [ ] Lighthouse mobile score ≥ 90
- [ ] Lighthouse accessibility score ≥ 95
- [ ] No horizontal scroll on any breakpoint
- [ ] All interactive elements reachable via keyboard
- [ ] Screen reader labels present on all charts and icons

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1–4)

**Goal:** Stabilize the platform, fix responsiveness, and prepare for Google Play Store.

| Week | Task | Deliverable |
|------|------|-------------|
| 1 | Fix all responsive layout issues (Section 5) | Clean dashboard on all breakpoints |
| 2 | Implement teal/blue design system (Section 4) | Updated Tailwind config, component library |
| 3 | Prepare Google Play Store assets (Section 1) | Icon, feature graphic, screenshots, descriptions |
| 4 | AAB build, Play App Signing, closed testing setup | App on Google Play internal testing track |

### Phase 2: Scientific Core (Weeks 5–10)

**Goal:** Add the essential scientific features that differentiate ENViroSwarm from consumer apps.

| Week | Task | Deliverable |
|------|------|-------------|
| 5 | EPA AQI calculator + NowCast algorithm | Real-time AQI with health messaging |
| 6 | OpenAQ + AirNow API integration | Official monitor data overlay |
| 7 | OpenWeatherMap pollution + weather overlay | Weather-correlated readings |
| 8 | Multi-standard comparison (EPA, EU, WHO) | Side-by-side regulatory view |
| 9 | Calibration wizard + validation dashboard | User-facing sensor calibration tools |
| 10 | Drift detection + outlier flagging | Automated data quality scoring |

### Phase 3: Satellite & Advanced Analytics (Weeks 11–16)

**Goal:** Connect to global remote sensing and enable serious research use.

| Week | Task | Deliverable |
|------|------|-------------|
| 11 | NASA Earthdata MODIS AOD integration | Satellite AOD overlay on map |
| 12 | Copernicus CAMS integration | European forecast data layer |
| 13 | Wildfire smoke + UV index overlays | Emergency-aware alerts |
| 14 | Unit conversion engine + data completeness scoring | Scientific-grade data integrity |
| 15 | NetCDF / GeoJSON export | Standardized data export |
| 16 | Cross-sensor network validation | Peer-to-peer sensor quality checks |

### Phase 4: Collaboration Hub (Weeks 17–24)

**Goal:** Launch the ENViroSwarm Portal for team-based research.

| Week | Task | Deliverable |
|------|------|-------------|
| 17 | Portal backend architecture (FastAPI + PostgreSQL) | API design, auth, organizations |
| 18 | Dataset library + versioning | CRUD datasets, Git-like versioning |
| 19 | Shared map layers + time-series charts | Collaborative visualization |
| 20 | Project workspaces + role-based access | Team-based research environments |
| 21 | Interactive dashboards + embed sharing | Publishable, embeddable widgets |
| 22 | Analysis notebooks (Python via Pyodide or WASM) | Browser-based analysis |
| 23 | Citizen science integrations (iNaturalist, Public Lab) | Bio-observation + community sync |
| 24 | Zenodo/Figshare export + DOI prep | Citation-ready dataset publishing |

### Phase 5: Polish & Scale (Weeks 25–30)

**Goal:** Monetization, performance, and community growth.

| Week | Task | Deliverable |
|------|------|-------------|
| 25 | Google Play Store production release | Live Android app |
| 26 | In-app subscription tiering (Premium analytics) | Revenue model active |
| 27 | Performance optimization (lazy loading, caching) | <2s initial load, <100ms API response |
| 28 | Mobile app feature parity with web | Full sync between platforms |
| 29 | Documentation + API reference + tutorials | Developer portal live |
| 30 | Community outreach + institutional partnerships | Academic onboarding program |

---

## 7. Technology Choices

### 7.1 Frontend (SaaS)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Component ecosystem, concurrent features |
| Styling | Tailwind CSS 3.4+ | Utility-first, rapid theming, small bundle |
| UI Components | shadcn/ui + Radix | Accessible, unstyled primitives, easy to customize |
| State Management | Zustand | Lightweight, TypeScript-friendly, no boilerplate |
| Data Fetching | TanStack Query (React Query) | Caching, background refetch, optimistic updates |
| Charts | Tremor + Recharts | Dashboard-first charts, responsive, themable |
| Maps | MapLibre GL JS | Open-source, WebGL-accelerated, free tiles |
| Map Tiles | MapTiler Cloud or Protomaps | Cost-effective, self-hostable vector tiles |
| Date/Time | date-fns | Modular, tree-shakeable, timezone support |
| Unit Math | mathjs | Dimensional analysis, unit conversion validation |

### 7.2 Mobile (Android)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Expo SDK 50+ | Rapid iteration, OTA updates, managed workflow |
| Navigation | Expo Router | File-based routing, deep linking, TypeScript |
| Maps | react-native-maps | Native map performance, Google/Apple Maps support |
| Charts | victory-native | Native rendering, smooth interactions |
| State | Zustand (shared logic) | Code reuse with web frontend |
| Storage | MMKV | Fast, synchronous, encrypted local storage |
| Background Fetch | expo-background-fetch | Periodic sync when app is backgrounded |
| Push Notifications | expo-notifications | Cross-platform, scheduled local + remote |

### 7.3 Backend

| Layer | Technology | Rationale |
|-------|------------|-----------|
| API Framework | FastAPI (Python) | Async, auto-generated OpenAPI, high performance |
| Database | PostgreSQL 15+ | JSONB for flexible sensor metadata, PostGIS for geospatial |
| Cache | Redis | Session store, rate limiting, real-time pub/sub |
| Task Queue | Celery + Redis | Background jobs: data ingestion, calibration, exports |
| Search | Meilisearch | Instant full-text search for datasets and projects |
| Object Storage | MinIO (S3-compatible) | Dataset files, NetCDF exports, user uploads |
| Time-Series | TimescaleDB (PostgreSQL extension) | Optimized sensor time-series, hypertables, continuous aggregates |
| Auth | OAuth 2.0 + JWT | Google/GitHub/institutional SSO |
| API Gateway | Kong or Traefik | Rate limiting, auth, request/response transformation |

### 7.4 Scientific & Data Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Spatial Analysis | GeoPandas + Shapely | Python geospatial operations, CRS handling |
| Interpolation | PyKrige / scikit-gstat | Kriging for spatial gap-filling |
| NetCDF | netCDF4-python + xarray | Standard scientific data format |
| Satellite Data | sentinelsat + earthpy | Copernicus + NASA data access |
| AQI Calculation | Custom EPA formula implementation | Exact EPA breakpoints, no dependencies |
| Drift Detection | scipy.stats + statsmodels | Control charts, Cusum, EWMA |
| Notebooks | Pyodide (WASM) in browser | Zero-backend Python execution for client-side analysis |
| Export Pipeline | Apache Arrow + Parquet | Fast columnar serialization for large datasets |

### 7.5 DevOps & Infrastructure

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Containerization | Docker + Docker Compose | Local dev parity, easy deployment |
| Orchestration | Kubernetes (EKS/GKE) | Production scaling, rolling deployments |
| CI/CD | GitHub Actions | Test, build, deploy on push |
| Monitoring | Prometheus + Grafana | Metrics, alerting, dashboards |
| Logging | Loki + Grafana | Centralized log aggregation |
| Error Tracking | Sentry | Real-time crash and error reporting |
| CDN | Cloudflare | Global asset delivery, DDoS protection |
| IaC | Terraform | Reproducible cloud infrastructure |

### 7.6 Collaboration Hub Specific

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Real-Time Collaboration | Socket.io + Redis adapter | Multi-user cursors, live annotations |
| Notebook Execution | JupyterLite (Pyodide) or WASM | Client-side Python without server costs |
| Version Control | DVC (Data Version Control) | Git-like versioning for datasets |
| DOI Minting | DataCite API | Persistent identifiers for published datasets |
| Embeds | iframe + signed URLs | Secure, scoped embedding of dashboards |
| Comment System | ProseMirror / TipTap | Rich text annotations on maps and charts |

---

## Appendix A: EPA AQI Breakpoints (2024)

| AQI Category | PM2.5 (24h) | PM10 (24h) | O3 (8h) | CO (8h) | SO2 (1h) | NO2 (1h) |
|--------------|-------------|------------|---------|---------|----------|----------|
| Good (0–50) | 0.0–12.0 | 0–54 | 0.000–0.054 | 0.0–4.4 | 0–35 | 0–53 |
| Moderate (51–100) | 12.1–35.4 | 55–154 | 0.055–0.070 | 4.5–9.4 | 36–75 | 54–100 |
| Unhealthy for Sensitive (101–150) | 35.5–55.4 | 155–254 | 0.071–0.085 | 9.5–12.4 | 76–185 | 101–360 |
| Unhealthy (151–200) | 55.5–150.4 | 255–354 | 0.086–0.105 | 12.5–15.4 | 186–304 | 361–649 |
| Very Unhealthy (201–300) | 150.5–250.4 | 355–424 | 0.106–0.200 | 15.5–30.4 | 305–604 | 650–1249 |
| Hazardous (301–500) | 250.5–500.4 | 425–604 | — | 30.5–50.4 | 605–1004 | 1250–2049 |

*Units: PM2.5/PM10 in µg/m³; O3 in ppm; CO in ppm; SO2/NO2 in ppb.*

### Piecewise-Linear Formula

```
AQI = ((I_high - I_low) / (C_high - C_low)) × (C - C_low) + I_low
```

Where `C` is the truncated concentration, and `C_low`, `C_high`, `I_low`, `I_high` are the breakpoint values bounding `C`.

---

## Appendix B: API Keys & Credentials Required

| Service | API Key Needed | Free Tier | Documentation |
|---------|---------------|-----------|---------------|
| OpenWeatherMap Air Pollution | Yes | 60 calls/min | `openweathermap.org/api/air_pollution` |
| AirNow API | Yes | Unlimited (US gov) | `airnowapi.org` |
| OpenAQ API | Yes (v3) | Rate-limited | `docs.openaq.org` |
| NASA Earthdata (LAADS) | Yes (Bearer token) | Free | `ladsweb.modaps.eosdis.nasa.gov` |
| Copernicus CAMS | Yes | Free for research | `ads.atmosphere.copernicus.eu` |
| Google Earth Engine | Project + Auth | Free for research | `developers.google.com/earth-engine` |
| iNaturalist | No (public) | Unlimited | `api.inaturalist.org/v1` |
| MapTiler | Yes | 100k requests/mo | `maptiler.com` |

---

## Appendix C: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Google Play closed testing delay | Medium | High | Start tester recruitment immediately; use organization account if possible |
| EPA API downtime | Low | Medium | Cache last-known values; fallback to OpenAQ |
| Satellite data latency | High | Low | Show "last updated" timestamp; use forecast models as fallback |
| Sensor calibration user abandonment | Medium | Medium | Gamify calibration; provide auto-calibration option |
| Data storage costs (time-series) | Medium | High | Use TimescaleDB compression; tiered retention (hot/warm/cold) |
| Institutional procurement cycles | High | Medium | Freemium model; self-serve onboarding with email nurture |

---

*End of Document*
