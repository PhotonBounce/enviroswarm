# ENViroSwarm Frontend — QA Cycle 22 Review Report

**Review Date:** 2026-07-01 16:40 PDT  
**Scope:** `web-dashboard/src/` and `android-app/src/` (all TS/TSX files)  
**Branch:** `main`  
**Reviewer:** Senior QA Engineer — Zero-Defect Review

| Severity | Count |
|----------|-------|
| **Critical** | 1 |
| **High** | 2 |
| **Medium** | 5 |
| **Low** | 9 |
| **Total** | **17** |

---

## Critical Issues

### 1. `web-dashboard/src/components/charts/SensorChart.tsx` — Conditional Return Before Hooks (Rules of Hooks Violation)
- **Line:** 24–30
- **Issue:** The component returns early when `!data.length` **before** any `useMemo` hooks are invoked. This is a fundamental violation of React's Rules of Hooks. If the component renders with an empty `data` array and then receives non-empty data on a subsequent render, React will detect a mismatch in the number of hooks called and throw a runtime error.
- **Expected:** Move the conditional return to **after** all hooks, or use a conditional wrapper inside the JSX returned by the component.
- **Fix Direction:**
  ```tsx
  const chartData = useMemo(() => { ... }, [data]);
  const types = useMemo(() => { ... }, [data]);
  if (!data.length) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">No data available</div>;
  }
  // ... rest of render
  ```

---

## High Issues

### 2. `web-dashboard/src/hooks/useApi.ts` — API Key Creation Workflow Is Broken / Misleading
- **Line:** 169–184 (specifically line 178)
- **Issue:** The `useCreateApiKey` mutation maps `res.data.data.key_hash` to `raw_key` in the returned `ApiKeyCreateResponse`. The `ApiKey` type has no actual `raw_key` field — only `key_hash`. This means one of the following is true:
  - (a) The backend returns the actual raw key in a misnamed `key_hash` field, making the listing a **security leak** because it displays raw keys as "hashes"; or
  - (b) The backend returns a true hash, meaning the user **never sees the actual raw API key** and cannot use the API programmatically.
- The user-facing message in `ApiKeys.tsx` (line 170) explicitly states: *"Copy this raw key now — it is shown only once. The key list below displays hashed values for security."* This message is a lie in either scenario. The entire API key creation and display workflow is fundamentally broken.
- **Expected:** The backend should return a separate, one-time `raw_key` field in the create response. The frontend should display that raw key in the dialog and never show it again. The listing should display true `key_hash` values.

### 3. `android-app/src/screens/DataViewScreen.tsx` — Conditional Return Before Hooks (Rules of Hooks Violation)
- **Line:** 32–38
- **Issue:** The component returns early if `route.params` is invalid **before** any hooks (`useState`, `useRef`, `useEffect`) are called. This is a Rules of Hooks violation. While React Navigation screens are typically remounted rather than re-rendered with new params, any edge case (e.g., deep linking state change, state restoration) that causes a re-render with changed params will trigger a React runtime error.
- **Expected:** Move the conditional check to **after** all hooks, or guard the render output instead of returning early.

---

## Medium Issues

### 4. `web-dashboard/src/components/ui/Dialog.tsx` — Orphaned ARIA References
- **Line:** 96–97
- **Issue:** `aria-labelledby={titleId}` and `aria-describedby={descriptionId}` are always set to `useId()` values, even when `DialogTitle` or `DialogDescription` are not rendered as children. This creates ARIA references to DOM elements that do not exist, which can confuse screen readers.
- **Expected:** Only set `aria-labelledby` / `aria-describedby` when the corresponding sub-component is actually rendered (e.g., via context flags or presence detection).

### 5. `web-dashboard/src/pages/Dashboard.tsx` — `today` Date Becomes Stale on Overnight Sessions
- **Line:** 20–24
- **Issue:** `today` is memoized against `refreshKey`, which only updates on `window.focus`. If a user leaves the dashboard tab open and focused for 24+ hours (e.g., on a kiosk or always-on display), `today` remains the previous day's date. The "Readings Today" stat and the `useSensorData` query will fetch stale data.
- **Expected:** Either compute `today` without memoization on each render, or add a `setInterval` to recompute at midnight.

