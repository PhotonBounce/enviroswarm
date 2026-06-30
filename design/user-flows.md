# ENViroSwarm User Flows & Experience Specification

> Version: 1.0.0 | Covers: Web Dashboard (React) + Android App (React Native / Expo) | Last updated: 2025-06-30

---

## 1. Onboarding Flow

### 1.1 Flow Overview

```
[Entry: Landing Page] → [Register / Login] → [Welcome Tutorial] → [Decision Point]
                                                            ↓
                                        ┌──────────────────┼──────────────────┐
                                        ↓                  ↓                  ↓
                                  [Add First Station] [Explore Map]     [Skip for Now]
                                        ↓                  ↓                  ↓
                                  [Station Setup]    [Map Browse]     [Dashboard]
                                        ↓                  ↓
                                  [Submit First Data]  [Account Prompt]
                                        ↓
                                  [Onboarding Complete]
```

### 1.2 Entry: Landing Page (Unauthenticated)

**Web:**
- URL: `/`
- Hero section: Full-width animated gradient background (subtle dark green to dark blue), headline "Collect the Planet. Understand the World.", subheadline describing swarm network.
- CTA buttons: "Get Started — Free" (primary, large) and "Explore Public Data" (secondary, ghost).
- Below fold: Feature grid (3 cards: Mobile Collection, Real-time Dashboard, API for Researchers), animated chart preview.
- Footer: Links to API docs, pricing, GitHub, privacy policy.
- **No account required** to view public data preview (last 24h aggregate).

**Mobile (Android):**
- App opens to splash screen: logo + "ENViroSwarm" for 1.5s.
- Landing screen: same headline, illustration of sensors on a map, two buttons: "Create Account" / "Sign In".
- "Explore Without Account" link: opens read-only map with limited data (no submission, no station creation).
- Swipeable onboarding carousel (3 slides): 
  1. "Contribute sensor data from your phone or IoT devices"
  2. "Visualize environmental trends in real time"
  3. "Access curated data via API for research and planning"
- Skip button on every slide, "Get Started" on slide 3.

### 1.3 Registration

**Web — `/register`:**
- Clean centered card (max-width 420px) on `--bg-base`.
- Fields: Email, Password (with strength indicator), Confirm Password.
- Password requirements shown live:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one number
  - At least one special character
  - Each requirement gets a green check (`Check` icon) as satisfied.
- Terms checkbox (required): "I agree to the Terms of Service and Privacy Policy" (links open in new tab).
- Submit: "Create Account" primary button. On success: auto-login, redirect to `/onboarding/welcome`.
- Error states: inline field errors, toast for generic ("Email already registered").
- Social auth (future): Google / GitHub OAuth buttons below divider ("or continue with").
- Already have account? Link to `/login`.

**Mobile — Registration Screen:**
- Scrollable form with 20dp horizontal padding.
- Keyboard handling: `KeyboardAvoidingView` with `behavior="padding"`.
- Password field: toggle `Eye` / `EyeOff` for visibility.
- Password strength bar: 4 segments, fills `--danger-500` → `--warning-500` → `--primary-500` as strength increases.
- Submit button: fixed to bottom of screen (or above keyboard), 56dp height.
- Auto-capitalize off for email, auto-correct off for password.
- Success: haptic feedback (light), then navigate to Welcome screen.

### 1.4 Login

**Web — `/login`:**
- Same layout as register. Fields: Email, Password.
- "Remember me" checkbox (30-day persistent session).
- "Forgot password?" link (sends reset email, mock for MVP shows toast "Check your email").
- "Don't have an account? Register" link.
- On success: redirect to `/dashboard` or saved redirect URL.
- JWT stored in `localStorage` (access token) + `httpOnly` cookie (refresh token, future).

**Mobile — Login Screen:**
- Same as registration but simpler form.
- Biometric auth (future): "Use fingerprint / face unlock" toggle in settings.
- Token stored in `SecureStore` (Expo).
- On success: navigate to Home screen, replace stack (no back to login).

### 1.5 Welcome / First-Time Tutorial

