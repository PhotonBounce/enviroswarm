# QA Cycle 23 — Frontend Review

**Status**: ❌ FAIL — Issues found.

**Scope**: All TS/TSX files in `web-dashboard/src/`  
**Date**: 2026-07-01  
**Reviewer**: Senior QA Engineer (Zero-Defect Review)

---

## Critical

### 1. Component redefined inside render — full unmount/remount on every update
- **Severity**: Critical  
- **File**: `components/charts/SensorChart.tsx` (line 54)  
- **Issue**: `const ChartComponent = type === 'area' ? AreaChart : LineChart` is declared inside the `SensorChart` render body. React treats a new function reference as a completely different component type, causing the entire chart subtree to unmount and remount on every re-render. This destroys internal Recharts state, animations, and focus, and causes severe performance degradation.  
- **Fix**: Define `ChartComponent` outside `SensorChart` at module scope, or inline the conditional directly in JSX without storing it in a local variable:
  ```tsx
  {type === 'area' ? (
    <AreaChart data={chartData}>...</AreaChart>
  ) : (
    <LineChart data={chartData}>...</LineChart>
  )}
  ```

---

## High

### 2. AuthContext value object recreated every render — cascades unnecessary re-renders
- **Severity**: High  
- **File**: `context/AuthContext.tsx` (lines 78–88)  
- **Issue**: The `value` object passed to `<AuthContext.Provider>` is constructed as an inline literal on every render. Even when `user` and `isLoading` are unchanged, a new object reference forces every `useAuth()` consumer (App, Header, Sidebar, Pricing, Profile, ApiKeys) to re-render.  
- **Fix**: Wrap the value in `useMemo` with the correct dependency array:
  ```tsx
  const value = useMemo(() => ({
    user, isLoading, login, logout, setUser,
    isAuthenticated: !!user,
    tier: user?.tier ?? 'free',
  }), [user, isLoading, login, logout, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  ```

### 3. Duplicate `/me` auth-check requests on every mount
- **Severity**: High  
- **File**: `context/AuthContext.tsx` (lines 31–47) and `App.tsx` (line 19)  
- **Issue**: `AuthContext` fetches `/me` on mount. Once the response arrives and `isAuthenticated` becomes `true`, `App.tsx` enables `useMe()` (which also fetches `/me`). This results in two identical requests on every initial mount / page refresh.  
- **Fix**: Remove the manual `checkAuth` effect from `AuthContext`; let `App.tsx`’s `useMe()` be the single source of truth for the user profile. Use `queryClient.fetchQuery` in `AuthContext` only if an imperative initial check is absolutely required, then sync to React Query cache.

### 4. Login / Register pages manually fetch `/me` after mutation — third duplicate request
- **Severity**: High  
- **File**: `pages/Login.tsx` (line 24) and `pages/Register.tsx` (line 37)  
- **Issue**: After `loginMutation` / `registerMutation` succeeds, both pages call `api.get('/me')` directly and then call `login(userData)`. This duplicates the `useMe()` hook in `App.tsx`, producing a third `/me` request and bypassing the React Query cache entirely.  
- **Fix**: Remove the manual `api.get('/me')` calls. Call `login` with a minimal user object (or let `App.tsx`’s `useMe` effect populate `setUser` automatically). Rely on the `useMe` hook and its cache.

### 5. Chart component completely inaccessible to screen readers
- **Severity**: High  
- **File**: `components/charts/SensorChart.tsx` (lines 46–119)  
- **Issue**: The Recharts chart has no `aria-label`, no `role="img"`, and no visually-hidden table or text alternative. Screen-reader users cannot perceive the time-series data.  
- **Fix**: Add an accessible description and a hidden data table:
  ```tsx
  <figure aria-label="Sensor time-series chart">
    <figcaption className="sr-only">...</figcaption>
    <ResponsiveContainer ...>
      ...
    </ResponsiveContainer>
    {/* Visually hidden table of data for screen readers */}
  </figure>
  ```

---

## Medium

### 6. Non-401 errors on `/me` silently treated as logged-out
- **Severity**: Medium  
- **File**: `context/AuthContext.tsx` (lines 35–38)  
- **Issue**: The `catch` block only handles `401`. If the backend returns `500` or a network error, the code falls through without setting any error state or retrying, leaving `user` as `null` and `isLoading` as `false`. The user sees a logged-out UI during a transient server error.  
- **Fix**: Add an `else` branch for non-401 errors to set an error state (e.g., `setError('Server error. Please retry.')`) and surface it in the UI, or implement a retry with exponential backoff.