### 6. `web-dashboard/src/pages/DataExplorer.tsx` — Query Errors Not Displayed
- **Line:** 41
- **Issue:** `useSensorData` is destructured as `const { data: response, isLoading } = useSensorData(queryParams)`. The `error` state is completely ignored. If the API request fails, the UI falls through to the "No data. Run a query to see results." message, which is misleading — the user *did* run a query and it failed.
- **Expected:** Destructure `error` from `useSensorData` and render an error banner or inline message when present.

### 7. `web-dashboard/src/pages/ApiKeys.tsx` — Query Errors Not Displayed
- **Line:** 17
- **Issue:** `useApiKeys` is destructured as `const { data: apiKeys, isLoading } = useApiKeys()`. The `error` state is ignored. If the API request fails, the UI renders the "No API keys yet" empty state, which is misleading.
- **Expected:** Destructure `error` and render an appropriate error message.

### 8. `web-dashboard/src/lib/utils.ts` — `formatDate` Omits Year, Causing Ambiguity
- **Line:** 8–17
- **Issue:** `formatDate` uses `toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })` and does **not** include the year. In `DataExplorer.tsx`, `ApiKeys.tsx`, `Profile.tsx`, and `Dashboard.tsx`, dates from previous years are rendered identically to current-year dates. This is a data-integrity UX issue for historical data queries, API key creation dates, and user membership dates.
- **Expected:** Include `year: 'numeric'` in the `toLocaleString` options, or add a separate `formatDateShort` / `formatDateLong` utility.

---

## Low Issues

### 9. `web-dashboard/src/pages/Login.tsx` — Unused Import
- **Line:** 15
- **Issue:** `logout` is destructured from `useAuth()` but never used. This creates dead code and may trigger lint warnings (`@typescript-eslint/no-unused-vars`).
- **Expected:** Remove `logout` from the destructuring.

### 10. `web-dashboard/src/pages/Register.tsx` — Unused Import
- **Line:** 16
- **Issue:** Same as above — `logout` is imported but never used.
- **Expected:** Remove `logout` from the destructuring.

### 11. `web-dashboard/src/App.tsx` — Unused Import
- **Line:** 18
- **Issue:** `user` is destructured from `useAuth()` but never referenced in the component body.
- **Expected:** Remove `user` from the destructuring.

### 12. `web-dashboard/src/components/layout/Header.tsx` — Dead Code / Hardcoded State
- **Line:** 25
- **Issue:** `const notificationCount = 0` is hardcoded and never dynamically updated. The notification badge logic (lines 103–107) will never render. While this is an MVP placeholder, it is still a deviation from best practice (dead code that should be wired to a real data source or removed).
- **Expected:** Wire to a real notifications endpoint or remove the badge markup until implemented.

### 13. `web-dashboard/src/pages/Pricing.tsx` — Non-Unique React Keys
- **Line:** 98
- **Issue:** `key={feature}` uses the feature string as a React key. If the API returns pricing tiers with duplicate feature strings (e.g., two tiers both containing `"Email support"`), React will emit duplicate key warnings and reconciliation may behave unpredictably.
- **Expected:** Use a composite key: `key={\`${t.tier}-${feature}-${index}\`}` or ensure feature uniqueness at the data level.

### 14. `web-dashboard/src/pages/ApiKeys.tsx` — Redundant Optional Chaining on Non-Optional Type
- **Line:** 130
- **Issue:** `key.key_hash?.substring(...)` uses optional chaining (`?.`) on `key_hash`, but the `ApiKey` type declares `key_hash: string` (non-optional). The optional chaining implies a type safety gap or developer uncertainty. The `?? ''` fallbacks are also unnecessary since `substring` on a valid string always returns a string.
- **Expected:** Remove redundant optional chaining and fallbacks, or change the type to `key_hash?: string` if the backend can legitimately omit it.

