# ENViroSwarm Frontend — QA Cycle 11 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 2 |
| **Medium** | 5 |
| **Low** | 10 |
| **Total** | **17** |

---

## Issues Found

### High

#### H1 — `Tabs.tsx` broken `TabsList` export (regression from Cycle 10 L10 fix)
**File:** `web-dashboard/src/components/ui/Tabs.tsx` (Lines 32–39)  
**Category:** Build / Crash  
The `export function TabsList` declaration is completely missing. A bare `return` statement (lines 34–39) floats at the top level with no enclosing function, which is a TypeScript syntax error. `DataExplorer.tsx` imports `TabsList` from this module, so the project will fail to compile. This appears to be a regression introduced while reordering `TabsContext` before `Tabs` to fix Cycle 10 L10.

#### H2 — Android `cachedToken` not cleared on logout causes relogin failure
**File:** `android-app/src/api/client.ts` (Lines 28, 46–48) and `android-app/src/hooks/useAuth.ts` (Lines 107–110)  
**Category:** Auth / Data Loss  
The `cachedToken` memory cache is cleared only on `401` responses in the interceptor. `useAuth.ts` `logout()` deletes the token from `SecureStore` but never clears `cachedToken`. After logout, the stale token remains in memory. When the user logs in again, the login request includes the stale `Authorization` header, and the subsequent `checkAuth()` `/me` call uses the old cached token instead of the newly issued one. If the old token is expired, the `/me` call returns `401`, the interceptor deletes the *new* token from `SecureStore`, and the user is immediately booted back to the login screen — a complete relogin failure. If the old token is still valid, the app silently uses the wrong token for all future requests.

---

### Medium

#### M1 — `Profile.tsx` `handleSave` lacks email validation (unfixed remainder of Cycle 10 L2)
**File:** `web-dashboard/src/pages/Profile.tsx` (Lines 42–54)  
**Category:** UX / Validation  
Cycle 10 L2 added `type="email"` to the input, but `handleSave` triggers on a button `onClick` (not a `<form>` submit), so browser-native validation never fires. There is still no client-side regex validation before `updateUser.mutateAsync({ email })`. An invalid email like `"not-an-email"` is submitted to the backend, resulting in an unnecessary round-trip and a generic error message.

#### M2 — `DataExplorer.tsx` uses `alert()` for date validation
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Line 60)  
**Category:** UX / Accessibility  
The inverted date-range guard uses `alert('Start date must be before end date')`. `alert()` is a blocking synchronous dialog that interrupts keyboard/screen-reader flow and cannot be styled. A non-blocking inline error message (e.g., a `div` with `role="alert"`) should be used instead.

#### M3 — `Header.tsx` mobile menu missing Escape close
**File:** `web-dashboard/src/components/layout/Header.tsx` (Lines 38–59)  
**Category:** Accessibility / Keyboard Navigation  
The mobile menu implements focus trapping, but there is no `Escape` key handler to close the menu. Keyboard users must tab to a navigation link or click the hamburger button again to dismiss the menu.

#### M4 — `StationsScreen.tsx` (mobile) whitespace-only name passes validation
**File:** `android-app/src/screens/StationsScreen.tsx` (Lines 76–78, 92–97)  
**Category:** UX / Validation  
The validation `if (!name || selectedTypes.length === 0)` is false for whitespace-only strings (e.g., `"   "`). The name is sent to the backend without trimming, unlike the web dashboard which validates with `name.trim()`. This is inconsistent and allows creation of stations with empty-looking names.

#### M5 — `DataViewScreen.tsx` chart labels are meaningless indices
**File:** `android-app/src/screens/DataViewScreen.tsx` (Line 88)  
**Category:** UX / Data Visualization  
The `LineChart` labels are computed as `String(i + 1)` (e.g., `1`, `2`, `3`…). Users cannot correlate data points with actual timestamps, making the chart far less useful than it should be. The labels should use formatted timestamps (e.g., `HH:mm`).

