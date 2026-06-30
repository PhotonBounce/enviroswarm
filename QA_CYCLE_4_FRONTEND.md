# ENViroSwarm Frontend QA Report — Cycle 4 (Re-review)

**Date:** 2025-07-18  
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)  
**Reviewer:** Senior QA Engineer  
**Instruction:** Review only — do not fix.  
**Previous Report:** `QA_CYCLE_2_FRONTEND.md`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Issues Resolved** | **64** |
| **Issues Still Open** | **16** |
| **New Issues Introduced by Fixes** | **3** |
| **Total Remaining Issues** | **19** |

**Key Findings:**
- **64 of 80 Cycle 2 issues were fixed** — a solid 80% fix rate. All 14 High issues were resolved.
- **3 Critical issues remain open:** JWT still in `localStorage`, 401 interceptor still triggers full-page reload, and `ApiKeys` still uses ambiguous `key_hash` naming.
- **1 Critical regression introduced:** Login and Register pages now call `/me` via the shared axios client **before** the token is stored in `localStorage`, guaranteeing a 401 on every login/register flow.
- **2 Medium regressions introduced:** The 401 interceptor fix added a race-condition fallback, and the `StationsScreen` refresh fix was botched (added unused `loading` state while leaving the original `refreshing` bug intact).

---

## Issues RESOLVED (64)

### Critical — 3 Resolved

| # | File | Description |
|---|------|-------------|
| C2 | `web-dashboard/src/pages/Login.tsx` | Replaced raw `fetch` with `api.get('/me')` using the configured axios instance. |
| C3 | `web-dashboard/src/pages/Register.tsx` | Same fix as C2 — now uses `api.get('/me')` with proper error handling. |
| C4 | `web-dashboard/src/pages/Profile.tsx` | "Save Changes" now calls `useUpdateUser().mutateAsync({ email })`, invalidates `['me']` query on success, shows loading/error/success states. |

### High — 14 Resolved

| # | File | Description |
|---|------|-------------|
| H1 | `web-dashboard/src/pages/Login.tsx` | API call now wrapped in `try/catch` with surfaced error messages. |
| H2 | `web-dashboard/src/pages/Register.tsx` | Same error-handling fix as H1. |
| H3 | `web-dashboard/src/components/charts/SensorChart.tsx` | Now groups by `sensor_type`, renders separate `<Line>`/`<Area>` per type with distinct colors via `getSensorTypeColor`. `chartData` and `types` are memoized. |
| H4 | `web-dashboard/src/pages/DataExplorer.tsx` | Date validation added (`isNaN(date.getTime())`) before `toISOString()`. |
| H5 | `android-app/src/api/client.ts` | Now uses `process.env.EXPO_PUBLIC_API_URL` with a production fallback URL. |
| H6 | `android-app/src/screens/HomeScreen.tsx` | Now checks `latitude !== null && longitude !== null` instead of truthiness. |
| H7 | `android-app/src/screens/SubmitReadingScreen.tsx` | Now checks `data.lat !== undefined && data.lat !== null` for coordinate metadata. |
| H8 | `android-app/src/screens/StationsScreen.tsx` | `openCreateModal` now directly uses the resolved `loc` from `getCurrentLocation()` instead of reading stale hook state. |
| H9 | `android-app/src/api/client.ts` | 401 interceptor now emits `authEvents.emitUnauthorized()`; `useAuth` listens and clears React state. |
| H10 | `android-app/src/screens/DataViewScreen.tsx` | Uses `RouteProp<RootStackParamList, 'DataView'>` and has runtime guard for missing params. |
| H11 | `android-app/src/hooks/useAuth.ts` | `login` and `register` now guard against duplicate requests with `isLoggingIn.current` ref. |
| H12 | `android-app/src/App.tsx` | Loading state now renders `ActivityIndicator` + text instead of blank `null`. |
| H13 | `web-dashboard/src/lib/api.ts` | `baseURL` no longer falls back to localhost; throws a build-time error if `VITE_API_URL` is missing. |
| H14 | `web-dashboard/src/pages/DataExplorer.tsx` | "Export CSV" now fully implemented with `Blob`, `URL.createObjectURL`, and `a[download]`. |

