# ENViroSwarm Frontend — QA Cycle 12 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 2 |
| **Low** | 7 |
| **Total** | **9** |

---

## Issues Found

### Medium

#### M1 — Web `Register.tsx` missing client-side password validation
**File:** `web-dashboard/src/pages/Register.tsx` (Lines 18–24)  
**Category:** UX / Validation / Inconsistency  
The registration form only validates that `password === confirmPassword`. It does **not** enforce:
- Minimum length (8 characters)
- Uppercase / lowercase / numeric complexity

The Android counterpart (`android-app/src/screens/RegisterScreen.tsx`) enforces all three rules. This inconsistency allows web users to submit weak passwords that will be rejected by the backend, resulting in a worse UX and an unnecessary round-trip.

#### M2 — Web `Profile.tsx` auth context stale after email update
**File:** `web-dashboard/src/pages/Profile.tsx` (Lines 42–58), `web-dashboard/src/App.tsx` (Lines 21–26)  
**Category:** State Management / Data Consistency  
After a successful profile update (`useUpdateUser.mutateAsync`), the `['me']` query is invalidated and refetches. However:
1. `App.tsx` only syncs `meData` to `user` when `!user` (guard at line 22). Since `user` is already set, the auth context is **not** updated.
2. `Profile.tsx` does not call `setUser` from the auth context after the mutation succeeds.

**Result:** The `Header` and the Profile page continue to display the old email address after a successful update. A full page refresh is required to see the new email.

---

### Low

#### L1 — Web `Profile.tsx` email edit not wrapped in `<form>`
**File:** `web-dashboard/src/pages/Profile.tsx` (Lines 104–116)  
**Category:** UX / Accessibility / Keyboard Navigation  
The email input and Save/Cancel buttons are not wrapped in a `<form>` element. Pressing `Enter` inside the email input does not trigger `handleSave`. This is inconsistent with `Login.tsx` and `Register.tsx`, which are properly wrapped in `<form>` tags and handle `Enter` submission natively.

#### L2 — Web `Header.tsx` mobile menu missing click-outside close handler
**File:** `web-dashboard/src/components/layout/Header.tsx` (Lines 124–154)  
**Category:** UX / Accessibility  
The mobile navigation menu opens via the hamburger button and closes via `Escape` or clicking a nav link, but it **lacks a click-outside handler**. Clicking anywhere outside the menu (e.g., on the main content area) does not close it. This is inconsistent with the notification dropdown (lines 82–114), which has a proper `mousedown` listener on `notificationRef`.

#### L3 — Web `ApiKeys.tsx` copy button `aria-label` is misleading
**File:** `web-dashboard/src/pages/ApiKeys.tsx` (Line 131)  
**Category:** Accessibility / ARIA  
The copy button has `aria-label="Copy API key"`, but it actually copies `key.key_hash` (a truncated hash value), not the actual API key. The actual raw key is only displayed once in the creation dialog. Screen-reader users may be misled about what is being copied.

#### L4 — Android `api/client.ts` interceptor sends stale token on login/register
**File:** `android-app/src/api/client.ts` (Lines 34–44)  
**Category:** Auth / API Design  
The request interceptor unconditionally adds the cached `Authorization` header to **all** outgoing requests, including `/auth/login` and `/auth/register`. Best practice is to exclude auth endpoints from bearer-token injection. If the server validates and rejects stale tokens before processing the login/register body, the first login attempt after a session expiry will fail with 401, forcing the user to retry.

#### L5 — Android `useAuth.ts` catch clause uses explicit `any` type
**File:** `android-app/src/hooks/useAuth.ts` (Line 28)  
**Category:** TypeScript / Type Safety  
```tsx
catch (err: any) {
```
Explicit `any` in catch clauses bypasses TypeScript's strict type checking. Modern TypeScript best practice is to use `unknown` and narrow with type guards (e.g., `err instanceof Error`, `isAxiosError(err)`).

#### L6 — Android `useAuth.ts` does not clear `cachedToken` on non-401 `/me` failure
**File:** `android-app/src/hooks/useAuth.ts` (Lines 19–26)  
**Category:** State Management / Auth  
In `checkAuth()`, if the server returns HTTP 200 with `success: false`, the code deletes the token from `SecureStore` (line 24) and throws an error, but it never calls `clearCachedToken()`. The stale token remains in memory and will be sent by the interceptor on subsequent requests until the app restarts or a 401 occurs.

