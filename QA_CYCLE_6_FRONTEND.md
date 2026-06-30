# ENViroSwarm Frontend QA Report — Cycle 6

**Date:** 2026-06-30
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)
**Reviewer:** Senior QA Engineer
**Instruction:** Review only — do not fix.
**Previous Reports:** `QA_CYCLE_2_FRONTEND.md`, `QA_CYCLE_4_FRONTEND.md`

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical** | 4 |
| **High** | 3 |
| **Medium** | 12 |
| **Low** | 15 |
| **Total** | **34** |

**Key Risk Areas:**
- **Security:** JWT still stored in client-side `sessionStorage` (XSS vulnerable). `ApiKeys` `key_hash` field naming remains ambiguous (raw key vs hash).
- **Functional Bugs:** Web `SensorChart` loses data when multiple readings share the same minute. Android `login`/`register` can fail silently with no user-facing error.
- **API / Network:** Web `api.ts` has no request timeout, allowing requests to hang indefinitely. Android API client reads `SecureStore` on every request, adding latency.
- **Accessibility:** Multiple ARIA violations across web components (`Tabs`, `Table`, `Header`, `Sidebar`). Android auth screens lack `SafeAreaView`.
- **Type Mismatch:** Android `StationsScreen` can send `undefined` for `latitude`/`longitude`, conflicting with the web `CreateStationRequest` type which requires `number`.

---

## Critical Issues (4)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| C1 | Critical | `web-dashboard/src/context/AuthContext.tsx` | 32–48, 61–62 | Security | JWT `access_token` and user object are stored in `sessionStorage`. Any XSS payload can read `enviroswarm_token` and impersonate the user. The `SECURITY NOTE` comment was added in Cycle 4 but the storage mechanism was not changed. | Move token storage to `httpOnly` secure cookies managed by the backend, or use a service-worker-based token vault. At minimum, add a strict Content-Security-Policy. |
| C6 | Critical | `web-dashboard/src/pages/ApiKeys.tsx` | 32–36 | Security / API | `result.key_hash` is still used for the one-time raw API key display. The backend contract is still ambiguous: on creation the field contains the raw key, on listing it contains a hash. Users may accidentally log the raw key or confuse it with a hash. | Rename the one-time field to `raw_key` or `api_key` in the backend contract. Update the frontend type to distinguish `ApiKeyCreateResponse` (has `raw_key`) from `ApiKey` (has `key_hash`). |
| CR3 | Critical | `web-dashboard/src/lib/api.ts` | 15–20 | API Integration | The axios instance has no `timeout` configured. Axios defaults to `0` (infinite). If the backend hangs, requests never resolve, leaving the UI in a perpetual loading state with no retry mechanism. | Add `timeout: 30000` (or similar) to the axios create config. Wrap calls in components with timeout-aware error handling. |
| CR4 | Critical | `web-dashboard/src/components/charts/SensorChart.tsx` | 33–48 | Data Integrity / UI | `chartData` groups readings by timestamp using `toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })`. If multiple readings occur within the same minute, they share the same key and overwrite each other in the `Map`. Data is silently lost. | Use the full ISO timestamp (`r.timestamp`) as the key, or a millisecond-precision numeric timestamp. Alternatively, aggregate duplicate timestamps (e.g., average) instead of overwriting. |

---

