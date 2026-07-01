# ENViroSwarm Frontend — QA Cycle 10 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 6 |
| **Low** | 10 |
| **Total** | **16** |

---

## Issues Found

### Medium

#### M1 — Transient logout on non-401 errors during auth mount
**File:** `web-dashboard/src/context/AuthContext.tsx` (Lines 30–45)  
**Category:** Auth / Resilience  
The `checkAuth` mount effect catches **all** errors indiscriminately and treats them as unauthenticated, setting `userState(null)`. A 500, 503, or network timeout from `/me` causes the user to be falsely redirected to `/login` with no error feedback. The `httpOnly` cookie is preserved, so a refresh may re-authenticate, but the transient logout is confusing and identical to the Android `checkAuth()` issue (H2) fixed in Cycle 7.

#### M2 — Swallowed API key creation errors
**File:** `web-dashboard/src/pages/ApiKeys.tsx` (Lines 28–39)  
**Category:** UX / Error Handling  
`handleCreate` wraps `createApiKey.mutateAsync()` in a `try/catch` with a bare `catch` block and the comment "error handled by mutation". React Query mutations do **not** automatically surface errors to the UI. If the backend rejects the request (e.g., rate limit, name too long), the dialog remains open with zero visual feedback, leaving the user unsure whether the action succeeded.

#### M3 — Inverted date ranges allowed in query builder
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Lines 43–61)  
**Category:** UX / Validation  
`handleSearch` does not validate that `start` ≤ `end`. Users can submit an inverted date range, causing the backend to return an empty result set with no client-side guidance on why.

#### M4 — Mobile menu focus not restored on close
**File:** `web-dashboard/src/components/layout/Header.tsx` (Lines 114–143)  
**Category:** Accessibility / Focus Management  
The mobile menu implements focus trapping while open, but when the menu closes (via Escape, clicking a link, or clicking the overlay), focus is **not** returned to the hamburger button that opened it. Keyboard users lose their place in the tab order and must tab from the top of the document.

#### M5 — Invalid lat/lon silently parsed to NaN
**File:** `android-app/src/components/ReadingForm.tsx` (Lines 42–56)  
**Category:** UX / Validation  
`handleSubmit` validates the `value` field for `NaN` (with `Alert.alert`), but does **not** validate `lat` or `lon`. Non-numeric text in the coordinate fields is silently parsed to `NaN` via `parseFloat` and passed to `onSubmit`. The parent (`SubmitReadingScreen`) includes `NaN` in the metadata payload because `NaN !== undefined && NaN !== null` evaluates to `true`.

#### M6 — Modal missing Android back-button dismissal
**File:** `android-app/src/screens/StationsScreen.tsx` (Line 148)  
**Category:** UX / Platform  
The `Modal` component lacks the `onRequestClose` prop required by React Native on Android. Users cannot dismiss the "New Station" modal with the hardware back button, forcing them to tap the small Cancel button.

---

### Low

#### L1 — Email not trimmed in Register (web)
**File:** `web-dashboard/src/pages/Register.tsx` (Line 26)  
**Category:** UX / Consistency  
`registerMutation.mutateAsync({ email, password })` does not trim the email, whereas `Login.tsx` calls `email.trim()`. Leading/trailing whitespace can cause registration failures with no obvious cause.

#### L2 — Profile email input lacks type="email" and validation
**File:** `web-dashboard/src/pages/Profile.tsx` (Lines 105–110)  
**Category:** Accessibility / UX  
The editable email `<Input>` does not declare `type="email"`, preventing browser-native email validation. There is also no client-side regex validation before calling `updateUser.mutateAsync`.

#### L3 — Auth redirects create back-button traps
**File:** `web-dashboard/src/App.tsx` (Lines 40–42)  
**Category:** UX / Navigation  
All `<Navigate>` components used for auth redirects (login → /, / → login, register → /) lack the `replace` prop. This pushes new history entries instead of replacing them, creating a back-button trap: pressing the browser back button from `/login` returns to a protected route that immediately redirects again.

