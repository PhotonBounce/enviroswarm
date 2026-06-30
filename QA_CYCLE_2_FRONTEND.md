# ENViroSwarm Frontend QA Report — Cycle 2

**Date:** 2025-07-01
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)
**Reviewer:** Senior QA Engineer
**Instruction:** Review only — do not fix.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Critical** | 6 |
| **High** | 14 |
| **Medium** | 32 |
| **Low** | 28 |
| **Total** | **80** |

**Key Risk Areas:**
- Security: JWT tokens stored in `localStorage` (XSS vulnerable), hardcoded localhost API URLs, and 401 handling that performs full-page reloads.
- API Integration: Login/Register pages bypass the configured axios client and use raw `fetch` with hardcoded `localhost` URLs.
- Functional Bugs: "Save Changes" button on Profile does not persist, Export CSV button has no handler, and 0-valued coordinates are treated as falsy.
- Mobile: Missing `SafeAreaView` / `SafeAreaProvider`, stale location values in station creation, and `KeyboardAvoidingView` using the buggy `height` behavior on Android.
- State Management: Stale closures in form state, race conditions in auth initialization, and `refreshing` state never set to `true` in multiple mobile screens.

---

## Critical Issues (6)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| C1 | Critical | `web-dashboard/src/context/AuthContext.tsx` | 32–48 | Security | JWT `access_token` and user object are stored in `localStorage`. Any XSS payload can read `enviroswarm_token` and impersonate the user. | Move token storage to `httpOnly` secure cookies managed by the backend, or use a service-worker-based token vault. If SPA-only, use `sessionStorage` and implement strict CSP. |
| C2 | Critical | `web-dashboard/src/pages/Login.tsx` | 22–25 | API Integration | Uses raw `fetch` with a hardcoded `http://localhost:8000/api/v1/me` URL instead of the configured `api` axios instance. Breaks in any non-localhost environment. | Replace the raw `fetch` call with the existing `api.get('/me')` axios instance. Remove the hardcoded URL entirely. |
| C3 | Critical | `web-dashboard/src/pages/Register.tsx` | 26–29 | API Integration | Same raw `fetch` with hardcoded `localhost` URL as Login.tsx. No error handling for network failures or JSON parse errors. | Use the shared `api` client (`api.get('/me')`) and wrap in a try/catch with proper error messaging. |
| C4 | Critical | `web-dashboard/src/pages/Profile.tsx` | 90 | State Management | The "Save Changes" button only calls `setIsEditing(false)`. It does **not** call any API to persist the updated email. Users believe changes are saved when they are lost on refresh. | Wire the Save button to a mutation hook (e.g., `useUpdateUser`) that calls `PATCH /me` and invalidates the user query cache on success. |
| C5 | Critical | `web-dashboard/src/lib/api.ts` | 31–34 | Security | On 401, the interceptor removes the token and sets `window.location.href = '/login'`. This causes a full-page reload in a SPA and can be exploited if an attacker triggers a 401 response. | Use a React Router navigation hook or emit a custom event that the auth context listens to. Avoid full-page reloads. |
| C6 | Critical | `web-dashboard/src/pages/ApiKeys.tsx` | 28 | Security / API | The API key creation response stores `result.key_hash` into state. If the field name truly contains a hash (not the raw key), the user cannot use it. If it contains the raw key, the naming is misleading and may lead to accidental exposure in logs. | Verify the backend contract. If the raw key is returned, rename the type field to `key` or `api_key`. Ensure it is only rendered once and never persisted to local storage. |

---

