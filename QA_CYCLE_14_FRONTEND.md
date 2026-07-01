# ENViroSwarm Frontend — QA Cycle 14 Review Report

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
| **Low** | 5 |
| **Total** | **7** |

---

## Previous Fixes Verification (Cycles 1–13)

All fixes from **QA Cycles 1–13** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 13 M1** (HomeScreen refresh) — `handleRefresh` now calls `fetchNearby` explicitly. ✅
- **Cycle 13 M2** (DataViewScreen NaN guard) — `Number.isFinite` filter present. ✅ (Regression introduced — see M1 below.)
- **Cycle 13 M3** (Infinity through numeric validation) — `Number.isFinite` used in `ReadingForm.tsx` and `StationsScreen.tsx`. ✅
- **Cycle 13 L1** (main.tsx non-null assertion) — Explicit `rootEl` null check with `throw`. ✅
- **Cycle 13 L2** (Dashboard "All operational") — Text changed to "Sensors on active stations". ✅
- **Cycle 13 L3** (Tabs ARIA linkage) — `id`/`aria-controls`/`aria-labelledby` present. ✅
- **Cycle 13 L4** (SensorChart explicit sort) — `.sort()` by timestamp present. ✅
- **Cycle 13 L5** (useAuth redundant `setLoading`) — Removed from early return. ✅
- **Cycle 13 L6** (SubmitReadingScreen duplicate lat/lon) — Only metadata includes coordinates. ✅
- **Cycle 13 L7** (StationsScreen FAB accessibility) — `accessibilityLabel` and `accessibilityRole` present. ✅
- **Cycle 13 L8** (AuthContext catch `any`) — Changed to `catch (err: unknown)`. ✅
- **Cycle 13 L9** (HomeScreen race condition) — `requestIdRef` with guards in all branches. ✅
- **All earlier cycles** (C1–C6, H1–H3, M1–M32, L1–L28, etc.) — Verified present and correct. ✅

> **Note:** The `android-app/App.tsx` `StatusBar` configuration (Cycle 8 L15) is present and correct but lives outside the `src/` scope. It was inspected for verification.

---

## Issues Found

### Medium

#### M1 — Android `DataViewScreen.tsx` chart label-data misalignment after Cycle 13 M2 fix
**File:** `android-app/src/screens/DataViewScreen.tsx` (Lines 88–91)  
**Category:** Data Integrity / Regression  

The Cycle 13 M2 fix added a `Number.isFinite` filter to the chart dataset, but the `labels` array is still mapped from the **unfiltered** `items` array:

```tsx
labels: items.map((r) => new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
datasets: [
  {
    data: items.filter(r => Number.isFinite(r.value)).map((r) => r.value),
    // ...
  },
],
```

If any reading has a non-finite value (`NaN` or `Infinity`), the `labels` array will have **more elements** than the `data` array. The `react-native-chart-kit` library expects aligned arrays; misalignment causes shifted or invalid chart rendering. The correct fix is to filter `items` **once** into a `validItems` array and then map both `labels` and `data` from it.

---

#### M2 — Web `Stations.tsx` and `ApiKeys.tsx` redundant conditional Dialog rendering breaks focus restoration
**Files:**
- `web-dashboard/src/pages/Stations.tsx` (Lines 122–174)
- `web-dashboard/src/pages/ApiKeys.tsx` (Lines 152–195)  
**Category:** Accessibility / Focus Management  

Both parent components wrap the `Dialog` in a `dialogOpen &&` guard:

```tsx
{dialogOpen && (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    ...
  </Dialog>
)}
```

The `Dialog` component already handles `open={false}` internally (`if (!open) return null`). The `&&` guard causes the Dialog to **unmount** on close, which prevents the `useEffect` `else if` branch (line 33 of `Dialog.tsx`) from running. That branch is responsible for restoring focus to `previousActiveElement`. As a result, keyboard and screen-reader users lose their focus position when the dialog closes. The parents should render `<Dialog open={dialogOpen} ...>` unconditionally.

