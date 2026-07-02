# QA Cycle 26 — Frontend Review

**Status**: ❌ FAIL — Critical and High issues found.
**Scope**: All TS/TSX files in `web-dashboard/src/`
**Date**: 2026-07-01

---

## Executive Summary

- **Critical Issues**: 2 (both auth-related)
- **High Issues**: 4 (security, race conditions, memory leak, cascading re-renders)
- **Medium Issues**: 3
- **Low Issues**: 0
- **Broken Hook Rules**: 0 confirmed

---

## Critical Issues

### 1. Auth Bypass — Fake user object injected after login
- **Severity**: Critical
- **File**: `pages/Login.tsx`, lines 21–27
- **Issue**: After a successful `loginMutation`, the component immediately calls `login()` with a hardcoded fake user object (`id: '', tier: 'free'`). This sets `isAuthenticated = true` in `AuthContext` before the `useMe` query confirms the session. If `useMe` subsequently fails (network error, 500, cookie not set, CORS issue), the fake user persists and the frontend renders protected routes with no valid backend session. The route guard is bypassed because `!!user` is `true`.
- **Fix**: Remove the `login()` call from `Login.tsx`. Rely on the `useMe` query in `App.tsx` to populate the real user after the cookie is set. If needed, show an intermediate "Signing in…" state while `useMe` loads.

```tsx
// Login.tsx — REMOVE this block:
login({
  id: '',
  email: email.trim(),
  tier: 'free',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
```

### 2. Auth Bypass — Fake user object injected after registration
- **Severity**: Critical
- **File**: `pages/Register.tsx`, lines 34–40
- **Issue**: Identical pattern to Login.tsx. After `registerMutation` succeeds, a fake user is injected. If `useMe` fails, the frontend treats the user as authenticated without a valid session.
- **Fix**: Remove the `login()` call from `Register.tsx`. Let `App.tsx`’s `useMe` query drive the authenticated user state.

---

## High Issues

### 3. Missing CSRF token mechanism for cookie-based auth
- **Severity**: High
- **File**: `lib/api.ts`, lines 21–22 and the request interceptor (lines 27–33)
- **Issue**: The app sends `withCredentials: true` so httpOnly session cookies are transmitted automatically on cross-origin requests. However, there is no explicit CSRF token read from a meta tag / cookie and injected into request headers (e.g., `X-CSRF-Token`). If the backend does not enforce `SameSite=Strict` cookies, state-changing requests (POST / PUT / PATCH / DELETE) are exposed to CSRF attacks from malicious third-party sites.
- **Fix**: The backend should expose a CSRF token (e.g., in a non-httpOnly cookie or meta tag). The frontend request interceptor should read it and attach it to every mutating request:

```ts
api.interceptors.request.use((config) => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  if (csrf && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() ?? '')) {
    config.headers['X-CSRF-Token'] = csrf
  }
  return config
})
```

### 4. Stale-closure race condition in mutation invalidation
- **Severity**: High
- **File**: `hooks/useApi.ts`, lines 111–126 (`useCreateStation`), 181–196 (`useCreateApiKey`), 198–213 (`useDeleteApiKey`)
- **Issue**: The `onSuccess` callbacks capture `user?.id` from the closure at render time. If `user` changes between mutation start and completion (e.g., `useMe` returns the real user after `Login.tsx` injected the fake `id: ''`), the mutation invalidates the wrong cache key (e.g., `['stations', '']` instead of `['stations', 'abc123']`). The active query stays stale and the user sees outdated data.
- **Fix**: Use the query client’s `getQueryData` or invalidate by predicate, or refetch the current user ID inside `onSuccess` rather than closing over it:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['stations'] }) // invalidate all station queries
}
```

Or, safer, fetch the latest user from the cache inside the callback:

```ts
onSuccess: () => {
  const latestUser = queryClient.getQueryData<User>(['me'])
  queryClient.invalidateQueries({ queryKey: ['stations', latestUser?.id] })
}
```

### 5. Memory leak in CSV export
- **Severity**: High
- **File**: `pages/DataExplorer.tsx`, lines 99–107
- **Issue**: `URL.createObjectURL` is revoked inside a `setTimeout`. If the component unmounts before the timeout fires, the blob URL is never released, leaking memory.
- **Fix**: Store the timeout ID in a `useRef` and clear it in a `useEffect` cleanup:

```tsx
const exportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
useEffect(() => {
  return () => {
    if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current)
  }
}, [])

const handleExportCsv = () => {
  // ... create url, download ...
  exportTimeoutRef.current = setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

### 6. Cascading re-renders from unmemoized Tabs context
- **Severity**: High
- **File**: `components/ui/Tabs.tsx`, lines 18–33
- **Issue**: `TabsContext.Provider` creates a new object literal on every render of `Tabs` (`value={{ value, onValueChange: handleChange, idPrefix }}`). Since the reference changes, all consumers (`TabsTrigger`, `TabsContent`) re-render every time the parent re-renders, even if `value` hasn’t changed. This is a classic cascading re-render pattern.
- **Fix**: Memoize the context value:

```tsx
const contextValue = useMemo(() => ({
  value,
  onValueChange: handleChange,
  idPrefix,
}), [value, handleChange, idPrefix])

return (
  <TabsContext.Provider value={contextValue}>
    <div className="w-full">{children}</div>
  </TabsContext.Provider>
)
```

---

## Medium Issues

### 7. Unnecessary 401 noise on public routes
- **Severity**: Medium
- **File**: `App.tsx`, line 19
- **Issue**: `useMe()` is called unconditionally in `App.tsx`, even on `/login` and `/register`. Unauthenticated users therefore trigger a `/me` request that returns 401. With the global `retry: 1`, this produces two 401 requests per page load, creating noise in logs and potentially triggering rate-limiting or security alerts.
- **Fix**: Since `useMe` is the canonical auth check, this is acceptable design, but consider disabling retries specifically for 401s (e.g., via a per-query `retry` function) to reduce noise.

### 8. DialogTitle / DialogDescription incorrect effect dependency
- **Severity**: Medium
- **File**: `components/ui/Dialog.tsx`, lines 129–131 and 141–143
- **Issue**: `DialogTitle` and `DialogDescription` use `useEffect(() => { ctx?.registerTitle() }, [ctx])`. Because `DialogContext.Provider` creates a new object literal on every render, `[ctx]` changes every time, causing the effects to run on every render. While currently harmless (bails out because state is already `true`), this is an incorrect dependency pattern.
- **Fix**: Memoize the context value in `Dialog.tsx` with `useMemo` so `ctx` is stable.

### 9. DataExplorer email sync race condition
- **Severity**: Medium
- **File**: `pages/Profile.tsx`, lines 23–27
- **Issue**: `useEffect` overwrites `email` state whenever `user?.email` changes. If a background refetch of `useMe` updates the user while the owner is editing the email input, the input is abruptly overwritten, causing a frustrating UX race.
- **Fix**: Only sync email when the user is not in edit mode, or derive the initial value from props/state without a live sync effect.

---

## Verdict

**Critical + High count: 6** — Zero-defect target is **not met**.

Recommended immediate actions:
1. Remove fake `login()` calls from `Login.tsx` and `Register.tsx` (Critical).
2. Implement CSRF token retrieval and injection in `lib/api.ts` (High).
3. Fix stale-closure invalidation in `hooks/useApi.ts` mutations (High).
4. Add cleanup for the CSV export timeout in `DataExplorer.tsx` (High).
5. Memoize `TabsContext.Provider` value in `Tabs.tsx` (High).

---

*End of report.*