---

### Low

#### L1 — `Dialog.tsx` missing `aria-labelledby` and `aria-describedby`
**File:** `web-dashboard/src/components/ui/Dialog.tsx` (Line 72)  
**Category:** Accessibility / ARIA  
The dialog has `role="dialog"` and `aria-modal="true"`, but no `aria-labelledby` linking to the `DialogTitle` and no `aria-describedby` linking to the `DialogDescription`. Screen-reader users hear only "dialog" with no context about its purpose.

#### L2 — `Header.tsx` hamburger button missing `aria-expanded`
**File:** `web-dashboard/src/components/layout/Header.tsx` (Lines 65–72)  
**Category:** Accessibility / ARIA  
The hamburger button toggles the mobile menu but does not communicate its expanded/collapsed state. It should have `aria-expanded={mobileOpen}`.

#### L3 — `DataExplorer.tsx` labels not programmatically associated with inputs
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Lines 118–142)  
**Category:** Accessibility / Forms  
The `<label>` elements for Station, Sensor Type, Start Date, and End Date lack `htmlFor` attributes, and the corresponding `<Select>`/`<Input>` elements lack `id` attributes. Screen readers cannot associate the labels with their controls.

#### L4 — `Stations.tsx` sensor toggle buttons missing `aria-pressed`
**File:** `web-dashboard/src/pages/Stations.tsx` (Lines 147–158)  
**Category:** Accessibility / ARIA  
The sensor type buttons in the create dialog act as toggles but do not declare `aria-pressed={selectedSensors.includes(type)}`, so screen-reader users cannot tell which sensors are selected.

#### L5 — `ApiKeys.tsx` icon-only buttons missing `aria-label`
**File:** `web-dashboard/src/pages/ApiKeys.tsx` (Lines 131–136)  
**Category:** Accessibility / ARIA  
The copy and delete buttons contain only icons (`<Copy />`, `<Trash2 />`) with no visible text and no `aria-label`. Screen readers announce them as unlabeled buttons.

#### L6 — `Login.tsx` and `Register.tsx` missing `autoComplete` attributes
**File:** `web-dashboard/src/pages/Login.tsx` (Lines 57–79), `web-dashboard/src/pages/Register.tsx` (Lines 61–99)  
**Category:** Accessibility / UX  
Email inputs should declare `autoComplete="email"`. Password inputs should declare `autoComplete="current-password"` (login) and `autoComplete="new-password"` (register). Missing these hinders password-manager autofill and browser accessibility heuristics.

#### L7 — `Dashboard.tsx` `recentActivity` uses index as `key`
**File:** `web-dashboard/src/pages/Dashboard.tsx` (Line 134)  
**Category:** React Anti-pattern  
`recentActivity.map((item, i) => <div key={i} ...>)` uses array index as the React `key`. Because the list content can switch between readings and stations, this can cause unnecessary re-renders or stale component state.

#### L8 — `HomeScreen.tsx` `Dimensions.get('window')` at module level
**File:** `android-app/src/screens/HomeScreen.tsx` (Line 23)  
**Category:** UX / Responsiveness  
`const { width, height } = Dimensions.get('window');` is evaluated once at module load. On device orientation change, the map dimensions do not update, causing layout issues.

#### L9 — `Profile.tsx` cancel does not clear `saveSuccess`
**File:** `web-dashboard/src/pages/Profile.tsx` (Line 126)  
**Category:** UX / State Management  
When clicking "Cancel" after a successful save, `setSaveError('')` is called but `setSaveSuccess(false)` is not. The success message persists while the user re-enters edit mode.

#### L10 — `DataExplorer.tsx` CSV escaping incomplete
**File:** `web-dashboard/src/pages/DataExplorer.tsx` (Line 90)  
**Category:** Data Integrity  
While commas are now wrapped in double quotes, double quotes and newlines within field values are not escaped per RFC 4180. If any future field contains a quote or newline, the exported CSV will be malformed.