### Medium — 28 Resolved

| # | File | Description |
|---|------|-------------|
| M1 | `web-dashboard/src/pages/Dashboard.tsx` | `useStations()` now destructures `isLoading` and `error`; shows loading and error states. |
| M3 | `web-dashboard/src/pages/Profile.tsx` | Added `useEffect` to sync `email` state when `user?.email` changes. |
| M4 | `web-dashboard/src/pages/Profile.tsx` | Now uses `useNavigate()` instead of `window.location.href`. |
| M5 | `web-dashboard/src/pages/ApiKeys.tsx` | Now uses `useNavigate()` instead of `window.location.href`. |
| M6 | `web-dashboard/src/pages/ApiKeys.tsx` | `handleCopy` now shows a checkmark icon for 2 seconds via `copiedId` state. |
| M7 | `web-dashboard/src/pages/Pricing.tsx` | Replaced native `alert()` with an in-app toast state (`toast` object rendered as a styled banner). |
| M8 | `web-dashboard/src/pages/Pricing.tsx` | Now tracks `pendingTier` per tier; only the clicked button shows "Processing...". |
| M9 | `web-dashboard/src/pages/Pricing.tsx` | `useSubscribe` now invalidates `['me']` query on success. |
| M10 | `web-dashboard/src/pages/Stations.tsx` | Error state now rendered with an error card and retry message. |
| M11 | `web-dashboard/src/pages/Stations.tsx` | `parseFloat` results now validated with `isNaN` before submission. |
| M13 | `web-dashboard/src/pages/DataExplorer.tsx` | Table now maps `station_id` to human-readable name via `stationNameMap`. |
| M15 | `web-dashboard/src/components/ui/Card.tsx` | `CardTitle` ref type corrected to `HTMLHeadingElement`. |
| M16 | `web-dashboard/src/hooks/useApi.ts` | `useMe()` now derives `enabled` from auth context's `isAuthenticated` instead of reading `localStorage`. |
| M17 | `web-dashboard/src/hooks/useApi.ts` | All hooks now check `if (!res.data?.success)` before returning `res.data.data`. |
| M18 | `web-dashboard/src/lib/utils.ts` | `formatDate` now guards against invalid dates and returns `"—"`. |
| M19 | `web-dashboard/src/lib/utils.ts` | `formatNumber` now guards against `NaN`/`Infinity` and returns `"—"`. |
| M20 | `android-app/src/App.tsx` | Now wrapped in `<SafeAreaProvider>`. |
| M21 | `android-app/src/screens/HomeScreen.tsx` | Now wrapped in `<SafeAreaView>` with `edges={['top']}`. |
| M22 | `android-app/src/screens/ProfileScreen.tsx` | Now wrapped in `<SafeAreaView>` with `edges={['top']}`. |
| M23 | `android-app/src/screens/DataViewScreen.tsx` | Now wrapped in `<SafeAreaView>` with `edges={['top']}`. |
| M24 | `android-app/src/screens/LoginScreen.tsx` | `KeyboardAvoidingView` now uses `Platform.OS === 'ios' ? 'padding' : undefined`. |
| M25 | `android-app/src/screens/RegisterScreen.tsx` | Same `KeyboardAvoidingView` fix as M24. |
| M26 | `android-app/src/screens/StationsScreen.tsx` | Same `KeyboardAvoidingView` fix in the modal. |
| M27 | `android-app/src/components/ReadingForm.tsx` | Same `KeyboardAvoidingView` fix. |
| M29 | `android-app/src/screens/SubmitReadingScreen.tsx` | `fetchStations` now correctly sets `setRefreshing(true)` and `setRefreshing(false)`. |
| M30 | `android-app/src/screens/StationsScreen.tsx` | `createStation` now has `isCreating` state, disables button, shows "Creating...". |
| M31 | `android-app/src/screens/DataViewScreen.tsx` | URL construction now uses `URLSearchParams`. |
| M32 | `android-app/src/screens/HomeScreen.tsx` | URL construction now uses `URLSearchParams`. |

