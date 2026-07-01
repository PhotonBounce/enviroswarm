# ENViroSwarm Frontend — QA Cycle 18 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 5 |
| **Total** | **5** |

---

## Previous Fixes Verification (Cycles 1–17)

All fixes from **QA Cycles 1–17** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 17 LO-1** (Profile.tsx email regex) — `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` present on line 46. ✅
- **Cycle 17 LO-2** (ApiKeys.tsx timeout leak) — `copyTimeoutRef` used with cleanup on unmount and overlap guard. ✅
- **Cycle 16 CR-1** (Dashboard.tsx `.reduce` crash) — `stations?.filter(... )?.reduce(... ) ?? 0` present. ✅
- **Cycle 16 CR-2** (DataExplorer.tsx `Map` crash) — `new Map(stations?.map(... ) ?? [])` present. ✅
- **Cycle 16 HI-1–HI-9** (Missing `React` imports) — All 9 files now import `React` or named types. ✅
- **Cycle 16 LO-3** (Stations.tsx geo range) — `latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180` present. ✅
- **Cycle 16 LO-4** (ApiKeys dismissible dialog) — `newKey` guard on `onOpenChange` and `onPointerDownOutside` present. ✅
- **Cycle 16 LO-5** (CSV anchor DOM append) — `document.body.appendChild(a)` / `removeChild(a)` present. ✅
- **Cycle 16 LO-6** (Badge semantic element) — Renders as `<span>`. ✅
- **Cycle 16 LO-7** (LoginScreen catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-8** (RegisterScreen catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-9** (DataViewScreen dead state) — Plain `const sensorType = 'all'` present. ✅
- **Cycle 16 LO-10** (SubmitReadingScreen unused import) — `SENSOR_UNITS` removed. ✅
- **Cycle 16 LO-11** (Header inconsistent label) — Mobile nav label now `'API Keys'`. ✅
- **Cycle 16 LO-12** (Dialog body scroll lock) — `document.body.style.overflow` present. ✅
- **Cycle 16 LO-13** (Android type-only imports) — `import type { ... }` used throughout. ✅
- **Cycle 15 M1** (Dashboard `now` stale memo) — `now` depends on `refreshKey`. ✅
- **Cycle 15 M2** (Header profile aria-label) — `aria-label="Profile"` present. ✅
- **Cycle 15 L1** (SensorChart non-finite guard) — `if (!Number.isFinite(r.value)) continue` present. ✅
- **Cycle 15 L2** (CSV UTF-8 BOM) — `\uFEFF` prefix present. ✅
- **Cycle 14 M1** (DataViewScreen label-data alignment) — `validItems` used for both arrays. ✅
- **Cycle 14 M2** (Dialog conditional rendering) — Dialog rendered unconditionally (no `&&` guard). ✅
- **Cycle 14 L1** (SensorChart dead code) — `ChartComponent` used, no dead `DataComponent`. ✅
- **Cycle 14 L2** (Dashboard `today` stale) — `today` depends on `refreshKey`. ✅
- **Cycle 14 L3** (CSV non-finite consistency) — `Number.isFinite` guard in CSV export. ✅
- **Cycle 14 L4** (Form label associations) — `htmlFor`/`id` pairs present in all forms. ✅
- **Cycle 14 L5** (Android catch `any`) — `catch (err: unknown)` in all screen files. ✅
- **All earlier cycles** (C1–C13, M1–M32, L1–L28, etc.) — Verified present and correct. ✅

---

## Issues Found

### LO-1 — `web-dashboard/src/components/ui/Dialog.tsx` — Initial focus selector does not exclude disabled/hidden elements
**Location:** lines 25–27
**Category:** Accessibility / Focus Management

The initial focus `useEffect` uses a `querySelector` that can match disabled or hidden elements:

```tsx
const focusable = content.querySelector<HTMLElement>(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
)
if (focusable) {
  focusable.focus()
}
```

If the first matched element is disabled (e.g., `<button disabled>`), `focus()` is a no-op in modern browsers, leaving focus on the trigger element outside the modal. The focus trap (`handleKeyDown`) correctly filters disabled elements with `!el.disabled && el.offsetParent !== null`, but the initial focus effect does not. This creates an inconsistency where a disabled first element prevents focus from entering the dialog on open.

**Recommendation:** Align the selector with the focus trap by excluding disabled elements:

```tsx
const focusable = content.querySelector<HTMLElement>(
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
)
if (focusable) {
  focusable.focus()
} else {
  content.focus()
}
```

---

### LO-2 — `web-dashboard/src/pages/Login.tsx` & `Register.tsx` — Partial authentication state on `/me` fetch failure
**Location:** `Login.tsx` lines 24–33; `Register.tsx` lines 37–47
**Category:** Authentication / UX

After a successful login or register mutation (the httpOnly cookie is already set by the backend), the code makes a second call to `api.get('/me')`. If this call fails (network error, server timeout, etc.), the user is shown an error message on the login/register page and remains there. However, the cookie is already valid. Refreshing the page or navigating to `/` would authenticate the user successfully. This leaves the user in a confusing partially-authenticated state.

**Recommendation:** On `/me` failure after a successful login/register, either (a) call the `logout()` function to clear the server-side session so the user is not left in a half-logged-in state, or (b) redirect to the dashboard and let `App.tsx`'s `useMe()` retry loading the profile in the background.

---

### LO-3 — `android-app/src/types/index.ts` — Type definitions inconsistent with web-dashboard (`updated_at` missing)
**Location:** `android-app/src/types/index.ts` lines 39–56
**Category:** Type Safety / Cross-Platform Consistency

The Android `User` and `SensorStation` interfaces are missing the `updated_at` field that is present in the web-dashboard types:

- Web `User` has `updated_at: string` (line 7).
- Web `SensorStation` has `updated_at: string` (line 34).
- Android `User` has only `created_at: string` (line 43).
- Android `SensorStation` has only `created_at: string` (line 56).

While the Android app does not currently consume `updated_at`, the divergence means the frontend type contracts drift from the backend schema and from each other. If a future Android feature needs `updated_at`, it will be untyped.

**Recommendation:** Add `updated_at: string` to both Android `User` and `SensorStation` interfaces to keep type definitions consistent across platforms.

---

### LO-4 — `android-app/src/api/client.ts` — 401 response interceptor masks original error on `SecureStore` failure
**Location:** lines 53–58
**Category:** Error Handling / Reliability

The response interceptor for 401 errors awaits `SecureStore.deleteItemAsync` before re-throwing the original Axios error:

```ts
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      cachedToken = null;
      await SecureStore.deleteItemAsync('access_token');  // ← If this throws...
      authEvents.emitUnauthorized();
    }
    return Promise.reject(error);  // ← ...this line is never reached
  }
);
```

If `SecureStore.deleteItemAsync` throws (e.g., keychain corruption, device lock), the async function throws the storage error instead of the original 401 error. Callers receive a misleading error message and cannot distinguish an auth failure from a storage failure.

**Recommendation:** Wrap the `deleteItemAsync` call in a try/catch so the original 401 error is always preserved:

```ts
if (error.response?.status === 401) {
  cachedToken = null;
  try {
    await SecureStore.deleteItemAsync('access_token');
  } catch (storeErr) {
    console.error('Failed to clear token from secure store:', storeErr);
  }
  authEvents.emitUnauthorized();
}
return Promise.reject(error);
```

---

### LO-5 — `android-app/src/hooks/useAuth.ts` — `checkAuth` catch block masks original 401 error on `SecureStore` failure
**Location:** lines 33–39
**Category:** Error Handling / Reliability

Same root cause as LO-4, in a different code path. The `checkAuth` catch block clears the token on 401 but does not guard against `SecureStore.deleteItemAsync` throwing:

```ts
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Auth check failed:', message);
  if (err instanceof AxiosError && err.response?.status === 401) {
    await SecureStore.deleteItemAsync('access_token');  // ← If this throws...
    clearCachedToken();
    setUser(null);
  }
  throw err;  // ← ...this line is never reached
}
```

If the deletion throws, the original `err` (401) is lost and replaced by the storage error. This is especially problematic because `checkAuth` is called from `login()` and `register()`; a storage failure during session validation after login would produce a confusing "Failed to save session" or storage error instead of the actual auth failure.

**Recommendation:** Wrap the `SecureStore.deleteItemAsync` call in a try/catch inside the 401 branch so the original error is always re-thrown:

```ts
if (err instanceof AxiosError && err.response?.status === 401) {
  try {
    await SecureStore.deleteItemAsync('access_token');
  } catch (storeErr) {
    console.error('Failed to clear token:', storeErr);
  }
  clearCachedToken();
  setUser(null);
}
throw err;
```

---

*Report generated by QA Cycle 18 frontend review.*
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*
*Repo: `D:/photonbounce/enviroswarm`, branch `main`.*
*Date: 2026-07-01 PDT.*