## High Issues (14)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| H1 | High | `web-dashboard/src/pages/Login.tsx` | 22–25 | API Integration | The raw `fetch` call has no network-error handling. If the backend is unreachable, `res.json()` will throw an unhandled rejection and the user sees a generic "Login failed" message. | Wrap `fetch` (or better, the axios call) in a `try/catch` and surface the specific error message (e.g., "Cannot reach server"). |
| H2 | High | `web-dashboard/src/pages/Register.tsx` | 26–29 | API Integration | Same lack of `fetch` error handling as Login.tsx. | Same fix as H1. |
| H3 | High | `web-dashboard/src/components/charts/SensorChart.tsx` | 32–73 | UI/UX / Data Viz | `chartData` maps all readings into a single array with one `dataKey="value"`. If the query returns multiple `sensor_type`s, they are all plotted on the same line with the same color. The chart becomes meaningless. | Group readings by `sensor_type`, render a separate `<Line>` / `<Area>` per type with distinct colors, or filter the data to a single type before passing to the chart. |
| H4 | High | `web-dashboard/src/pages/DataExplorer.tsx` | 40–41 | API Integration | `new Date(start).toISOString()` and same for `end` will throw a `RangeError` if the input is invalid (e.g., user clears the field partially). The error is unhandled and crashes the handler. | Validate the date string with `isNaN(date.getTime())` before calling `toISOString()`. |
| H5 | High | `android-app/src/api/client.ts` | 4 | API Integration | `process.env.API_URL` is **not** available in standard Expo builds unless prefixed with `EXPO_PUBLIC_`. The fallback to `http://localhost:8000` means production builds will always point to localhost. | Use `process.env.EXPO_PUBLIC_API_URL` or `Constants.expoConfig.extra.apiUrl`, and provide a meaningful production fallback (or fail-fast if unset). |
| H6 | High | `android-app/src/screens/HomeScreen.tsx` | 52 | State Management | `if (latitude && longitude)` treats `0` as falsy. The coordinates `(0, 0)` (Gulf of Guinea) are valid, but the app will never fetch nearby stations there. | Explicitly check `latitude !== null && longitude !== null` (or use `undefined` as the unset state instead of `0`). |
| H7 | High | `android-app/src/screens/SubmitReadingScreen.tsx` | 54–55 | API Integration | `...(data.lat ? { lat: data.lat } : {})` uses truthiness. If the user is at latitude `0` (equator) or longitude `0` (prime meridian), the metadata omits the coordinate. | Check `data.lat !== undefined && data.lat !== null` instead of truthiness. Same for `lon`. |
| H8 | High | `android-app/src/screens/StationsScreen.tsx` | 58–65 | State Management / Race Condition | `openCreateModal` calls `await getCurrentLocation()`, then immediately reads `latitude`/`longitude` from hook state. Because state updates are asynchronous, the modal opens with the **previous** location values, not the freshly fetched ones. | Pass the resolved location directly from `getCurrentLocation` (return it from the hook) or use a `useEffect` inside the modal to sync when location changes. |
| H9 | High | `android-app/src/api/client.ts` | 28–33 | State Management | On 401, the interceptor deletes the token from `SecureStore` but does **not** update React state or trigger navigation. The user remains on authenticated screens with a broken token. | Expose an auth callback (e.g., `logout()` from `useAuth`) or emit an event that the navigator listens to, forcing a re-render and redirect to Login. |
| H10 | High | `android-app/src/screens/DataViewScreen.tsx` | 25 | TypeScript | `route.params as { stationId: string; stationName: string }` is an unchecked type assertion. If the screen is navigated to without params, it crashes at runtime. | Use a typed route param interface with `RouteProp<RootStackParamList, 'DataView'>` and validate params with a runtime guard. |
| H11 | High | `android-app/src/hooks/useAuth.ts` | 37–47 | State Management | `login` has no race-condition guard. If the user taps the login button rapidly, multiple API calls are fired. The first to resolve may overwrite the token of the second, causing unpredictable auth state. | Add a `isLoggingIn` ref/state and abort/ignore duplicate requests. |
| H12 | High | `android-app/src/App.tsx` | 71–73 | UI/UX | `if (loading) return null;` shows a blank white screen while auth status is checked. On slow devices this feels like a freeze. | Return a full-screen loading spinner or splash screen instead of `null`. |
| H13 | High | `web-dashboard/src/lib/api.ts` | 11 | API Integration | `baseURL` falls back to `http://localhost:8000/api/v1` if `VITE_API_URL` is missing. In production this silently points to a non-existent local backend. | Remove the fallback and throw a build-time error if `VITE_API_URL` is not defined, or use a clearly invalid sentinel value. |
| H14 | High | `web-dashboard/src/pages/DataExplorer.tsx` | 94–97 | UI/UX | The "Export CSV" button has no `onClick` handler. It is a completely non-functional UI element. | Implement CSV export with `URL.createObjectURL` + `a[download]`, or remove the button until the feature is built. |