## High Issues (3)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| H1 | High | `android-app/src/hooks/useAuth.ts` | 47–67, 69–89 | State Management / Auth | `login()` and `register()` store the token, then call `checkAuth()`. If `checkAuth()` fails (e.g., `/me` returns 500 or network error), it **catches the error internally**, deletes the token, sets `user` to `null`, and **returns without throwing**. The caller (`LoginScreen`) sees a successful `await login()` and gives no error feedback. The user is silently stuck on the login screen. | Make `checkAuth()` throw after cleanup on failure, or have `login`/`register` inspect the `user` state after `checkAuth()` and throw a user-facing error if still `null`. |
| H2 | High | `android-app/src/hooks/useAuth.ts` | 19–32 | State Management / Auth | `checkAuth()` catches **all** errors (including 403, 500, network timeouts) and unconditionally logs the user out. If the `/me` endpoint is temporarily down or returns 403, the user's valid session is destroyed. | Only clear auth state on **401** responses. For other errors, surface a "Session check failed" message and leave the token intact so the user can retry. |
| H3 | High | `android-app/src/screens/StationsScreen.tsx` | 80–81, 95–96 | TypeScript / API Integration | `latVal` and `lonVal` can be `undefined` when `lat`/`lon` inputs are empty. The payload sends `latitude: latVal` where `latVal` is `undefined`. The web `CreateStationRequest` type requires `latitude: number` and `longitude: number`. This causes a runtime type mismatch and likely a 422 or silent coercion on the backend. | Require latitude and longitude in the mobile form validation, or align the backend to accept optional coordinates and update the shared type. |

---

## Medium Issues (12)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| M1 | Medium | `web-dashboard/src/pages/ApiKeys.tsx` | 43–51 | UI/UX | `handleDelete` uses `alert()` to show error messages. Native `alert()` blocks the UI thread and provides poor UX. | Replace with an in-app toast/snackbar or render an inline error banner. |
| M2 | Medium | `web-dashboard/src/pages/ApiKeys.tsx` | 53–61 | UI/UX | `handleCopy` uses `alert('Clipboard access denied...')` on clipboard failure. Same native `alert()` UX issue as M1. | Replace with an inline error message or a non-blocking toast. |
| M3 | Medium | `web-dashboard/src/pages/Pricing.tsx` | 130 | UI/UX | The "Contact Sales" button has no `onClick` handler. It is a non-functional UI element. | Wire to a mailto link, a contact modal, or remove the button until the feature is built. |
| M4 | Medium | `web-dashboard/src/components/layout/Header.tsx` | 55–71 | UI/UX / Accessibility | The notification dropdown has no click-outside handler. The user must click the bell or the close button to dismiss it. Clicking anywhere else on the page leaves it open. | Add a `useClickOutside` hook on the dropdown container to call `setNotificationsOpen(false)`. |
| M5 | Medium | `web-dashboard/src/components/layout/Header.tsx` | 81–110 | Accessibility | The mobile menu (`md:hidden` nav) does not trap focus. When open, keyboard users can Tab to the hidden desktop sidebar and other elements behind the menu. | Add focus trapping to the mobile menu or use a `Dialog` component for the mobile drawer. |
| M6 | Medium | `web-dashboard/src/main.tsx` | 18–27 | Resilience | There is no `ErrorBoundary` in the React tree. If any component throws during render, the entire SPA crashes to a white screen. | Wrap the app in an `ErrorBoundary` that catches render errors and displays a fallback UI with a reload button. |
| M7 | Medium | `android-app/src/screens/LoginScreen.tsx` | 46–82 | Mobile | No `SafeAreaView` wrapper. The form content can be obscured by the device notch or status bar on modern devices. | Wrap the screen in `<SafeAreaView style={{ flex: 1 }}>` or add top inset padding. |
| M8 | Medium | `android-app/src/screens/RegisterScreen.tsx` | 62–107 | Mobile | Same missing `SafeAreaView` as LoginScreen. | Same fix as M7. |
| M9 | Medium | `android-app/src/screens/SubmitReadingScreen.tsx` | 75–116 | Mobile | Same missing `SafeAreaView` as LoginScreen. | Same fix as M7. |
| M10 | Medium | `android-app/src/components/ReadingForm.tsx` | 41–52 | UI/UX | `handleSubmit` returns early when `parseFloat(value)` is `NaN` without showing any error to the user. If the user enters whitespace or a non-numeric string (e.g., via paste), the submit button is enabled but clicking it does nothing with zero feedback. | Show an `Alert.alert('Invalid value', 'Please enter a numeric reading.')` or an inline error before returning early. Also validate `lat`/`lon` for `NaN`. |
| M11 | Medium | `android-app/src/api/client.ts` | 28–35 | Performance | `SecureStore.getItemAsync('access_token')` is called on **every** outgoing request. This is an async storage read that adds ~5–50ms latency per request. For high-frequency data fetches, this is significant. | Read the token once at app startup, cache it in memory (e.g., a module-level `let`), and only read from `SecureStore` again after a 401 or app restart. |
| M12 | Medium | `android-app/src/screens/DataViewScreen.tsx` | 70–72 | TypeScript / Lint | `useEffect(() => { fetchData(); }, [stationId, sensorType]);` omits `fetchData` from the dependency array. While currently benign because `fetchData` only references stable values, this violates the exhaustive-deps rule and is a footgun for future edits. | Add `fetchData` to the dependency array (and wrap `fetchData` in `useCallback` with its own stable deps). |

