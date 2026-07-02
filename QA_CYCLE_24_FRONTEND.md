# QA Cycle 24 — Frontend Review

**Status**: ⚠️ PASS with findings — Zero Critical issues, 1 High issue found.
**Total issues**: 6 (1 High, 3 Medium, 2 Low)
**Scope**: All TS/TSX files in `web-dashboard/src/`
**Date**: 2026-07-01
**Reviewer**: Senior QA Engineer — Zero-Defect Review

---

## Executive Summary

The ENViroSwarm frontend codebase demonstrates **solid security posture**: no JWT in `localStorage`, no XSS sinks (`dangerouslySetInnerHTML`, `eval`, etc.), proper httpOnly cookie auth via `withCredentials: true`, and no auth bypass in route guards. React hooks are used correctly with no rule violations, no stale closures, and no memory leaks (all event listeners, intervals, and timeouts are properly cleaned up).

The single **High** issue is a **privacy/data leak between user sessions on shared browsers** caused by the React Query cache not being cleared on manual logout. This is the only issue that warrants immediate attention before release.

---

## Severity Legend

- **Critical**: Active security vulnerability, auth bypass, complete feature breakage, broken hooks rules
- **High**: Privacy leak, race conditions, incorrect React patterns that cause real user impact, memory leaks
- **Medium**: Suboptimal patterns, missing loading states, noisy API calls, false UX expectations
- **Low**: Minor performance hits, unnecessary re-renders, UX polish

---

## High Issues (1)

### 1. React Query cache not cleared on logout — previous user's data can leak to the next session

**Severity**: High  
**File**: `web-dashboard/src/context/AuthContext.tsx` (lines 44–51) and `web-dashboard/src/App.tsx` (lines 29–35)  
**Issue**:  
`AuthContext.logout()` only calls `api.post('/logout')` and then `setUserState(null)`. It does **not** clear the React Query cache. `App.tsx` only removes the `['me']` query when the `enviroswarm:unauthorized` event fires — but that event is dispatched by the **Axios 401 interceptor**, not by the logout handler. On a **manual logout**, the interceptor is never triggered (the logout endpoint returns 200), so all cached queries (`['me']`, `['stations']`, `['apikeys']`, `['sensorData']`, etc.) remain in memory.

If a different user logs in on the same browser (e.g., shared library/workstation), `useMe()` in `App.tsx` immediately returns the **previous user's cached data** from the `['me']` query before the background refetch completes. `App.tsx` then syncs that stale data into `AuthContext` via `setUser(meData)`, causing the new user to briefly (or indefinitely, if offline) see the previous user's email, tier, and potentially cached API keys or station data.

**Fix**:  
Clear the entire React Query cache on logout, or dispatch the `enviroswarm:unauthorized` event from the logout handler so the existing `removeQueries` listener fires. The cleanest approach is to inject the `queryClient` into `AuthContext` (or move logout to `App.tsx`) and call `queryClient.clear()` before `setUserState(null)`:

```tsx
// In AuthContext.tsx
import { useQueryClient } from '@tanstack/react-query'

const logout = useCallback(async () => {
  const queryClient = useQueryClient() // or accept it as a prop
  try {
    await api.post('/logout')
  } catch {
    // ignore
  }
  queryClient.clear()   // <-- clear all cached user data
  setUserState(null)
}, [])
```

Alternatively, dispatch the same event the interceptor uses:

```tsx
window.dispatchEvent(new CustomEvent('enviroswarm:unauthorized'))
setUserState(null)
```

---

## Medium Issues (3)

### 2. `useMe()` fetched unconditionally on all routes including public pages

**Severity**: Medium  
**File**: `web-dashboard/src/App.tsx` (line 19)  
**Issue**: `const { data: meData } = useMe()` is called unconditionally at the app root. Every unauthenticated visitor to `/login` or `/register` triggers a `/me` request that returns 401, firing the Axios interceptor, dispatching `enviroswarm:unauthorized`, and removing the `['me']` query. This is wasteful, noisy in server logs, and creates unnecessary event churn.

