# ENViroSwarm Frontend QA Report — Cycle 8

**Date:** 2026-07-18
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)
**Reviewer:** Senior QA Engineer
**Instruction:** Review only — do not fix.
**Previous Reports:** `QA_CYCLE_6_FRONTEND.md`, `QA_CYCLE_4_FRONTEND.md`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical** | 1 |
| **High** | 1 |
| **Medium** | 12 |
| **Low** | 15 |
| **Total** | **29** |

**Key Risk Areas:**
- **Security:** JWT still stored in client-side `sessionStorage` (XSS vulnerable). A new split-auth state issue was introduced when fixing the login/register token flow.
- **Mobile UX:** `LoginScreen`, `RegisterScreen`, and `SubmitReadingScreen` still lack `SafeAreaView` wrappers.
- **Resilience:** No `ErrorBoundary` in the React tree; web dashboard can still white-screen on any render error.
- **API / Network:** Android API client still reads `SecureStore` on every outgoing request.
- **UI/UX:** Native `alert()` still used for error feedback in `ApiKeys`; `DataViewScreen` still has a missing `exhaustive-deps` violation.

---

## Critical Issues Still Open (1)

| # | Severity | File | Line | Category | Description |
|---|----------|------|------|----------|-------------|
| C1 | Critical | `web-dashboard/src/context/AuthContext.tsx` | 32–48, 67–68, 81–82 | Security | JWT `access_token` and user object are stored in `sessionStorage`. Any XSS payload can read `enviroswarm_token` and impersonate the user. The security comments were expanded in Cycle 7 but the storage mechanism was not changed. | **Cycle 7 status:** Unchanged. Comments added; `localStorage` was swapped for `sessionStorage` in Cycle 6, but client-side storage remains vulnerable. |

---

## High Issues Still Open (1)

| # | Severity | File | Line | Category | Description |
|---|----------|------|------|----------|-------------|
| NH1 | High | `web-dashboard/src/pages/Login.tsx`<br>`web-dashboard/src/pages/Register.tsx` | 23 (Login)<br>28 (Register) | State Management / Auth | **Regression introduced by Cycle 7 fix.** The token is stored in `sessionStorage` *before* calling `api.get('/me')`. If the `/me` call fails (network error, 500, etc.), the token remains orphaned in `sessionStorage` with no corresponding user object. The axios interceptor will continue attaching the orphaned token on future requests, while `AuthContext` considers the user unauthenticated. This creates a split auth state that can cause 401 loops or confusing behavior on retry. | **Root cause:** The fix for N1 (Cycle 4) stored the token early to satisfy the interceptor, but did not add cleanup logic on `/me` failure. |

---

## New Issues Introduced by Fixes (1)

| # | Severity | File | Line | Category | Description | Root Cause |
|---|----------|------|------|----------|-------------|------------|
| NH1 | High | `web-dashboard/src/pages/Login.tsx`<br>`web-dashboard/src/pages/Register.tsx` | 23, 32–35 (Login)<br>28, 33–38 (Register) | State Management / Regression | Orphaned token in `sessionStorage` when `/me` fails after login/register. | Fix for N1 (token-before-`/me`) without adding rollback on failure. |

*Note: No other new critical or high issues were introduced by the Cycle 7 fixes. The `Dialog` accessibility refactor, `DataExplorer` pagination, `SensorChart` timestamp fix, and `useAuth` error-handling improvements are all clean.*

---

## Summary: Cycle 7 Fix Verification

### ✅ Fixed in Cycle 7