---

## Low Issues (15)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| L1 | Low | `web-dashboard/src/pages/DataExplorer.tsx` | 87–94 | UI/UX | `handleExportCsv` calls `URL.revokeObjectURL(url)` immediately after `a.click()`. In some browsers, the download may not complete before the URL is revoked. | Revoke the URL in a `setTimeout(..., 1000)` or after the download is confirmed. |
| L2 | Low | `web-dashboard/src/pages/Login.tsx` | 17–39 | UI/UX | `email` is submitted without `.trim()`. If the user enters leading/trailing whitespace, the backend receives an invalid email and the login fails with a generic error. | Call `email.trim()` before passing to `loginMutation.mutateAsync()`. Same for `Register.tsx`. |
| L3 | Low | `web-dashboard/src/pages/Profile.tsx` | 39–41 | Memory Leak | `setTimeout(() => setSaveSuccess(false), 3000)` is not cleared if the component unmounts before the timeout fires. | Store the timeout ID in a `useRef` and clear it in the cleanup function of a `useEffect`. |
| L4 | Low | `web-dashboard/src/components/ui/Button.tsx` | 12–31 | UI/UX | `Button` does not default to `type="button"`. If a consumer forgets to add `type="button"` inside a form, the button will submit the form. | Add `type = 'button'` to the destructured props and spread it onto the `<button>` element. |
| L5 | Low | `web-dashboard/src/components/layout/Header.tsx` | 84–97 | Accessibility | Active mobile nav item and notification bell have no `aria-current="page"` or `aria-controls`. | Add `aria-current="page"` to the active mobile nav `<Link>`. Add `aria-controls` to the notification bell button. |
| L6 | Low | `web-dashboard/src/components/layout/Sidebar.tsx` | 36–55 | Accessibility | Active sidebar nav item has no `aria-current="page"`. | Add `aria-current="page"` to the active `<Link>`. |
| L7 | Low | `web-dashboard/src/components/ui/Tabs.tsx` | 33–78 | Accessibility | `TabsList` has no `role="tablist"`, `TabsTrigger` has no `role="tab"`, `TabsContent` has no `role="tabpanel"`. | Add the appropriate ARIA roles and `aria-selected` to the active trigger. |
| L8 | Low | `web-dashboard/src/components/ui/Table.tsx` | 36–48 | Accessibility | `TableHead` (`<th>`) has no `scope="col"`. | Add `scope="col"` to `TableHead`. |
| L9 | Low | `web-dashboard/src/pages/DataExplorer.tsx` | 211 | Robustness | `reading.value.toFixed(3)` is called directly on the API response. If the backend ever returns a non-numeric `value` (e.g., `null`), this will throw a runtime error. | Use `formatNumber(reading.value, 3)` which already guards against `NaN`/`Infinity`. |
| L10 | Low | `web-dashboard/src/components/charts/SensorChart.tsx` | 89–91 | UI/UX | If a station has many sensor types (e.g., 10), the `Legend` will overflow or become unreadable. There is no scroll or collapse mechanism. | Add a custom legend with scrollable wrapping, or limit the number of visible lines with a "Show more" toggle. |
| L11 | Low | `web-dashboard/src/pages/Dashboard.tsx` | 115–143 | UI/UX | The "Recent Activity" card only shows station creation events, not actual sensor readings. The title "Recent Activity" is misleading. | Rename the card to "Recent Station Activity" or include actual reading events from the API. |
| L12 | Low | `android-app/src/screens/DataViewScreen.tsx` | 43 | Dead Code | `const [sensorType, setSensorType] = useState<SensorType | 'all'>('all');` is declared but `setSensorType` is never called. There is no UI filter for sensor type. | Remove the unused state or implement a sensor type filter dropdown. |
| L13 | Low | `android-app/src/screens/DataViewScreen.tsx` | 29 | Mobile | `screenWidth` is computed once at module load. If the device rotates, the `LineChart` width does not update. | Use `Dimensions.addEventListener('change', ...)` or `useWindowDimensions` to react to orientation changes. |
| L14 | Low | `android-app/src/screens/HomeScreen.tsx` | 64–67 | UI/UX | `fetchNearby` is only called when the user's GPS location changes. Panning the map to a new region does not fetch stations in that new region. | Add an "Explore here" button or call `fetchNearby` when `region` changes significantly. |
| L15 | Low | `android-app/App.tsx` | 108–117 | Mobile | No `StatusBar` configuration from `expo-status-bar` or `react-native`. The status bar may be light text on a light background or fail to match the dark theme. | Import `StatusBar` from `expo-status-bar` and set `style="light"` with `backgroundColor="#0f172a"`. |

