# QA Cycle 25 — Frontend Review

**Status**: ⚠️ PASS WITH HIGH ISSUES — 3 High issues found, 0 Critical
**Total issues**: 9 (3 High / 4 Medium / 2 Low)
**Scope**: All TS/TSX files in `web-dashboard/src/`
**Date**: 2026-07-01
**Reviewer**: Senior QA Engineer — Zero-Defect Review

---

## Critical Issues

*None found.*

---

## High Issues

### H1. App.tsx — Route guard race condition breaks deep linking on protected route refresh
**Severity**: High  
**File**: `App.tsx` (line 41)  
**Issue**: `isAuthenticated` is evaluated before auth state is confirmed. On initial mount or refresh of a protected route, `user` is `null` so `isAuthenticated` is `false`. The route guard immediately renders `<Navigate to="/login" replace />`, replacing the current URL. Once `useMe` returns data, `isAuthenticated` flips to `true` and the `/login` route redirects to `/`. This causes a visible flash of the login page and **destroys deep linking** (the user loses their original URL). This is a race condition between auth initialization and route rendering.  
**Fix**: Gate route rendering behind an auth-ready check. Two options:

1. **Move auth loading into `AuthContext`**: Initialize `isLoading` to `true` and expose it. Set it to `false` after `useMe` resolves (or move `useMe` into `AuthContext`). In `App.tsx`, render a loading spinner while `isLoading` is `true` before `<Routes>`.
2. **Quick local fix in `App.tsx`**: Track `authReady` locally and wait for `useMe` to settle:

```tsx
const { isAuthenticated, setUser } = useAuth()
const { data: meData, isLoading: meLoading } = useMe()
const [authReady, setAuthReady] = useState(false)

useEffect(() => {
  if (meData || !meLoading) {
    setAuthReady(true)
  }
}, [meData, meLoading])

if (!authReady) return <LoadingSpinner />

return <Routes>...</Routes>
```

---

### H2. Login.tsx & Register.tsx — Stale user state after successful authentication
**Severity**: High  
**File**: `Login.tsx` (lines 20–27), `Register.tsx` (lines 33–40), `useApi.ts` (lines 19–41)  
**Issue**: After `loginMutation.mutateAsync` or `registerMutation.mutateAsync` succeeds, the code calls `login()` with a **placeholder** user object (`id: ''`, `tier: 'free'`). Neither `useLogin` nor `useRegister` invalidate the `['me']` query. Because `useMe` in `App.tsx` is already mounted and retains its previous error/empty state, it **does not automatically refetch** after login. The `useEffect` in `App.tsx` that calls `setUser(meData)` never fires because `meData` is still `undefined`. The user remains stuck with the placeholder state until a manual page refresh. This causes incorrect UI state: Pro/Enterprise users see the Free tier badge, the API Keys page shows the upsell instead of key management, and the Profile page shows an empty user ID.  
**Fix**: Invalidate `['me']` in the login and register mutations so `App.tsx` refetches the real user object immediately:

```tsx
// useApi.ts
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: LoginRequest) => { ... },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: RegisterRequest) => { ... },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
```

Alternatively, if the backend can return the full `User` object in the login/register response, use that data directly instead of the placeholder.

---

### H3. useApi.ts — Query cache keys are not scoped by user, risking cross-user data exposure
**Severity**: High  
**File**: `useApi.ts` (lines 73–84, 100–114, 122–135, 152–196)  
**Issue**: All user-specific queries use keys like `['stations']`, `['apikeys']`, `['sensorData', params]`, `['me']` without a user identifier. React Query caches data by these keys. If User A's session expires (or they simply leave the browser), and User B logs in on the same browser without an explicit logout, React Query may briefly serve User A's cached data on the first render of `useStations`/`useApiKeys`/`useSensorData` before the background refetch completes. On a slow network, the exposure window can be noticeable. This is a cache-isolation / incorrect-query-key-pattern issue.  
**Fix**: Scope user-specific query keys to the current user. Either:

1. **Include `user.id` in keys** (requires importing `useAuth` in `useApi.ts`):
```tsx
export function useStations() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['stations', user?.id],
    queryFn: async () => { ... },
  })
}
```

2. **Clear the entire cache on unauthorized** (simpler, catches all user-scoped queries at once):
```tsx
// AuthContext.tsx
useEffect(() => {
  const handler = () => {
    queryClient.clear() // instead of just setUserState(null)
    setUserState(null)
  }
  window.addEventListener('enviroswarm:unauthorized', handler)
  return () => window.removeEventListener('enviroswarm:unauthorized', handler)
}, [queryClient])
```

