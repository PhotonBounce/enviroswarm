# ENViroSwarm Frontend — QA Cycle 13 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 3 |
| **Low** | 9 |
| **Total** | **12** |

---

## Issues Found

### Medium

#### M1 — Android `HomeScreen.tsx` Refresh button does not refresh station data
**File:** `android-app/src/screens/HomeScreen.tsx` (Lines 64–66)  
**Category:** UX / Data Consistency  
The overlay "Refresh" button only calls `getCurrentLocation()`:
```tsx
const handleRefresh = async () => {
  await getCurrentLocation();
};
```
If the user has not moved since the last GPS fix, `latitude` and `longitude` do not change, so the `useEffect` dependency array does not fire and `fetchNearby` is **never invoked**. The station list remains stale. The user must pan the map to trigger a new data fetch. A refresh button should explicitly re-fetch the data for the current viewport, not just the GPS coordinates.

---

#### M2 — Android `DataViewScreen.tsx` chart data unguarded against `NaN`/`Infinity`
**File:** `android-app/src/screens/DataViewScreen.tsx` (Line 91)  
**Category:** Data Integrity / Defensive Coding  
```tsx
data: items.map((r) => r.value),
```
Sensor readings are mapped directly to chart data without validating finiteness. If the backend ever returns `NaN` or `Infinity`, the `react-native-chart-kit` library may crash or render an invalid chart. The codebase already established a `Number.isFinite` guard pattern in `SensorCard.tsx` (Cycle 12 L7 fix) but this same diligence was not applied to the chart data pipeline.

---

#### M3 — Android `ReadingForm.tsx` and `StationsScreen.tsx` allow `Infinity` through numeric validation
**Files:**
- `android-app/src/components/ReadingForm.tsx` (Lines 43–44, 48–51)
- `android-app/src/screens/StationsScreen.tsx` (Lines 80–88)  
**Category:** Validation / Input Sanitization  
Both locations use `isNaN()` to validate parsed numeric input:
```tsx
if (isNaN(numValue)) { ... }
if (lat.trim() === '' || isNaN(latVal ?? NaN)) { ... }
```
`isNaN()` returns `false` for `Infinity` and `-Infinity` because they are technically of type `number`. A user can type `"Infinity"` (or paste it despite the numeric keyboard) and submit it as a valid reading value or geographic coordinate. The project’s established pattern in `SensorCard.tsx` uses `Number.isFinite()` to guard against this exact case; the same guard must be applied to all user-submitted numeric inputs.

---

### Low

#### L1 — Web `main.tsx` uses non-null assertion for `root` element
**File:** `web-dashboard/src/main.tsx` (Line 57)  
**Category:** TypeScript / Type Safety  
```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(...)
```
The `!` non-null assertion suppresses TypeScript’s null-checking. If the HTML template is ever missing the `#root` element, the app will throw an unhandled runtime error instead of a graceful error message. Best practice is to guard with a conditional and log a descriptive error.

---

#### L2 — Web `Dashboard.tsx` misleading "All operational" status text
**File:** `web-dashboard/src/pages/Dashboard.tsx` (Line 33)  
**Category:** UX / Copy Accuracy  
```tsx
{ label: 'Active Sensors', value: String(activeSensorCount), icon: Zap, change: activeSensorCount > 0 ? 'All operational' : 'No sensors configured' },
```
The `activeSensorCount` is the sum of `sensor_types.length` across **all** stations regardless of their `status` (`active`, `inactive`, or `maintenance`). The text "All operational" implies every station is active, which is not what the code computes. If a station is in `maintenance` mode but still has sensors configured, the dashboard falsely claims everything is operational.

---

#### L3 — Web `Tabs.tsx` missing ARIA tab-to-tabpanel linkage
**File:** `web-dashboard/src/components/ui/Tabs.tsx` (Lines 52, 77)  
**Category:** Accessibility / ARIA  
`TabsTrigger` elements have `role="tab"` and `aria-selected`, but they lack:
- `id` attributes so that `aria-labelledby` can reference them
- `aria-controls` pointing to their corresponding `TabsContent` tabpanels

`TabsContent` elements have `role="tabpanel"` but lack `aria-labelledby` referencing their trigger tab. This violates the WAI-ARIA Tabs pattern requirement that tabs and their panels are programmatically associated.

---