---

### Low

#### L1 — Web `SensorChart.tsx` dead `DataComponent` declaration
**File:** `web-dashboard/src/components/charts/SensorChart.tsx` (Line 58)  
**Category:** Code Quality / Dead Code  

```tsx
const DataComponent = type === 'area' ? Area : Line
```

`DataComponent` is assigned but never referenced in the JSX. The chart elements are rendered via an explicit ternary inside the `types.map()` callback (lines 99–119). The unused variable should be removed.

---

#### L2 — Web `Dashboard.tsx` `today` memo won't update if app crosses midnight
**File:** `web-dashboard/src/pages/Dashboard.tsx` (Lines 12–16)  
**Category:** UX / Edge Case  

```tsx
const today = useMemo(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}, [])
```

The `useMemo` with an empty dependency array computes once on mount. If the user keeps the dashboard open past midnight, the "Readings Today" query continues to use the previous day's start time, causing stale stats. The value should be recomputed on window refocus or via a time-based invalidation mechanism.

---

#### L3 — Web `DataExplorer.tsx` CSV export inconsistent with table for non-finite values
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Lines 84–91)  
**Category:** Data Integrity / Consistency  

The data table renders non-finite values as `"—"` via `formatNumber(reading.value, 3)` (line 224). However, the CSV export passes raw values directly:

```tsx
const rows = readings.map((r: SensorReading) => [
  r.timestamp,
  r.station_id,
  r.sensor_type,
  String(r.value),
  r.unit,
])
```

`String(NaN)` produces `"NaN"` and `String(Infinity)` produces `"Infinity"`, which are exported into the CSV. This is inconsistent with the UI display and can corrupt downstream data processing. The CSV pipeline should apply the same `formatNumber` (or `Number.isFinite`) guard before stringifying.

---

#### L4 — Web forms missing explicit label-to-input associations
**Files:**
- `web-dashboard/src/pages/Stations.tsx` (Lines 129, 135, 140)
- `web-dashboard/src/pages/ApiKeys.tsx` (Line 181)
- `web-dashboard/src/pages/Profile.tsx` (Line 109)  
**Category:** Accessibility / WCAG 1.3.1  

Multiple form inputs inside dialogs and the profile edit form have `<label>` elements that are not programmatically associated with their corresponding `<input>` elements via `htmlFor`/`id` pairs. Affected fields:

| File | Field | Missing `htmlFor` on label | Missing `id` on input |
|------|-------|---------------------------|----------------------|
| `Stations.tsx` | Station Name | ✅ | ✅ |
| `Stations.tsx` | Latitude | ✅ | ✅ |
| `Stations.tsx` | Longitude | ✅ | ✅ |
| `ApiKeys.tsx` | Key Name | ✅ | ✅ |
| `Profile.tsx` | Email | ✅ | ✅ |

The `Login.tsx`, `Register.tsx`, and `DataExplorer.tsx` forms correctly use `htmlFor`/`id` associations. The pattern should be applied consistently across all forms.

---

#### L5 — Android screen components use `catch (err: any)` instead of `unknown`
**Files:**
- `android-app/src/screens/HomeScreen.tsx` (Line 47)
- `android-app/src/screens/StationsScreen.tsx` (Line 47)
- `android-app/src/screens/SubmitReadingScreen.tsx` (Line 32)
- `android-app/src/screens/DataViewScreen.tsx` (Line 63)  
**Category:** TypeScript / Type Safety / Consistency  

All four screen files use explicit `catch (err: any)` clauses, bypassing TypeScript's strict type checking. The project has already established the `catch (err: unknown)` pattern with `instanceof Error` narrowing in `android-app/src/hooks/useAuth.ts` (Cycle 11 L5 fix) and across all web files. The mobile screen components should follow the same standard.

---

*End of QA Cycle 14 Report*
