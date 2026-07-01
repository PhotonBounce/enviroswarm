# ENViroSwarm Frontend — QA Cycle 19 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 6 |
| **Total** | **6** |

---

## Previous Fixes Verification (Cycles 1–18)

All fixes from **QA Cycles 1–18** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 18 LO-1** (Dialog.tsx initial focus selector) — `button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])` present on lines 25–27. ✅
- **Cycle 18 LO-2** (Login.tsx & Register.tsx partial auth state) — Both files call `logout()` on `/me` fetch failure to clear the server-side session. ✅
- **Cycle 18 LO-3** (Android types missing `updated_at`) — `updated_at: string` present on both Android `User` (line 44) and `SensorStation` (line 56). ✅
- **Cycle 18 LO-4** (Android `api/client.ts` response interceptor) — `deleteItemAsync` wrapped in `try/catch` on lines 56–59. ✅
- **Cycle 18 LO-5** (Android `useAuth.ts` catch block) — `deleteItemAsync` wrapped in `try/catch` on lines 35–38. ✅
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

### LO-1 — `android-app/src/hooks/useAuth.ts` — `checkAuth` `else` branch does not guard `SecureStore.deleteItemAsync`
**Location:** lines 24–28
**Category:** Error Handling / Reliability

The `else` branch in the `checkAuth` try block unconditionally clears the token on a non-success API response:

```ts
} else {
  await SecureStore.deleteItemAsync('access_token');
  clearCachedToken();
  setUser(null);
  throw new Error(res.data?.error || 'Session validation failed');
}
```

If `SecureStore.deleteItemAsync` throws (e.g., keychain corruption), the `Error` containing the original API failure message is never thrown. Instead, the storage error propagates, leaving the caller with a misleading error. This is the same vulnerability class as Cycle 18 LO-5 (which was fixed in the `catch` block), but it remains unaddressed in the `else` branch.

**Recommendation:** Wrap the deletion in a `try/catch` so the original API error is always preserved, consistent with the fix applied to the `catch` block in Cycle 18.

---

### LO-2 — `android-app/src/api/client.ts` — Request interceptor does not guard `SecureStore.getItemAsync`
**Location:** lines 35–49
**Category:** Error Handling / Resilience

The request interceptor fetches the cached token from SecureStore without error handling:

```ts
if (cachedToken === null) {
  cachedToken = await SecureStore.getItemAsync('access_token');
}
```

If `getItemAsync` throws (storage corruption, device lock, etc.), the interceptor rejects the request with the storage error. No API call can proceed, and the user receives a generic failure rather than being gracefully redirected to the auth flow (which would happen if the request proceeded without a token and received a 401).

**Recommendation:** Wrap `getItemAsync` in a `try/catch`. On failure, set `cachedToken = null` and allow the request to continue without an Authorization header, letting the 401 response interceptor handle the auth state.

---

### LO-3 — `android-app/src/screens/StationsScreen.tsx` — `Number.isFinite` receives `number | null`
**Location:** lines 81–88
**Category:** Type Safety

```ts
const latVal = lat.trim() !== '' ? parseFloat(lat) : null;
const lonVal = lon.trim() !== '' ? parseFloat(lon) : null;
if (lat.trim() === '' || !Number.isFinite(latVal)) {
```

`latVal` and `lonVal` are typed as `number | null`, but `Number.isFinite` expects `number`. TypeScript strict mode would flag this as a type error. While runtime short-circuit evaluation prevents `null` from reaching `Number.isFinite` when `lat.trim() === ''`, the expression is still a type mismatch.

**Recommendation:** Narrow the type before passing to `Number.isFinite`, e.g., `latVal !== null && !Number.isFinite(latVal)`.

---

### LO-4 — `android-app/src/screens/HomeScreen.tsx` — `handleRefresh` causes duplicate `fetchNearby` invocation
**Location:** lines 71–76
**Category:** Performance / API Efficiency

`handleRefresh` calls `getCurrentLocation()`, which updates `latitude` and `longitude` in `useLocation`. This triggers the `useEffect` on lines 59–69, which also calls `fetchNearby`. Additionally, `handleRefresh` calls `fetchNearby` directly. The result is two concurrent network requests for the same coordinates. The `requestIdRef` race guard suppresses the stale response, but the duplicate HTTP request is still dispatched.

**Recommendation:** Remove the direct `fetchNearby` call from `handleRefresh` and rely solely on the `latitude`/`longitude` `useEffect` to trigger the refresh.

---

### LO-5 — `android-app/src/screens/ProfileScreen.tsx` — Unvalidated date formatting
**Location:** line 52
**Category:** Consistency / Data Integrity

```ts
{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
```

If `created_at` is truthy but invalid (e.g., malformed server response), `new Date()` produces an Invalid Date, and `toLocaleDateString()` may return `"Invalid Date"` or throw, depending on the JavaScript engine. This is inconsistent with the web dashboard's `formatDate` utility (which guards with `isNaN(d.getTime())`) and with `SensorCard.tsx` (which also uses the `isNaN` guard).

**Recommendation:** Guard with `isNaN(date.getTime())` before calling `toLocaleDateString()`, consistent with the pattern used elsewhere in the codebase.

---

### LO-6 — `web-dashboard/src/pages/Pricing.tsx` — `<button>` used for `mailto:` navigation
**Location:** line 130
**Category:** Accessibility / Semantic HTML

```tsx
<Button variant="outline" onClick={() => window.location.href = 'mailto:sales@enviroswarm.example.com?subject=Enterprise%20Inquiry'}>Contact Sales</Button>
```

A `<button>` element is used to perform a navigation action to a `mailto:` URL. This is an accessibility anti-pattern: buttons should trigger actions within the current context, while anchor tags should be used for navigation (including external links and mailto). Screen readers and keyboard users expect buttons to submit forms or trigger JS actions, not to navigate.

**Recommendation:** Replace with an `<a>` element (or render the `Button` component as an `a` tag) with `href="mailto:sales@enviroswarm.example.com?subject=Enterprise%20Inquiry"`. If a styled button appearance is required, use an anchor with button-like styling or a `Button` component that supports `asChild` or `as="a"`.

---

*Report generated by QA Cycle 19 frontend review.*
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*
*Repo: `D:/photonbounce/enviroswarm`, branch `main`.*