---

## Previous Fixes Verification (Cycles 1–10)

All prior fixes are present and correct, **except** where noted below:

| Original Issue | File | Status | Notes |
|----------------|------|--------|-------|
| **C1** — JWT in `sessionStorage` | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | `httpOnly` cookies with `withCredentials: true`. No client-side token storage. |
| **NH1** — Orphaned token on `/me` failure | `web-dashboard/src/pages/Login.tsx`, `Register.tsx` | ✅ Fixed | Cookie-based auth; no manual token storage. |
| **CR3** — No request timeout | `web-dashboard/src/lib/api.ts` | ✅ Fixed | `timeout: 30000` present. |
| **CR4** — `SensorChart` data loss | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | Groups by full ISO timestamp in a `Map`. |
| **H1** — Android silent login failure | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | `login`/`register` throw if `checkAuth()` returns null. |
| **H2** — `checkAuth()` clears all errors | `android-app/src/hooks/useAuth.ts` | ✅ Fixed | Only clears token on `err?.response?.status === 401`. |
| **H3** — `StationsScreen` undefined lat/lon | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `latVal`/`lonVal` validated as non-empty and numeric. |
| **M1** — `ApiKeys` `alert()` for delete | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | Errors rendered via `toast`; `confirm()` used for confirmation. |
| **M2** — `ApiKeys` `alert()` for copy | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | Clipboard errors shown via `toast`. |
| **M3** — Pricing "Contact Sales" no handler | `web-dashboard/src/pages/Pricing.tsx` | ✅ Fixed | Wired to `mailto:` link. |
| **M4** — Notification dropdown no click-outside | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | `useEffect` with `mousedown` listener on `notificationRef`. |
| **M5** — Mobile menu no focus trap | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | Focus trapping on Tab/Shift+Tab implemented. |
| **M6** — No `ErrorBoundary` | `web-dashboard/src/main.tsx` | ✅ Fixed | `ErrorBoundary` with fallback UI and reload button present. |
| **M7–M9** — Missing `SafeAreaView` | `android-app/src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`, `SubmitReadingScreen.tsx` | ✅ Fixed | All wrapped in `<SafeAreaView edges={['top']}>`. |
| **M10** — `ReadingForm` NaN no feedback | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert('Invalid Input', ...)` on NaN. |
| **M11** — `SecureStore` read on every request | `android-app/src/api/client.ts` | ⚠️ **Partial** | Interceptor caches token, but `logout` does not clear `cachedToken` (see H2 above). |
| **M12** — `DataViewScreen` missing `fetchData` dep | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | `useEffect(() => { fetchData(); }, [fetchData]);` present. |
| **L1** — `revokeObjectURL` immediately | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `setTimeout(() => URL.revokeObjectURL(url), 1000)` used. |
| **L2** — Login email no trim | `web-dashboard/src/pages/Login.tsx` | ✅ Fixed | `email.trim()` used. |
| **L3** — Profile timeout not cleared | `web-dashboard/src/pages/Profile.tsx` | ✅ Fixed | `saveTimeoutRef` stored in `useRef`; cleared in cleanup. |
| **L4** — Button default `type` | `web-dashboard/src/components/ui/Button.tsx` | ✅ Fixed | `type = 'button'` in destructured props. |
| **L5–L6** — Missing `aria-current` | `web-dashboard/src/components/layout/Header.tsx`, `Sidebar.tsx` | ✅ Fixed | `aria-current="page"` on active items. |
| **L7** — Tabs missing ARIA roles | `web-dashboard/src/components/ui/Tabs.tsx` | ✅ Fixed | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` present. |
| **L8** — TableHead no `scope="col"` | `web-dashboard/src/components/ui/Table.tsx` | ✅ Fixed | `scope="col"` on `<th>`. |
| **L9** — Unguarded `toFixed(3)` | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `typeof reading.value === 'number' ? reading.value.toFixed(3) : reading.value`. |
| **L10** — Legend overflow | `web-dashboard/src/components/charts/SensorChart.tsx` | ✅ Fixed | `wrapperStyle={{ maxHeight: 80, overflowY: 'auto' }}`. |
| **L11** — Dashboard "Recent Activity" mock data | `web-dashboard/src/pages/Dashboard.tsx` | ✅ Fixed | Computed from real `useStations`/`useSensorData` responses. |
| **L12** — `setSensorType` dead code | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Changed to `const [sensorType]` (no setter destructured). |
| **L13** — `screenWidth` module load | `android-app/src/screens/DataViewScreen.tsx` | ✅ Fixed | Uses `useWindowDimensions()`. |
| **L14** — `fetchNearby` only on GPS change | `android-app/src/screens/HomeScreen.tsx` | ✅ Fixed | `onRegionChangeComplete` calls `fetchNearby`. |
| **L15** — No `StatusBar` config | `android-app/App.tsx` | ✅ Fixed | `<StatusBar barStyle="light-content" backgroundColor="#0f172a" />`. |
| **Cycle 10 M1** — Transient logout on non-401 | `web-dashboard/src/context/AuthContext.tsx` | ✅ Fixed | Only `setUserState(null)` on `401`. |
| **Cycle 10 M2** — Swallowed API key errors | `web-dashboard/src/pages/ApiKeys.tsx` | ✅ Fixed | `catch` sets `createError` state. |
| **Cycle 10 M3** — Inverted date ranges | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | `alert()` guard on inverted range. |
| **Cycle 10 M4** — Mobile menu focus not restored | `web-dashboard/src/components/layout/Header.tsx` | ✅ Fixed | Cleanup focuses `hamburgerRef`. |
| **Cycle 10 M5** — Invalid lat/lon parsed to NaN | `android-app/src/components/ReadingForm.tsx` | ✅ Fixed | `Alert.alert` on NaN coordinates. |
| **Cycle 10 M6** — Modal missing `onRequestClose` | `android-app/src/screens/StationsScreen.tsx` | ✅ Fixed | `onRequestClose={() => setModalVisible(false)}` present. |
| **Cycle 10 L1** — Email not trimmed in Register (web) | `web-dashboard/src/pages/Register.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L2** — Profile email lacks type/validation | `web-dashboard/src/pages/Profile.tsx` | ⚠️ **Partial** | `type="email"` added, but no regex validation and no form submit to trigger browser validation (see M1 above). |
| **Cycle 10 L3** — Auth redirects back-button traps | `web-dashboard/src/App.tsx` | ✅ Fixed | `replace` prop on all `<Navigate>` components. |
| **Cycle 10 L4** — Dead focus styles on Badge | `web-dashboard/src/components/ui/Badge.tsx` | ✅ Fixed | Focus classes removed. |
| **Cycle 10 L5** — Dead `overlayRef` in Dialog | `web-dashboard/src/components/ui/Dialog.tsx` | ✅ Fixed | `overlayRef` removed. |
| **Cycle 10 L6** — CSV export no comma escape | `web-dashboard/src/pages/DataExplorer.tsx` | ✅ Fixed | Quotes around comma-containing values. |
| **Cycle 10 L7** — Email not trimmed in Login (mobile) | `android-app/src/screens/LoginScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L8** — Email not trimmed in Register (mobile) | `android-app/src/screens/RegisterScreen.tsx` | ✅ Fixed | `email.trim()` used. |
| **Cycle 10 L9** — Unguarded `toFixed` in SensorCard | `android-app/src/components/SensorCard.tsx` | ✅ Fixed | `typeof` guard present. |
| **Cycle 10 L10** — TabsContext ordering | `web-dashboard/src/components/ui/Tabs.tsx` | ⚠️ **Regression** | Context is now before `Tabs`, but `TabsList` export was accidentally deleted (see H1 above). |

---

*End of QA Cycle 11 Report*