#### L7 — Unguarded `toFixed` calls deviate from `formatNumber` utility pattern
**Files:**
- `web-dashboard/src/pages/Dashboard.tsx` (Line 42)
- `web-dashboard/src/pages/DataExplorer.tsx` (Line 224)
- `android-app/src/components/SensorCard.tsx` (Line 17)  
**Category:** Data Integrity / Consistency  
All three locations use `typeof value === 'number' ? value.toFixed(n) : value` to format sensor readings. This pattern guards against non-numeric types but **does not guard against `NaN` or `Infinity`**, which satisfy `typeof === 'number'`. The codebase already provides a `formatNumber` utility (`web-dashboard/src/lib/utils.ts`, line 20) that correctly handles this with `!isFinite(value)`. Using `toFixed` directly is inconsistent with the project's own standard and can display `"NaN"` or `"Infinity"` to the user instead of the expected `"—"` fallback.

> **Note on previous fix:** Cycle 8 L9 addressed non-numeric type guarding for `DataExplorer.tsx`. The `NaN`/`Infinity` case remains unguarded in the current code.

---

## Previous Fixes Verification (Cycles 1–11)

All fixes from QA Cycles 1–11 are present and correct, **except where superseded by new findings above**.

| Original Issue | File | Status | Notes |
|----------------|------|--------|-------|
| **H1** — `Tabs.tsx` broken `TabsList` export | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | `export function TabsList` present and correctly scoped. |
| **H2** — Android `cachedToken` not cleared on logout | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | `logout()` calls `clearCachedToken()` after `SecureStore.deleteItemAsync`. |
| **M1** — `Profile.tsx` email validation | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | Regex validation `^\S+@\S+\.\S+$` added to `handleSave`. |
| **M2** — `DataExplorer.tsx` `alert()` for date validation | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `setDateError` with inline `role="alert"` div replaces native `alert()`. |
| **M3** — `Header.tsx` mobile menu missing Escape close | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `e.key === 'Escape'` handler closes mobile menu. |
| **M4** — `StationsScreen.tsx` whitespace-only name | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `name.trim()` validation present. |
| **M5** — `DataViewScreen.tsx` chart labels | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Labels use `toLocaleTimeString({hour:'2-digit', minute:'2-digit'})`. |
| **L1** — `Dialog.tsx` missing `aria-labelledby`/`describedby` | `web-dashboard/src/components/ui/Dialog.tsx` | ✅ Fixed | `aria-labelledby={titleId}` and `aria-describedby={descriptionId}` present. |
| **L2** — `Header.tsx` hamburger missing `aria-expanded` | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `aria-expanded={mobileOpen}` present. |
| **L3** — `DataExplorer.tsx` labels not associated | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | All `<label>` elements have `htmlFor` matching input `id`. |
| **L4** — `Stations.tsx` sensor toggle missing `aria-pressed` | `web-dashboard/src/pages/Stations.tsx` | ✅ Fixed | `aria-pressed={selectedSensors.includes(type)}` present. |
| **L5** — `ApiKeys.tsx` icon buttons missing `aria-label` | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `aria-label="Copy API key"` and `aria-label="Delete API key"` present. |
| **L6** — `Login.tsx`/`Register.tsx` missing `autoComplete` | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | ✅ Fixed | `autoComplete="email"`, `autoComplete="current-password"`, `autoComplete="new-password"` present. |
| **L7** — `Dashboard.tsx` index as `key` | `web-dashboard/src/pages/Dashboard.tsx` | ✅ Fixed | `key={item.id}` used for `recentActivity`. |
| **L8** — `HomeScreen.tsx` module-level `Dimensions` | `android-app/src/screens/HomeScreen.tsx` | ✅ Fixed | Uses `useWindowDimensions()` hook. |
| **L9** — `Profile.tsx` cancel not clearing `saveSuccess` | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | Cancel handler calls `setSaveSuccess(false)`. |
| **L10** — `DataExplorer.tsx` CSV escaping incomplete | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Commas, double quotes, and newlines are all escaped per RFC 4180. |
| **CR3** — No request timeout | `web-dashboard/src/lib/api.ts` | ✅ Fixed | `timeout: 30000` present. |
| **CR4** — `SensorChart` data loss | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | Groups by full ISO timestamp in a `Map`. |
| **C1** — JWT in client storage | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | httpOnly cookies with `withCredentials: true`. No client-side token storage. |
| **NH1** — Orphaned token on `/me` failure | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | ✅ Fixed | Cookie-based auth; no manual token storage. |
| **M10** — `ReadingForm` NaN no feedback | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert('Invalid Input', ...)` on NaN. |
| **M11** — `SecureStore` read on every request | `android-app/src/api/client.ts` | ✅ Fixed | Token cached in `cachedToken`; re-read only when `null`. |
| **M12** — `DataViewScreen` missing `fetchData` dep | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | `useEffect(() => { fetchData(); }, [fetchData]);` present. |
| **L1** — `revokeObjectURL` immediately | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `setTimeout(() => URL.revokeObjectURL(url), 1000)` used. |
| **L2** — Login email no trim | `web-dashboard/src/pages/Login.tsx` | ✅ Fixed | `email.trim()` used. |
| **L3** — Profile timeout not cleared | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `saveTimeoutRef` stored in `useRef`; cleared in cleanup. |
| **L4** — Button default `type` | `web-dashboard/src/components/ui/Button.tsx` | ✅ Fixed | `type = 'button'` in destructured props. |
| **L5–L6** — Missing `aria-current` | `web-dashboard/src/components/layout/Header.tsx`, `Sidebar.tsx` | ✅ Fixed | `aria-current="page"` on active items. |
| **L7** — Tabs missing ARIA roles | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` present. |
| **L8** — TableHead no `scope="col"` | `web-dashboard/src/components/ui/Table.tsx` | ✅ Fixed | `scope="col"` on `<th>`. |
| **L9** — Unguarded `toFixed(3)` (non-numeric types) | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `typeof` guard present; `NaN`/`Infinity` case remains (see L7 above). |
| **L10** — Legend overflow | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | `wrapperStyle={{ maxHeight: 80, overflowY: 'auto' }}`. |
| **L11** — Dashboard "Recent Activity" mock data | `web-dashboard/src/pages/Dashboard.tsx` | ✅ Fixed | Computed from real `useStations`/`useSensorData` responses. |
| **L12** — `setSensorType` dead code | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Changed to `const [sensorType]` (no setter). |
| **L13** — `screenWidth` module load | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Uses `useWindowDimensions()`. |
| **L14** — `fetchNearby` only on GPS change | `android-app/src/screens/HomeScreen.tsx` | ✅ Fixed | `onRegionChangeComplete` calls `fetchNearby`. |
| **L15** — No `StatusBar` config | `android-app/App.tsx` | ✅ Fixed | `<StatusBar barStyle="light-content" backgroundColor="#0f172a" />`. |
| **Cycle 10 M1** — Transient logout on non-401 | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | Only `setUserState(null)` on `401`. |
| **Cycle 10 M2** — Swallowed API key errors | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `catch` sets `createError` state. |
| **Cycle 10 M3** — Inverted date ranges | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Inline error guard on inverted range. |
| **Cycle 10 M4** — Mobile menu focus not restored | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | Cleanup focuses `hamburgerRef`. |
| **Cycle 10 M5** — Invalid lat/lon parsed to NaN | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert` on NaN coordinates. |
| **Cycle 10 M6** — Modal missing `onRequestClose` | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `onRequestClose={() => setModalVisible(false)}` present. |
| **Cycle 10 L1** — Email not trimmed in Register (web) | `web-dashboard/src/pages/Register.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L2** — Profile email lacks type/validation | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `type="email"` and regex validation present. |
| **Cycle 10 L3** — Auth redirects back-button traps | `web-dashboard/src/App.tsx` | ✅ Fixed | `replace` prop on all `<Navigate>` components. |
| **Cycle 10 L4** — Dead focus styles on Badge | `web-dashboard/src/components/ui/Badge.tsx` | ✅ Fixed | Focus classes removed. |
| **Cycle 10 L5** — Dead `overlayRef` in Dialog | `web-dashboard/src/components/ui/Dialog.tsx` | ✅ Fixed | `overlayRef` removed. |
| **Cycle 10 L6** — CSV export no comma escape | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Quotes around comma-containing values. |
| **Cycle 10 L7** — Email not trimmed in Login (mobile) | `android-app/src/screens/LoginScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L8** — Email not trimmed in Register (mobile) | `android-app/src/screens/RegisterScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L9** — Unguarded `toFixed` in SensorCard (non-numeric) | `android-app/src/components/SensorCard.tsx` | ✅ Fixed | `typeof` guard present; `NaN`/`Infinity` case remains (see L7 above). |
| **Cycle 10 L10** — TabsContext ordering | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | Context is before `Tabs`; `TabsList` export is present. |

---

*End of QA Cycle 12 Report*