**Fix**: Guard `useMe()` so it only fetches when the user is expected to be authenticated:

```tsx
const { isAuthenticated } = useAuth()
const { data: meData } = useMe({ enabled: isAuthenticated })
```

(Requires adding `enabled?: boolean` to the `useMe` hook in `useApi.ts`.)

---

### 3. Missing auth initialization loading state causes flash of login screen

**Severity**: Medium  
**File**: `web-dashboard/src/context/AuthContext.tsx` (line 27)  
**Issue**: `isLoading` is initialized to `false` and never set to `true`. On browser refresh, an authenticated user briefly sees the `/login` route because `isAuthenticated` is `false` until `useMe()` returns. This is a classic "flash of unauthenticated content" (FOUC) that degrades perceived reliability.

**Fix**: Initialize `isLoading` to `true` and set it to `false` once auth initialization is complete (e.g., after `useMe()` settles in `App.tsx`):

```tsx
// AuthContext.tsx
const [isLoading, setIsLoading] = useState(true)

// App.tsx
const { isLoading: meLoading } = useMe()
useEffect(() => {
  setIsLoading(meLoading)
}, [meLoading, setIsLoading])
```

Then conditionally render a loading spinner or skeleton instead of the route guard while `isLoading` is true.

---

### 4. Logout API failure leaves valid auth cookie but clears UI state

**Severity**: Medium  
**File**: `web-dashboard/src/context/AuthContext.tsx` (lines 44–51)  
**Issue**: If `api.post('/logout')` fails (network error, server timeout, 500), the catch block silently swallows the error and clears frontend state. The user *believes* they are logged out, but the httpOnly cookie is still valid in the browser. Any subsequent request (e.g., page refresh, back button) would still be authenticated.

**Fix**: Surface the error to the user and do not clear state until logout is confirmed, or retry the logout request:

```tsx
const logout = useCallback(async () => {
  try {
    await api.post('/logout')
    queryClient.clear()
    setUserState(null)
  } catch {
    // Show error toast; do not clear state
    throw new Error('Logout failed. Your session may still be active.')
  }
}, [])
```

---

## Low Issues (2)

### 5. Dialog context value recreated on every render

**Severity**: Low  
**File**: `web-dashboard/src/components/ui/Dialog.tsx` (line 101)  
**Issue**: The `DialogContext.Provider` value is a new object literal on every `Dialog` render. This causes `DialogTitle` and `DialogDescription` to re-render and re-run their `registerTitle()` / `registerDescription()` effects unnecessarily.

**Fix**: Memoize the context value:

```tsx
const ctxValue = useMemo(() => ({
  titleId,
  descriptionId,
  registerTitle: () => setHasTitle(true),
  registerDescription: () => setHasDescription(true),
}), [titleId, descriptionId])
```

---

### 6. Login/Register hardcode dummy user tier

**Severity**: Low  
**File**: `web-dashboard/src/pages/Login.tsx` (lines 21–27) and `web-dashboard/src/pages/Register.tsx` (lines 34–40)  
**Issue**: On successful login/register, `login()` is called with a hardcoded dummy user object (`tier: 'free'`, `id: ''`). Pro/Enterprise users briefly see free-tier UI (e.g., upsell banners on `/apikeys`) until `useMe()` returns the real tier. This is a flash-of-wrong-content issue.

**Fix**: Avoid seeding `AuthContext` with dummy data. Rely solely on `useMe()` (or the login mutation response) to populate the user. If `useMe()` must be guarded, show a loading state during auth initialization instead of showing the dummy user.

---

## Verdict

- **Critical**: 0 ✅
- **High**: 1 (cache leak on logout)  
- **Medium**: 3 (unconditional `useMe`, missing loading state, logout failure false-security)  
- **Low**: 2 (Dialog context memoization, dummy login tier)

The codebase is well-structured, secure, and free of hook rule violations or critical security flaws. The **single High issue (cache leak)** should be fixed before the next release to prevent cross-session data exposure on shared devices.