---

## Summary by Category

| Category | Count |
|----------|-------|
| Security (XSS, Storage, Secrets) | 2 |
| API Integration (Timeouts, Types, Endpoints) | 4 |
| Data Integrity / Data Loss | 1 |
| State Management / Auth Flow | 3 |
| UI/UX (Alerts, Missing Handlers, Feedback) | 8 |
| Accessibility (ARIA, Focus, Labels) | 6 |
| Mobile-Specific (Safe Area, Status Bar, Keyboard) | 4 |
| Performance (Latency, Re-renders) | 2 |
| Resilience / Error Boundaries | 1 |
| Dead Code / Lint Violations | 2 |
| Robustness (NaN, Trimming, Edge Cases) | 1 |
| **Total** | **34** |

---

## Top Recommendations for Cycle 7

1. **Fix the Critical `SensorChart` data loss immediately.** The minute-precision timestamp grouping silently drops readings. Use full ISO timestamps or aggregate properly.
2. **Add a request timeout to `web-dashboard/src/lib/api.ts`.** A 30-second timeout prevents hung requests from freezing the UI.
3. **Fix the Android silent login failure.** `login()` and `register()` must throw or surface an error when `checkAuth()` fails after token storage.
4. **Address the `key_hash` vs raw key ambiguity.** Coordinate with the backend team to rename the one-time creation field to `raw_key` or `api_key`.
5. **Add `SafeAreaView` to all Android auth screens.** Login, Register, and SubmitReading screens currently lack safe-area padding.
6. **Add an `ErrorBoundary` to the web app.** Prevents total white-screen crashes from any single component failure.
7. **Implement a token memory cache in the Android API client.** Stop reading `SecureStore` on every request; read once at startup and cache in a module-level variable.
8. **Fix the `Button` default `type="button"`.** Prevents accidental form submissions from future feature development.
9. **Add ARIA roles to `Tabs` and `Table` components.** Brings the web dashboard closer to WCAG compliance.
10. **Add email trimming and `ReadingForm` NaN validation.** Small polish fixes that prevent user confusion.

---

*End of QA Cycle 6 Report*
