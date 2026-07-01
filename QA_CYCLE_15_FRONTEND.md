# ENViroSwarm Frontend — QA Cycle 15 Review Report

**Date:** 2026-08-07  
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)  
**Reviewer:** Senior QA Engineer  
**Branch:** `main`  
**Repo:** `D:/photonbounce/enviroswarm`

---

## Issue Summary

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 2 |
| **Total** | **4** |

---

## Previous Fixes Verification (Cycles 1–14)

All fixes from **QA Cycles 1–14** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 14 M1** (DataViewScreen label-data alignment) — `validItems` used for both `labels` and `data` arrays. ✅
- **Cycle 14 M2** (Dialog focus restoration) — `Stations.tsx` and `ApiKeys.tsx` render `<Dialog>` unconditionally (no `&&` guard). ✅
- **Cycle 14 L1** (SensorChart dead code) — `ChartComponent` is actively used; no dead `DataComponent` declaration. ✅
- **Cycle 14 L2** (Dashboard `today` stale memo) — `today` now depends on `refreshKey`; updates on window focus. ✅
- **Cycle 14 L3** (CSV export non-finite consistency) — `String(Number.isFinite(r.value) ? r.value : '—')` present in `DataExplorer.tsx`. ✅
- **Cycle 14 L4** (Form label associations) — `htmlFor`/`id` pairs present in `Stations.tsx`, `ApiKeys.tsx`, and `Profile.tsx`. ✅
- **Cycle 14 L5** (Android `catch (err: any)`) — All four screen files use `catch (err: unknown)`. ✅
- **Cycle 13 M1** (HomeScreen refresh) — `handleRefresh` calls `fetchNearby` explicitly. ✅
- **Cycle 13 M2** (DataViewScreen NaN guard) — `Number.isFinite` filter present. ✅
- **Cycle 13 M3** (Infinity validation) — `Number.isFinite` used in `ReadingForm.tsx` and `StationsScreen.tsx`. ✅
- **Cycle 13 L1** (main.tsx non-null assertion) — Explicit `rootEl` null check with `throw`. ✅
- **Cycle 13 L2** (Dashboard text) — "Sensors on active stations" text present. ✅
- **Cycle 13 L3** (Tabs ARIA) — `id`/`aria-controls`/`aria-labelledby` present. ✅
- **Cycle 13 L4** (SensorChart sort) — `.sort()` by timestamp present. ✅
- **Cycle 13 L5** (useAuth redundant `setLoading`) — Removed from early return. ✅
- **Cycle 13 L6** (SubmitReadingScreen duplicate lat/lon) — Only metadata includes coordinates. ✅
- **Cycle 13 L7** (FAB accessibility) — `accessibilityLabel` and `accessibilityRole` present. ✅
- **Cycle 13 L8** (AuthContext catch `any`) — Changed to `catch (err: unknown)`. ✅
- **Cycle 13 L9** (HomeScreen race condition) — `requestIdRef` with guards in all branches. ✅
- **All earlier cycles** (C1–C6, H1–H3, M1–M32, L1–L28, etc.) — Verified present and correct. ✅

---

## Issues Found

### Medium

#### M1 — Web `Dashboard.tsx` `now` memo is stale after mount, preventing data refresh on window focus
**File:** `web-dashboard/src/pages/Dashboard.tsx` (Lines 20–27)  
**Category:** Data Freshness / State Management

The `today` memo was fixed in Cycle 14 to depend on `refreshKey`, but `now` was missed:

```tsx
const today = useMemo(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}, [refreshKey])

const now = useMemo(() => new Date().toISOString(), [])
```

Because `now` never updates, the `useSensorData` query key (`{ start: today, end: now, limit: 10 }`) does not change on same-day window focus events, so React Query never re-fetches. The "Readings Today" stats and recent activity remain frozen at mount time. If the page crosses midnight, `today` updates but `now` is still the previous day's mount time, causing the query to only return data from the new day up to the stale mount time.

**Correct fix:** Add `refreshKey` to `now`'s dependency array: `}, [refreshKey])`.

---

#### M2 — Web `Header.tsx` profile link lacks accessible name
**File:** `web-dashboard/src/components/layout/Header.tsx` (Lines 127–132)  
**Category:** Accessibility / WCAG 2.4.4

The header profile link is an icon-only `<Link>` with no text content or `aria-label`:

```tsx
<Link
  to="/profile"
  className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold"
>
  <User className="h-4 w-4" />
</Link>
```

Screen readers announce this as an unlabeled link, providing no context about its destination or purpose. The sidebar profile link (in `Sidebar.tsx`) correctly includes text content (`{item.label}`), but the header avatar link does not.

**Correct fix:** Add `aria-label="Profile"` or `aria-label="User profile"` to the `<Link>`.

---

### Low

#### L1 — Web `SensorChart.tsx` missing non-finite value guard in chart data pipeline
**File:** `web-dashboard/src/components/charts/SensorChart.tsx` (Lines 36–49)  
**Category:** Data Integrity / Defensive Coding

The `chartData` `useMemo` stores raw `r.value` without `Number.isFinite` validation:

```tsx
const chartData = useMemo(() => {
  const timestamps = new Map<string, Record<string, number>>()
  for (const r of data) {
    const ts = r.timestamp
    if (!timestamps.has(ts)) timestamps.set(ts, {})
    timestamps.get(ts)![r.sensor_type] = r.value
  }
  ...
}, [data])
```

If the backend returns `NaN` or `Infinity` values, they are passed directly to recharts, which can produce incorrect Y-axis domain calculations or broken visual rendering. The `DataExplorer.tsx` table already guards against this via `formatNumber(reading.value, 3)` (which returns `'—'` for non-finite values), but the chart component does not.

**Correct fix:** Filter out non-finite values before building the chart data:
```tsx
if (!Number.isFinite(r.value)) continue
```

---

#### L2 — Web `DataExplorer.tsx` CSV export missing UTF-8 BOM for Excel compatibility
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Lines 82–105)  
**Category:** Data Export / Platform Compatibility

The CSV export constructs a `Blob` from raw UTF-8 text without a Byte Order Mark (BOM):

```tsx
const csv = [headers.join(','), ...rows.map(...)].join('\n')
const blob = new Blob([csv], { type: 'text/csv' })
```

Sensor units include non-ASCII characters (`°C`, `µg/m³`, `µSv/h`, `ppb`). When opened in Microsoft Excel on Windows, files without a UTF-8 BOM are typically interpreted using the system's default ANSI encoding (e.g., Windows-1252), causing characters like `°` and `µ` to render as garbled mojibake. This is a well-known CSV interoperability issue.

**Correct fix:** Prepend a UTF-8 BOM to the CSV string before creating the Blob:
```tsx
const csv = '\uFEFF' + [headers.join(','), ...rows.map(...)].join('\n')
```

---

*End of QA Cycle 15 Report*