#### L4 — Web `SensorChart.tsx` does not explicitly sort data by timestamp
**File:** `web-dashboard/src/components/charts/SensorChart.tsx` (Lines 36–47)  
**Category:** Data Integrity / Visualization  
```tsx
const chartData = useMemo(() => {
  const timestamps = new Map<string, Record<string, number>>()
  ...
  return Array.from(timestamps.entries()).map(...)
}, [data])
```
The chart data is grouped by timestamp using a `Map`, which preserves insertion order. If the API ever returns readings out of chronological order (e.g., concurrent writes or clock skew), the resulting chart line will jump back and forth in time. The data should be explicitly sorted by `timestamp` before rendering to guarantee a monotonic X-axis.

---

#### L5 — Android `useAuth.ts` redundant `setLoading(false)` call
**File:** `android-app/src/hooks/useAuth.ts` (Lines 16–18, 40–42)  
**Category:** Code Quality / State Management  
```tsx
if (!token) {
  setUser(null);
  setLoading(false);   // ← first call
  return null;
}
```
Because `setLoading(false)` is also invoked in the `finally` block, it executes **twice** when no token is found. React batches state updates, so this is not a user-visible bug, but it is a code-smell deviation from DRY principles and may cause unnecessary re-render work.

---

#### L6 — Android `SubmitReadingScreen.tsx` duplicates `lat`/`lon` in request payload
**File:** `android-app/src/screens/SubmitReadingScreen.tsx` (Lines 55–60)  
**Category:** API Design / Payload Hygiene  
```tsx
const payload = {
  ...data,              // spreads lat and lon at top level
  metadata: {
    ...(data.lat !== undefined && data.lat !== null ? { lat: data.lat } : {}),
    ...(data.lon !== undefined && data.lon !== null ? { lon: data.lon } : {}),
  },
};
```
The `payload` contains `lat`/`lon` both at the root level (inherited from `...data`) and nested inside `metadata`. If the backend is strict about unknown fields, the extra top-level keys could cause a validation error. The payload should be constructed explicitly to include only the fields the API expects.

---

#### L7 — Android `StationsScreen.tsx` FAB missing accessibility label
**File:** `android-app/src/screens/StationsScreen.tsx` (Lines 141–146)  
**Category:** Accessibility / Mobile A11y  
```tsx
<TouchableOpacity
  style={[styles.fab, { bottom: 20 + insets.bottom }]}
  onPress={openCreateModal}
>
  <Text style={styles.fabText}>+</Text>
</TouchableOpacity>
```
The floating action button has no `accessibilityLabel` or `accessibilityRole`. Screen readers will announce only "plus" or may skip the element entirely, leaving non-sighted users unaware of the primary action for creating a new station.

---

#### L8 — Web `AuthContext.tsx` catch clause uses explicit `any` type
**File:** `web-dashboard/src/context/AuthContext.tsx` (Line 37)  
**Category:** TypeScript / Type Safety  
```tsx
} catch (err: any) {
  if (err?.response?.status === 401) {
    setUserState(null)
  }
}
```
Using `any` in a catch clause bypasses TypeScript’s strict type checking. The project’s Android counterpart already migrated to `catch (err: unknown)` with type guards (Cycle 12 L5 fix). The web auth context should follow the same pattern and narrow with `instanceof AxiosError` before accessing response properties.

---

#### L9 — Android `HomeScreen.tsx` race condition in overlapping `fetchNearby` calls
**File:** `android-app/src/screens/HomeScreen.tsx` (Lines 35–50)  
**Category:** Concurrency / State Management  
```tsx
const fetchNearby = async (lat: number, lon: number) => {
  setLoading(true);
  try {
    ...
  } finally {
    setLoading(false);
  }
};
```
If the user pans the map rapidly, multiple `fetchNearby` calls can be in flight simultaneously. The first call to finish sets `loading` to `false`, which hides the loading indicator while a later call is still pending. Additionally, `setStations` from an earlier, slower response could overwrite the results of a later, faster response. Best practice is to use an `AbortController` or a request-scoped ref to cancel or ignore stale requests.

---

## Previous Fixes Verification (Cycles 1–12)

All fixes from QA Cycles 1–12 are present and correct, **except where superseded by new findings above**.