### 7. `useSubscribe` mutation accepts overly broad `string` instead of `UserTier`
- **Severity**: Medium  
- **File**: `hooks/useApi.ts` (line 218)  
- **Issue**: `mutationFn: async (tier: string)` loses type safety. Any arbitrary string can be passed to the subscription endpoint.  
- **Fix**: Change the parameter type to `UserTier`:
  ```tsx
  mutationFn: async (tier: UserTier) => { ... }
  ```

### 8. `stationNameMap` recreated on every render without memoization
- **Severity**: Medium  
- **File**: `pages/DataExplorer.tsx` (line 111)  
- **Issue**: `const stationNameMap = new Map((stations?.map((s) => [s.id, s.name]) ?? []))` reconstructs the Map on every keystroke or state change in the page, causing unnecessary GC pressure.  
- **Fix**: Wrap in `useMemo`:
  ```tsx
  const stationNameMap = useMemo(() => new Map(stations?.map((s) => [s.id, s.name]) ?? []), [stations]);
  ```

### 9. User-facing toast contains internal development note
- **Severity**: Medium  
- **File**: `pages/Pricing.tsx` (line 46)  
- **Issue**: `setToast({ type: 'success', message: 'Subscription updated! (Mock checkout for MVP)' })` exposes the internal note "(Mock checkout for MVP)" to end users.  
- **Fix**: Remove the parenthetical:
  ```tsx
  message: 'Subscription updated!'
  ```

### 10. `CardTitle` renders `h3`, causing skipped heading hierarchy on every page
- **Severity**: Medium  
- **File**: `components/ui/Card.tsx` (line 24)  
- **Issue**: `CardTitle` renders an `<h3>`. Every page uses `Card` components under an `<h1>`, creating `h1` → `h3` jumps (skipping `h2`) which violates WCAG heading-order guidelines.  
- **Fix**: Change `CardTitle` to render `<h2>` by default, or accept an `as` prop so consumers can choose the correct level:
  ```tsx
  <h2 ref={ref} ...>{children}</h2>
  ```

### 11. Missing CSRF protection for state-changing requests with `withCredentials: true`
- **Severity**: Medium  
- **File**: `lib/api.ts` (line 21)  
- **Issue**: The Axios instance sends cookies cross-origin via `withCredentials: true`. All mutating endpoints (`POST /stations`, `DELETE /apikeys/{id}`, `POST /subscribe`, `PATCH /me`) are vulnerable to CSRF if the backend cookie is not strictly `SameSite=Strict` and the frontend does not send a CSRF token header.  
- **Fix**: Add a CSRF token header to the Axios request interceptor (e.g., read a meta tag or cookie), or document/verify that the backend uses `SameSite=Strict` and validates the `Origin` header for all mutating requests.