---

## Medium Issues (32)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| M1 | Medium | `web-dashboard/src/pages/Dashboard.tsx` | 22 | UI/UX | `useStations()` is called without `isLoading` or `error` handling. During the initial load, the UI flashes "No stations yet" before data arrives. | Destructure `isLoading` and `error` from `useStations()`, show a skeleton/loader while loading, and an error state on failure. |
| M2 | Medium | `web-dashboard/src/pages/Dashboard.tsx` | 8–19 | UI/UX | `stats` and `recentActivity` arrays contain hardcoded mock data. These values do not reflect real system state. | Replace with actual API queries (e.g., `useSensorData({ limit: 1 })` or a dedicated `/stats` endpoint). |
| M3 | Medium | `web-dashboard/src/pages/Profile.tsx` | 12 | State Management | `const [email, setEmail] = useState(user?.email ?? '')` captures the initial value only. If `user` is still loading when the component mounts, the email field remains empty even after `user` arrives. | Add a `useEffect` that syncs `email` state when `user?.email` changes. |
| M4 | Medium | `web-dashboard/src/pages/Profile.tsx` | 116 | UI/UX | Uses `window.location.href = '/pricing'` for navigation, causing a full-page reload. | Use `useNavigate()` from `react-router-dom` and call `navigate('/pricing')`. |
| M5 | Medium | `web-dashboard/src/pages/ApiKeys.tsx` | 59 | UI/UX | Same full-page reload navigation pattern (`window.location.href = '/pricing'`). | Use `useNavigate()`. |
| M6 | Medium | `web-dashboard/src/pages/ApiKeys.tsx` | 41–43 | UI/UX | `handleCopy` calls `navigator.clipboard.writeText()` but provides no visual feedback (toast, tooltip, or color change). Users cannot tell if the copy succeeded. | Show a temporary toast or change the button icon to a checkmark for 2 seconds. |
| M7 | Medium | `web-dashboard/src/pages/Pricing.tsx` | 38–45 | UI/UX | Uses native `alert()` for success and error messages. This blocks the UI thread and provides a poor user experience. | Replace with an in-app toast/snackbar component or a modal. |
| M8 | Medium | `web-dashboard/src/pages/Pricing.tsx` | 94 | UI/UX | `disabled={isCurrent || subscribe.isPending}` disables **all** tier buttons when any subscription is pending. Users cannot click a different tier while one is loading. | Only disable the button that was clicked (track `pendingTier` in local state). |
| M9 | Medium | `web-dashboard/src/pages/Pricing.tsx` | 38–45 | State Management | After successful subscription, the user tier is not invalidated/refetched. The UI still shows the old tier until manual refresh. | Call `queryClient.invalidateQueries({ queryKey: ['me'] })` in `onSuccess` of the subscribe mutation. |
| M10 | Medium | `web-dashboard/src/pages/Stations.tsx` | 18 | UI/UX | `useStations()` error state is not handled. If the request fails, the UI shows the empty "No stations yet" state instead of an error message. | Destructure `error` and render an error card with a retry button. |
| M11 | Medium | `web-dashboard/src/pages/Stations.tsx` | 43–44 | API Integration | `parseFloat(latitude)` and `parseFloat(longitude)` are not validated. If the user enters "abc", `NaN` is sent to the API. | Check `isNaN(parsed)` after `parseFloat` and show a form-level validation error before submitting. |
| M12 | Medium | `web-dashboard/src/pages/DataExplorer.tsx` | 142 | Performance | `filteredReadings.slice(0, 50)` silently truncates results to 50 rows with no UI indication. Users with 500 readings see only 10% of the data. | Add pagination controls (previous/next) or a "Load more" button, and show the total count prominently. |
| M13 | Medium | `web-dashboard/src/pages/DataExplorer.tsx` | 145 | UI/UX | The table shows `reading.station_id` (a UUID) instead of the human-readable station name. | Map station IDs to names using the `stations` query data, or include the station name in the `/data` response. |
| M14 | Medium | `web-dashboard/src/components/ui/Dialog.tsx` | 9–18 | UI/UX | The dialog has no ESC key handler, no focus trapping, and no `aria-modal` / `role="dialog"` attributes. Keyboard users can tab outside the modal. | Add a `useEffect` keydown listener for `Escape`, implement focus trapping (e.g., with a ref and tab-index loop), and add ARIA roles. |
| M15 | Medium | `web-dashboard/src/components/ui/Card.tsx` | 22 | TypeScript | `CardTitle` uses `React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>` but renders an `<h3>`. The ref type should be `HTMLHeadingElement`. | Change the ref generic to `HTMLHeadingElement` and align the props type. |
| M16 | Medium | `web-dashboard/src/hooks/useApi.ts` | 43 | State Management | `enabled: !!localStorage.getItem('enviroswarm_token')` reads localStorage at render time. It does not reactively update if the token is removed during the session. | Derive `enabled` from the auth context's `token` state so it stays reactive. |
| M17 | Medium | `web-dashboard/src/hooks/useApi.ts` | 22, 30, 40 | API Integration | All hooks return `res.data.data` without checking if `res.data` exists. If axios returns a malformed response, the app crashes. | Add a runtime guard: `if (!res.data?.success) throw new Error(res.data?.error ?? 'Unknown error')`. |
| M18 | Medium | `web-dashboard/src/lib/utils.ts` | 9–16 | TypeScript | `formatDate` does not handle invalid date strings. `new Date('invalid').toLocaleString()` returns `"Invalid Date"` silently. | Check `isNaN(date.getTime())` and return a fallback string like `"—"`. |
| M19 | Medium | `web-dashboard/src/lib/utils.ts` | 18–20 | TypeScript | `formatNumber` does not guard against `NaN` or `Infinity`. `NaN.toFixed(2)` returns `"NaN"`. | Add `if (!isFinite(value)) return '—'`. |
| M20 | Medium | `android-app/src/App.tsx` | 104–108 | Mobile | No `SafeAreaProvider` from `react-native-safe-area-context` is wrapped around the app. This prevents descendant screens from using `useSafeAreaInsets` correctly. | Wrap the app tree in `<SafeAreaProvider>` from `react-native-safe-area-context`. |
| M21 | Medium | `android-app/src/screens/HomeScreen.tsx` | 87–113 | Mobile | Missing `SafeAreaView`. The map overlay at `top: 16` can be hidden under the status bar or notch on modern devices. | Wrap the screen in `<SafeAreaView>` or use `useSafeAreaInsets` to pad the overlay. |
| M22 | Medium | `android-app/src/screens/ProfileScreen.tsx` | 22–45 | Mobile | Missing `SafeAreaView`. The title and card content can be obscured by the device notch or status bar. | Add `SafeAreaView` wrapper or top padding from `useSafeAreaInsets`. |
| M23 | Medium | `android-app/src/screens/DataViewScreen.tsx` | 91 | Mobile | Missing `SafeAreaView` or bottom inset padding. The `ScrollView` content may be hidden by the home indicator on iOS or gesture navigation bar on Android. | Add `SafeAreaView` or `contentInsetAdjustmentBehavior="automatic"`. |
| M24 | Medium | `android-app/src/screens/LoginScreen.tsx` | 42–44 | Mobile | `KeyboardAvoidingView` behavior is set to `height` on Android, which is known to be buggy and can cause layout jumps or hidden inputs. | Use `padding` behavior on both platforms, or conditionally use `undefined` on Android with `Platform.OS === 'ios' ? 'padding' : undefined`. |
| M25 | Medium | `android-app/src/screens/RegisterScreen.tsx` | 47–49 | Mobile | Same `KeyboardAvoidingView` `height` behavior issue on Android as LoginScreen. | Same fix as M24. |
| M26 | Medium | `android-app/src/screens/StationsScreen.tsx` | 132–134 | Mobile | Same `KeyboardAvoidingView` `height` behavior in the modal on Android. | Same fix as M24. |
| M27 | Medium | `android-app/src/components/ReadingForm.tsx` | 49–52 | Mobile | Same `KeyboardAvoidingView` `height` behavior issue on Android. | Same fix as M24. |
| M28 | Medium | `android-app/src/screens/StationsScreen.tsx` | 118–120 | UI/UX | `RefreshControl` is bound to `refreshing` state, but `refreshing` is initialized to `false` and never set to `true` during `fetchStations`. Pull-to-refresh shows no spinner. | Set `setRefreshing(true)` at the start of `fetchStations` and `setRefreshing(false)` in `finally`. |
| M29 | Medium | `android-app/src/screens/SubmitReadingScreen.tsx` | 80–82 | UI/UX | Same `RefreshControl` issue as StationsScreen: `refreshing` is never set to `true`, so the spinner never appears. | Same fix as M28. |
| M30 | Medium | `android-app/src/screens/StationsScreen.tsx` | 187–188 | UI/UX | `createStation` Save button has no loading state. Users can double-tap and create duplicate stations. | Add a local `isCreating` state, disable the button, and show "Creating..." text while the request is in flight. |
| M31 | Medium | `android-app/src/screens/DataViewScreen.tsx` | 33 | API Integration | URL parameters are concatenated with string interpolation (`/data?station_id=${stationId}...`). Special characters in IDs or sensor types could break the URL or cause injection. | Use `URLSearchParams` or pass `params` as the axios config object. |
| M32 | Medium | `android-app/src/screens/HomeScreen.tsx` | 38–39 | API Integration | Same string-interpolation URL construction for `/data/nearby`. | Use `URLSearchParams` or axios `params`. |