| Original Issue | File | Status | Notes |
|----------------|------|--------|-------|
| **Cycle 2 H1** — `Tabs.tsx` broken export | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | `export function TabsList` present. |
| **Cycle 2 H2** — Android `cachedToken` not cleared on logout | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | `logout()` calls `clearCachedToken()`. |
| **Cycle 4 M1** — `Profile.tsx` email validation | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | Regex `^\S+@\S+\.\S+$` present. |
| **Cycle 4 M2** — `DataExplorer.tsx` `alert()` for date validation | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Inline `role="alert"` div used. |
| **Cycle 4 M3** — `Header.tsx` mobile menu Escape close | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `e.key === 'Escape'` handler closes menu. |
| **Cycle 4 M4** — `StationsScreen.tsx` whitespace-only name | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `name.trim()` validation present. |
| **Cycle 4 M5** — `DataViewScreen.tsx` chart labels | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | `toLocaleTimeString` with `hour: '2-digit', minute: '2-digit'` present. |
| **Cycle 6 L1** — `Dialog.tsx` missing ARIA | `web-dashboard/src/components/ui/Dialog.tsx` | ✅ Fixed | `aria-labelledby`, `aria-describedby`, `aria-modal` present. |
| **Cycle 6 L2** — `Header.tsx` hamburger `aria-expanded` | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `aria-expanded={mobileOpen}` present. |
| **Cycle 6 L3** — `DataExplorer.tsx` labels not associated | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | All `<label>` have `htmlFor` matching input `id`. |
| **Cycle 6 L4** — `Stations.tsx` sensor toggle missing `aria-pressed` | `web-dashboard/src/pages/Stations.tsx` | ✅ Fixed | `aria-pressed` present. |
| **Cycle 6 L5** — `ApiKeys.tsx` icon buttons missing `aria-label` | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `aria-label="Copy key hash"` and `aria-label="Delete API key"` present. |
| **Cycle 6 L6** — `Login.tsx`/`Register.tsx` missing `autoComplete` | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | ✅ Fixed | `autoComplete` attributes present. |
| **Cycle 6 L7** — `Dashboard.tsx` index as `key` | `web-dashboard/src/pages/Dashboard.tsx` | ✅ Fixed | `key={item.id}` used. |
| **Cycle 6 L8** — `HomeScreen.tsx` module-level `Dimensions` | `android-app/src/screens/HomeScreen.tsx` | ✅ Fixed | `useWindowDimensions()` used. |
| **Cycle 6 L9** — `Profile.tsx` cancel not clearing `saveSuccess` | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | Cancel handler calls `setSaveSuccess(false)`. |
| **Cycle 6 L10** — `DataExplorer.tsx` CSV escaping incomplete | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Commas, quotes, and newlines escaped per RFC 4180. |
| **Cycle 8 CR3** — No request timeout | `web-dashboard/src/lib/api.ts` | ✅ Fixed | `timeout: 30000` present. |
| **Cycle 8 CR4** — `SensorChart` data loss | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | Groups by full ISO timestamp in `Map`. |
| **Cycle 8 C1** — JWT in client storage | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | httpOnly cookies with `withCredentials: true`. |
| **Cycle 8 NH1** — Orphaned token on `/me` failure | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | ✅ Fixed | Cookie-based auth; no manual token storage. |
| **Cycle 8 M10** — `ReadingForm` NaN no feedback | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert('Invalid Input', ...)` on NaN. |
| **Cycle 8 M11** — `SecureStore` read on every request | `android-app/src/api/client.ts` | ✅ Fixed | `cachedToken` used; re-read only when `null`. |
| **Cycle 8 M12** — `DataViewScreen` missing `fetchData` dep | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | `useEffect(() => { fetchData(); }, [fetchData]);` present. |
| **Cycle 8 L1** — `revokeObjectURL` immediately | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `setTimeout(() => URL.revokeObjectURL(url), 1000)` used. |
| **Cycle 8 L2** — Login email no trim | `web-dashboard/src/pages/Login.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 8 L3** — Profile timeout not cleared | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `saveTimeoutRef` stored in `useRef`; cleared in cleanup. |
| **Cycle 8 L4** — Button default `type` | `web-dashboard/src/components/ui/Button.tsx` | ✅ Fixed | `type = 'button'` in destructured props. |
| **Cycle 8 L5–L6** — Missing `aria-current` | `web-dashboard/src/components/layout/Header.tsx`, `Sidebar.tsx` | ✅ Fixed | `aria-current="page"` on active items. |
| **Cycle 8 L7** — Tabs missing ARIA roles | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` present. |
| **Cycle 8 L8** — TableHead no `scope="col"` | `web-dashboard/src/components/ui/Table.tsx` | ✅ Fixed | `scope="col"` on `<th>`. |
| **Cycle 8 L9** — Unguarded `toFixed(3)` (non-numeric types) | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `typeof` guard present; `NaN`/`Infinity` remains unguarded (see M2/M3 above). |
| **Cycle 8 L10** — Legend overflow | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | `wrapperStyle={{ maxHeight: 80, overflowY: 'auto' }}`. |
| **Cycle 8 L11** — Dashboard "Recent Activity" mock data | `web-dashboard/src/pages/Dashboard.tsx` | ✅ Fixed | Computed from real `useStations`/`useSensorData` responses. |
| **Cycle 8 L12** — `setSensorType` dead code | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Changed to `const [sensorType]` (no setter). |
| **Cycle 8 L13** — `screenWidth` module load | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | `useWindowDimensions()` used. |
| **Cycle 8 L14** — `fetchNearby` only on GPS change | `android-app/src/screens/HomeScreen.tsx` | ✅ Fixed | `onRegionChangeComplete` calls `fetchNearby`. |
| **Cycle 8 L15** — No `StatusBar` config | `android-app/App.tsx` | ✅ Fixed | `<StatusBar barStyle="light-content" backgroundColor="#0f172a" />`. |
| **Cycle 10 M1** — Transient logout on non-401 | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | Only `setUserState(null)` on `401`. |
| **Cycle 10 M2** — Swallowed API key errors | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `catch` sets `createError` state. |
| **Cycle 10 M3** — Inverted date ranges | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Inline error guard on inverted range. |
| **Cycle 10 M4** — Mobile menu focus not restored | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | Cleanup focuses `hamburgerRef`. |
| **Cycle 10 M5** — Invalid lat/lon parsed to NaN | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert` on NaN coordinates. |
| **Cycle 10 M6** — Modal missing `onRequestClose` | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `onRequestClose` present. |
| **Cycle 10 L1** — Email not trimmed in Register (web) | `web-dashboard/src/pages/Register.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L2** — Profile email lacks type/validation | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `type="email"` and regex validation present. |
| **Cycle 10 L3** — Auth redirects back-button traps | `web-dashboard/src/App.tsx` | ✅ Fixed | `replace` prop on all `<Navigate>` components. |
| **Cycle 10 L4** — Dead focus styles on Badge | `web-dashboard/src/components/ui/Badge.tsx` | ✅ Fixed | Focus classes removed. |
| **Cycle 10 L5** — Dead `overlayRef` in Dialog | `web-dashboard/src/components/ui/Dialog.tsx` | ✅ Fixed | `overlayRef` removed. |
| **Cycle 10 L6** — CSV export no comma escape | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Quotes around comma-containing values. |
| **Cycle 10 L7** — Email not trimmed in Login (mobile) | `android-app/src/screens/LoginScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L8** — Email not trimmed in Register (mobile) | `android-app/src/screens/RegisterScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L9** — Unguarded `toFixed` in SensorCard (non-numeric) | `android-app/src/components/SensorCard.tsx` | ✅ Fixed | `typeof` guard present; `NaN`/`Infinity` remains unguarded (see M2/M3 above). |
| **Cycle 10 L10** — TabsContext ordering | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | Context and `TabsList` export correct. |
| **Cycle 11 M1** — Web `Register.tsx` missing password validation | `web-dashboard/src/pages/Register.tsx` | ✅ Fixed | Length 8, uppercase, lowercase, numeric checks present. |
| **Cycle 11 M2** — Web `Profile.tsx` auth context stale after update | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `setUser(updatedUser)` called after mutation. |
| **Cycle 11 L1** — Profile email not wrapped in `<form>` | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `<form onSubmit={handleSave}>` present. |
| **Cycle 11 L2** — Header mobile menu missing click-outside close | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `mousedown` listener on `mobileMenuRef` present. |
| **Cycle 11 L3** — ApiKeys copy button `aria-label` misleading | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `aria-label="Copy key hash"` present. |
| **Cycle 11 L4** — Android interceptor sends stale token on login | `android-app/src/api/client.ts` | ✅ Fixed | Excludes `/auth/login` and `/auth/register` from token injection. |
| **Cycle 11 L5** — Android `useAuth.ts` catch `any` | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | `catch (err: unknown)` present. |
| **Cycle 11 L6** — Android `useAuth.ts` no `clearCachedToken` on failure | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | `clearCachedToken()` called on non-200 success. |
| **Cycle 11 L7** — Unguarded `toFixed` calls | `web-dashboard/src/pages/Dashboard.tsx`, `DataExplorer.tsx`; `android-app/src/components/SensorCard.tsx` | ✅ Fixed | All use `formatNumber` or `Number.isFinite`. |

---

*End of QA Cycle 13 Report*