### 12. ESLint exhaustive-deps suppressed due to unstable context reference
- **Severity**: Medium  
- **File**: `App.tsx` (line 25)  
- **Issue**: The `eslint-disable-next-line react-hooks/exhaustive-deps` comment suppresses a dependency warning. The root cause is that `setUser` from `useAuth()` is not stable because `AuthContext` value is not memoized (see #2). The suppression masks a real architectural issue.  
- **Fix**: Memoize `AuthContext` value (see #2), then remove the ESLint suppression.

### 13. `DialogContext.Provider` value recreated every render, causing wasteful effect runs
- **Severity**: Medium  
- **File**: `components/ui/Dialog.tsx` (line 101)  
- **Issue**: The context value `{ titleId, descriptionId, registerTitle: () => setHasTitle(true), registerDescription: () => setHasDescription(true) }` is recreated inline. `DialogTitle` and `DialogDescription` depend on `ctx` in `useEffect`, so their registration effects run on every `Dialog` re-render.  
- **Fix**: Memoize the context value with `useMemo` and stable callback references:
  ```tsx
  const value = useMemo(() => ({
    titleId, descriptionId,
    registerTitle, registerDescription,
  }), [titleId, descriptionId, registerTitle, registerDescription]);
  ```

### 14. `useSensorData` fires immediately with empty params on mount
- **Severity**: Medium  
- **File**: `pages/DataExplorer.tsx` (line 40)  
- **Issue**: `queryParams` starts as `{}`, so `useSensorData(queryParams)` runs an immediate API call with no filters. This is a wasted request and may return an unbounded dataset.  
- **Fix**: Add an `enabled` guard to the `useSensorData` hook (or inline it):
  ```tsx
  const { data: response, ... } = useSensorData(queryParams, {
    enabled: Object.keys(queryParams).length > 0,
  });
  ```

### 15. Login and Register pages are heavily duplicated
- **Severity**: Medium  
- **File**: `pages/Login.tsx` (lines 10–99) and `pages/Register.tsx` (lines 10–128)  
- **Issue**: The two pages share ~80% of their JSX structure, form layout, icon wrappers, error handling, and the post-auth manual `/me` fetch pattern. This violates DRY and increases maintenance burden.  
- **Fix**: Extract a reusable `AuthForm` component that accepts `mode: 'login' | 'register'`, `onSubmit`, and extra fields.

### 16. AuthContext bypasses React Query cache with direct `api.get('/me')`
- **Severity**: Medium  
- **File**: `context/AuthContext.tsx` (line 34)  
- **Issue**: The initial auth check uses `api.get('/me')` directly instead of `queryClient.fetchQuery({ queryKey: ['me'] })`. This means the response is not cached in React Query, and `useMe()` in `App.tsx` will re-fetch anyway.  
- **Fix**: Use `queryClient.fetchQuery` or remove the manual check entirely and rely on `useMe`.

### 17. Flash-of-login-page (FOLO) while auth state is loading
- **Severity**: Medium  
- **File**: `App.tsx` (lines 40–42)  
- **Issue**: `App.tsx` routes based only on `isAuthenticated`, ignoring `isLoading` from `useAuth()`. While `AuthContext` is performing its initial `/me` check, `isAuthenticated` is `false`, so the user is briefly redirected to `/login` before being sent back to the dashboard.  
- **Fix**: Add an auth-loading gate:
  ```tsx
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  ```

---

## Low

### 18. Production `console.error` calls remain in source
- **Severity**: Low  
- **File**: `main.tsx` (lines 32, 59)  
- **Issue**: `console.error('ErrorBoundary caught an error:', ...)` and `console.error('Root element not found')` will leak into production builds.  
- **Fix**: Replace with a proper error-reporting service (e.g., Sentry) or strip in production.

### 19. Hardcoded `text-red-400` used instead of semantic `text-destructive`
- **Severity**: Low  
- **File**: `pages/Login.tsx:85`, `pages/Register.tsx:114`, `pages/Stations.tsx:166`, `pages/DataExplorer.tsx:191`, `pages/ApiKeys.tsx:190`, `pages/Profile.tsx:129`, `pages/Dashboard.tsx:104`  
- **Issue**: Using `text-red-400` breaks the shadcn/ui theming system. If the theme’s `destructive` color is changed, error text will still appear red instead of the semantic destructive color.  
- **Fix**: Replace all instances with `text-destructive`.

### 20. Potentially invalid Tailwind shadow utility
- **Severity**: Low  
- **File**: `pages/Pricing.tsx` (line 77)  
- **Issue**: `shadow-emerald-900/20` is a color-only modifier without a shadow size (e.g., `shadow-lg`). It may not produce any visible shadow.  
- **Fix**: Add a size class:
  ```tsx
  className={cn('relative flex flex-col', t.tier === 'pro' && 'border-emerald-600/50 shadow-lg shadow-emerald-900/20')}
  ```

### 21. Error messages lack ARIA live-region `role="alert"`
- **Severity**: Low  
- **File**: `pages/Login.tsx:85`, `pages/Register.tsx:114`, `pages/Stations.tsx:166`, `pages/ApiKeys.tsx:190`, `pages/Profile.tsx:129`, `pages/Dashboard.tsx:104`, `pages/DataExplorer.tsx:191`  
- **Issue**: Error paragraphs are not announced to screen readers when they appear dynamically.  
- **Fix**: Add `role="alert"` to each error `<p>` element.

### 22. Success message lacks ARIA live-region `role="status"`
- **Severity**: Low  
- **File**: `pages/Profile.tsx` (line 130)  
- **Issue**: The "Profile updated successfully!" message is not announced to screen readers.  
- **Fix**: Add `role="status" aria-live="polite"` to the success `<p>`.

### 23. Badge text uses sub-recommended font size
- **Severity**: Low  
- **File**: `pages/Dashboard.tsx:116`, `pages/Stations.tsx:107`  
- **Issue**: `text-[10px]` renders text below the 12px minimum recommended for readability and accessibility.  
- **Fix**: Use `text-xs` (12px) instead of `text-[10px]`.

### 24. Decorative icons lack explicit `aria-hidden`
- **Severity**: Low  
- **File**: `pages/Login.tsx:56,72`, `pages/Register.tsx:69,85,101`, `pages/Profile.tsx:111,125`, `pages/Pricing.tsx:83,99`, `pages/Dashboard.tsx:83,130`, etc.  
- **Issue**: `lucide-react` may or may not inject `aria-hidden="true"` depending on the installed version. Without an explicit prop, decorative icons can be announced as "image" by screen readers.  
- **Fix**: Add `aria-hidden="true"` to all purely decorative icons:
  ```tsx
  <Mail className="..." aria-hidden="true" />
  ```

### 25. CSV export `URL.revokeObjectURL` timeout may be too short
- **Severity**: Low  
- **File**: `pages/DataExplorer.tsx` (lines 105–107)  
- **Issue**: `setTimeout(() => URL.revokeObjectURL(url), 1000)` may revoke the URL before the browser initiates the download on slow machines.  
- **Fix**: Increase to at least 5000ms, or use a `load` event on a temporary iframe to revoke after the download actually begins.

### 26. CSV export lacks formula-injection sanitization
- **Severity**: Low  
- **File**: `pages/DataExplorer.tsx` (lines 92–98)  
- **Issue**: If a malicious backend value or user input begins with `=`, `+`, `-`, or `@`, opening the CSV in Excel can trigger formula injection (CSV injection). The `escapeCsv` function only handles quotes/commas/newlines.  
- **Fix**: Prefix cell values that match dangerous characters with a single quote (`'`) or strip leading `=+@-`.

### 27. Dead code — exported hooks never imported
- **Severity**: Low  
- **File**: `hooks/useApi.ts` (lines 89–100, 140–153)  
- **Issue**: `useStation` and `useNearbyData` are exported but never consumed by any component. They will still be bundled and increase dead code.  
- **Fix**: Remove the unused exports or implement the features that consume them.

### 28. Weak client-side email validation regex
- **Severity**: Low  
- **File**: `pages/Profile.tsx` (line 46)  
- **Issue**: `^[^\s@]+@[^\s@]+\.[^\s@]+$` accepts invalid addresses like `a@b.c` and rejects valid ones with `+` labels.  
- **Fix**: Use a more robust regex (e.g., from `validator.js`) or rely on the browser’s built-in `type="email"` validation and backend verification.

### 29. Redundant `setUser` calls on every `/me` refetch
- **Severity**: Low  
- **File**: `App.tsx` (lines 21–26)  
- **Issue**: `useEffect(() => { if (meData) setUser(meData) }, [meData, setUser])` triggers a state update even when `meData` is deeply equal to the current user. This causes unnecessary `AuthContext` re-renders.  
- **Fix**: Only call `setUser` when the data actually differs:
  ```tsx
  useEffect(() => {
    if (meData && meData.id !== user?.id) setUser(meData);
  }, [meData, user, setUser]);
  ```

### 30. Notification dropdown lacks keyboard dismissal
- **Severity**: Low  
- **File**: `components/layout/Header.tsx` (lines 92–118)  
- **Issue**: The notification dropdown can be opened with the keyboard but cannot be closed with `Escape`. The mobile menu correctly implements Escape handling; the notification dropdown does not.  
- **Fix**: Add a `keydown` listener (or reuse a shared hook) that closes the dropdown when `Escape` is pressed and restores focus to the Bell button.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High     | 4 |
| Medium   | 12 |
| Low      | 15 |
| **Total**| **32** |

**Next Steps**: Remediate all **Critical** and **High** issues before the next QA cycle. Address **Medium** issues in the following sprint. **Low** issues should be triaged and scheduled based on product priorities.