### Low — 19 Resolved

| # | File | Description |
|---|------|-------------|
| L2 | `web-dashboard/src/App.tsx` | `useMe()` is now gated internally by `isAuthenticated`; pattern is no longer fragile. |
| L3 | `web-dashboard/src/components/charts/SensorChart.tsx` | `chartData` and `types` are now memoized with `useMemo`. |
| L4 | `web-dashboard/src/components/charts/SensorChart.tsx` | `XAxis` now has `angle={-45}` and `height={60}`. |
| L8 | `web-dashboard/src/pages/ApiKeys.tsx` | `key.key_hash?.substring(...)` now uses optional chaining. |
| L10 | `web-dashboard/src/pages/Profile.tsx` | `user?.id?.substring(0, 8)` now uses optional chaining. |
| L11 | `web-dashboard/src/lib/api.ts` | Multiple simultaneous 401s now debounced via `isRedirecting` flag. |
| L12 | `web-dashboard/src/lib/utils.ts` | `capitalize` now has a runtime type guard. |
| L13 | `web-dashboard/src/types/index.ts` | `SensorReading.metadata` is now optional (`metadata?:`) on both platforms. |
| L14 | `android-app/src/types/index.ts` | Android `User` type now includes `updated_at: string`. |
| L15 | `android-app/src/hooks/useAuth.ts` | `SecureStore.setItemAsync` failure is now caught and surfaced as an error. |
| L17 | `android-app/src/hooks/useLocation.ts` | Initial `latitude`/`longitude` are now `null` instead of `0`. |
| L18 | `android-app/src/hooks/useLocation.ts` | `mountedRef` now guards `setLocation` calls against unmounted components. |
| L19 | `android-app/src/screens/DataViewScreen.tsx` | `groupedByType` and `chartData` are now memoized with `useMemo`. |
| L20 | `android-app/src/screens/DataViewScreen.tsx` | `chartConfig` is now memoized with `useMemo`. |
| L21 | `android-app/src/screens/DataViewScreen.tsx` | `fetchData` now guards state updates with `isMounted` ref. |
| L24 | `android-app/src/screens/ProfileScreen.tsx` | Logout now shows an `Alert.alert` confirmation dialog. |
| L26 | `android-app/src/components/ReadingForm.tsx` | Added `useEffect` to sync `lat`/`lon` state when `initialLat`/`initialLon` change. |
| L27 | `android-app/src/components/SensorCard.tsx` | `replace(/_/g, ' ')` now replaces all underscores. |
| L28 | `android-app/src/components/SensorCard.tsx` | Invalid timestamps now checked with `isNaN(date.getTime())` before formatting. |

---

## Issues STILL OPEN (16)

### Critical — 3 Still Open

| # | Severity | File | Line | Category | Description | Why Not Fixed |
|---|----------|------|------|----------|-------------|---------------|
| C1 | Critical | `web-dashboard/src/context/AuthContext.tsx` | 32–48, 60–61 | Security | JWT `access_token` and user object are still stored in `localStorage`. A successful XSS payload can still read `enviroswarm_token` and impersonate the user. | A `SECURITY NOTE` comment was added but the storage mechanism was not changed. |
| C5 | Critical | `web-dashboard/src/lib/api.ts` | 47–50 | Security / Navigation | The 401 interceptor still falls back to `window.location.href = '/login'` after a 100ms delay. A full-page reload in a SPA still occurs. | Custom event was added but the fallback reload was not removed. |
| C6 | Critical | `web-dashboard/src/pages/ApiKeys.tsx` | 32 | Security / API | `result.key_hash` is still stored and displayed. The backend contract is still ambiguous: if this is a hash, the user cannot use it as an API key; if it is the raw key, the naming is misleading. | No change to the field name or backend contract verification. |