**Web:**
- Modal overlay: "Welcome to ENViroSwarm, {name}!"
- 3-step guided tour using floating spotlight:
  1. "This is your dashboard — see all your stations at a glance."
  2. "Add your first sensor station to start contributing data." (spotlight on "Add Station" button)
  3. "Explore public data from the global network." (spotlight on "Explore" link)
- Tour can be skipped. Progress dots at bottom. "Next" / "Got it" buttons.
- After tour: decision modal — "What would you like to do first?"
  - "Add a Station" (primary) → flows to station creation
  - "Explore the Map" (secondary) → flows to map view
  - "Skip for now" (ghost) → dismisses to dashboard

**Mobile:**
- Full-screen welcome: "Welcome, {name}!" with confetti animation (Lottie or simple particles).
- Same 3-step tutorial as overlay tooltips on actual UI elements.
- After tutorial: bottom sheet with 3 options (Add Station, Explore Map, Skip).
- First-time users get a subtle "1 of 3" badge in the bottom nav for the first 3 sessions to remind them to complete setup.

### 1.6 Add First Station (Onboarding Variant)

- Pre-filled with user's current geolocation (if permission granted).
- Simplified form: Station Name (default: "My Station"), Location (lat/lon from GPS or map pick), Sensor Types (multi-select chips: temperature, humidity, etc.).
- "Create Station" button. On success: confetti/celebration, then prompt to "Submit your first reading."
- If location permission denied: show manual map picker with search bar.

### 1.7 Onboarding Completion Criteria

User is considered "onboarded" when:
1. Account created and verified (email optional for MVP).
2. At least one station created OR explicitly skipped with "Explore Without Account".
3. Onboarding flag stored in `localStorage` (web) / `AsyncStorage` (mobile).

---

## 2. Data Submission Flow (Mobile-First)

### 2.1 Flow Overview

```
[Open App] → [Select Station] → [Choose Sensor Type] → [Enter Value / Auto-Read] → [Review] → [Submit] → [Confirmation]
    ↓              ↓                      ↓                        ↓                    ↓           ↓              ↓
[Quick Action]  [Station List]     [Sensor Grid]            [Manual Input]      [Value + Unit]  [POST /api/v1/ingest]  [Success Toast]
[Notification]  [Map Tap]          [Recent History]         [Device Sensor]     [Timestamp]     [Loading]            [Home Refresh]
```

### 2.2 Entry Points

**Primary:**
- Home screen FAB (Floating Action Button): `PlusCircle` icon, 56dp, `--primary-500` background, positioned 16dp above bottom nav.
- Bottom nav "Submit" tab: `PlusCircle` icon, opens station selection if multiple stations exist.
- Push notification: "Time to submit data for Station X" (tap opens direct submission).

**Secondary:**
- Station detail screen → "Submit Reading" button.
- Deep link: `enviroswarm://submit?station_id=xxx&sensor_type=temperature`

### 2.3 Select Station

**If 1 station:** Skip this step, auto-select.

**If 2+ stations:**
- Bottom sheet (modal) slides up: "Select Station" header, draggable handle.
- List of stations with:
  - Left: station icon (40dp circle, `--primary-500` bg, `Radio` icon)
  - Title: station name (`text-base`, `--text-primary`)
  - Subtitle: last reading timestamp (`text-sm`, `--text-muted`)
  - Right: `ChevronRight` icon
- Search bar at top: filters stations by name.
- "Add New Station" button at bottom of list.
- Recent / favorite stations pinned to top.
- **Empty state:** "No stations yet. Create your first station to start submitting data." + "Create Station" primary button.

### 2.4 Choose Sensor Type

**Screen: Sensor Type Grid**
- Header: "What are you measuring?" + selected station name subtitle.
- Grid: 2 columns, 3 rows (10 types). Each cell:
  - 80dp x 80dp touch target (card style: `--bg-surface`, border-radius 12dp)
  - Top: sensor icon (24dp, colored by sensor type)
  - Label: sensor display name (text-sm, `--text-primary`)
  - Unit in smaller text below (text-xs, `--text-muted`)
