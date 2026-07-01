# ENViroSwarm Frontend — QA Cycle 16 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 2 |
| **High** | 9 |
| **Medium** | 0 |
| **Low** | 13 |
| **Total** | **24** |

---

## Critical Issues

### CR-1: `web-dashboard/src/pages/Dashboard.tsx` — Runtime crash when `stations` is `undefined`
**Location:** line 36  
**Description:** `activeSensorCount` computes `stations?.filter(...).reduce(...)`. On initial load, `stations` is `undefined`, so `stations?.filter(...)` returns `undefined`. The subsequent `.reduce(...)` call immediately throws a `TypeError` because `undefined` does not have a `reduce` method. The trailing `?? 0` fallback is never reached because the exception is thrown before the nullish-coalescing operator is evaluated.

**Recommendation:** Add optional chaining before `.reduce` or wrap with an explicit fallback:
```tsx
const activeSensorCount = stations?.filter(s => s.status === 'active')?.reduce((acc, s) => acc + s.sensor_types.length, 0) ?? 0
```

### CR-2: `web-dashboard/src/pages/DataExplorer.tsx` — Runtime crash when `stations` is `undefined`
**Location:** line 109  
**Description:** `stationNameMap` is constructed with `new Map(stations?.map(...))`. On initial load, `stations` is `undefined`, so `stations?.map(...)` returns `undefined`. The `Map` constructor requires an iterable, so `new Map(undefined)` throws a `TypeError`.

**Recommendation:** Provide a fallback empty array:
```tsx
const stationNameMap = new Map(stations?.map((s) => [s.id, s.name]) ?? [])
```

---

## High Issues

### HI-1: `web-dashboard/src/pages/Register.tsx` — Missing `React` import for type references
**Locations:** lines 18, 74, 90, 106  
**Description:** The file uses `React.FormEvent` and `React.ChangeEvent<HTMLInputElement>` but only imports `useState` from `react`. Under standard TypeScript configurations (including the Vite React template), this produces a compilation error because the `React` namespace is not in scope.

**Recommendation:** Either add `import React from 'react'` or import the named types directly (`import { useState, FormEvent, ChangeEvent } from 'react'`).

### HI-2: `web-dashboard/src/pages/Login.tsx` — Missing `React` import for type references
**Locations:** lines 17, 61, 77  
**Description:** Same as HI-1 — uses `React.FormEvent` and `React.ChangeEvent<HTMLInputElement>` without importing the `React` namespace.

### HI-3: `web-dashboard/src/pages/DataExplorer.tsx` — Missing `React` import for type references
**Locations:** lines 127, 136, 145, 149, 164  
**Description:** Uses `React.ChangeEvent<HTMLSelectElement>` and `React.ChangeEvent<HTMLInputElement>` with only `useState` imported from `react`.

### HI-4: `web-dashboard/src/pages/Profile.tsx` — Missing `React` import for type references
**Locations:** lines 42, 116  
**Description:** Uses `React.FormEvent` and `React.ChangeEvent<HTMLInputElement>` with only `useState`, `useEffect`, and `useRef` imported from `react`.

### HI-5: `web-dashboard/src/pages/Stations.tsx` — Missing `React` import for type references
**Locations:** lines 33, 130, 135, 139  
**Description:** Uses `React.FormEvent` and `React.ChangeEvent<HTMLInputElement>` with only `useState` imported from `react`.

### HI-6: `web-dashboard/src/pages/ApiKeys.tsx` — Missing `React` import for type references
**Locations:** lines 29, 181  
**Description:** Uses `React.FormEvent` and `React.ChangeEvent<HTMLInputElement>` with only `useState` imported from `react`.

### HI-7: `web-dashboard/src/context/AuthContext.tsx` — Missing `React` import for type references
**Location:** line 26  
**Description:** Uses `React.FC` and `React.ReactNode` but only imports named hooks (`createContext`, `useState`, `useCallback`, `useEffect`) from `react`.

### HI-8: `web-dashboard/src/components/ui/Dialog.tsx` — Missing `React` import for type references
**Locations:** lines 10, 39, 92, 100, 109, 118  
**Description:** Uses `React.ReactNode`, `React.HTMLAttributes`, and `React.KeyboardEvent` but only imports named hooks (`useEffect`, `useRef`, `useCallback`, `useId`, `createContext`, `useContext`) from `react`.

### HI-9: `web-dashboard/src/components/ui/Badge.tsx` — Missing `React` import for type references
**Location:** line 3  
**Description:** Uses `React.HTMLAttributes<HTMLDivElement>` but does not import `React` at all.

---

## Low Issues

### LO-1: `web-dashboard/src/lib/utils.ts` — Unused import
**Location:** line 1  
**Description:** `import React from 'react'` is present but `React` is never referenced in the file. This is dead code and can bloat the bundle if the bundler does not tree-shake it aggressively.

### LO-2: `web-dashboard/src/pages/Profile.tsx` — Weak email validation regex
**Location:** line 46  
**Description:** The regex `/^\S+@\S+\.\S+$/` is overly permissive and accepts invalid addresses such as `a@b.c` (no valid TLD). Client-side validation should be stricter or delegated to the backend.