| Original Issue | File | Fix Verified |
|----------------|------|--------------|
| **CR3** — `api.ts` no timeout | `web-dashboard/src/lib/api.ts` | `timeout: 30000` added on line 20. ✅ |
| **CR4** — `SensorChart` data loss | `web-dashboard/src/components/charts/SensorChart.tsx` | Now groups by full ISO timestamp (`r.timestamp`) in a `Map`; minute-level collision eliminated. ✅ |
| **C5** — 401 interceptor full reload | `web-dashboard/src/lib/api.ts` | `window.location.href` fallback removed; only `CustomEvent('enviroswarm:unauthorized')` dispatched. ✅ |
| **H1** — Android silent login failure | `android-app/src/hooks/useAuth.ts` | `login()` / `register()` now throw `Error('Session validation failed after login...')` if `checkAuth()` returns null. ✅ |
| **H2** — `checkAuth()` clears all errors | `android-app/src/hooks/useAuth.ts` | Only clears token on `err?.response?.status === 401`; other errors are thrown and token is preserved. ✅ |
| **H3** — `StationsScreen` undefined lat/lon | `android-app/src/screens/StationsScreen.tsx` | `latVal` / `lonVal` are now validated as non-empty and numeric before submission; `Alert` shown on invalid input. ✅ |
| **N1** — Login/Register 401 before token stored | `web-dashboard/src/pages/Login.tsx`<br>`web-dashboard/src/pages/Register.tsx` | Token is stored in `sessionStorage` *before* `api.get('/me')` is called. ✅ (see NH1 for side-effect) |
| **N2** — 401 reload race condition | `web-dashboard/src/lib/api.ts` | `window.location.href` fallback removed entirely. ✅ |
| **N3** — Botched `M28` refresh fix | `android-app/src/screens/StationsScreen.tsx` | `fetchStations` correctly calls `setRefreshing(true/false)`. ✅ |
| **L1** — `App.tsx` race condition | `web-dashboard/src/App.tsx` | `user` removed from `useEffect` dependency array; `['me']` query cache cleared on unauthorized event. ✅ |
| **M2** — Dashboard mock data | `web-dashboard/src/pages/Dashboard.tsx` | `stats` and `recentActivity` now computed from real `useStations` / `useSensorData` responses with `useMemo`. ✅ |
| **M12** — `DataExplorer` silent truncation | `web-dashboard/src/pages/DataExplorer.tsx` | Full client-driven pagination with `page`, `limit`, `meta`, and UI controls. ✅ |
| **M14** — `Dialog` no ESC / focus trap | `web-dashboard/src/components/ui/Dialog.tsx` | `Escape` handler, focus trapping on `Tab`/`Shift+Tab`, `role="dialog"`, `aria-modal="true"`, and focus restoration added. ✅ |
| **L5** — Header bell no handler | `web-dashboard/src/components/layout/Header.tsx` | Bell now has `onClick`, `aria-expanded`, `aria-haspopup`, and badge count UI. ✅ |
| **L6 / L7** — Dashboard redundant arrays | `web-dashboard/src/pages/Dashboard.tsx` | `stats` and `recentActivity` moved to `useMemo`. ✅ |
| **L9** — `DataExplorer` hardcoded limit | `web-dashboard/src/pages/DataExplorer.tsx` | `limit` is now user-selectable (`[10, 25, 50, 100]`). ✅ |
| **L16** — `checkAuth()` silent failures | `android-app/src/hooks/useAuth.ts` | Errors are now logged and thrown; non-401 errors preserve the token. ✅ |
| **L22 / L23** — Login/Register no validation | `android-app/src/screens/LoginScreen.tsx`<br>`android-app/src/screens/RegisterScreen.tsx` | Email regex validation, min length 8, uppercase/lowercase/number complexity checks added. ✅ |
| **L25** — FAB no safe-area padding | `android-app/src/screens/StationsScreen.tsx` | `useSafeAreaInsets()` applied; `bottom: 20 + insets.bottom`. ✅ |
| **C6** — `ApiKeys` ambiguous `key_hash` (UI layer) | `web-dashboard/src/pages/ApiKeys.tsx` | UI now clearly labels one-time display as "raw key" and listing as "hashed values". `ApiKeyCreateResponse` type added. ⚠️ Backend contract still ambiguous; frontend maps `key_hash` → `raw_key` as a workaround. |

### ❌ Still Unfixed from Previous Cycles

