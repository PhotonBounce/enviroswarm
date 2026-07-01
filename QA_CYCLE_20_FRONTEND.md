# ENViroSwarm Frontend — QA Cycle 20 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 4 |
| **Total** | **4** |

---

## Previous Fixes Verification (Cycles 1–19)

All fixes from **QA Cycles 1–19** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 19 LO-1** (`useAuth.ts` `else` branch `deleteItemAsync` guard) — `try/catch` present on lines 24–28. ✅
- **Cycle 19 LO-2** (`api/client.ts` request interceptor `getItemAsync` guard) — `try/catch` present on lines 41–46. ✅
- **Cycle 19 LO-3** (`StationsScreen` `Number.isFinite` type safety) — `NaN` fallback used instead of `null` on lines 81–82. ✅
- **Cycle 19 LO-4** (`HomeScreen` duplicate `fetchNearby`) — Direct `fetchNearby` call removed from `handleRefresh` (lines 71–73). ✅
- **Cycle 19 LO-5** (`ProfileScreen` unvalidated date) — `isNaN(d.getTime())` guard present on lines 53–55. ✅
- **Cycle 19 LO-6** (`Pricing.tsx` mailto button) — `<Button asChild><a>` pattern present on lines 130–132. ✅
- **Cycle 18 LO-1** (`Dialog.tsx` initial focus selector) — Disabled elements excluded on lines 25–27. ✅
- **Cycle 18 LO-2** (`Login.tsx` & `Register.tsx` partial auth) — `logout()` called in `/me` catch blocks (Login.tsx:34, Register.tsx:47). ✅
- **Cycle 18 LO-3** (Android types `updated_at`) — Present on Android `User` (line 44) and `SensorStation` (line 56). ✅
- **Cycle 18 LO-4** (`api/client.ts` response interceptor) — `deleteItemAsync` wrapped in `try/catch` on lines 60–64. ✅
- **Cycle 18 LO-5** (`useAuth.ts` catch block) — `deleteItemAsync` wrapped in `try/catch` on lines 39–43. ✅
- **Cycle 17 LO-1** (`Profile.tsx` email regex) — `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` present on line 46. ✅
- **Cycle 17 LO-2** (`ApiKeys.tsx` timeout leak) — `copyTimeoutRef` with cleanup present. ✅
- **Cycle 16 CR-1** (`Dashboard.tsx` `.reduce` crash) — `?.reduce(... ) ?? 0` present on line 36. ✅
- **Cycle 16 CR-2** (`DataExplorer.tsx` `Map` crash) — `new Map(... ?? [])` present on line 111. ✅
- **Cycle 16 HI-1–HI-9** (Missing `React` imports) — All present. ✅
- **Cycle 16 LO-3** (`Stations.tsx` geo range) — `latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180` present on lines 46–48. ✅
- **Cycle 16 LO-4** (`ApiKeys` dismissible dialog) — `newKey` guard on `onOpenChange` and `onPointerDownOutside` present on line 159. ✅
- **Cycle 16 LO-5** (CSV anchor DOM append) — `document.body.appendChild(a)` / `removeChild(a)` present on lines 104–106. ✅
- **Cycle 16 LO-6** (Badge semantic element) — Renders as `<span>`. ✅
- **Cycle 16 LO-7** (`LoginScreen` catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-8** (`RegisterScreen` catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-9** (`DataViewScreen` dead state) — Plain `const sensorType = 'all'` present. ✅
- **Cycle 16 LO-10** (`SubmitReadingScreen` unused import) — `SENSOR_UNITS` removed. ✅
- **Cycle 16 LO-11** (Header inconsistent label) — Mobile nav label `'API Keys'`. ✅
- **Cycle 16 LO-12** (Dialog body scroll lock) — `document.body.style.overflow` present. ✅
- **Cycle 16 LO-13** (Android type-only imports) — `import type { ... }` used for all navigation and local type imports. ✅
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
- **All earlier cycles** (C1–C13) — Verified present and correct. ✅

---

## Issues Found

### LO-1 — `android-app/src/hooks/useAuth.ts` — `logout` does not guard `SecureStore.deleteItemAsync`
**Location:** lines 118–122
**Category:** Error Handling / Reliability

The `logout` function awaits `SecureStore.deleteItemAsync('access_token')` without a `try/catch`. If the deletion throws (e.g., keychain corruption, device lock), `clearCachedToken()` and `setUser(null)` are never reached. The user remains authenticated in React state while the token may still exist in secure storage. This is the same vulnerability class as Cycle 18 LO-4, Cycle 18 LO-5, and Cycle 19 LO-1.

**Recommendation:** Wrap the deletion in a `try/catch` and unconditionally clear the cached token and user state:

```ts
const logout = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('access_token');
  } catch (storeErr) {
    console.error('Failed to clear token from secure store:', storeErr);
  }
  clearCachedToken();
  setUser(null);
};
```

---

### LO-2 — `android-app/src/context/AuthContext.tsx` — `ReactNode` imported as a value instead of a type
**Location:** line 1
**Category:** Type Safety / Best Practice

`ReactNode` is used exclusively as a TypeScript type (`{ children: ReactNode }`) but is imported as a value:

```ts
import React, { createContext, useContext, ReactNode } from 'react';
```

This is inconsistent with the `import type { ... }` pattern adopted elsewhere in the Android codebase (e.g., `import type { User } from '../types'`). Under `verbatimModuleSyntax` or strict TypeScript configurations, value imports of pure types are compilation errors.

**Recommendation:** Separate the type import:

```ts
import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
```

---

### LO-3 — `android-app/src/screens/StationsScreen.tsx` — Missing geographic coordinate range validation
**Location:** lines 81–89
**Category:** Data Integrity / Validation

`createStation` validates that latitude and longitude are finite numbers, but it does not enforce the valid geographic ranges (`-90 ≤ lat ≤ 90`, `-180 ≤ lon ≤ 180`). The web dashboard's `Stations.tsx` (Cycle 16 LO-3 fix) includes this validation. Submitting out-of-range coordinates from the Android app could lead to invalid data being sent to the backend.

**Recommendation:** Add range validation consistent with the web dashboard:

```ts
if (latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 180) {
  Alert.alert('Validation', 'Latitude and longitude must be within valid ranges');
  return;
}
```

---

### LO-4 — `android-app/src/screens/StationsScreen.tsx` — Station name not trimmed before API call
**Location:** lines 92–98
**Category:** Data Integrity / Consistency

The form validation checks `name.trim()` (line 77), but the API payload sends the raw `name` string without trimming:

```ts
const res = await apiClient.post<ApiResponse<SensorStation>>('/stations', {
  name,
  sensor_types: selectedTypes,
  ...
});
```

This is inconsistent with the web dashboard (`Stations.tsx` line 52: `name: name.trim()`), which trims the name before sending. Leading or trailing whitespace could be persisted if the backend does not trim on its own.

**Recommendation:** Trim the name in the API payload:

```ts
const res = await apiClient.post<ApiResponse<SensorStation>>('/stations', {
  name: name.trim(),
  sensor_types: selectedTypes,
  latitude: latVal,
  longitude: lonVal,
});
```

---

*Report generated by QA Cycle 20 frontend review.*
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*
*Repo: `D:/photonbounce/enviroswarm`, branch `main`.*