- Selected state: border 2px solid `--primary-500`, background rgba(16,185,129,0.1).
- Recently used sensor types: first 2 cells in a "Recent" section above the grid.
- **Quick actions:** If device has sensor (e.g., temperature via battery thermistor, microphone for noise), show a "Use Device Sensor" chip below the grid.

**Sensor Type Display Names:**
| Enum | Display Name | Unit | Icon |
|---|---|---|---|
| `temperature` | Temperature | °C | `Thermometer` |
| `humidity` | Humidity | % | `Droplets` |
| `air_quality` | Air Quality | AQI | `Wind` |
| `noise_level` | Noise Level | dB | `Volume2` |
| `radiation` | Radiation | µSv/h | `AlertTriangle` |
| `water_quality` | Water Quality | WQI | `Waves` |
| `co2` | CO₂ | ppm | `Cloud` |
| `pm25` | PM2.5 | µg/m³ | `Factory` |
| `pm10` | PM10 | µg/m³ | `CircleDot` |
| `voc` | VOCs | ppb | `FlaskConical` |

### 2.5 Enter Value or Auto-Read

**Manual Input Mode:**
- Large numeric input: 56dp height, `--bg-inset`, border-radius 12dp.
- Number pad keyboard (if possible; otherwise standard keyboard with numeric input type).
- Unit shown inline to the right of input (e.g., "23.5 °C").
- **Range helper**: Below input, a subtle bar showing the "typical range" for this sensor type (e.g., -10°C to 40°C for temperature) with a marker for the entered value. Color changes if out of typical range (warning tint).
- **Validation**: Real-time validation with inline error.
  - Temperature: -50 to 80°C
  - Humidity: 0 to 100%
  - Noise: 0 to 140 dB
  - Radiation: 0 to 10000 µSv/h
  - CO₂: 0 to 10000 ppm
  - PM2.5 / PM10: 0 to 1000 µg/m³
  - VOC: 0 to 10000 ppb
- **Notes field**: Optional text area (max 280 chars) for context ("Near construction site", "Rainy day").

**Auto-Read Mode (Device Sensors):**
- "Use Device Sensor" toggle / button.
- If available: show live reading from device sensor updating every 500ms.
- "Capture" button: freezes the current reading and populates the input.
- Supported sensors:
  - Temperature: battery thermistor (approximate), ambient temperature sensor (if available)
  - Noise: microphone dB estimation (requires permission)
  - Humidity: some devices have humidity sensors (rare)
- If sensor unavailable: disable button with tooltip "No compatible sensor on this device."

**Timestamp:**
- Default: current time (`auto`)
- Optional: "Set custom time" for backdated readings (max 7 days back for free tier, 90 days for pro).
- Time picker: native Android time picker for mobile, custom dropdown for web.

### 2.6 Review & Submit

**Review Screen:**
- Summary card showing:
  - Station: name + location (lat/lon rounded to 4 decimals)
  - Sensor: icon + name + value + unit (large, 32dp display-sm font)
  - Timestamp: human-readable ("Today, 14:32")
  - Notes: if provided
- "Edit" button to go back and change value.
- **Submit button**: Full-width at bottom, 56dp, primary style. Label: "Submit Reading".
- **Loading state**: Button shows spinner, disabled, text "Submitting...".
- **Error state**: If API fails (network, rate limit), show inline error + "Retry" button.
  - Free tier rate limit: "You've reached your daily limit (100/100). Upgrade to Pro for more." + "Upgrade" link.

### 2.7 Confirmation

**Success:**
- Toast: "Reading submitted!" with `Check` icon, `--success-500` accent, slides up from bottom, auto-dismisses in 4s.
- Haptic feedback: light success vibration.
- Station detail screen updates: latest reading card animates in with the new value.
- Points / streak update (if gamification implemented): subtle "+1" float animation.
- "Submit another" button (secondary) + "Done" button (primary, goes to home).

**Failure:**
- Inline error with retry.
- If offline: queue reading locally. Show "Saved offline — will sync when connected" badge. Display pending count in home badge.

