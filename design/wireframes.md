# ENViroSwarm Wireframes — Text-Based Screen Specifications

> Version: 1.0.0 | All measurements follow the 4px grid. Web = px, Mobile = dp unless noted.

---

## Table of Contents

1. [Web Dashboard Wireframes](#1-web-dashboard)
   - 1.1 Login
   - 1.2 Register
   - 1.3 Dashboard (Overview)
   - 1.4 Stations (List / Grid)
   - 1.5 Data Explorer
   - 1.6 API Keys
   - 1.7 Pricing
   - 1.8 Profile
2. [Android App Wireframes](#2-android-app)
   - 2.1 Login
   - 2.2 Register
   - 2.3 Home (Map)
   - 2.4 Stations (List)
   - 2.5 Submit Reading (Form)
   - 2.6 Data View (Chart)
   - 2.7 Profile
3. [Common Patterns](#3-common-patterns)
   - Responsive Behavior
   - Empty States
   - Loading States
   - Error States

---

## 1. Web Dashboard

### 1.1 Login Screen (`/login`)

```
+--------------------------------------------------+
|                                                  |
|              [ENViroSwarm Logo]                    |
|                (48px icon + wordmark)              |
|                                                  |
|  +------------------------------------------+    |
|  |                                          |    |
|  |  Welcome back                            |    |
|  |  Sign in to your account                 |    |
|  |                                          |    |
|  |  Email                                   |    |
|  |  +------------------------------------+  |    |
|  |  | user@example.com                   |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  Password                                |    |
|  |  +------------------------------------+  |    |
|  |  | ••••••••••        [Eye]            |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  [☑] Remember me    Forgot password?     |    |
|  |                                          |    |
|  |  +------------------------------------+  |    |
|  |  |         Sign In                    |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  ─────────── or continue with ─────────── |    |
|  |                                          |    |
|  |  [G] Google    [GH] GitHub               |    |
|  |                                          |    |
|  |  Don't have an account?  Register       |    |
|  |                                          |    |
|  +------------------------------------------+    |
|                                                  |
+--------------------------------------------------+
```

**Layout Description:**
- Full viewport height, centered content.
- Background: `--bg-base` (`#0B0F19`).
- Card: max-width 420px, centered, `--bg-surface`, border-radius 16px (`radius-xl`), padding 40px (`space-10`), border 1px solid `--border-default`.
- Logo: 48px `Radio` icon in `--primary-500` + "ENViroSwarm" text (display-xs, weight 700, letter-spacing -0.01em).
- Headline: "Welcome back" (display-sm, weight 600).
- Subheadline: "Sign in to your account" (text-lg, `--text-secondary`).
- Inputs: 48px height, `--bg-inset`, border-radius 8px (`radius-md`), padding 12px 16px.
- Password toggle: `Eye` / `EyeOff` icon button (20px, `--text-muted`) inside input, right-aligned.
- "Remember me": checkbox (16px), label text-sm `--text-secondary`.
- "Forgot password?": text-sm, `--text-link`, right-aligned, hover `--text-link-hover`.
- "Sign In" button: full-width, 48px height, primary style (`--primary-500` background, white text, weight 500).
- Divider: 1px `--border-default` line with "or continue with" text-sm `--text-muted` centered.
- Social buttons: 48px height, outline style, 50% width each, gap 12px.
- Footer: text-sm, `--text-secondary`. "Register" link in `--text-link`.

**Responsive:**
- `xs` (< 640px): card becomes full-width, 16px horizontal padding, no border-radius on left/right (or full-bleed card with 16px margin).
- `sm`+: card floats with shadow.

**Empty State:** N/A (form screen).
**Loading State:** "Sign In" button shows 16px spinner, disabled.
**Error State:**
- Field-level: red border (`--danger-500`), error text below (text-xs, `--danger-400`).
- Global: toast notification top-right (or centered banner on mobile): "Invalid email or password." with `AlertCircle` icon.

---

### 1.2 Register Screen (`/register`)

```
+--------------------------------------------------+
|                                                  |
|              [ENViroSwarm Logo]                    |
|                                                  |
|  +------------------------------------------+    |
|  |                                          |    |
|  |  Create your account                     |    |
|  |  Join the environmental data network     |    |
|  |                                          |    |
|  |  Email                                   |    |
|  |  +------------------------------------+  |    |
|  |  |                                    |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  Password                                |    |
|  |  +------------------------------------+  |    |
|  |  | ••••••••••        [Eye]            |  |    |
|  |  +------------------------------------+  |    |
|  |  [████░░░░] Weak password              |    |
|  |                                          |    |
|  |  ☑ 8+ chars   ☑ 1 uppercase            |    |
|  |  ☑ 1 number   ☑ 1 special              |    |
|  |                                          |    |
|  |  Confirm Password                        |    |
|  |  +------------------------------------+  |    |
|  |  | ••••••••••        [Eye]            |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  [☑] I agree to the Terms and Privacy   |    |
|  |                                          |    |
|  |  +------------------------------------+  |    |
|  |  |         Create Account               |  |    |
|  |  +------------------------------------+  |    |
|  |                                          |    |
|  |  Already have an account?  Sign in      |    |
|  |                                          |    |
|  +------------------------------------------+    |
|                                                  |
+--------------------------------------------------+
```

**Layout Description:**
- Same structure as Login, but with additional fields.
- Password strength bar: 4 segments, 40px wide each, 4px height, border-radius 2px. Fills left-to-right as strength increases. Colors: `#EF4444` (weak), `#F59E0B` (fair), `#3B82F6` (good), `#10B981` (strong).
- Requirement checklist: 4 items in 2x2 grid. Each item: 16px `Check` icon (green when satisfied, grey when not) + text-xs label.
- "I agree" checkbox: required. Links "Terms" and "Privacy" open in new tabs with `ExternalLink` icon.
- Submit disabled until all validations pass and checkbox checked.
- **Responsive:** Same as Login.
- **Loading:** Button shows spinner, "Creating Account..."
- **Error:** Inline field errors + toast for duplicates ("Email already registered").

---

### 1.3 Dashboard (Overview) (`/dashboard`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        [Search...]    [🔔] [👤]                 |
+------------------------------------------------------------------+
| Sidebar |                                                        |
| [🏠]Dashboard     |  +----------------------+  +----------------+ |
| [📍]Stations      |  | Total Stations       |  | Today's Reads  | |
| [📊]Data Explorer |  | [12] / 10 [⚠]        |  | [847]          | |
| [🔑]API Keys      |  | 2 near limit         |  | +12% vs yday   | |
| [💳]Pricing       |  +----------------------+  +----------------+ |
| [⚙]Settings      |  +----------------------+  +----------------+ |
|                   |  | Avg Temperature      |  | Online Status  | |
| [User Name]       |  | [23.5°C]             |  | [8/10] Online  | |
| [email]           |  | -0.3°C vs yday       |  | 2 offline      | |
|                   |  +----------------------+  +----------------+ |
|                   |                                        +---+   |
|                   |  +--------------------------------+    |Map|   |
|                   |  | Recent Activity                |    +---+   |
|                   |  | • 🌡 Station A  23.5°C  2m ago |    | 🗺|   |
|                   |  | • 💧 Station B  67%    5m ago |    +---+   |
|                   |  | • 🔊 Station C  45dB  12m ago |           |
|                   |  | • 🌡 Station A  24.1°C 15m ago|           |
|                   |  | • 💨 Station D  AQI 42  18m ago |           |
|                   |  +--------------------------------+           |
|                   |                                                |
|                   |  +----------------------------------------+   |
|                   |  | Sensor Breakdown (Last 7 Days)           |   |
|                   |  | [Bar chart: 10 sensor types, colored]  |   |
|                   |  +----------------------------------------+   |
|                   |                                                |
+------------------------------------------------------------------+
```

**Layout Description:**
- **Top Bar (56px):**
  - Left: hamburger menu (icon button, 40px, hidden on `lg`+) + "ENViroSwarm" wordmark (display-xs, weight 700).
  - Center: Global search input (320px width, 40px height, `--bg-inset`, border-radius 8px, `Search` icon left, placeholder "Search stations, data...").
  - Right: Notifications bell (icon button, 40px, badge dot for unread) + User avatar (32px circle, dropdown on click).
- **Sidebar (240px, collapsible to 64px):**
  - Background: `--bg-surface`, border-right 1px `--border-default`.
  - Nav items: 40px height, padding 12px 16px, border-radius 8px, gap 12px icon-to-text.
  - Active: background `rgba(16,185,129,0.1)`, text `--primary-400`, left border 3px solid `--primary-500`.
  - Hover: background `--bg-surface-elevated`.
  - Bottom: user mini-card (name text-sm, email text-xs `--text-muted`).
  - Collapse trigger: chevron at bottom of sidebar.
- **Main Content Area:**
  - Padding: 32px (`space-8`).
  - Max-width: 1440px, centered.
- **KPI Cards (4-column grid on xl, 2 on md, 1 on xs):**
  - Each card: `--bg-surface`, border 1px `--border-default`, border-radius 8px, padding 24px.
  - Top: label text-sm `--text-secondary` uppercase.
  - Middle: value display-lg weight 800.
  - Bottom: trend text-sm (arrow icon + percentage + "vs yesterday").
  - "Stations" card: shows "12 / 10" in `--danger-400` to indicate over-limit (upgrade prompt badge).
- **Recent Activity (2/3 width on lg):**
  - Card with header "Recent Activity" + "View All" link.
  - List: 48px rows, border-bottom 1px `--border-default`.
  - Each item: 24px sensor icon (colored) + station name (text-base) + value (text-base weight 600) + relative time (text-xs `--text-muted`).
- **Mini Map (1/3 width on lg):**
  - 280px min-height, `--bg-inset`, border-radius 8px.
  - Map tiles (dark-themed, e.g., CartoDB Dark Matter or Mapbox Dark).
  - User stations as colored pins (circle, 16px, `--primary-500` border, white center).
  - Click pin: tooltip with station name + latest reading.
- **Sensor Breakdown (full width):**
  - Bar chart card, 320px min-height.
  - 10 bars, one per sensor type, colored by chart tokens.
  - Y-axis: count of readings. X-axis: sensor names (rotated 45° on mobile).

**Responsive:**
- `xs` (< 640px): sidebar hidden, hamburger opens drawer overlay. Single column for all widgets. Map moves below activity feed. Charts scroll horizontally.
- `sm`–`md`: sidebar icon-only (64px). 2-column KPI grid.
- `lg`+: full sidebar. 4-column KPI, side-by-side activity + map.
- `2xl`: 4-column KPI, 3-column chart layout (if more charts added).

**Empty State:**
- Centered content: 64px `Radio` icon in `--text-muted`, "No stations yet" (display-sm), "Add your first station to start collecting data" (text-base `--text-secondary`), "Add Station" primary button (cta).
- Dashboard hides all widget cards, shows only empty state.

**Loading State:**
- Skeleton: 4 KPI cards as grey rectangles ( `--bg-surface-raised` with shimmer), 2 rows.
- Activity list: 5 skeleton rows (40px circle + 2 lines each).
- Map: grey placeholder with pulsing `Map` icon.
- Full page: spinner overlay if initial load > 500ms.

**Error State:**
- Inline: "Failed to load dashboard data." banner at top, `--danger-500` left border, retry button.
- Per-widget: individual error messages with retry. Other widgets load independently.
- Network error: full-screen error with `WifiOff` icon, "You're offline. Retrying in 3s..." countdown.

---

### 1.4 Stations (List / Grid) (`/stations`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        ... top bar ...                           |
+------------------------------------------------------------------+
| Sidebar |  Stations (12)                              [+ Add New] |
|         |  ────────────────────────────────────────────────────  |
|         |  [All ▼] [Search stations...        🔍] [View: ▧ ▨]  |
|         |                                                        |
|         |  +----------------------+  +----------------------+   |
|         |  | [🌡] Station Alpha     |  | [💧] Station Beta     |   |
|         |  | 📍 40.7128, -74.0060  |  | 📍 34.0522, -118.2437 |   |
|         |  | 🌡 23.5°C  💧 67%      |  | 🌡 19.2°C  💧 72%     |   |
|         |  | Status: ● Online       |  | Status: ● Online       |   |
|         |  | Last: 2 min ago        |  | Last: 5 min ago        |   |
|         |  | [View] [Edit] [Delete] |  | [View] [Edit] [Delete] |   |
|         |  +----------------------+  +----------------------+   |
|         |                                                        |
|         |  +----------------------+  +----------------------+   |
|         |  | [🔊] Station Gamma     |  | [🌡] Station Delta     |   |
|         |  | ...                    |  | ...                    |   |
|         |  +----------------------+  +----------------------+   |
|         |                                                        |
|         |  [← Prev]  Page 1 of 3  [Next →]                     |
|         |                                                        |
+------------------------------------------------------------------+
```

**Layout Description:**
- Header: "Stations (12)" (display-sm) + "Add New" primary button (right-aligned).
- Filter bar: sensor type dropdown ("All"), search input (240px), view toggle (grid `⊞` / list `☰` icon buttons, 32px).
- **Grid View (default):**
  - 3 columns on `lg`+, 2 on `md`, 1 on `sm`.
  - Card: `--bg-surface`, border 1px `--border-default`, border-radius 8px, padding 24px.
  - Top: 40px sensor icon circle (colored by dominant sensor type, or `--primary-500` default) + station name (display-xs) + `ChevronRight` (float right, `--text-muted`).
  - Coordinates: text-sm `--text-muted`, `MapPin` icon.
  - Latest readings: row of up to 3 sensor chips (text-xs, `--bg-surface-raised`, border-radius 4px, icon + value + unit).
  - Status: dot (8px, `--success-500` or `--danger-500`) + "Online" / "Offline" text-sm.
  - Last reading: text-xs `--text-muted`.
  - Actions (bottom): "View" (ghost), "Edit" (ghost), "Delete" (ghost, danger hover). Icon buttons 32px.
- **List View:**
  - Table: full-width, same styling as Data Explorer table.
  - Columns: Name, Location, Sensors, Status, Last Reading, Actions.
  - More compact, good for bulk operations.
- Pagination: centered below grid, 32px buttons, active page `--primary-500` background.

**Responsive:**
- `xs`: single column cards, filter bar stacks vertically (dropdown, search, view toggle each full-width).
- `sm`+: filter bar horizontal.

**Empty State:**
- "No stations found." with `Radio` icon, "Add your first station to get started." + "Add Station" button.
- If search returns no results: "No stations match '{query}'." + "Clear Filters" button.

**Loading State:**
- Grid: 6 skeleton cards (grey rectangles with shimmer).
- List: 8 skeleton table rows.

**Error State:**
- Banner: "Failed to load stations." + retry.
- Delete error: "Cannot delete station with active readings." inline or toast.

---

### 1.5 Data Explorer (`/data/explorer`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        ... top bar ...                           |
+------------------------------------------------------------------+
| Sidebar |  Data Explorer                                           |
|         |  ──────────────────────────────────────────────────────  |
|         |  [Station: All Stations ▼] [Sensor: Temperature ▼]       |
|         |  [Range: Last 7 days ▼] [Agg: Daily avg ▼] [Apply]    |
|         |  ──────────────────────────────────────────────────────  |
|         |                                                        |
|         |  +--------------------------------+  +----------------+ |
|         |  |                                |  | Stats          | |
|         |  |    [Line Chart]                |  | Count: 1,247   | |
|         |  |                                |  | Avg: 23.5°C    | |
|         |  |  °C  |    ╱╲                   |  | Min: 18.2°C    | |
|         |  |  30  |   ╱  ╲                   |  | Max: 31.4°C    | |
|         |  |  20  |  ╱    ╲____             |  | StdDev: 2.8    | |
|         |  |  10  | ╱           ╲___         |  |                | |
|         |  |   0  +─────────────────────     |  | Trend: ↑ +4.2% | |
|         |  |      M  T  W  T  F  S  S        |  | vs last week   | |
|         |  |                                |  +----------------+ |
|         |  +--------------------------------+  +----------------+ |
|         |  | [📥 CSV] [📥 JSON] [🔗 Share]  |  | Anomalies: 3   | |
|         |  +--------------------------------+  +----------------+ |
|         |                                                        |
|         |  +--------------------------------------------------+   |
|         |  | Timestamp    Station    Sensor    Value   Unit   |   |
|         |  | ─────────────────────────────────────────────────  |   |
|         |  | 2025-06-30  Station A  Temp      23.5    °C    |   |
|         |  | 2025-06-30  Station B  Temp      19.2    °C    |   |
|         |  | 2025-06-29  Station A  Temp      22.8    °C    |   |
|         |  | ...                                              |   |
|         |  +--------------------------------------------------+   |
|         |  [25 / page ▼]  [← Prev] 1 2 3 ... 12 [Next →]     |
|         |                                                        |
+------------------------------------------------------------------+
```

**Layout Description:**
- **Filter Bar (sticky):**
  - Background: `--bg-surface` with bottom border 1px `--border-default`.
  - Padding: 16px vertical, 32px horizontal.
  - Dropdowns: 40px height, `--bg-inset`, border-radius 8px.
  - "Apply" button: primary, 40px height.
  - Saved filters: chips below ("Last Week", "My Stations", etc.) with `X` dismiss.
- **Chart Area (60% width on lg+):**
  - Card: `--bg-surface`, border-radius 8px, padding 24px, min-height 400px.
  - Header: "Temperature over Last 7 Days" (display-xs) + chart type toggle (line/bar/area icon buttons, 32px).
  - Line chart: grid lines `--border-default`, axis labels text-xs `--text-muted`, line `--chart-temp` 2px.
  - Brush (zoom) at bottom: 24px height, `--primary-500` tint.
  - Tooltip: `--bg-surface-elevated`, border-radius 8px, padding 12px, shadow.
- **Stats Panel (right, 40% width):**
  - Card with title "Statistics" (text-sm weight 600 uppercase).
  - Stats: label + value pairs. Value: display-xs weight 700. Trend: arrow + color.
  - Anomalies: count badge with `--warning-500` background.
- **Action Bar (below chart):**
  - Left: "Download CSV", "Download JSON", "Share Link" (ghost buttons, 32px height, icon + text).
  - Right: "Copy API Query" (if pro, else disabled with lock icon + tooltip).
- **Data Table (full width below):**
  - Same styling as global table spec.
  - 7 columns: Timestamp, Station, Sensor Type, Value, Unit, Status (dot), Actions (edit/delete for owner).
  - Horizontal scroll on `xs` with sticky first column (timestamp).

**Responsive:**
- `xs`–`md`: chart and stats stack vertically (chart 100%, stats below). Table horizontal scroll. Filter bar wraps (2 per row).
- `lg`+: side-by-side layout.
- Mobile web: tabs at top — "Chart" | "Table" | "Stats" — only one visible at a time.

**Empty State:**
- Chart: "No data for selected filters." with `BarChart3` icon, "Try adjusting your date range or sensor type." + "Reset Filters" button.
- Table: "No readings found." centered in table container.

**Loading State:**
- Chart: skeleton rectangle with shimmer.
- Stats: 5 skeleton stat rows (40px each).
- Table: 10 skeleton rows.
- Filter bar: disabled during load.

**Error State:**
- "Failed to load data." overlay on chart with retry button.
- Export error: "Export failed. Please try again." toast.
- Rate limit: "Too many requests. Please wait 60 seconds." with countdown.

---

### 1.6 API Keys (`/api-keys`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        ... top bar ...                           |
+------------------------------------------------------------------+
| Sidebar |  API Keys                                [+ Generate Key]|
|         |  ──────────────────────────────────────────────────────  |
|         |  [Info banner: "Your API keys grant access..."]          |
|         |                                                        |
|         |  +--------------------------------------------------+   |
|         |  | Name          | Key              | Created | Actions|   |
|         |  | ─────────────────────────────────────────────────  |   |
|         |  | Python Script | es_live_****xxxx | 2d ago  | [📋][🗑] |   |
|         |  | Read: data    | Active           |         |        |   |
|         |  | Research Proj | es_live_****yyyy | 5d ago  | [📋][🗑] |   |
|         |  | Read: data    | Active           |         |        |   |
|         |  | Write: ingest |                  |         |        |   |
|         |  +--------------------------------------------------+   |
|         |                                                        |
|         |  [Usage stats: 12,340 requests this month, 99.2% OK]  |
|         |                                                        |
+------------------------------------------------------------------+
```

**Layout Description:**
- Same header + sidebar pattern.
- Info banner: `--bg-surface-elevated`, left border 4px `--info-500`, padding 16px, text-sm.
- **Key Table:**
  - Columns: Name, Key (masked), Permissions (chips), Created, Last Used, Status, Actions.
  - Row height: 56px.
  - Key cell: `es_live_` prefix + last 4 chars, rest masked with `••••`. Copy button (24px) adjacent.
  - Status: dot + text ("Active" green, "Revoked" grey).
  - Actions: Copy icon button, Edit icon button, Revoke (trash, danger hover).
- **Usage Stats (below table, collapsible):**
  - Bar chart: requests per day (last 30 days).
  - Summary cards: Total requests, Success rate, Top endpoint, Remaining rate limit.
- **Generate Key Modal:** See User Flows §5.3.

**Responsive:**
- `xs`: table becomes card list (each key as a card with stacked rows). Actions at bottom.
- `sm`+: table view.

**Empty State:**
- "No API keys yet." with `Key` icon (64px), "Generate your first key to integrate with ENViroSwarm." + "Generate Key" primary button.

**Loading State:**
- Skeleton table (5 rows).
- Stats hidden until data loaded.

**Error State:**
- "Failed to load API keys." with retry.
- Revoke error: toast "Unable to revoke key. Please try again."

---

### 1.7 Pricing (`/pricing`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        ... top bar ...                           |
+------------------------------------------------------------------+
| Sidebar |  Simple, transparent pricing                             |
|         |  Start free, scale as you grow.                        |
|         |  [Monthly] [Annual — Save 20%]                         |
|         |                                                        |
|         |  +----------------+  +----------------+  +----------------+ |
|         |  | Free           |  | Pro           |  | Enterprise      | |
|         |  | $0/month       |  | $29/month     |  | $299/month     | |
|         |  |                |  | [Most Popular]|  |                | |
|         |  | ✓ 1 station    |  | ✓ 10 stations |  | ✓ Unlimited    | |
|         |  | ✓ 100 reads/day|  | ✓ 10K/day     |  | ✓ Unlimited    | |
|         |  | ✓ 7-day data   |  | ✓ 90-day data |  | ✓ 2-year data  | |
|         |  | ✗ No API       |  | ✓ 1 API key   |  | ✓ 10 API keys  | |
|         |  |                |  | ✓ Email support|  | ✓ SLA + Support| |
|         |  | [Current Plan] |  | [Upgrade]     |  | [Contact Sales]| |
|         |  +----------------+  +----------------+  +----------------+ |
|         |                                                        |
|         |  [Full Feature Comparison Table — expandable]            |
|         |                                                        |
+------------------------------------------------------------------+
```

**Layout Description:**
- No sidebar on this page (or collapsed). Full-width centered content.
- Max-width: 1200px, centered.
- Header: "Simple, transparent pricing" (display-lg, centered), subheadline (text-lg, `--text-secondary`, centered).
- Toggle: pill-shaped switch (Monthly / Annual), 40px height, `--bg-surface-raised` background, active side `--primary-500` with white text. "Save 20%" badge on Annual.
- **Three Cards:**
  - Equal width (33%), gap 24px, stacked vertically on `xs`.
  - Free: default border, no accent. CTA: disabled if current plan.
  - Pro: 2px solid `--tier-pro` border, top accent bar 4px `--tier-pro`. "Most Popular" badge: absolute top, centered, `--primary-500` background, pill.
  - Enterprise: default border, `--tier-enterprise` accent on CTA hover.
- Each card: padding 32px.
  - Price: display-xl weight 800 + "/month" text-sm.
  - Feature list: 16px `Check` icon (`--success-500`) or 16px `X` icon (`--text-muted`) + text-sm. Gap 12px between items.
  - CTA: full-width, 48px height.
- **Comparison Table:**
  - Full-width below cards, collapsible (accordion).
  - Sticky header row, 48px height.
  - Alternating row backgrounds: `--bg-surface` / `--bg-inset`.
  - Feature names left-aligned, tier columns centered with check/x.

**Responsive:**
- `xs`: cards stack vertically, full-width. Toggle centered. Table horizontal scroll.
- `sm`+: 3-column card layout.

**Empty State:** N/A (static marketing page).
**Loading State:** Prices shimmer (rare, but if fetched from API).
**Error State:** "Unable to load pricing." with retry.

---

### 1.8 Profile (`/profile`)

```
+------------------------------------------------------------------+
| [≡] ENViroSwarm        ... top bar ...                           |
+------------------------------------------------------------------+
| Sidebar |  Profile                                               |
|         |  ──────────────────────────────────────────────────────  |
|         |                                                        |
|         |  +----------------+  +------------------------------+   |
|         |  | [👤]            |  | Account Information          |   |
|         |  | Change Photo     |  | Name: [John Doe          ]   |   |
|         |  |                  |  | Email: [john@example.com ]   |   |
|         |  | Tier: Pro        |  |                              |   |
|         |  | Expires: 2025-08 |  | [Save Changes]              |   |
|         |  +----------------+  +------------------------------+   |
|         |                                                        |
|         |  +------------------------------+  +----------------+   |
|         |  | Subscription                  |  | Security       |   |
|         |  | Current: Pro ($29/mo)         |  | Password: [••••]|   |
|         |  | Renews: Aug 15, 2025          |  | [Change]       |   |
|         |  | [Manage Billing] [Cancel]     |  | 2FA: [Toggle]  |   |
|         |  +------------------------------+  +----------------+   |
|         |                                                        |
|         |  +------------------------------+                      |
|         |  | Danger Zone                   |                      |
|         |  | Delete all data and account    |                      |
|         |  | [Delete Account] — danger btn |                      |
|         |  +------------------------------+                      |
|         |                                                        |
+------------------------------------------------------------------+
```

**Layout Description:**
- Left card: avatar (96px circle, `--bg-surface-raised`, initials if no photo), "Change Photo" link (text-sm `--text-link`), tier badge (`--tier-pro` colored pill), expiry date text-xs.
- Right card: form fields (Name, Email), disabled until edit mode.
- Below: 2-column grid (`lg`+), stacked on mobile.
  - Subscription card: plan name, price, renewal date. "Manage Billing" (secondary), "Cancel" (ghost, danger hover).
  - Security card: password change button (opens modal), 2FA toggle (future).
- Danger Zone: full-width card at bottom, `--danger-500` border. "Delete Account" button (outline danger). Opens confirmation modal with re-authentication.

**Responsive:**
- `xs`: single column, avatar centered above form.
- `sm`+: avatar left, form right.

**Empty State:** N/A.
**Loading State:** Skeleton form, spinner on avatar.
**Error State:** "Failed to save changes." inline below form. Delete error: modal with specific reason.

---

## 2. Android App

### 2.1 Login Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|                                  |
|                                  |
|         [🌿]                     |
|      ENViroSwarm                 |
|      (Logo, 64dp)                |
|                                  |
|    Welcome Back                  |
|    Sign in to continue           |
|                                  |
|  +----------------------------+  |
|  | Email                      |  |
|  | john@example.com           |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Password           [Eye]   |  |
|  | ••••••••••                 |  |
|  +----------------------------+  |
|                                  |
|  [☐] Remember me                 |
|                                  |
|  +----------------------------+  |
|  |         Sign In            |  |
|  +----------------------------+  |
|                                  |
|  Forgot Password?                |
|                                  |
|  ─────── or continue with ───────|
|                                  |
|  [G] Google   [Apple]            |
|                                  |
|  Don't have an account? Register |
|                                  |
|  +----------------------------------+
|  |  Home Indicator (34dp)           |
|  +----------------------------------+
```

**Layout Description:**
- Background: `--bg-base` (`#0B0F19`).
- Safe area: `SafeAreaView` top and bottom.
- Vertical padding: 20dp horizontal, content centered vertically with `justifyContent: 'center'`.
- Logo: 64dp `Radio` icon, `--primary-500`, centered. App name below: 22dp (`display-sm`), weight 700, centered.
- Headline: "Welcome Back" (22dp, weight 600), centered.
- Subheadline: "Sign in to continue" (14dp, `--text-secondary`), centered.
- Inputs: 56dp height, `--bg-inset`, border-radius 12dp, padding 16dp horizontal.
  - Label: floating or inline (14dp, `--text-secondary`, margin-bottom 8dp).
  - Password: `Eye` / `EyeOff` icon (24dp) inside right padding.
- "Remember me": checkbox (24dp touch target) + label (14dp).
- "Sign In" button: 56dp height, full-width minus 40dp padding, `--primary-500`, border-radius 12dp, text 16dp weight 500.
- "Forgot Password?": 14dp, `--text-link`, centered.
- Social buttons: 48dp height, outline style, 50% width minus 8dp gap.
- "Register" link: 14dp, `--text-link`.
- Keyboard: `KeyboardAvoidingView behavior="padding"`. Submit button stays visible above keyboard.

**Responsive / Safe Areas:**
- Notch: additional 24dp top padding via `SafeAreaView`.
- Home indicator: 34dp bottom safe area (or 16dp minimum).
- Landscape: scrollable, logo shrinks to 48dp, social buttons hidden or moved below.

**Empty State:** N/A.
**Loading State:** Button shows `ActivityIndicator` (spinner), disabled. Input fields disabled.
**Error State:**
- Field-level: red border (2dp, `--danger-500`), error text below (12dp, `--danger-400`).
- Global: `Snackbar` at bottom (above nav/home indicator): "Invalid email or password." with `AlertCircle` icon, 4s auto-dismiss.

---

### 2.2 Register Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|                                  |
|         [🌿]                     |
|      ENViroSwarm                 |
|                                  |
|    Create Account                |
|    Join the network              |
|                                  |
|  +----------------------------+  |
|  | Email                      |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Password           [Eye]   |  |
|  +----------------------------+  |
|  [████░░░░] Weak                 |
|  [☑] 8+ chars  [☑] Uppercase     |
|  [☑] Number    [☑] Special       |
|                                  |
|  +----------------------------+  |
|  | Confirm Password   [Eye] |  |
|  +----------------------------+  |
|                                  |
|  [☐] I agree to Terms & Privacy |
|                                  |
|  +----------------------------+  |
|  |      Create Account        |  |
|  +----------------------------+  |
|                                  |
|  Already have an account? Sign in|
|                                  |
+----------------------------------+
```

**Layout Description:**
- Scrollable `ScrollView` with `KeyboardAvoidingView` wrapper.
- Same logo and header as Login.
- Password strength bar: 4 segments, 40dp each, 4dp height, `--border-default` background, fills with color as strength increases.
- Requirement checklist: 2x2 grid, 16dp `Check` icon + 12dp text.
- "I agree": checkbox + tappable links for Terms and Privacy (open in browser or in-app webview).
- Submit disabled until all requirements met and checkbox checked.
- All other patterns same as Login.

**Loading State:** Same as Login.
**Error State:**
- Duplicate email: `Snackbar` "Email already registered." + "Sign In" action button.
- Password mismatch: inline below confirm password field.

---

### 2.3 Home (Map) Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|  [≡] ENViroSwarm    [🔍] [🔔]    |
+----------------------------------+
|                                  |
|                                  |
|                                  |
|         [MAP VIEW]               |
|         Dark-themed tiles        |
|                                  |
|         [●] Station Alpha        |
|         [●] Station Beta         |
|         [●] Station Gamma        |
|                                  |
|                                  |
|                                  |
+----------------------------------+
|  [📍]  [📊]  [+]  [🔑]  [👤]    |
|  Map  Data  Add   API   Profile  |
|  (Bottom Nav, 56dp each)         |
+----------------------------------+
|  Home Indicator (34dp)           |
+----------------------------------+
```

**Layout Description:**
- Full-screen map (Mapbox / Google Maps / React Native Maps) with dark theme.
- Top bar: 56dp height, `--bg-surface` with 80% opacity (translucent), blur effect.
  - Left: hamburger menu (opens drawer) or app logo.
  - Right: search icon (opens search overlay) + notifications icon (badge dot if unread).
- Map pins: 24dp circles, colored by sensor type (or `--primary-500` default), white border 2dp, shadow.
  - Active pin: scale 1.2, border 3dp `--primary-400`, pulse animation ring.
  - Cluster: larger circle with count text.
- Tap pin: bottom sheet (240dp initial height, draggable to 80% screen) slides up:
  - Sheet header: drag handle (40dp wide, 4dp height, `--border-strong`, centered, 8dp from top).
  - Station name (22dp), status dot, last reading time.
  - Latest readings: horizontal scroll of sensor chips.
  - "View Details" button + "Submit Reading" button.
- **FAB (Floating Action Button):**
  - 56dp circle, `--primary-500` background, white `PlusCircle` icon.
  - Position: 16dp from right edge, 16dp above bottom nav (72dp from bottom).
  - On tap: opens station selection → submit flow.
- **Bottom Navigation (56dp height):**
  - Background: `--bg-surface`, top border 1dp `--border-default`.
  - 5 items: Map (active), Data, Add (raised, 56dp circle with different background — `--primary-500`), API Keys, Profile.
  - Active: icon `--primary-500`, label `--primary-400`, weight 600. Top 2dp indicator line.
  - Inactive: icon `--text-muted`, label `--text-muted`, weight 400.
  - Tap feedback: ripple from touch point, 200ms.

**Responsive:**
- Landscape: bottom nav moves to left side (72dp width), map fills rest. FAB repositioned.
- Tablet: bottom sheet opens as right-side drawer (320dp width).

**Empty State (no stations):**
- Centered: 64dp `MapPin` icon, "No stations on the map yet", "Add your first station to see it here." + "Add Station" button.
- Map still shows public data (if any) as grey/blue dots.

**Loading State:**
- Map: grey placeholder with `Map` icon and "Loading map..." text.
- Pins: appear with 200ms stagger fade-in as data loads.

**Error State:**
- "Unable to load map data." `Snackbar` with retry.
- GPS unavailable: "Location services disabled. Enable in settings." with link to app settings.

---

### 2.4 Stations (List) Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|  [←] Stations (12)    [+ Add]    |
+----------------------------------+
|  [All ▼] [Search...      🔍]     |
+----------------------------------+
|                                  |
|  +----------------------------+  |
|  | [🌡] Station Alpha         |  |
|  | 📍 40.7128, -74.0060       |  |
|  | 🌡 23.5°C  💧 67%  🔊 45dB |  |
|  | ● Online  • 2 min ago      |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | [💧] Station Beta          |  |
|  | ...                        |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | [🔊] Station Gamma         |  |
|  | ...                        |  |
|  +----------------------------+  |
|                                  |
|  (pull to refresh)               |
|                                  |
+----------------------------------+
|  [📍]  [📊]  [+]  [🔑]  [👤]    |
+----------------------------------+
```

**Layout Description:**
- Header: 56dp, back arrow (if drilled in) or hamburger, title "Stations (12)" (22dp), "Add" icon button (40dp) right.
- Filter bar: 48dp, sensor type dropdown (32dp height), search input (fills remaining).
- **List cards:**
  - Full-width minus 20dp horizontal padding.
  - 88dp min-height (but auto-expands for content).
  - `--bg-surface`, border-radius 12dp, margin-bottom 12dp, padding 16dp.
  - Top row: 40dp icon circle (sensor type color, `Radio` icon) + station name (16dp weight 600) + `ChevronRight` (24dp, right).
  - Coordinates: 12dp, `--text-muted`, `MapPin` icon.
  - Sensor chips: horizontal scroll if > 3 sensors. Each chip: `--bg-surface-raised`, border-radius 4dp, padding 4dp 8dp, 12dp text, icon + value + unit.
  - Status row: 8dp dot (`--success-500` or `--danger-500`) + "Online" / "Offline" (12dp) + `Clock` icon + relative time (12dp `--text-muted`).
- Tap card: navigate to Station Detail (not in this wireframe, but implied: header + map + readings list + submit button).
- Swipe left: reveals "Edit" (blue) and "Delete" (red) actions.
- Pull to refresh: standard Android spinner (`--primary-500` color).

**Responsive:**
- Tablet: 2-column grid (cards side by side).
- Landscape: same as portrait, but more content visible.

**Empty State:**
- "No stations found." with `Radio` icon, "Add your first station." + button.
- Search no results: "No stations match '{query}'." + "Clear" button.

**Loading State:**
- 3 skeleton cards (shimmer animation).
- Pull to refresh: spinner at top.

**Error State:**
- `Snackbar` "Failed to load stations." with retry action.
- Delete error: "Cannot delete station with active readings." inline or alert dialog.

---

### 2.5 Submit Reading (Form) Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|  [←] Submit Reading    [✓]       |
+----------------------------------+
|                                  |
|  Station: Station Alpha          |
|  Tap to change                   |
|  ───────────────────────────────  |
|                                  |
|  What are you measuring?          |
|                                  |
|  +--------+  +--------+  +--------+ |
|  | [🌡]   |  | [💧]   |  | [🔊]   | |
|  | Temp   |  | Humidity|  | Noise  | |
|  | °C     |  | %      |  | dB     | |
|  +--------+  +--------+  +--------+ |
|  +--------+  +--------+  ...       |
|  | [🌡]   |  | [💨]   |            |
|  | Air Q  |  | CO₂    |            |
|  +--------+  +--------+            |
|                                  |
|  Enter value                     |
|  +----------------------------+  |
|  | 23.5               °C      |  |
|  +----------------------------+  |
|  [Typical range: -10 to 40°C]   |
|  [==========●=========]         |
|                                  |
|  Notes (optional)                |
|  +----------------------------+  |
|  | Near construction site     |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |      Submit Reading        |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
```

**Layout Description:**
- Header: 56dp, back arrow, title "Submit Reading" (22dp), optional checkmark (if review step is skipped).
- Station selector: row showing current station name (16dp weight 600) + `ChevronRight`. Tap opens bottom sheet for station selection.
- Divider: 1dp `--border-default`.
- "What are you measuring?": 16dp weight 600, margin-bottom 16dp.
- Sensor grid: 3 columns, gap 12dp. Each cell: 80dp x 80dp, `--bg-surface`, border-radius 12dp, centered.
  - Icon: 24dp, colored by sensor type.
  - Label: 12dp, `--text-primary`.
  - Unit: 11dp, `--text-muted`.
  - Selected: border 2dp `--primary-500`, background `rgba(16,185,129,0.1)`.
- **Value input:**
  - 56dp height, `--bg-inset`, border-radius 12dp, padding 16dp.
  - Number keyboard (Android: `numeric`).
  - Unit label inside right side (14dp, `--text-muted`).
  - Range helper: 12dp text below + visual bar (200dp, 4dp height, `--border-default` background, colored fill up to current value, marker dot).
  - Out of range: bar turns `--warning-500`, text "Warning: value outside typical range."
- **Notes:**
  - TextArea: min 80dp, max 160dp, `--bg-inset`, border-radius 12dp, padding 12dp.
  - Character counter: 0/280 (text-xs, `--text-muted`).
- **Submit button:**
  - 56dp height, full-width, `--primary-500`, border-radius 12dp, 16dp weight 500.
  - Fixed to bottom of screen (or above keyboard).
  - Disabled until valid value entered.
- **Keyboard handling:**
  - `KeyboardAvoidingView` ensures submit button is visible.
  - On keyboard open, scroll to keep focused input in view with 24dp padding.

**Responsive:**
- Landscape: sensor grid becomes 4 or 5 columns. Input and notes side by side on tablets.

**Empty State:** N/A (form).
**Loading State:** Button shows `ActivityIndicator`, disabled.
**Error State:**
- Inline field validation (red border, text below).
- Rate limit: `Snackbar` "Daily limit reached (100/100). Upgrade to Pro?" with action "Upgrade".
- Offline: `Snackbar` "Saved offline. Will sync when connected." + badge on home icon.

---

### 2.6 Data View (Chart) Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|  [←] Temperature Data            |
|  Station Alpha • Last 7 days     |
+----------------------------------+
|  [Line] [Bar] [Area]             |
|                                  |
|  +----------------------------+  |
|  |                            |  |
|  |     [Line Chart]           |  |
|  |                            |  |
|  |  30|    ╱╲                  |  |
|  |  20|   ╱  ╲___              |  |
|  |  10|  ╱      ╲              |  |
|  |   0+───────────────────     |  |
|  |    M T W T F S S            |  |
|  |                            |  |
|  +----------------------------+  |
|                                  |
|  +--------+  +--------+  +--------+|
|  | Count  |  | Avg    |  | Trend  ||
|  | 1,247  |  | 23.5°C |  | ↑ 4.2%||
|  +--------+  +--------+  +--------+|
|                                  |
|  [📥 Export] [🔗 Share] [🔍 API]  |
|                                  |
|  +----------------------------+  |
|  | Latest Readings              |  |
|  | • 23.5°C  Today, 14:32     |  |
|  | • 22.8°C  Today, 13:15     |  |
|  | • 21.9°C  Yesterday, 16:00 |  |
|  | • ...                        |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
|  [📍]  [📊]  [+]  [🔑]  [👤]    |
+----------------------------------+
```

**Layout Description:**
- Header: back arrow, title "{Sensor} Data" (22dp), subtitle "Station Name • Time Range" (12dp `--text-muted`).
- Chart type toggle: 3 pill buttons (Line, Bar, Area), 32dp height, `--bg-surface-raised`, active `--primary-500` background.
- Chart card: `--bg-surface`, border-radius 12dp, padding 16dp, 280dp min-height.
  - Uses Recharts or similar. Touch to show tooltip (crosshair + value label).
  - Pinch to zoom (if supported), or range selector below.
- Stats row: 3 equal cards, 80dp height, `--bg-surface`, border-radius 8dp.
  - Label: 12dp `--text-secondary` uppercase.
  - Value: 18dp weight 700.
- Action row: 3 ghost buttons (Export, Share, API Query).
- Readings list: card with header "Latest Readings" + scrollable list (max 4 items, "View All" link).
  - Each item: 48dp row, value (16dp weight 600) + timestamp (12dp `--text-muted`).

**Responsive:**
- Tablet: chart larger (400dp), stats and actions side-by-side.
- Landscape: chart full-width, stats row becomes right column (320dp).

**Empty State:**
- "No data for this sensor yet." + "Submit your first reading" button.

**Loading State:**
- Chart skeleton: 280dp grey rectangle with shimmer.
- Stats: 3 skeleton blocks.
- List: 4 skeleton rows.

**Error State:**
- Chart overlay: "Failed to load chart data." with retry button.
- Export error: `Snackbar` "Export failed." + retry.

---

### 2.7 Profile Screen

```
+----------------------------------+
|  Status Bar (24dp)               |
+----------------------------------+
|  [≡] Profile           [⚙]       |
+----------------------------------+
|                                  |
|         [👤]                     |
|       John Doe                     |
|     john@example.com               |
|    +--------+                      |
|    |   Pro  |  (tier badge)        |
|    +--------+                      |
|                                  |
|  +----------------------------+  |
|  | 📝 Account Settings    >   |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | 💳 Subscription          >   |  |
|  | Pro Plan — Renews Aug 15   |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | 🔐 Security              >   |  |
|  | Password, 2FA              |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | 🔔 Notifications         >   |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | ❓ Help & Support        >   |  |
|  +----------------------------+  |
|  +----------------------------+  |
|  | 🌙 Dark Mode             [●] |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |     Log Out                |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
|  [📍]  [📊]  [+]  [🔑]  [👤]    |
+----------------------------------+
```

**Layout Description:**
- Header: 56dp, hamburger or title "Profile" (22dp), settings gear icon (right).
- Avatar section: centered, 80dp circle, `--bg-surface-raised`, initials text (32dp weight 700). Name (18dp weight 600), email (14dp `--text-muted`).
- Tier badge: centered pill, `--tier-pro` background, 12dp white text, padding 4dp 12dp.
- Menu list: full-width, `--bg-surface` cards, border-radius 12dp, margin-bottom 12dp, 56dp height.
  - Left: 24dp icon (`--text-secondary`) + label (16dp).
  - Right: `ChevronRight` (24dp, `--text-muted`) or toggle switch (for Dark Mode).
  - Tap: ripple effect, navigate to sub-screen.
- "Log Out" button: full-width, 56dp, `--danger-500` background, 16dp weight 500, border-radius 12dp. Confirmation dialog: "Are you sure you want to log out?"

**Responsive:**
- Tablet: avatar and name left-aligned, menu right side (two-column).

**Empty State:** N/A.
**Loading State:** Avatar skeleton (circle), menu items greyed out.
**Error State:** Sub-screen errors (e.g., "Failed to load subscription details" in subscription screen).

---

## 3. Common Patterns

### 3.1 Responsive Behavior Summary

| Screen | `xs` (< 640px) | `sm` (640px) | `md` (768px) | `lg` (1024px) | `xl` (1280px) |
|---|---|---|---|---|---|
| Web Dashboard | Stack all, sidebar drawer | 2-col KPI | Icon sidebar, 2-col | Full sidebar, 3-col | 4-col KPI, side charts |
| Stations | 1-col cards | 2-col grid | 2-col grid | 3-col grid | 3-col grid |
| Data Explorer | Tab switch (Chart/Table) | Stacked | Side chart+stats | Side chart+stats | Full layout |
| Mobile App | Portrait stack | Portrait stack | 2-col sensor grid | 2-col cards | 2-col cards |
| Mobile Landscape | Scroll, sidebar | Scroll, sidebar | Left nav, 2-col | Left nav, 2-col | Left nav, 2-col |

### 3.2 Empty States (Universal)

Every screen that displays data must have an empty state:

```
+------------------------+
|                        |
|      [Icon 64px]       |
|      --text-muted       |
|                        |
|   "No {data} yet"      |
|   display-sm, centered  |
|                        |
|  "Description of what   |
|   this screen shows."  |
|   text-base, --text-secondary |
|                        |
|  [Action Button]       |
|  Primary, centered     |
|                        |
+------------------------+
```

**Empty State Rules:**
- Icon: 64px / 64dp, `--text-muted` or sensor-specific color.
- Title: 22dp / 24px, weight 600, `--text-primary`.
- Description: 14dp / 14px, `--text-secondary`, max 2 lines, centered.
- Action: primary button, only if there's a logical next step (e.g., "Add Station").
- If no action possible: hide button, show "Check back later."

### 3.3 Loading States (Universal)

**Skeleton Pattern:**
- Background: `--bg-surface-raised`.
- Shimmer: `linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)` animating left-to-right, 1.5s infinite.
- Card skeleton: border-radius matches final card (8px / 12dp).
- Text skeleton: 4px height lines, varying widths (40%, 60%, 80%), border-radius 2px.
- Circle skeleton: 40px / 40dp circles for avatars/icons.
- Stagger: 100ms delay between sibling skeletons.

**Spinner Pattern:**
- Page-level: centered overlay, 40px spinner, "Loading..." text-xs below.
- Inline: 16px spinner next to content.
- Button: 16px spinner replaces icon, text dims.

**Progressive Loading:**
- Load critical content first (KPIs, text), charts and images lazy-loaded.
- Show skeleton for 300ms minimum (avoids flash).
- If load < 300ms: no skeleton, direct render.

### 3.4 Error States (Universal)

**Inline Error:**
- Left border 4px `--danger-500`, background `--bg-surface`, padding 16px.
- Icon: 20px `AlertCircle`, `--danger-500`.
- Title: 14px weight 600, `--text-primary`.
- Message: 14px, `--text-secondary`.
- Action: "Retry" button (secondary, small) or link.

**Toast / Snackbar:**
- Position: bottom-center (web) or bottom above nav (mobile).
- Background: `--bg-surface-elevated`, border-radius 8px, padding 12px 16px.
- Icon: 16px / 16dp (colored by severity).
- Text: 14px / 14dp, `--text-primary`.
- Action: text button, `--primary-400`.
- Auto-dismiss: 4s. Swipe to dismiss on mobile.
- Max: 3 toasts stacked vertically with 8px gap.

**Full-Screen Error:**
- Centered: 64px `WifiOff` or `AlertCircle` icon, `--danger-500`.
- Title: "Something went wrong" (display-sm).
- Message: specific error text (text-base, `--text-secondary`).
- "Retry" primary button + "Go Home" ghost button.
- Offline: "You're offline. Retrying in {N}s..." with countdown.

**Error Codes & Messages:**
| Code | User Message | Action |
|---|---|---|
| 400 | "Invalid request. Please check your input." | Highlight fields |
| 401 | "Session expired. Please sign in again." | Redirect to login |
| 403 | "You don't have permission for this action." | Show upgrade prompt if tier-related |
| 404 | "Not found. It may have been deleted." | Back button |
| 429 | "Too many requests. Please wait {N}s." | Countdown, disable submit |
| 500 | "Server error. Our team has been notified." | Retry |
| Network | "Connection failed. Check your internet." | Retry |

---

*End of Wireframes Document*