---

## Medium Issues

### M1. App.tsx — `useMe` fires unnecessarily on public routes
**Severity**: Medium  
**File**: `App.tsx` (line 19)  
**Issue**: `useMe()` is called unconditionally at the top level of `App.tsx`, so it fires even on `/login` and `/register` when the user is unauthenticated. This causes a 401 request (plus retry) on every public page load, triggering the `enviroswarm:unauthorized` event unnecessarily and adding noise to error logs.  
**Fix**: Skip the query when the user is known to be unauthenticated, or gate it behind a route check:
```tsx
const { isAuthenticated } = useAuth()
const { data: meData } = useMe({ enabled: isAuthenticated || !hasCheckedAuth })
```

---

### M2. DataExplorer.tsx — Auto-fetches data before user initiates query
**Severity**: Medium  
**File**: `DataExplorer.tsx` (line 40)  
**Issue**: `useSensorData(queryParams)` is called with an empty `queryParams` object `{}` on initial mount. This fetches sensor data immediately, even though the UI displays the message "No data. Run a query to see results." This is a behavior mismatch and wastes bandwidth on initial page load.  
**Fix**: Disable the query until the user has explicitly triggered a search:
```tsx
const { data: response, isLoading, error: queryError } = useSensorData(queryParams, {
  enabled: Object.keys(queryParams).length > 0,
})
```

---

### M3. Dashboard.tsx — Manual polling via `refreshKey` instead of React Query primitives
**Severity**: Medium  
**File**: `Dashboard.tsx` (lines 12–22, 28–30)  
**Issue**: A `setInterval` and `window.focus` listener manually increment a `refreshKey` state to force `useSensorData` to refetch. This is an anti-pattern; React Query provides `refetchInterval` and `refetchOnWindowFocus` for exactly this purpose. The manual approach triggers unnecessary re-renders of `Dashboard` and recalculations of multiple `useMemo` blocks every 60 seconds.  
**Fix**: Remove `refreshKey` and the `useEffect`. Pass `refetchInterval: 60000` and `refetchOnWindowFocus: true` directly to `useSensorData` in `useApi.ts`, or configure it in the `QueryClient` default options.

---

### M4. AuthContext.tsx — `isLoading` is initialized to `false` and never updated
**Severity**: Medium  
**File**: `AuthContext.tsx` (line 29)  
**Issue**: `isLoading` is set to `false` on mount and never changed to `true`. The context exposes it, but consumers cannot rely on it to gate UI during auth initialization. This is why `App.tsx` has no loading state to prevent the route-guard flash.  
**Fix**: Initialize `isLoading` to `true` and manage it properly. If `useMe` is moved into `AuthContext`, set `isLoading = false` when the fetch completes. If `useMe` stays in `App.tsx`, expose a `setIsLoading` from `AuthContext` so `App.tsx` can drive it.

---

## Low Issues

### L1. DataExplorer.tsx — `stationNameMap` recreated on every render
**Severity**: Low  
**File**: `DataExplorer.tsx` (line 111)  
**Issue**: `const stationNameMap = new Map(...)` is created fresh on every render. For large station lists, this is unnecessary overhead.  
**Fix**: Wrap in `useMemo`:
```tsx
const stationNameMap = useMemo(() => new Map(stations?.map(s => [s.id, s.name]) ?? []), [stations])
```

---

### L2. Stations.tsx — `parseFloat` on `type="number"` input may accept partial strings
**Severity**: Low  
**File**: `Stations.tsx` (lines 40–41)  
**Issue**: `parseFloat("123abc")` returns `123` (not `NaN`). While the `<input type="number">` helps, pasted or programmatic input could slip through with a partial numeric value. The `isNaN` check alone does not catch this.  
**Fix**: Add a stricter validation before `parseFloat`:
```tsx
if (!/^-?\d+(\.\d+)?$/.test(latitude) || !/^-?\d+(\.\d+)?$/.test(longitude)) {
  setFormError('Latitude and longitude must be valid numbers')
  return
}
```

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| Critical | 0 | — |
| High | 3 | Auth/race condition (H1), stale user state (H2), cache isolation (H3) |
| Medium | 4 | Unnecessary queries, anti-patterns, unused state |
| Low | 2 | Minor performance / validation gaps |

**Action required before release**: Resolve **H1** (route guard flash / deep linking) and **H2** (stale user after login). **H3** (cache scoping) should be addressed before any multi-user or shared-terminal usage. The remaining Medium/Low issues are recommended for the next sprint but do not block release if the High issues are fixed.