---

## 3. Data Exploration Flow (Web Dashboard)

### 3.1 Flow Overview

```
[Login] → [Dashboard Overview] → [Select Station / Filter] → [View Charts] → [Drill Down] → [Export / Share]
                                            ↓                      ↓              ↓
                                     [Quick Filters]          [Time Range]     [Data Table]
                                     [Search Map]             [Compare Mode]   [Download CSV]
                                     [Nearby Query]           [Anomaly Alert]  [API Query]
```

### 3.2 Dashboard Overview (`/dashboard`)

**Layout:**
- Left sidebar (240px, collapsible to 64px icon-only on md screens): Navigation.
- Top bar (56px): Search, notifications bell, user avatar dropdown.
- Main content area: fluid, max-width 1440px, centered.

**Widgets (responsive grid):**
1. **KPI Row** (4 columns on xl, 2 on md, 1 on xs):
   - Total stations (user's count vs. limit)
   - Today's readings count
   - Average value of most-read sensor type (last 24h)
   - Network status (online / offline stations)
2. **Recent Activity Feed** (2/3 width on lg):
   - List of latest readings across all stations.
   - Each item: sensor icon + station name + value + time ago.
   - Click → drill to station detail.
3. **Quick Map** (1/3 width on lg):
   - Mini interactive map showing user's stations as pins.
   - Click pin → station detail flyout.
4. **Sensor Breakdown** (full width):
   - Bar chart: count of readings by sensor type (last 7 days).
   - Color-coded by sensor type chart colors.

**Empty State (new user):**
- Centered illustration (animated sensor icon), "No data yet" heading, "Add your first station to get started" CTA.

**Loading State:**
- Skeleton cards for all widgets, staggered pulse animation.
- Map shows grey placeholder with "Loading map..." text.

### 3.3 Station Selection & Filtering

**Station Selector (top of Data Explorer):**
- Multi-select dropdown: "All Stations" or individual stations.
- Each station shows: name, online/offline dot, reading count badge.
- Searchable within dropdown.

**Quick Filters (chips below selector):**
- Time range: "Last 24h", "Last 7 days", "Last 30 days", "Custom range"
- Sensor type: single-select dropdown (or multi-select for comparison)
- Aggregation: "Raw", "Hourly avg", "Daily avg", "Weekly avg"
- Status: "All", "Verified", "Flagged" (future)

### 3.4 Data Explorer (`/data/explorer`)

**Layout:**
- Top: filter bar (sticky on scroll, z-index 10).
- Left (60%): chart area.
- Right (40%): data table + stats panel.
- On mobile (< md): tabs switch between "Chart" and "Table".

**Chart Area:**
- Default: line chart for time-series data.
- If multiple sensor types selected: multi-line chart with legend.
- If no time dimension: horizontal bar chart (average by station).
- Interactive features:
  - Hover: tooltip with exact value, timestamp, station name.
  - Brush/zoom: drag to select time range, updates table and URL params.
  - Click data point: highlights row in table, opens detail drawer.
  - Reference lines: average, max, min (toggled via checkbox).
  - Anomaly detection toggle: flags outlier points with `--warning-500` circles.

**Stats Panel:**
- For selected data range:
  - Count, Average, Min, Max, Standard Deviation
  - Trend arrow (up/down vs. previous period) with percentage.
  - "Last reading" timestamp.

**Data Table:**
- Columns: Timestamp, Station, Sensor Type, Value, Unit, Status, Actions (edit/delete for owner).
- Sortable by all columns.
- Pagination: 25/50/100 rows per page.
- Inline search: filters visible rows.
- Responsive: on mobile, horizontal scroll with sticky first column.

### 3.5 Drill Down

- Click any data point: right-side drawer slides in (desktop) or full-screen modal (mobile).
- Drawer content:
  - Reading detail: value (large), timestamp, station, sensor, notes.
  - Mini sparkline: last 24h for same sensor at same station.
  - Related readings: same time at nearby stations (if available).
  - Actions: "Edit" (if owner), "Delete" (if owner, danger button with confirm), "Export this reading".

### 3.6 Export / Share

**Export Options:**
- "Download CSV": current filtered view, includes all metadata.
- "Download JSON": structured data, good for developers.
- "Copy API Query": generates `curl` command for the current filter set (pro/enterprise only).
- **Share Link**: generates a public URL with filters encoded (last 7 days, no API key required for read-only).

**Export Modal:**
- Format: radio buttons (CSV, JSON, XLSX future).
- Date range: inherits current filter or custom override.
- Include fields: checkboxes for metadata, station info, notes.
- "Download" button → file download starts, progress toast shown.
- Free tier: max 1000 rows per export. Pro: 10000. Enterprise: unlimited.
- If limit exceeded: "Your current selection has {N} rows. Upgrade to export more."

---

## 4. Upgrade Flow (Monetization)

### 4.1 Flow Overview

```
[Trigger: Limit Reached] → [Upgrade Prompt] → [Pricing Page] → [Select Plan] → [Mock Checkout] → [Success]
        ↓                        ↓                 ↓                ↓              ↓            ↓
   [Free Limit Hit]        [Modal / Banner]   [/pricing]     [Plan Card]    [Payment Form]  [Confirmation]
   [Feature Locked]        [Highlight Value]  [Compare]      [Annual Toggle] [Stripe Mock]   [Immediate Access]
   [API Key Prompt]                                             [Pro / Ent]   [Billing Info]  [Welcome Email]
```

### 4.2 Triggers

The upgrade prompt is shown when:
1. **Station limit**: Free user tries to create station 2+ → "Free tier limited to 1 station. Upgrade to Pro for 10."
2. **Reading limit**: Free user submits reading 101/100 → "Daily limit reached. Upgrade for more."
3. **Retention limit**: Trying to query data older than 7 days → "Data older than 7 days requires Pro."
4. **API key attempt**: Free user clicks "Generate API Key" → "API access is a Pro feature."
5. **Export limit**: Export exceeds 1000 rows → "Export limit reached."
6. **Feature gate**: "Advanced analytics", "Custom alerts", "Team collaboration" (future).

### 4.3 Upgrade Prompt (In-Context)

**Inline Banner (non-blocking):**
- Position: top of relevant screen, below header.
- Style: `--bg-surface-elevated` background, left border 4px `--tier-pro`, padding 16px.
- Content: "You've reached your free tier limit. Upgrade to Pro for $29/mo to unlock more stations and 90-day data retention."
- Actions: "Upgrade Now" (primary, small) + "Learn More" (ghost).
- Dismissible: `X` button. Dismissed banners do not re-show for 7 days.

**Modal (blocking for hard limits):**
- Full-screen overlay (not dismissible by clicking outside for hard limits).
- Large icon: `Zap` (Pro) or `Crown` (Enterprise), 64px, `--tier-pro` color.
- Headline: "Unlock More Power"
- Feature list (3 bullets for the specific limit hit).
- CTA: "Upgrade to Pro — $29/mo" primary button.
- Secondary: "Explore Enterprise" link (for high-volume users).
- Footer: "No thanks, I'll stay on the free plan" (text button, allows dismissal).

### 4.4 Pricing Page (`/pricing`)

**Layout:**
- Hero: "Simple, transparent pricing" + "Start free, scale as you grow."
- Toggle: Monthly / Annual (save 20% badge on annual).
- Three cards side by side (stacked on mobile):

**Free Tier Card:**
- Border: `--border-default`, no accent.
- Price: "$0" display-lg, "/month" text-sm.
- Features: 1 station, 100 readings/day, 7-day retention, community support, public data access.
- CTA: "Current Plan" (disabled) or "Get Started" (if not logged in).
- Footer: "No credit card required."

**Pro Tier Card (featured):**
- Border: 2px solid `--tier-pro`, top accent bar `--tier-pro`.
- "Most Popular" badge: `--tier-pro` background, pill shape.
- Price: "$29" / "$23" (annual) display-lg, "/month" text-sm.
- Features: 10 stations, 10K readings/day, 90-day retention, 1 API key, email support, advanced charts.
- CTA: "Upgrade to Pro" primary button (full-width).
- Footer: "Cancel anytime."

**Enterprise Card:**
- Border: `--border-strong`, no accent.
- Price: "$299" display-lg, "/month" text-sm.
- Features: Unlimited stations, unlimited readings, 2-year retention, 10 API keys, SLA, dedicated support, data licensing, custom integrations.
- CTA: "Contact Sales" secondary button (opens contact form / mailto).
- Footer: "14-day free trial."

**Comparison Table (below cards):**
- Full feature matrix. Sticky header on scroll. Checkmarks for included, `-` for excluded.
- Alternating row backgrounds for readability.

### 4.5 Plan Selection & Checkout (Mock)

**Plan Selection:**
- Click "Upgrade to Pro" → modal with plan confirmation.
- Toggle: Monthly vs. Annual (price updates live).
- Summary: "Pro Plan — $29/month, billed monthly."
- "Continue to Payment" button.

**Payment Form (Mock for MVP):**
- Header: "Payment Method" (mock — no real money processed).
- Card form: Card number, Expiry, CVC, Name on card (all fields validated for format but not charged).
- Billing address: Country, ZIP (optional for MVP).
- "Subscribe" button. On click: simulate 2s processing, then success.
- **Error handling**: Show validation errors inline. If "payment fails" (test mode), show retry.

**Success:**
- Success modal: "Welcome to Pro! 🎉"
- Confetti animation (Lottie or canvas).
- Immediate upgrade: tier updated in API, features unlocked without refresh.
- Redirect: back to the page that triggered the upgrade (or dashboard if direct).
- Toast: "Your Pro plan is now active. Enjoy 90-day data retention and API access!"
- Email confirmation (mock): show "Confirmation email sent to {email}" text.

---

## 5. API Key Management Flow (Pro/Enterprise)

### 5.1 Flow Overview

```
[Pro User Navigates] → [API Keys Page] → [Generate Key] → [Copy Key] → [View Usage] → [Revoke if Needed]
         ↓                   ↓                ↓               ↓              ↓              ↓
    [Settings or Sidebar]  [/api-keys]   [Modal Form]   [One-time show] [Stats Cards]   [Confirm Dialog]
                                                      [Warning: copy now] [Charts]        [Instant revoke]
```

### 5.2 API Keys Page (`/api-keys`)

**Layout:**
- Header: "API Keys" with "Generate New Key" primary button (top right).
- Info banner: "Your API keys grant access to ENViroSwarm data. Keep them secure." + link to API docs.

**Key List (if any exist):**
- Table with columns: Name, Permissions, Created, Last Used, Rate Limit, Status, Actions.
- Each row:
  - Name: user-defined label (e.g., "Python Script", "Research Project")
  - Key preview: "es_live_****...xxxx" (masked, only prefix shown)
  - Permissions: chips (e.g., "read:stations", "read:data", "write:ingest")
  - Created: relative time ("2 days ago")
  - Last Used: relative time or "Never"
  - Rate Limit: "1000/hour" or "Custom"
  - Status: "Active" (`Wifi` icon, green) or "Revoked" (`WifiOff` icon, grey)
  - Actions: "Copy" (icon button), "Edit" (icon button), "Revoke" (danger icon button)

**Empty State:**
- "No API keys yet. Generate your first key to start integrating."
- "Generate API Key" primary button.

### 5.3 Generate Key

**Modal:**
- Field 1: "Key Name" (text input, required, max 64 chars) — e.g., "My Python Script".
- Field 2: "Permissions" (multi-select checkboxes):
  - ☑ Read Station Data
  - ☑ Read Sensor Data
  - ☑ Submit Sensor Data (ingest)
  - ☐ Admin Operations (enterprise only)
- Field 3: "Rate Limit" (select): "Default (1000/hour)", "Custom" (number input for enterprise).
- Field 4: "Expiration" (select): "Never", "30 days", "90 days", "1 year".
- Submit: "Generate Key" primary button.

**Key Reveal (CRITICAL):**
- On success: modal transitions to "Your API Key" reveal screen.
- The full key is shown in a read-only input with "Copy" button.
- **Warning banner**: "This is the only time you can see the full key. Copy it now and store it securely."
- Button: "I've copied it" → dismisses modal, key added to list.
- If user tries to close without copying: confirm dialog "You haven't copied your key. It will be lost forever. Are you sure?"

### 5.4 Copy & Integrate

- "Copy" button: copies to clipboard, shows toast "Copied to clipboard!"
- "View Docs" button: opens `/docs` in new tab with the key pre-filled in code examples.
- Code snippet shown: `curl` example with the key in `Authorization: Bearer {key}` header.

### 5.5 Usage Stats

- Per-key stats card (expandable row):
  - Requests today / this week / this month (bar chart)
  - Success rate (percentage)
  - Top endpoints (pie chart)
  - Last 10 requests (table: timestamp, endpoint, status, response time)
- Aggregate stats at top of page: total requests this month, success rate, approaching limit warning.

### 5.6 Revoke

- Click "Revoke" → confirmation dialog:
  - Title: "Revoke API Key?"
  - Body: "This will permanently disable '{key name}'. Any applications using this key will stop working immediately."
  - Danger button: "Revoke Key" + ghost "Cancel".
- On confirm: key status changes to "Revoked" in list, row dims, no immediate deletion (soft delete for audit).
- Toast: "API key revoked. It may take up to 5 minutes to propagate."

---

## 6. Admin / Moderator Flow (Future)

### 6.1 Overview

This flow is for future platform moderation features. Not active in MVP but documented for design consistency.

```
[Admin Login] → [Admin Dashboard] → [Select Module] → [Take Action] → [Log / Audit]
                    ↓
        ┌───────────┼───────────┬───────────┐
        ↓           ↓           ↓           ↓
   [Flagged Data] [Stations]   [Users]    [System Health]
        ↓           ↓           ↓           ↓
   [Review Queue] [Verification] [Manage]   [Metrics]
   [Approve/Deny] [Onboarding]   [Ban/Suspend] [Alerts]
```

### 6.2 Admin Dashboard

- Separate route: `/admin` (role-gated).
- Sidebar: Data Moderation, Station Verification, User Management, System Metrics, Audit Log.
- Top bar: "Admin" badge (`Crown` icon, `--tier-enterprise` color), impersonation selector (switch to user view).

### 6.3 Flagged Data Review

**Review Queue:**
- Table of readings flagged by automated anomaly detection or user reports.
- Columns: Reading ID, Station, Sensor, Value, Flag Reason, Reporter, Time, Actions.
- Filter: by sensor type, flag reason, date range, status (pending / reviewed).
- Actions per row:
  - "Approve" (valid data, remove flag)
  - "Reject" (invalid data, hide from public, notify owner)
  - "Investigate" (mark for deeper review, send to other admin)
  - "View Context" (opens station detail + nearby readings at same time)
- Batch actions: select multiple, approve all, reject all.
- Stats: queue size, average review time, accuracy rate.

### 6.4 Station Verification

- List of stations pending verification (newly created, or flagged for suspicious patterns).
- Verification criteria: location合理性 (not in ocean, not duplicate), reading consistency, owner reputation.
- Actions: "Verify" (adds verified badge), "Request More Info" (sends email to owner), "Reject" (with reason).
- Verified stations get a `Check` badge on public map and in API responses.

### 6.5 User Management

- User list: search, filter by tier, status, registration date.
- User detail drawer: profile info, stations, readings, API keys, subscription status.
- Actions: "Suspend" (temp block), "Ban" (permanent), "Change Tier" (manual override), "Impersonate" (login as user for support), "View Audit Log".
- Bulk actions: export user list CSV.

### 6.6 Audit Log

- Immutable log of all admin actions: timestamp, admin user, action type, target, old value, new value, IP address.
- Filterable by admin, action type, date range.
- Exportable to CSV for compliance.
- Non-admin users cannot access.

---

*End of User Flows Document*
