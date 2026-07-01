# ENViroSwarm Frontend — QA Cycle 21 Review Report

| Severity | Count |
|----------|-------|
| **Critical** | 0 |
| **High** | 0 |
| **Medium** | 1 |
| **Low** | 0 |
| **Total** | **1** |

---

## Previous Fixes Verification (Cycles 1–20)

All fixes from **QA Cycles 1–20** are **present** in the source code, with **one exception**: the Cycle 19 LO-6 fix is present in source but **does not function correctly** (see ME-1 below). All other fixes were verified as present and correct with no regressions.

Key verifications:

- **Cycle 20 LO-1** (`useAuth.ts` logout `deleteItemAsync` guard) — `try/catch` present on lines 118–126. ✅
- **Cycle 20 LO-2** (`AuthContext.tsx` `ReactNode` type import) — `import type { ReactNode }` present on line 2. ✅
- **Cycle 20 LO-3** (`StationsScreen` geo range validation) — `latVal < -90 || latVal > 90 || lonVal < -180 || lonVal > 180` present on lines 91–94. ✅
- **Cycle 20 LO-4** (`StationsScreen` name trim) — `name: name.trim()` present on line 98. ✅
- **Cycle 19 LO-1** (`useAuth.ts` else branch `deleteItemAsync` guard) — `try/catch` present on lines 24–28. ✅
- **Cycle 19 LO-2** (`api/client.ts` request interceptor `getItemAsync` guard) — `try/catch` present on lines 41–46. ✅
- **Cycle 19 LO-3** (`StationsScreen` `Number.isFinite` type safety) — `NaN` fallback used on lines 81–82. ✅
- **Cycle 19 LO-4** (`HomeScreen` duplicate `fetchNearby`) — Direct `fetchNearby` call removed from `handleRefresh` (lines 71–73). ✅
- **Cycle 19 LO-5** (`ProfileScreen` unvalidated date) — `isNaN(d.getTime())` guard present on lines 53–55. ✅
- **Cycle 19 LO-6** (`Pricing.tsx` mailto button) — `<Button asChild><a>` pattern present on lines 130–132. **❌ BROKEN — see ME-1.**
- **Cycle 18 LO-1** (`Dialog.tsx` initial focus selector) — Disabled elements excluded on lines 25–27. ✅
- **Cycle 18 LO-2** (`Login.tsx` & `Register.tsx` partial auth) — `logout()` called in `/me` catch blocks (Login.tsx:34, Register.tsx:47). ✅
- **Cycle 18 LO-3** (Android types `updated_at`) — Present on Android `User` (line 44) and `SensorStation` (line 56). ✅
- **Cycle 18 LO-4** (`api/client.ts` response interceptor) — `deleteItemAsync` wrapped in `try/catch` on lines 60–64. ✅
- **Cycle 18 LO-5** (`useAuth.ts` catch block) — `deleteItemAsync` wrapped in `try/catch` on lines 39–43. ✅
- **Cycle 17 LO-1** (`Profile.tsx` email regex) — `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` present on line 46. ✅
- **Cycle 17 LO-2** (`ApiKeys.tsx` timeout leak) — `copyTimeoutRef` with cleanup present on lines 26–32. ✅
- **Cycle 16 CR-1** (`Dashboard.tsx` `.reduce` crash) — `?.reduce(... ) ?? 0` present on line 36. ✅
- **Cycle 16 CR-2** (`DataExplorer.tsx` `Map` crash) — `new Map(... ?? [])` present on line 111. ✅
- **Cycle 16 HI-1–HI-9** (Missing `React` imports) — All present. ✅
- **Cycle 16 LO-3** (`Stations.tsx` geo range) — `latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180` present on lines 46–48. ✅
- **Cycle 16 LO-4** (`ApiKeys` dismissible dialog) — `newKey` guard on `onOpenChange` and `onPointerDownOutside` present on line 159. ✅
- **Cycle 16 LO-5** (CSV anchor DOM append) — `document.body.appendChild(a)` / `removeChild(a)` present on lines 104–106. ✅
- **Cycle 16 LO-6** (Badge semantic element) — Renders as `<span>`. ✅
- **Cycle 16 LO-7** (`LoginScreen` catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-8** (`RegisterScreen` catch `any`) — `catch (err: unknown)` present. ✅
- **Cycle 16 LO-9** (`DataViewScreen` dead state) — Plain `const sensorType = 'all'` present on line 42. ✅
- **Cycle 16 LO-10** (`SubmitReadingScreen` unused import) — `SENSOR_UNITS` removed from screen file. ✅
- **Cycle 16 LO-11** (Header inconsistent label) — Mobile nav label `'API Keys'`. ✅
- **Cycle 16 LO-12** (Dialog body scroll lock) — `document.body.style.overflow` present on lines 41–48. ✅
- **Cycle 16 LO-13** (Android type-only imports) — `import type { ... }` used for all navigation and local type imports. ✅
- **Cycle 15 M1** (Dashboard `now` stale memo) — `now` depends on `refreshKey`. ✅
- **Cycle 15 M2** (Header profile aria-label) — `aria-label="Profile"` present on line 129. ✅
- **Cycle 15 L1** (SensorChart non-finite guard) — `if (!Number.isFinite(r.value)) continue` present on line 39. ✅
- **Cycle 15 L2** (CSV UTF-8 BOM) — `\uFEFF` prefix present on line 98. ✅
- **Cycle 14 M1** (DataViewScreen label-data alignment) — `validItems` used for both arrays. ✅
- **Cycle 14 M2** (Dialog conditional rendering) — Dialog rendered unconditionally (no `&&` guard). ✅
- **Cycle 14 L1** (SensorChart dead code) — `ChartComponent` used, no dead `DataComponent`. ✅
- **Cycle 14 L2** (Dashboard `today` stale) — `today` depends on `refreshKey`. ✅
- **Cycle 14 L3** (CSV non-finite consistency) — `Number.isFinite` guard in CSV export on line 89. ✅
- **Cycle 14 L4** (Form label associations) — `htmlFor`/`id` pairs present in all forms. ✅
- **Cycle 14 L5** (Android catch `any`) — `catch (err: unknown)` in all screen files. ✅
- **All earlier cycles** (C1–C13) — Verified present and correct. ✅

---

## Issues Found

### ME-1 — `Pricing.tsx` `<Button asChild><a>` pattern is broken because `Button.tsx` does not support `asChild`
**Location:** `web-dashboard/src/pages/Pricing.tsx` lines 130–132; `web-dashboard/src/components/ui/Button.tsx`  
**Category:** Accessibility / HTML Semantics / Broken Previous Fix  
**Severity:** Medium

The Cycle 19 LO-6 fix introduced the pattern `<Button asChild><a href="mailto:...">Contact Sales</a></Button>` in `Pricing.tsx`. However, the `Button` component does **not** implement an `asChild` prop:

```tsx
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button type={type} className={cn(...)} ref={ref} {...props} />
    )
  }
)
```

Because `asChild` is not destructured or handled, it is passed through `{...props}` to the underlying `<button>` element. The resulting DOM is:

```html
<button type="button" class="..." aschild="true">
  <a href="mailto:sales@enviroswarm.example.com?subject=Enterprise%20Inquiry">Contact Sales</a>
</button>
```

This violates the HTML5 content model: a `<button>` cannot contain interactive content (including `<a>`). Consequences:

1. **Invalid HTML** — `<button>` containing `<a>` is not valid per the HTML5 spec.
2. **Accessibility** — Screen readers may misidentify the element (announced as a button rather than a link), and keyboard interaction may be unpredictable (Enter/Space on the button may not trigger the link navigation in all assistive technologies).
3. **Click behavior** — Clicking the button padding (outside the `<a>` text) may not trigger the mailto navigation, depending on the browser.

**Recommendation:** Implement `asChild` polymorphism in `Button.tsx` (e.g., using `React.cloneElement` or a Radix-style `Slot` pattern), or replace the markup with a styled `<a>` element that uses the button's Tailwind classes directly:

```tsx
<a
  href="mailto:sales@enviroswarm.example.com?subject=Enterprise%20Inquiry"
  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
>
  Contact Sales
</a>
```

---

*Report generated by QA Cycle 21 frontend review.*  
*Scope: `web-dashboard/src/` and `android-app/src/` (all TS/TSX files).*  
*Repo: `D:/photonbounce/enviroswarm`, branch `main`.*