### 15. `web-dashboard/src/lib/api.ts` — Overly Short 401 Dedup Window
- **Line:** 35–50
- **Issue:** The `isRedirecting` flag is reset after only 100ms (`setTimeout(() => { isRedirecting = false }, 100)`). If two parallel API requests both receive 401 responses within that window, the second one will still dispatch `enviroswarm:unauthorized`, potentially causing duplicate redirects or duplicate cache clearing.
- **Expected:** Increase the debounce window to at least 500ms–1000ms, or use a more robust promise-based dedup mechanism.

### 16. `web-dashboard/src/components/ui/Dialog.tsx` — Missing Focus Restoration on Unmount
- **Line:** 19–37
- **Issue:** The `useEffect` that manages focus does not include a cleanup function. If the parent component unmounts while the dialog is open (e.g., user navigates away), `previousActiveElement` is never restored to focus. This is an edge case but a WCAG 2.1 focus management deviation.
- **Expected:** Add a cleanup function to the focus-management `useEffect` that restores focus when the component unmounts while `open === true`.

### 17. `web-dashboard/src/pages/Pricing.tsx` & `web-dashboard/src/pages/ApiKeys.tsx` — Toast Notifications Lack ARIA Live Regions
- **Line:** `Pricing.tsx:62` and `ApiKeys.tsx:101`
- **Issue:** The custom toast banners (`<div className="...">{toast.message}</div>`) are not announced to screen readers because they lack `role="alert"` or `aria-live="polite"`. Success and error messages are invisible to assistive technology users.
- **Expected:** Add `role="alert"` (for errors) or `aria-live="polite"` (for success) to the toast container.

---

## Previous Fix Verification

| QA Cycle | Fix Description | Status |
|----------|----------------|--------|
| Cycles 1–21 | `SensorChart` timestamp collision fix (full ISO key) | ✅ Present and correct — `SensorChart.tsx:36–50` |
| Cycles 1–21 | `Dialog` focus trap + `aria-labelledby` / `aria-describedby` | ✅ Present and correct — `Dialog.tsx:50–76` |
| Cycles 1–21 | `ApiKeys` dialog close-guard when raw key shown | ✅ Present and correct — `ApiKeys.tsx:159` |
| Cycles 1–21 | `Login` / `Register` client-side password validation | ✅ Present and correct — `Register.tsx:25–32` |
| Cycles 1–21 | `Header` mobile menu focus trap + Escape handler | ✅ Present and correct — `Header.tsx:38–63` |
| Cycles 1–21 | `DataExplorer` CSV export with BOM + escape logic | ✅ Present and correct — `DataExplorer.tsx:82–108` |
| Cycles 1–21 | `HomeScreen` request-id race-condition prevention | ✅ Present and correct — `HomeScreen.tsx:35–57` |
| Cycles 1–21 | `useAuth` (Android) `isLoggingIn` ref guard | ✅ Present and correct — `android-app/src/hooks/useAuth.ts:70` |
| Cycles 1–21 | `api.ts` (Web) `enviroswarm:unauthorized` custom event | ✅ Present and correct — `web-dashboard/src/lib/api.ts:43` |
| Cycles 1–21 | `AuthContext` (Web) 401-only logout + `window` event listener | ✅ Present and correct — `web-dashboard/src/context/AuthContext.tsx:38–56` |

---

## Summary

The ENViroSwarm frontend has **one Critical** Rules of Hooks violation in `SensorChart.tsx` that will crash the app when data transitions from empty to non-empty. **Two High** issues include a broken API key security workflow and a second Rules of Hooks violation in the Android `DataViewScreen`. **Five Medium** issues span accessibility (orphaned ARIA references), data integrity (stale dates, missing error states), and UX (ambiguous date formatting). **Nine Low** issues cover unused variables, dead code, non-unique keys, and missing ARIA live regions.

All fixes from QA Cycles 1–21 are verified present and correct.

---
*Report generated by QA Cycle 22 automated review.*
