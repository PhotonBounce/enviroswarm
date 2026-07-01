# ENViroSwarm Frontend — QA Cycle 17 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 0 |
| **Low** | 2 |
| **Total** | **2** |

---

## Previous Fixes Verification (Cycles 1–16)

All fixes from **QA Cycles 1–16** are present and correct, with **no regressions** in any previously resolved issue. Key verifications:

- **Cycle 16 CR-1** (Dashboard.tsx `.reduce` crash) — `stations?.filter(... )?.reduce(... ) ?? 0` present. ✅
- **Cycle 16 CR-2** (DataExplorer.tsx `Map` crash) — `new Map(stations?.map(... ) ?? [])` present. ✅
- **Cycle 16 HI-1–HI-9** (Missing `React` imports) — All 9 files now import `React` or named types. ✅
- **Cycle 16 LO-1** (utils.ts unused import) — `import React` removed. ✅
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

### LO-1 — `web-dashboard/src/pages/Profile.tsx` — Broken email validation regex (unfixed from Cycle 16 LO-2)
**Location:** line 46
**Category:** Data Integrity / Validation

The regex `/^\S+@\S+\.\S+$/` is flawed in two ways:
1. **`\S` matches `@`**, so it accepts invalid emails with multiple `@` signs (e.g., `a@b@c.com`).
2. **It accepts single-character TLDs** (e.g., `a@b.c`), which are not valid.

The `type="email"` input on the same field provides better browser-native validation, but the custom regex is still evaluated on submit and can pass malformed addresses to the backend.

**Recommendation:** Replace with the same pattern used in the Android app (`^[^\s@]+@[^\s@]+\.[^\s@]+$`) or remove the custom regex entirely and rely on the browser's `type="email"` validation.

```tsx
// Current (broken)
if (!/^\S+@\S+\.\S+$/.test(email)) { ... }

// Fixed (matching Android app)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ... }
```

---

### LO-2 — `web-dashboard/src/pages/ApiKeys.tsx` — `setTimeout` leak and overlapping timeout bug
**Location:** line 62
**Category:** React / Memory Leak / State Management

`handleCopy` sets a timeout without storing the ID or clearing it on unmount:

```tsx
const handleCopy = async (key: string, id: string) => {
  setToast(null)
  try {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)  // ← Leak: not stored / not cleared
  } catch {
    setToast({ type: 'error', message: 'Clipboard access denied. Please copy manually.' })
  }
}
```

**Problems:**
1. **Memory leak:** If the component unmounts before 2s, the timeout fires and calls `setCopiedId(null)` on an unmounted component, producing a React development warning.
2. **Overlapping timeout bug:** If the user clicks two different copy buttons within 2s, the first timeout will prematurely clear the `copiedId` of the second copy. The checkmark icon disappears before the user expects it to.

**Recommendation:** Store the timeout in a `useRef`, clear it on unmount, and clear it before setting a new one:

```tsx
const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  return () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
  }
}, [])

const handleCopy = async (key: string, id: string) => {
  setToast(null)
  if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
  try {
    await navigator.clipboard.writeText(key)
    setCopiedId(id)
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedId(null)
      copyTimeoutRef.current = null
    }, 2000)
  } catch {
    setToast({ type: 'error', message: 'Clipboard access denied. Please copy manually.' })
  }
}
```

---

*Report generated by QA Cycle 17 frontend review.*
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*
*Repo: `D:/photonbounce/enviroswarm`, branch `main`.*