### Medium — 4 Still Open

| # | Severity | File | Line | Category | Description | Why Not Fixed |
|---|----------|------|------|----------|-------------|---------------|
| M2 | Medium | `web-dashboard/src/pages/Dashboard.tsx` | 8–12, 14–19 | UI/UX | `stats` and `recentActivity` arrays still contain hardcoded mock data. These do not reflect real system state. | No replacement with real API queries. |
| M12 | Medium | `web-dashboard/src/pages/DataExplorer.tsx` | 174 | UI/UX / Performance | `filteredReadings.slice(0, 50)` still silently truncates results to 50 rows with no pagination controls or "Load more" UI. | No pagination or limit selector was added. |
| M14 | Medium | `web-dashboard/src/components/ui/Dialog.tsx` | 9–18 | UI/UX / Accessibility | Still no ESC key handler, no focus trapping, and no `aria-modal` / `role="dialog"`. Keyboard users can still tab outside the modal. | No accessibility enhancements were added. |
| M28 | Medium | `android-app/src/screens/StationsScreen.tsx` | 132–134 | UI/UX | `RefreshControl` is still bound to `refreshing` state, but `fetchStations` only sets `loading` (which is never read) and never sets `refreshing = true`. Pull-to-refresh still shows no spinner. | **Attempted fix was botched:** `setLoading(true)` was added instead of `setRefreshing(true)`. |

### Low — 9 Still Open

| # | Severity | File | Line | Category | Description | Why Not Fixed |
|---|----------|------|------|----------|-------------|---------------|
| L1 | Low | `web-dashboard/src/App.tsx` | 19–23 | State Management | `useEffect` still depends on `[meData, user, setUser]`. If `user` is nullified (e.g., by 401), `meData` (still cached) re-triggers `setUser`, causing a state reset race and potential re-auth with a null token. | Dependency array unchanged. |
| L5 | Low | `web-dashboard/src/components/layout/Header.tsx` | 36–38 | UI/UX | Bell notification button still has no `onClick` handler and no badge count. | No change. |
| L6 | Low | `web-dashboard/src/pages/Dashboard.tsx` | 8–12 | Performance | `stats` array is still re-declared inside the component. | Not moved outside the component. |
| L7 | Low | `web-dashboard/src/pages/Dashboard.tsx` | 14–19 | Performance | `recentActivity` array is still re-declared inside the component. | Not moved outside the component. |
| L9 | Low | `web-dashboard/src/pages/DataExplorer.tsx` | 52 | API Integration | `params.limit = 500` is still hardcoded with no UI control. | No limit selector or pagination added. |
| L16 | Low | `android-app/src/hooks/useAuth.ts` | 25–28 | State Management | `checkAuth` still catches all errors silently. If the `/me` endpoint is down during login, the user is silently logged out with no explanation. | No error logging or user-facing message added. |
| L22 | Low | `android-app/src/screens/LoginScreen.tsx` | 26–39 | UI/UX | Still no email format validation beyond `keyboardType`. | No regex validation added. |
| L23 | Low | `android-app/src/screens/RegisterScreen.tsx` | 27–43 | UI/UX | Still no password strength validation (minimum length, complexity). | No client-side validation added. |
| L25 | Low | `android-app/src/screens/StationsScreen.tsx` | 247–248 | Mobile | FAB is still positioned at `bottom: 20` with no `useSafeAreaInsets()` padding. May overlap gesture navigation bar. | No safe-area padding added. |

---

## NEW Issues Introduced by Fixes (3)