| Issue | File | Line | Description | First Reported |
|-------|------|------|-------------|----------------|
| **C1** | `web-dashboard/src/context/AuthContext.tsx` | 32–48, 67–68, 81–82 | JWT in `sessionStorage` — XSS vulnerable | Cycle 4 |
| **M1** | `web-dashboard/src/pages/ApiKeys.tsx` | 47 | `handleDelete` uses `alert()` for error feedback | Cycle 6 |
| **M2** | `web-dashboard/src/pages/ApiKeys.tsx` | 57 | `handleCopy` uses `alert()` on clipboard failure | Cycle 6 |
| **M3** | `web-dashboard/src/pages/Pricing.tsx` | 130 | "Contact Sales" button has no `onClick` handler | Cycle 6 |
| **M4** | `web-dashboard/src/components/layout/Header.tsx` | 55–71 | Notification dropdown has no click-outside handler | Cycle 6 |
| **M5** | `web-dashboard/src/components/layout/Header.tsx` | 81–110 | Mobile menu lacks focus trapping | Cycle 6 |
| **M6** | `web-dashboard/src/main.tsx` | 18–27 | No `ErrorBoundary` in the React tree | Cycle 6 |
| **M7** | `android-app/src/screens/LoginScreen.tsx` | 46–82 | No `SafeAreaView` wrapper | Cycle 6 |
| **M8** | `android-app/src/screens/RegisterScreen.tsx` | 62–107 | No `SafeAreaView` wrapper | Cycle 6 |
| **M9** | `android-app/src/screens/SubmitReadingScreen.tsx` | 75–116 | No `SafeAreaView` wrapper | Cycle 6 |
| **M10** | `android-app/src/components/ReadingForm.tsx` | 41–52 | `handleSubmit` returns early on `NaN` with zero user feedback | Cycle 6 |
| **M11** | `android-app/src/api/client.ts` | 28–35 | `SecureStore.getItemAsync` called on every request | Cycle 6 |
| **M12** | `android-app/src/screens/DataViewScreen.tsx` | 70–72 | `useEffect` omits `fetchData` from dependency array | Cycle 6 |
| **L1** | `web-dashboard/src/pages/DataExplorer.tsx` | 87–94 | `URL.revokeObjectURL(url)` called immediately after `a.click()` | Cycle 4 |
| **L2** | `web-dashboard/src/pages/Login.tsx` | 17–39 | `email` submitted without `.trim()` | Cycle 4 |
| **L3** | `web-dashboard/src/pages/Profile.tsx` | 39–41 | `setTimeout` for `saveSuccess` not cleared on unmount | Cycle 4 |
| **L4** | `web-dashboard/src/components/ui/Button.tsx` | 12–31 | `Button` does not default to `type="button"` | Cycle 4 |
| **L5** | `web-dashboard/src/components/layout/Header.tsx` | 84–97 | Mobile nav active item has no `aria-current="page"` | Cycle 4 |
| **L6** | `web-dashboard/src/components/layout/Sidebar.tsx` | 36–55 | Active sidebar item has no `aria-current="page"` | Cycle 4 |
| **L7** | `web-dashboard/src/components/ui/Tabs.tsx` | 33–78 | No `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` | Cycle 4 |
| **L8** | `web-dashboard/src/components/ui/Table.tsx` | 36–48 | `TableHead` (`<th>`) has no `scope="col"` | Cycle 4 |
| **L9** | `web-dashboard/src/pages/DataExplorer.tsx` | 211 | `reading.value.toFixed(3)` unguarded against non-numeric values | Cycle 4 |
| **L10** | `web-dashboard/src/components/charts/SensorChart.tsx` | 89–91 | `Legend` can overflow with many sensor types; no scroll/collapse | Cycle 4 |
| **L11** | `web-dashboard/src/pages/Dashboard.tsx` | 115–143 | "Recent Activity" only shows station creation, not actual readings | Cycle 4 |
| **L12** | `android-app/src/screens/DataViewScreen.tsx` | 43 | `setSensorType` declared but never called | Cycle 4 |
| **L13** | `android-app/src/screens/DataViewScreen.tsx` | 29 | `screenWidth` computed once at module load; no rotation handling | Cycle 4 |
| **L14** | `android-app/src/screens/HomeScreen.tsx` | 64–67 | `fetchNearby` only called on GPS change, not on map pan | Cycle 4 |
| **L15** | `android-app/App.tsx` | 108–117 | No `StatusBar` configuration | Cycle 4 |

---

## Top Recommendations for Cycle 9

1. **Address the split-auth state (NH1).** In `Login.tsx` and `Register.tsx`, wrap the `/me` call in a `try/finally` that removes the token from `sessionStorage` on failure, or better yet, move the token storage into `AuthContext.login()` and pass the token explicitly to the `/me` request header to avoid the ordering problem entirely.
2. **Fix the remaining Critical XSS vector (C1).** Move JWT storage to `httpOnly` secure cookies, or implement a strict CSP and token rotation. Client-side sessionStorage is not a long-term solution.
3. **Add `SafeAreaView` to all Android auth screens.** `LoginScreen`, `RegisterScreen`, and `SubmitReadingScreen` need `edges={['top']}` to avoid notch/status bar overlap.
4. **Add an `ErrorBoundary` to the web app.** Wrap the `<App />` in `main.tsx` with an error boundary that shows a fallback UI and reload button.
5. **Cache the Android token in memory.** Read `SecureStore` once at app startup and cache the token in a module-level variable; only re-read after a 401 or app restart.
6. **Replace native `alert()` in `ApiKeys`.** Use the same toast/banner pattern already established in `Pricing.tsx` for `handleDelete` and `handleCopy` errors.
7. **Fix the `DataViewScreen` dependency array.** Add `fetchData` to the `useEffect` deps and wrap `fetchData` in `useCallback` with stable deps.
8. **Add email trimming to `Login.tsx` and `Register.tsx`.** Call `email.trim()` before passing to the mutation to prevent whitespace-caused login failures.
9. **Clear the `Profile.tsx` timeout.** Store the `setTimeout` ID in a `useRef` and clear it in the cleanup function.
10. **Add ARIA roles to `Tabs` and `Table`.** Small accessibility wins that bring the dashboard closer to WCAG compliance.

---

*End of QA Cycle 8 Report*