---

## Low Issues (28)

| # | Severity | File | Line | Category | Description | Fix Suggestion |
|---|----------|------|------|----------|-------------|----------------|
| L1 | Low | `web-dashboard/src/App.tsx` | 16–23 | State Management | `useEffect` depends on `[meData, user, setUser]`. If `user` is nullified elsewhere, `meData` (still truthy) will re-trigger `setUser`, causing a reset race. | Remove `user` from the dependency array and use a ref to track whether the sync has already happened. |
| L2 | Low | `web-dashboard/src/App.tsx` | 17 | State Management | `useMe()` is called unconditionally. The `enabled` guard inside `useMe` relies on `localStorage`, which is synchronous, but this pattern is fragile. | Gate `useMe()` with the auth context's `isAuthenticated` boolean instead of reading `localStorage` directly. |
| L3 | Low | `web-dashboard/src/components/charts/SensorChart.tsx` | 32–42 | Performance | `chartData` is recreated on every render, including expensive `toLocaleString` calls for each data point. | Memoize with `useMemo(() => ..., [data])`. |
| L4 | Low | `web-dashboard/src/components/charts/SensorChart.tsx` | 51 | UI/UX | `XAxis` has no `angle` or `height` prop. Long formatted timestamps will overlap on narrow viewports. | Add `angle={-45}` and `height={60}` to the XAxis. |
| L5 | Low | `web-dashboard/src/components/layout/Header.tsx` | 36–38 | UI/UX | Bell notification button has no `onClick` handler and no badge count. It appears functional but does nothing. | Either implement a notification panel or hide the button until the feature is built. |
| L6 | Low | `web-dashboard/src/pages/Dashboard.tsx` | 8–12 | Performance | `stats` array is re-declared inside the component, causing a new reference on every render. | Move the constant array definition outside the component. |
| L7 | Low | `web-dashboard/src/pages/Dashboard.tsx` | 14–19 | Performance | `recentActivity` array is also re-declared inside the component. | Move outside the component. |
| L8 | Low | `web-dashboard/src/pages/ApiKeys.tsx` | 95 | UI/UX | `key.key_hash.substring(0, 8)` will throw if `key_hash` is ever `undefined`. | Use optional chaining: `key.key_hash?.substring(0, 8) ?? ''`. |
| L9 | Low | `web-dashboard/src/pages/DataExplorer.tsx` | 42 | API Integration | `params.limit = 500` is hardcoded with no UI control or pagination. Large queries can be slow. | Make the limit configurable with a `<Select>` and implement server-side pagination. |
| L10 | Low | `web-dashboard/src/pages/Profile.tsx` | 53 | UI/UX | `user?.id?.substring(0, 8)` will throw if `id` is undefined (though unlikely per the type). | Use optional chaining: `user?.id?.substring(0, 8) ?? ''`. |
| L11 | Low | `web-dashboard/src/lib/api.ts` | 31–34 | Performance | If multiple requests fail with 401 simultaneously, the interceptor triggers multiple `window.location.href` assignments. | Debounce the redirect or use a single flag to prevent concurrent redirects. |
| L12 | Low | `web-dashboard/src/lib/utils.ts` | 22–24 | TypeScript | `capitalize('')` returns `''` correctly, but `capitalize` has no type guard for non-string inputs. | Ensure callers pass strings, or add a runtime guard. |
| L13 | Low | `web-dashboard/src/types/index.ts` | 44 | TypeScript | `SensorReading.metadata` is required (`Record<string, unknown>`), but in the Android app it is optional (`metadata?:`). This mismatch can cause deserialization errors. | Align the types. Prefer optional `metadata?: Record<string, unknown>` on both platforms. |
| L14 | Low | `android-app/src/types/index.ts` | 39–44 | TypeScript | `User` interface is missing `updated_at` compared to the web dashboard type. This can cause inconsistency in shared code. | Add `updated_at: string` to the Android `User` type. |
| L15 | Low | `android-app/src/hooks/useAuth.ts` | 45 | API Integration | `SecureStore.setItemAsync` failure is not handled. If the device is out of storage or encryption fails, the token is lost but the user appears logged in. | Wrap `setItemAsync` in try/catch and surface an error to the user. |
| L16 | Low | `android-app/src/hooks/useAuth.ts` | 25–28 | State Management | `checkAuth` catches all errors silently. If the `/me` endpoint is down, the user is silently logged out with no explanation. | Consider logging the error or showing a "Session expired" message instead of silent logout. |
| L17 | Low | `android-app/src/hooks/useLocation.ts` | 14–15 | State Management | Initial `latitude` and `longitude` are `0`. `0` is a valid coordinate, so the map briefly shows the Gulf of Guinea before the real location is fetched. | Initialize with `null` or `undefined` and guard against rendering the map until a real location is available. |
| L18 | Low | `android-app/src/hooks/useLocation.ts` | 56–58 | Memory Leak | If the component unmounts while `getCurrentPositionAsync` is pending, `setLocation` may be called on an unmounted component. | Track a `mounted` ref and guard `setLocation` calls, or use an AbortController-like pattern. |
| L19 | Low | `android-app/src/screens/DataViewScreen.tsx` | 55–69 | Performance | `chartData` and `groupedByType` are recreated on every render. The `LineChart` receives a new `data` prop each time, causing unnecessary re-renders. | Memoize `groupedByType` and `chartData` with `useMemo`. |
| L20 | Low | `android-app/src/screens/DataViewScreen.tsx` | 71–86 | Performance | `chartConfig` object is recreated on every render. | Define `chartConfig` outside the component or memoize it. |
| L21 | Low | `android-app/src/screens/DataViewScreen.tsx` | 45–47 | Memory Leak | `useEffect` calls `fetchData()` without a cleanup mechanism. If the component unmounts during the request, the state update may run on an unmounted component. | Add an `isMounted` ref check inside `fetchData` or use a cancellation token. |
| L22 | Low | `android-app/src/screens/LoginScreen.tsx` | 26–39 | UI/UX | No email format validation (beyond `keyboardType`). The backend receives invalid emails and returns a generic error. | Add a simple regex validation (e.g., `/.+@.+\..+/)` before calling the API. |
| L23 | Low | `android-app/src/screens/RegisterScreen.tsx` | 27–43 | UI/UX | No password strength validation (minimum length, complexity). Weak passwords are accepted. | Add client-side validation: minimum 8 characters, at least one letter and one number. |
| L24 | Low | `android-app/src/screens/ProfileScreen.tsx` | 42–44 | UI/UX | Logout button has no confirmation dialog. Accidental taps immediately log the user out. | Add an `Alert.alert` confirmation with "Cancel" and "Log Out" options. |
| L25 | Low | `android-app/src/screens/StationsScreen.tsx` | 233–250 | Mobile | FAB positioned at `bottom: 20` may overlap the system navigation bar on Android devices with gesture navigation. | Add `useSafeAreaInsets()` bottom padding to the FAB position. |
| L26 | Low | `android-app/src/components/ReadingForm.tsx` | 32–33 | State Management | `initialLat` and `initialLon` are only used in initial state. If the parent re-renders with new coordinates, the form does not update. | Use a `useEffect` to sync `lat`/`lon` state when `initialLat`/`initialLon` change. |
| L27 | Low | `android-app/src/components/SensorCard.tsx` | 13 | UI/UX | `reading.sensor_type.replace('_', ' ')` only replaces the first underscore. Types like `noise_level` become `"noise level"` correctly, but `some_multi_word` would become `"some multi_word"`. | Use `replace(/_/g, ' ')` to replace all underscores. |
| L28 | Low | `android-app/src/components/SensorCard.tsx` | 17 | UI/UX | `new Date(reading.timestamp).toLocaleString()` does not handle invalid timestamps. | Check `isNaN(date.getTime())` before formatting. |

---

## Summary by Category

| Category | Count |
|----------|-------|
| TypeScript / Type Safety | 5 |
| Security (XSS, Secrets, Storage) | 6 |
| API Integration (Endpoints, Errors, Validation) | 16 |
| UI/UX (Loading, Error, Empty, Feedback) | 20 |
| Memory Leaks / Cleanup | 3 |
| Performance (Re-renders, Memoization, Virtualization) | 10 |
| Mobile-Specific (Keyboard, Safe Area, Permissions) | 12 |
| State Management (Race Conditions, Stale Closures) | 8 |
| **Total** | **80** |

## Top Recommendations

1. **Fix the Critical security and API issues first.** Move JWT out of `localStorage`, eliminate hardcoded `localhost` URLs in Login/Register, and fix the 401 interceptor behavior.
2. **Fix the "Save Changes" functional bug on Profile.** It is the most user-visible broken feature.
3. **Standardize coordinate falsiness checks across the mobile app.** `(0, 0)` is a valid location; do not use `if (lat)` for coordinate validation.
4. **Add reactive loading and error states to every data-fetching screen.** At minimum, every `useQuery` call should destructure `isLoading`, `isError`, and `error`.
5. **Wrap the mobile app in `SafeAreaProvider` and add `SafeAreaView` to every screen.** This prevents layout issues on devices with notches, dynamic islands, and gesture navigation bars.
6. **Memoize expensive chart data objects.** Both web (`recharts`) and mobile (`react-native-chart-kit`) will re-render unnecessarily if the data/config prop references change every render.

---
*End of QA Cycle 2 Report*