#### L4 — Dead focus styles on non-interactive Badge
**File:** `web-dashboard/src/components/ui/Badge.tsx` (Line 11)  
**Category:** Accessibility / Dead Code  
The component renders a non-interactive `<div>` but includes `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` Tailwind classes. A `<div>` is not focusable by default, so these styles are unreachable dead code.

#### L5 — Dead overlayRef in Dialog
**File:** `web-dashboard/src/components/ui/Dialog.tsx` (Line 12)  
**Category:** Code Quality / Dead Code  
`overlayRef` is declared with `useRef<HTMLDivElement>(null)` but never read anywhere in the component. The overlay element uses an inline `onClick` handler.

#### L6 — CSV export does not escape commas
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Lines 78–94)  
**Category:** Data Integrity  
`handleExportCsv` joins values with commas without escaping. If any field ever contains a comma (e.g., a future `unit` value with a comma, or a `station_id` with special characters), the exported CSV will be malformed.

#### L7 — Email not trimmed in Login (mobile)
**File:** `android-app/src/screens/LoginScreen.tsx` (Line 39)  
**Category:** UX / Consistency  
`await login(email, password)` does not trim the email, inconsistent with the web dashboard `Login.tsx` which calls `email.trim()`.

#### L8 — Email not trimmed in Register (mobile)
**File:** `android-app/src/screens/RegisterScreen.tsx` (Line 55)  
**Category:** UX / Consistency  
`await register(email, password)` does not trim the email.

#### L9 — Unguarded toFixed in SensorCard
**File:** `android-app/src/components/SensorCard.tsx` (Line 17)  
**Category:** Robustness  
`reading.value.toFixed(2)` is called directly without guarding against non-numeric values. The web dashboard uses `formatNumber()` which handles `NaN`/`Infinity`. A malformed API response could crash the mobile render.

#### L10 — TabsContext defined after consuming component
**File:** `web-dashboard/src/components/ui/Tabs.tsx` (Lines 28–31)  
**Category:** Code Quality  
`TabsContext` is defined after the `Tabs` component function. While JavaScript hoisting makes this technically valid, it is a readability anti-pattern; context providers should be declared before the components that consume them.

---

## Previous Fixes Verification (Cycles 1–9)

All prior fixes are present and correct:

| Original Issue | File | Fix Verified |
|----------------|------|--------------|
| **C1** — JWT in `sessionStorage` | `web-dashboard/src/context/AuthContext.tsx` | Now uses `httpOnly` cookies with `withCredentials: true`. No client-side token storage. ✅ |
| **NH1** — Orphaned token on `/me` failure | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | Fixed by architecture change to cookie-based auth; no manual token storage. ✅ |
| **CR3** — No request timeout | `web-dashboard/src/lib/api.ts` | `timeout: 30000` present. ✅ |
| **CR4** — `SensorChart` data loss | `web-dashboard/src/components/charts/SensorChart.tsx` | Groups by full ISO timestamp (`r.timestamp`) in a `Map`. ✅ |
| **H1** — Android silent login failure | `android-app/src/hooks/useAuth.ts` | `login`/`register` throw `Error('Session validation failed...')` if `checkAuth()` returns null. ✅ |
| **H2** — `checkAuth()` clears all errors | `android-app/src/hooks/useAuth.ts` | Only clears token on `err?.response?.status === 401`. ✅ |
| **H3** — `StationsScreen` undefined lat/lon | `android-app/src/screens/StationsScreen.tsx` | `latVal`/`lonVal` validated as non-empty and numeric before submission. ✅ |
| **M1** — `ApiKeys` `alert()` for delete | `web-dashboard/src/pages/ApiKeys.tsx` | Errors rendered via `toast` state banner; `confirm()` used only for confirmation. ✅ |
| **M2** — `ApiKeys` `alert()` for copy | `web-dashboard/src/pages/ApiKeys.tsx` | Clipboard errors shown via `toast` state. ✅ |
| **M3** — Pricing "Contact Sales" no handler | `web-dashboard/src/pages/Pricing.tsx` | Wired to `mailto:` link. ✅ |
| **M4** — Notification dropdown no click-outside | `web-dashboard/src/components/layout/Header.tsx` | `useEffect` with `mousedown` listener on `notificationRef`. ✅ |
| **M5** — Mobile menu no focus trap | `web-dashboard/src/components/layout/Header.tsx` | Focus trapping on Tab/Shift+Tab implemented. ✅ |
| **M6** — No `ErrorBoundary` | `web-dashboard/src/main.tsx` | `ErrorBoundary` with fallback UI and reload button present. ✅ |
| **M7–M9** — Missing `SafeAreaView` | `android-app/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`, `SubmitReadingScreen.tsx` | All wrapped in `<SafeAreaView edges={['top']}>`. ✅ |
| **M10** — `ReadingForm` NaN no feedback | `android-app/src/components/ReadingForm.tsx` | `Alert.alert('Invalid Input', 'Please enter a valid numeric value.')` on NaN. ✅ |
| **M11** — `SecureStore` read on every request | `android-app/src/api/client.ts` | `cachedToken` memory cache; reads `SecureStore` only when null. ✅ |
| **M12** — `DataViewScreen` missing `fetchData` dep | `android-app/src/screens/DataViewScreen.tsx` | `useEffect(() => { fetchData(); }, [fetchData]);` present. ✅ |
| **L1** — `revokeObjectURL` immediately | `web-dashboard/src/pages/DataExplorer.tsx` | `setTimeout(() => URL.revokeObjectURL(url), 1000)` used. ✅ |
| **L2** — Login email no trim | `web-dashboard/src/pages/Login.tsx` | `email.trim()` used. ✅ |
| **L3** — Profile timeout not cleared | `web-dashboard/src/pages/Profile.tsx` | `saveTimeoutRef` stored in `useRef`; cleared in cleanup. ✅ |
| **L4** — Button default `type` | `web-dashboard/src/components/ui/Button.tsx` | `type = 'button'` in destructured props. ✅ |
| **L5–L6** — Missing `aria-current` | `web-dashboard/src/components/layout/Header.tsx`, `Sidebar.tsx` | `aria-current="page"` on active items. ✅ |
| **L7** — Tabs missing ARIA roles | `web-dashboard/src/components/ui/Tabs.tsx` | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` present. ✅ |
| **L8** — TableHead no `scope="col"` | `web-dashboard/src/components/ui/Table.tsx` | `scope="col"` on `<th>`. ✅ |
| **L9** — Unguarded `toFixed(3)` | `web-dashboard/src/pages/DataExplorer.tsx` | `typeof reading.value === 'number' ? reading.value.toFixed(3) : reading.value`. ✅ |
| **L10** — Legend overflow | `web-dashboard/src/components/charts/SensorChart.tsx` | `wrapperStyle={{ maxHeight: 80, overflowY: 'auto' }}`. ✅ |
| **L11** — Dashboard "Recent Activity" mock data | `web-dashboard/src/pages/Dashboard.tsx` | Computed from real `useStations`/`useSensorData` responses. ✅ |
| **L12** — `setSensorType` dead code | `android-app/src/screens/DataViewScreen.tsx` | Changed to `const [sensorType]` (no setter destructured). ✅ |
| **L13** — `screenWidth` module load | `android-app/src/screens/DataViewScreen.tsx` | Uses `useWindowDimensions()`. ✅ |
| **L14** — `fetchNearby` only on GPS change | `android-app/src/screens/HomeScreen.tsx` | `onRegionChangeComplete` calls `fetchNearby`. ✅ |
| **L15** — No `StatusBar` config | `android-app/App.tsx` | `<StatusBar barStyle="light-content" backgroundColor="#0f172a" />`. ✅ |

---

*End of QA Cycle 10 Report*