### LO-3: `web-dashboard/src/pages/Stations.tsx` — Missing geographic range validation
**Location:** lines 40–45  
**Description:** `latitude` and `longitude` are only validated with `parseFloat` + `isNaN`. Out-of-range values (e.g., `999`) are accepted. Should validate `-90 ≤ lat ≤ 90` and `-180 ≤ lon ≤ 180`.

### LO-4: `web-dashboard/src/pages/ApiKeys.tsx` — Dismissible dialog while one-time raw key is displayed
**Location:** line 152  
**Description:** The API key creation dialog can be closed via backdrop click or the Escape key while the one-time raw key is visible. If the user accidentally dismisses the dialog, the key is lost forever. The dialog should be non-dismissible when `newKey` is present.

### LO-5: `web-dashboard/src/pages/DataExplorer.tsx` — CSV export anchor not appended to DOM
**Location:** line 103  
**Description:** The dynamically created `<a>` element is never appended to `document.body` (or removed after clicking). In some strict browser environments or CSP configurations, this can prevent the download from triggering.

### LO-6: `web-dashboard/src/components/ui/Badge.tsx` — Semantic element choice
**Location:** line 8  
**Description:** The component renders as a `<div>`. Because badges are typically inline text tokens inside paragraphs or headings, a `<span>` is more semantically correct and avoids invalid HTML nesting.

### LO-7: `android-app/src/screens/LoginScreen.tsx` — `any` typed catch clause
**Location:** line 40  
**Description:** Uses `err: any` instead of `err: unknown`, weakening type safety and bypassing the strict-error handling already adopted elsewhere in the codebase.

### LO-8: `android-app/src/screens/RegisterScreen.tsx` — `any` typed catch clause
**Location:** line 56  
**Description:** Same as LO-7.

### LO-9: `android-app/src/screens/DataViewScreen.tsx` — Dead state
**Location:** line 41  
**Description:** `sensorType` is declared via `useState<SensorType | 'all'>('all')` but the setter is never invoked and the value never changes. This is dead code and should be a plain `const` or removed entirely.

### LO-10: `android-app/src/screens/SubmitReadingScreen.tsx` — Unused import
**Location:** line 14  
**Description:** `SENSOR_UNITS` is imported from `../types` but never referenced in the file. It is only used by the child component `ReadingForm`.

### LO-11: `web-dashboard/src/components/layout/Header.tsx` — Inconsistent navigation label
**Location:** line 11  
**Description:** The mobile nav label is `'Keys'` while the desktop Sidebar label is `'API Keys'`. Navigation labels should be consistent across viewports to avoid user confusion.

### LO-12: `web-dashboard/src/components/ui/Dialog.tsx` — Missing body scroll lock
**Description:** When the dialog is open, the underlying page body remains scrollable. Best practice is to lock body scroll (e.g., set `overflow: hidden` on `<body>`) while a modal is active.

### LO-13: Android type-only imports used as value imports
**Files:** `DataViewScreen.tsx`, `StationsScreen.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `HomeScreen.tsx`, `StationMarker.tsx`, `AuthContext.tsx`, `useAuth.ts`  
**Description:** Several imports from `@react-navigation/native-stack`, `@react-navigation/native`, and `../types` are used exclusively as TypeScript types but are imported as value imports. Best practice is to use `import type { ... }` to clarify intent, improve tree-shaking, and avoid potential issues with `isolatedModules`.

---

## Previous Fix Verification

The following QA Cycle 1–15 fixes were inspected and verified as present and correct:

| Fix | File(s) | Status |
|-----|---------|--------|
| **SensorChart timestamp collision** — Full ISO timestamp used as Map key to prevent same-minute collisions. | `SensorChart.tsx` | ✅ Verified |
| **Android 401 handling** — Token is preserved on 403/500/network errors; only cleared on 401. | `api/client.ts`, `hooks/useAuth.ts` | ✅ Verified |
| **Web httpOnly cookie auth** — No manual token handling; `withCredentials: true` used. | `api.ts`, `AuthContext.tsx` | ✅ Verified |
| **Error boundary** — Class-based boundary with graceful fallback UI and reload button. | `main.tsx` | ✅ Verified |
| **Focus management** — Dialog focus trap, return focus, mobile menu focus trap, and click-outside handlers. | `Dialog.tsx`, `Header.tsx` | ✅ Verified |
| **CSV export safety** — BOM prefix and proper CSV escaping (quotes, commas, newlines). | `DataExplorer.tsx` | ✅ Verified |
| **Request-id race condition** — `requestIdRef` used to discard stale `fetchNearby` responses. | `HomeScreen.tsx` | ✅ Verified |
| **Profile save timeout cleanup** — `saveTimeoutRef` is cleared on unmount to prevent memory leaks. | `Profile.tsx` | ✅ Verified |

No regressions were detected in any previously fixed code paths.

---

*Report generated by QA Cycle 16 frontend review.*
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*