| # | Severity | File | Line | Category | Description | Root Cause |
|---|----------|------|------|----------|-------------|------------|
| N1 | **Critical** | `web-dashboard/src/pages/Login.tsx` `web-dashboard/src/pages/Register.tsx` | 22–25 (Login) 26–29 (Register) | API Integration / Regression | After login/register, the code calls `api.get('/me')` **before** the access token is stored in `localStorage`. The axios interceptor reads `localStorage` for the `Authorization` header, finds nothing, and the `/me` request returns **401**. The old raw-`fetch` code explicitly passed the token in the header; the new axios-based code does not. | Switching from raw `fetch` to the shared `api` client (fix for C2/C3/H1/H2) without ensuring the token is persisted first. |
| N2 | **Medium** | `web-dashboard/src/lib/api.ts` | 43–50 | Security / Race Condition | The 401 "fix" adds a custom event but then schedules `window.location.href = '/login'` after 100ms. This creates a race: the SPA's React Router `<Navigate to="/login" />` may trigger simultaneously with the delayed `window.location.href`, causing a redundant page reload or navigation conflict. | Partial fix for C5: event was added but the fallback reload was not removed. |
| N3 | **Medium** | `android-app/src/screens/StationsScreen.tsx` | 29, 40, 49 | State Management / Dead Code | The fix for M28 added a `loading` state (`const [loading, setLoading] = useState(false)`) and `setLoading(true/false)` in `fetchStations`, but `loading` is **never read** in the JSX. The original `refreshing` bug (spinner never shown) remains because `setRefreshing` is still never called. | Developer misapplied the fix: added `loading` instead of `setRefreshing`. |

---

## Summary by Category (Remaining Issues)

| Category | Still Open | New | Total Remaining |
|----------|------------|-----|-----------------|
| Security (XSS, Secrets, Storage, Navigation) | 2 | 1 | 3 |
| API Integration (Endpoints, Errors, Validation, Token Handling) | 1 | 2 | 3 |
| UI/UX (Loading, Error, Empty, Feedback, Accessibility) | 4 | 0 | 4 |
| Mobile-Specific (Keyboard, Safe Area, Permissions) | 1 | 0 | 1 |
| State Management (Race Conditions, Stale Closures, Dead Code) | 2 | 1 | 3 |
| Performance (Re-renders, Memoization, Pagination) | 3 | 0 | 3 |
| TypeScript / Type Safety | 0 | 0 | 0 |
| Memory Leaks / Cleanup | 0 | 0 | 0 |
| **Total** | **13** | **4** | **17** |

*Note: The category totals (17) do not match the issue totals (19) because N2 and C5 are counted as one issue each but span multiple categories. C5 is Security+Navigation, N2 is Security+Race Condition.*

---

## Top Recommendations for Cycle 5

1. **Fix the Critical regression N1 immediately.** Login and Register are broken in production. Store the token before calling `/me`, or pass the token explicitly in the axios request headers.
2. **Remove the 401 fallback reload.** In `api.ts`, remove the `setTimeout(...window.location.href)` block entirely. Trust the auth context event listener and React Router `<Navigate>` to handle redirection.
3. **Fix the botched M28 refresh fix.** In `StationsScreen.tsx`, replace `setLoading(true/false)` with `setRefreshing(true/false)` in `fetchStations`, or remove the unused `loading` state.
4. **Address remaining Critical security issues.** Move JWT out of `localStorage` (or at least add a CSP and `sessionStorage` migration), and clarify the `key_hash` vs raw key contract in `ApiKeys.tsx`.
5. **Fix the App.tsx race condition (L1).** Remove `user` from the `useEffect` dependency array, or invalidate the `['me']` query when the user is logged out.
6. **Add pagination to DataExplorer.** Replace the silent `.slice(0, 50)` with server-side pagination or a "Load more" button.
7. **Add accessibility to Dialog.** Implement ESC key handling, focus trapping, and ARIA attributes.

---

*End of QA Cycle 4 Report*
