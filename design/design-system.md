# ENViroSwarm Design System

> Version: 1.0.0 | Target: Web Dashboard (React + Tailwind) + Android App (React Native / Expo) | Theme: Dark-first, emerald-accented environmental data platform

---

## 1. Color Palette

### 1.1 Base / Surface Colors (Dark Theme)

All surfaces are derived from a deep slate-near-black foundation. The palette is designed for prolonged data-analysis sessions with minimal eye strain.

| Token Name | Hex Code | RGB | Usage |
|---|---|---|---|
| `--bg-base` | `#0B0F19` | `rgb(11, 15, 25)` | Absolute page background (root `<html>` / `<body>`) |
| `--bg-surface` | `#111827` | `rgb(17, 24, 39)` | Primary card / panel / modal background |
| `--bg-surface-elevated` | `#1A2235` | `rgb(26, 34, 53)` | Hover-elevated cards, dropdown menus, tooltips |
| `--bg-surface-raised` | `#232D45` | `rgb(35, 45, 69)` | Active / selected state, inline input backgrounds |
| `--bg-inset` | `#070A10` | `rgb(7, 10, 16)` | Deep inset areas: code blocks, terminal-like panels, chart inner backgrounds |
| `--border-default` | `#1E293B` | `rgb(30, 41, 59)` | Default dividers, card borders, table row separators |
| `--border-strong` | `#334155` | `rgb(51, 65, 85)` | Focused / hovered borders, active tab underlines |
| `--border-subtle` | `#0F172A` | `rgb(15, 23, 42)` | Subtle 1px hairline borders between similar surfaces |

### 1.2 Primary Brand (Emerald / Environmental Green)

| Token Name | Hex Code | RGB | Usage |
|---|---|---|---|
| `--primary-50` | `#ECFDF5` | `rgb(236, 253, 245)` | — (reserved for light mode) |
| `--primary-100` | `#D1FAE5` | `rgb(209, 250, 229)` | Light tint backgrounds, badges, success indicators on dark |
| `--primary-200` | `#A7F3D0` | `rgb(167, 243, 208)` | Hover states, ghost button fills |
| `--primary-300` | `#6EE7B7` | `rgb(110, 231, 183)` | Secondary accent, active toggles |
| `--primary-400` | `#34D399` | `rgb(52, 211, 153)` | Hover primary buttons, link hovers |
| `--primary-500` | `#10B981` | `rgb(16, 185, 129)` | **Primary action**: buttons, active nav items, progress bars, key highlights |
| `--primary-600` | `#059669` | `rgb(5, 150, 105)` | Primary button pressed / active state |
| `--primary-700` | `#047857` | `rgb(4, 120, 87)` | Primary button shadow, deep emphasis |
| `--primary-800` | `#065F46` | `rgb(6, 95, 70)` | Dark mode icon fills |
| `--primary-900` | `#064E3B` | `rgb(6, 78, 59)` | Deep tonal backgrounds |

### 1.3 Semantic Colors

| Token Name | Hex Code | RGB | Usage | Contrast on Dark? |
|---|---|---|---|---|
| `--danger-400` | `#F87171` | `rgb(248, 113, 113)` | Danger hover, light icon | ✅ AAA |
| `--danger-500` | `#EF4444` | `rgb(239, 68, 68)` | **Danger**: delete buttons, errors, offline status, critical alerts | ✅ AA |
| `--danger-600` | `#DC2626` | `rgb(220, 38, 38)` | Danger pressed / active | — |
| `--danger-50` | `#FEF2F2` | `rgb(254, 242, 242)` | Danger background tint | — |
| `--warning-400` | `#FBBF24` | `rgb(251, 191, 36)` | Warning hover | ✅ AAA |
| `--warning-500` | `#F59E0B` | `rgb(245, 158, 11)` | **Warning**: degraded data, unverified stations, moderate alerts | ✅ AA |
| `--warning-600` | `#D97706` | `rgb(217, 119, 6)` | Warning pressed | — |
| `--warning-50` | `#FFFBEB` | `rgb(255, 251, 235)` | Warning background tint | — |
| `--success-400` | `#34D399` | `rgb(52, 211, 153)` | Success hover | ✅ AAA |
| `--success-500` | `#10B981` | `rgb(16, 185, 129)` | **Success**: online status, verified stations, submission confirmation | ✅ AA |
| `--success-600` | `#059669` | `rgb(5, 150, 105)` | Success pressed | — |
| `--info-400` | `#60A5FA` | `rgb(96, 165, 250)` | Info hover | ✅ AAA |
| `--info-500` | `#3B82F6` | `rgb(59, 130, 246)` | **Info**: tips, API docs links, neutral alerts, map markers | ✅ AA |
| `--info-600` | `#2563EB` | `rgb(37, 99, 235)` | Info pressed | — |
| `--info-50` | `#EFF6FF` | `rgb(239, 246, 255)` | Info background tint | — |

### 1.4 Text Colors (Dark Theme)

| Token Name | Hex Code | RGB | Usage | WCAG on `#0B0F19`? |
|---|---|---|---|---|
| `--text-primary` | `#F8FAFC` | `rgb(248, 250, 252)` | Headings, primary body, active nav | ✅ AAA (18.2:1) |
| `--text-secondary` | `#94A3B8` | `rgb(148, 163, 184)` | Secondary body, labels, inactive nav, placeholders | ✅ AA (7.2:1) |
| `--text-muted` | `#64748B` | `rgb(100, 116, 139)` | Timestamps, metadata, disabled text, footnotes | ✅ AA (4.6:1) |
| `--text-disabled` | `#475569` | `rgb(71, 85, 105)` | Explicitly disabled controls | ⚠️ 2.8:1 (non-text OK) |
| `--text-inverse` | `#0B0F19` | `rgb(11, 15, 25)` | Text on primary / semantic buttons, light badges | — |
| `--text-link` | `#34D399` | `rgb(52, 211, 153)` | Inline links, external references | ✅ AA (11.4:1) |
| `--text-link-hover` | `#6EE7B7` | `rgb(110, 231, 183)` | Link hover state | ✅ AAA |

### 1.5 Chart / Data Visualization Colors (10 Sensor Types)

Each sensor type has a dedicated chart color that is used consistently across line charts, bar charts, map markers, and legend badges. Colors are chosen to be maximally distinguishable on dark backgrounds and accessible to color-blind users (avoiding red-green confusion pairs where possible).

| Sensor Type | Token Name | Hex Code | Gradient (for range bars) | Notes |
|---|---|---|---|---|
| `temperature` | `--chart-temp` | `#F97316` | `#FDBA74` → `#EA580C` | Warm orange, intuitive for heat |
| `humidity` | `--chart-humidity` | `#06B6D4` | `#67E8F9` → `#0891B2` | Cyan/teal for water vapor |
| `air_quality` | `--chart-aq` | `#8B5CF6` | `#C4B5FD` → `#7C3AED` | Purple for composite index |
| `noise_level` | `--chart-noise` | `#F59E0B` | `#FCD34D` → `#D97706` | Amber, distinct from temp orange |
| `radiation` | `--chart-radiation` | `#EF4444` | `#FCA5A5` → `#DC2626` | Red for danger, safety association |
| `water_quality` | `--chart-water` | `#0EA5E9` | `#7DD3FC` → `#0284C7` | Blue, aquatic association |
| `co2` | `--chart-co2` | `#78716C` | `#A8A29E` → `#57534E` | Stone grey for invisible gas |
| `pm25` | `--chart-pm25` | `#F43F5E` | `#FDA4AF` → `#E11D48` | Rose pink for particulate matter |
| `pm10` | `--chart-pm10` | `#EC4899` | `#F9A8D4` → `#DB2777` | Magenta for larger particles |
| `voc` | `--chart-voc` | `#84CC16` | `#BEF264` → `#65A30D` | Lime green for organic compounds |

**Color-blind safety check**: The palette uses distinct hue families (orange, cyan, purple, amber, red, blue, grey, rose, magenta, lime) that remain distinguishable in deuteranopia and protanopia simulations. Avoid pairing `--chart-temp` + `--chart-radiation` in the same chart without additional shape/line-pattern differentiation.

### 1.6 Tier / Plan Colors

| Tier | Token | Hex | Usage |
|---|---|---|---|
| Free | `--tier-free` | `#94A3B8` | Grey, neutral |
| Pro | `--tier-pro` | `#10B981` | Emerald, primary brand |
| Enterprise | `--tier-enterprise` | `#8B5CF6` | Purple, premium feel |

---

## 2. Typography

### 2.1 Font Stacks

**Web Dashboard:**
```css
--font-sans: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;
--font-display: 'Inter', 'SF Pro Display', sans-serif; /* Headings use tighter tracking */
```

**Android App (React Native):**
```javascript
const fontFamily = {
  sans: 'Inter-Regular',          // Or system default: 'Roboto' on Android
  sansBold: 'Inter-Bold',
  sansSemiBold: 'Inter-SemiBold',
  sansMedium: 'Inter-Medium',
  mono: 'JetBrainsMono-Regular', // Fallback: 'monospace'
  monoBold: 'JetBrainsMono-Bold',
};
```
*Note: Bundle `Inter` via `expo-font` for cross-device consistency. JetBrains Mono for data/code blocks only.*

### 2.2 Type Scale (Web)

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display-xl` | 48px | 56px | 800 | -0.02em | Hero headlines, empty-state titles |
| `display-lg` | 36px | 44px | 700 | -0.02em | Page titles (H1) |
| `display-md` | 30px | 38px | 700 | -0.01em | Section headers (H2) |
| `display-sm` | 24px | 32px | 600 | -0.01em | Card titles, modal headers (H3) |
| `display-xs` | 20px | 28px | 600 | -0.005em | Subsection headers (H4) |
| `text-xl` | 18px | 28px | 400 | 0 | Lead paragraphs, large body |
| `text-lg` | 16px | 24px | 400 | 0 | Default body text |
| `text-base` | 14px | 22px | 400 | 0 | Secondary body, descriptions, table cells |
| `text-sm` | 13px | 20px | 400 | 0 | Captions, metadata, timestamps, labels |
| `text-xs` | 12px | 16px | 400 | 0.01em | Badges, tags, fine print, axis labels |
| `text-2xs` | 10px | 14px | 500 | 0.02em | Chart tick labels, minimap text |

### 2.3 Type Scale (Android — dp units)

| Token | Size (dp) | Line Height (dp) | Weight | Usage |
|---|---|---|---|---|
| `display-xl` | 40 | 48 | 800 | Empty state, welcome screen |
| `display-lg` | 32 | 40 | 700 | Screen titles (top app bar) |
| `display-md` | 26 | 34 | 700 | Section headers |
| `display-sm` | 22 | 28 | 600 | Card titles |
| `display-xs` | 18 | 26 | 600 | Bottom sheet headers |
| `text-xl` | 16 | 24 | 400 | Lead body, form labels |
| `text-lg` | 14 | 22 | 400 | Default body |
| `text-base` | 13 | 20 | 400 | Secondary body, list items |
| `text-sm` | 12 | 18 | 400 | Captions, timestamps |
| `text-xs` | 11 | 16 | 500 | Badges, tags |
| `text-2xs` | 10 | 14 | 500 | Chart tick labels |

### 2.4 Font Weights

| Weight | Name | Usage |
|---|---|---|
| 400 | Regular | Body text, descriptions, table content |
| 500 | Medium | Button labels, nav items, input labels |
| 600 | SemiBold | Card titles, section headers, active tab |
| 700 | Bold | Page titles, data values, highlighted metrics |
| 800 | ExtraBold | Hero text, large KPI numbers, empty states |

---

## 3. Spacing Scale

Based on a **4px grid system**. All spacing tokens must resolve to multiples of 4px. This applies to padding, margin, gap, border-radius, and icon size.

| Token | Value | Usage |
|---|---|---|
| `space-0` | 0px | Collapse, no gap |
| `space-px` | 1px | Hairline borders, separator lines |
| `space-0.5` | 2px | Tight inline icon-to-text spacing |
| `space-1` | 4px | Minimum touch padding, icon-text gap |
| `space-1.5` | 6px | Tight button padding (icon-only), label gap |
| `space-2` | 8px | Inline form controls, tight row gap, chip padding |
| `space-2.5` | 10px | Small card internal padding |
| `space-3` | 12px | Mobile card padding, mobile button padding |
| `space-3.5` | 14px | Mobile form row gap |
| `space-4` | 16px | Standard card padding, standard button padding (web) |
| `space-5` | 20px | Mobile screen horizontal padding (edge safe area) |
| `space-6` | 24px | Section gap, modal padding, desktop card padding |
| `space-8` | 32px | Large section gap, dashboard grid gap |
| `space-10` | 40px | Page-level vertical padding |
| `space-12` | 48px | Section break, empty state padding |
| `space-16` | 64px | Hero spacing, large modal padding |
| `space-20` | 80px | Page header margin |
| `space-24` | 96px | Maximum layout spacing |

### 3.1 Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | Tables, data grids, full-width elements |
| `radius-sm` | 4px | Buttons, small badges, tags |
| `radius-md` | 8px | Cards, inputs, modals, dropdowns |
| `radius-lg` | 12px | Large cards, floating panels, bottom sheets |
| `radius-xl` | 16px | Hero cards, feature callouts, dialogs (mobile) |
| `radius-2xl` | 24px | Mobile bottom sheets, prominent modals |
| `radius-full` | 9999px | Pills, avatars, circular buttons, progress bars |

---

## 4. Component Specifications

### 4.1 Button Variants

All buttons use `border-radius: radius-md` (8px) on web, `radius-lg` (12dp) on mobile for thumb-friendly targets.

#### Primary Button
```
Background: --primary-500
Text: --text-inverse (weight 500, 14px web / 14dp mobile)
Padding: space-2.5 space-4 (10px 16px) web | space-3 space-5 (12dp 20dp) mobile
Height: 40px web | 48dp mobile (minimum touch target)
Border: none
Shadow: 0 1px 2px rgba(0,0,0,0.3), 0 0 0 0 transparent
Hover: background --primary-400, translateY(-1px), shadow 0 4px 12px rgba(16,185,129,0.25)
Active: background --primary-600, translateY(0), shadow 0 1px 2px rgba(0,0,0,0.3)
Disabled: background --bg-surface-raised, text --text-disabled, opacity 0.6, cursor not-allowed
Focus: outline 2px solid --primary-400, outline-offset 2px
Loading: spinner 16px replacing left icon, text dims to 0.6 opacity
```

#### Secondary Button (Outline)
```
Background: transparent
Border: 1px solid --border-strong
Text: --text-primary (weight 500)
Padding: same as primary
Hover: background --bg-surface-elevated, border --primary-400, text --primary-400
Active: background --bg-surface-raised
Focus: outline 2px solid --primary-400, outline-offset 2px
```

#### Ghost Button
```
Background: transparent
Text: --text-secondary
Padding: space-2 space-3 (8px 12px) — tighter
Hover: background --bg-surface-elevated, text --text-primary
Active: background --bg-surface-raised
```

#### Danger Button
```
Background: --danger-500
Text: --text-inverse
Hover: background --danger-400, shadow 0 4px 12px rgba(239,68,68,0.25)
Active: background --danger-600
Focus: outline 2px solid --danger-400, outline-offset 2px
```

#### Icon Button
```
Size: 40px x 40px web | 48dp x 48dp mobile
Background: transparent
Icon: 20px / 24dp, color --text-secondary
Hover: background --bg-surface-elevated, color --text-primary
Active: background --bg-surface-raised, color --text-primary
Border-radius: radius-md (8px) / radius-lg (12dp) mobile
```

### 4.2 Card Styles

#### Data Card (Dashboard KPI)
```
Background: --bg-surface
Border: 1px solid --border-default
Border-radius: radius-md (8px)
Padding: space-6 (24px) web | space-4 (16dp) mobile
Shadow: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)
Hover (if interactive): border --border-strong, shadow 0 4px 12px rgba(0,0,0,0.3), translateY(-2px)
Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
```

#### Chart Card
```
Background: --bg-surface
Border: 1px solid --border-default
Border-radius: radius-md (8px)
Padding: space-6 (24px) web | space-4 (16dp) mobile
Header: flex row, space-between, title (display-sm) + actions (icon buttons)
Body: min-height 280px web | 240dp mobile
Footer: optional legend row, text-sm, --text-muted
```

#### List Item Card (Mobile)
```
Background: --bg-surface
Border: 1px solid --border-default
Border-radius: radius-lg (12dp)
Padding: space-4 (16dp) vertical, space-5 (20dp) horizontal
Left: Icon (40dp circle, colored by sensor type) + Title/Subtitle
Right: Chevron or action button
Touch target: full card, min 48dp height for nested actions
Active state: background --bg-surface-elevated
```

### 4.3 Input States

#### Text Input (Web)
```
Background: --bg-inset
Border: 1px solid --border-default
Border-radius: radius-md (8px)
Height: 40px (single line) | auto (multi-line, min 80px)
Padding: space-2.5 space-4 (10px 16px)
Text: --text-primary, text-base (14px)
Placeholder: --text-muted

Hover: border --border-strong
Focus: border --primary-500, box-shadow 0 0 0 3px rgba(16,185,129,0.15), outline none
Error: border --danger-500, box-shadow 0 0 0 3px rgba(239,68,68,0.15)
Disabled: background --bg-surface, text --text-disabled, border --border-default

Label: text-sm, --text-secondary, margin-bottom space-1.5 (6px)
Error message: text-xs, --danger-400, margin-top space-1.5
Help text: text-xs, --text-muted, margin-top space-1.5
```

#### Text Input (Mobile)
```
Background: --bg-inset
Border: 1px solid --border-default
Border-radius: radius-lg (12dp)
Height: 56dp (minimum thumb-friendly)
Padding: space-4 (16dp) horizontal, space-3 (12dp) vertical
Font: text-lg (14dp), --font-sans

States: same as web but with 4dp border-width for focus/error
Keyboard handling: adjustResize on Android, avoid keyboard covering submit button
Clear button: 24dp X icon inside right padding when text present
```

#### Select / Dropdown
```
Trigger: same as input
Dropdown panel: background --bg-surface-elevated, border 1px solid --border-strong, border-radius radius-lg (12px), shadow 0 10px 40px rgba(0,0,0,0.4)
Item: padding space-3 space-4, text --text-primary, hover background --bg-surface-raised
Selected item: background rgba(16,185,129,0.1), text --primary-400, left border 3px solid --primary-500
```

### 4.4 Table Styling

```
Container: background --bg-surface, border 1px solid --border-default, border-radius radius-md (8px), overflow hidden
Header row: background --bg-inset, text text-sm, --text-secondary, font-weight 600, text-transform uppercase, letter-spacing 0.05em
Header cell: padding space-3 space-4 (12px 16px), border-bottom 1px solid --border-default
Data row: background --bg-surface, border-bottom 1px solid --border-default
Data cell: padding space-3 space-4, text text-base, --text-primary
Hover row: background --bg-surface-elevated
Selected row: background rgba(16,185,129,0.08), border-left 3px solid --primary-500
Empty state: centered in container, icon 48px --text-muted, text "No data available", --text-secondary, padding space-12
Pagination: bottom of table, flex row, gap space-2, page buttons 32px square, active page --primary-500 background
```

### 4.5 Chart Theming (Recharts / Any Chart Library)

```
Chart background: transparent (card provides --bg-surface)
Grid lines: stroke --border-default, strokeDasharray "3 3", strokeWidth 1
Axis lines: stroke --border-strong, strokeWidth 1
Tick labels: fill --text-muted, font-size 12px (text-xs), font-family --font-sans
Tooltip: background --bg-surface-elevated, border 1px solid --border-strong, border-radius radius-md (8px), padding space-3 space-4, shadow 0 8px 24px rgba(0,0,0,0.4)
Tooltip title: text-sm, --text-primary, font-weight 600
Tooltip value: text-base, --text-primary
Tooltip label: text-xs, --text-muted
Legend: bottom or right, text-sm, --text-secondary, icon 12px square
Reference lines: stroke --text-muted, strokeDasharray "5 5", label fill --text-muted
Brush (zoom): fill rgba(16,185,129,0.15), stroke --primary-500, height 24px
```

---

## 5. Iconography

**Icon Library**: [Lucide](https://lucide.dev/) (lucide-react for web, lucide-react-native for mobile)

**Default icon sizing:**
- Web UI chrome: 20px
- Mobile UI chrome: 24dp
- Inline with text: 16px / 16dp
- Large feature icons: 40px / 40dp
- Empty state icons: 64px / 64dp

### 5.1 Sensor Type Icon Mapping

| Sensor Type | Lucide Icon | Icon Name | Color Token | Size (inline) | Mobile Touch |
|---|---|---|---|---|---|
| `temperature` | `Thermometer` | `thermometer` | `--chart-temp` | 16px / 16dp | 40dp circle bg |
| `humidity` | `Droplets` | `droplets` | `--chart-humidity` | 16px / 16dp | 40dp circle bg |
| `air_quality` | `Wind` | `wind` | `--chart-aq` | 16px / 16dp | 40dp circle bg |
| `noise_level` | `Volume2` | `volume-2` | `--chart-noise` | 16px / 16dp | 40dp circle bg |
| `radiation` | `AlertTriangle` | `alert-triangle` | `--chart-radiation` | 16px / 16dp | 40dp circle bg |
| `water_quality` | `Waves` | `waves` | `--chart-water` | 16px / 16dp | 40dp circle bg |
| `co2` | `Cloud` | `cloud` | `--chart-co2` | 16px / 16dp | 40dp circle bg |
| `pm25` | `Factory` | `factory` | `--chart-pm25` | 16px / 16dp | 40dp circle bg |
| `pm10` | `CircleDot` | `circle-dot` | `--chart-pm10` | 16px / 16dp | 40dp circle bg |
| `voc` | `FlaskConical` | `flask-conical` | `--chart-voc` | 16px / 16dp | 40dp circle bg |

### 5.2 Navigation / UI Icon Mapping

| UI Element | Lucide Icon | Name | Notes |
|---|---|---|---|
| Home / Dashboard | `LayoutDashboard` | `layout-dashboard` | — |
| Map | `Map` | `map` | — |
| Stations | `Radio` | `radio` | Signal tower metaphor |
| Submit Data | `PlusCircle` | `plus-circle` | Primary action |
| Data Explorer | `BarChart3` | `bar-chart-3` | — |
| API Keys | `Key` | `key` | — |
| Profile | `User` | `user` | — |
| Settings | `Settings` | `settings` | — |
| Logout | `LogOut` | `log-out` | — |
| Search | `Search` | `search` | — |
| Filter | `Filter` | `filter` | — |
| Download | `Download` | `download` | Export action |
| Share | `Share2` | `share-2` | — |
| Calendar | `Calendar` | `calendar` | Date range picker |
| Clock | `Clock` | `clock` | Timestamp |
| Check | `Check` | `check` | Success / confirmation |
| X / Close | `X` | `x` | Close / dismiss |
| ChevronDown | `ChevronDown` | `chevron-down` | Expand / dropdown |
| ChevronRight | `ChevronRight` | `chevron-right` | Navigate / list item |
| ArrowLeft | `ArrowLeft` | `arrow-left` | Back navigation |
| MoreVertical | `MoreVertical` | `more-vertical` | Overflow menu (mobile) |
| Trash | `Trash2` | `trash-2` | Delete action |
| Edit | `Pencil` | `pencil` | Edit action |
| Copy | `Copy` | `copy` | Copy to clipboard |
| Eye | `Eye` | `eye` | View / show |
| EyeOff | `EyeOff` | `eye-off` | Hide / password |
| Bell | `Bell` | `bell` | Notifications |
| Info | `Info` | `info` | Help / tooltip trigger |
| AlertCircle | `AlertCircle` | `alert-circle` | Error / warning |
| Wifi | `Wifi` | `wifi` | Online status |
| WifiOff | `WifiOff` | `wifi-off` | Offline status |
| Zap | `Zap` | `zap` | Pro / premium feature |
| Crown | `Crown` | `crown` | Enterprise tier |
| CreditCard | `CreditCard` | `credit-card` | Billing / payment |
| Lock | `Lock` | `lock` | Secure / private |
| Unlock | `Unlock` | `unlock` | Public / unlocked |
| HelpCircle | `HelpCircle` | `help-circle` | Support / FAQ |
| ExternalLink | `ExternalLink` | `external-link` | Opens in new tab |

---

## 6. Dark Mode Implementation Guide

### 6.1 Tailwind CSS Configuration (Web)

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for OS preference
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B0F19',
          surface: '#111827',
          'surface-elevated': '#1A2235',
          'surface-raised': '#232D45',
          inset: '#070A10',
        },
        border: {
          DEFAULT: '#1E293B',
          strong: '#334155',
          subtle: '#0F172A',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
          disabled: '#475569',
          inverse: '#0B0F19',
          link: '#34D399',
          'link-hover': '#6EE7B7',
        },
        primary: {
          50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
          400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
          800: '#065F46', 900: '#064E3B',
        },
        danger: {
          50: '#FEF2F2', 400: '#F87171', 500: '#EF4444', 600: '#DC2626',
        },
        warning: {
          50: '#FFFBEB', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706',
        },
        success: {
          400: '#34D399', 500: '#10B981', 600: '#059669',
        },
        info: {
          50: '#EFF6FF', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB',
        },
        chart: {
          temp: '#F97316', humidity: '#06B6D4', aq: '#8B5CF6',
          noise: '#F59E0B', radiation: '#EF4444', water: '#0EA5E9',
          co2: '#78716C', pm25: '#F43F5E', pm10: '#EC4899', voc: '#84CC16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        '4.5': '18px', // 4.5 * 4 = 18
        '5.5': '22px',
        '7': '28px',
        '9': '36px',
        '11': '44px',
        '14': '56px',
      },
      borderRadius: {
        '4xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.3)',
        'dropdown': '0 10px 40px rgba(0,0,0,0.4)',
        'primary': '0 4px 12px rgba(16,185,129,0.25)',
        'danger': '0 4px 12px rgba(239,68,68,0.25)',
        'focus-primary': '0 0 0 3px rgba(16,185,129,0.15)',
        'focus-danger': '0 0 0 3px rgba(239,68,68,0.15)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
```

### 6.2 CSS Custom Properties (Global Styles)

```css
/* globals.css or index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* All tokens defined above mapped to CSS variables */
  --bg-base: #0B0F19;
  --bg-surface: #111827;
  --bg-surface-elevated: #1A2235;
  --bg-surface-raised: #232D45;
  --bg-inset: #070A10;
  --border-default: #1E293B;
  --border-strong: #334155;
  --border-subtle: #0F172A;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --text-disabled: #475569;
  --text-inverse: #0B0F19;
  --text-link: #34D399;
  --text-link-hover: #6EE7B7;
  --primary-500: #10B981;
  /* ... etc ... */
}

html {
  background-color: var(--bg-base);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg-base);
}

/* Focus ring normalization */
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Scrollbar theming (WebKit) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-base);
}
::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

### 6.3 React Native / Expo Theme Object

```typescript
// theme.ts — shared across Android app
export const theme = {
  colors: {
    bg: {
      base: '#0B0F19',
      surface: '#111827',
      surfaceElevated: '#1A2235',
      surfaceRaised: '#232D45',
      inset: '#070A10',
    },
    border: {
      default: '#1E293B',
      strong: '#334155',
      subtle: '#0F172A',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      disabled: '#475569',
      inverse: '#0B0F19',
      link: '#34D399',
    },
    primary: {
      500: '#10B981',
      400: '#34D399',
      600: '#059669',
    },
    danger: { 500: '#EF4444', 400: '#F87171', 600: '#DC2626' },
    warning: { 500: '#F59E0B', 400: '#FBBF24', 600: '#D97706' },
    success: { 500: '#10B981', 400: '#34D399', 600: '#059669' },
    info: { 500: '#3B82F6', 400: '#60A5FA', 600: '#2563EB' },
    chart: {
      temp: '#F97316', humidity: '#06B6D4', aq: '#8B5CF6',
      noise: '#F59E0B', radiation: '#EF4444', water: '#0EA5E9',
      co2: '#78716C', pm25: '#F43F5E', pm10: '#EC4899', voc: '#84CC16',
    },
  },
  spacing: {
    0: 0, px: 1, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12,
    3.5: 14, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
  },
  radius: {
    none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999,
  },
  fontSize: {
    '2xs': 10, xs: 11, sm: 12, base: 13, lg: 14, xl: 16,
    'display-xs': 18, 'display-sm': 22, 'display-md': 26, 'display-lg': 32, 'display-xl': 40,
  },
  shadows: {
    card: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    cardHover: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    dropdown: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 40, elevation: 12 },
  },
};
```

---

## 7. Animation & Motion Specifications

### 7.1 Easing Definitions

| Name | Value | Usage |
|---|---|---|
| `ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default transitions (200–300ms) |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the viewport (decelerate) |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving (accelerate) |
| `ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful micro-interactions, toggles |
| `ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Large elements entering (modal, sheet) |

### 7.2 Page Transitions (Web Dashboard)

```
Fade Slide Up (default route transition):
  Duration: 300ms
  Easing: ease-enter
  Enter: opacity 0 → 1, translateY(12px) → translateY(0)
  Exit: opacity 1 → 0, translateY(0) → translateY(-8px)
  Mode: wait (exit completes before enter)
```

```
Slide In Right (detail / drill-down views):
  Duration: 250ms
  Easing: ease-smooth
  Enter: translateX(30px) → translateX(0), opacity 0 → 1
  Exit: translateX(0) → translateX(-20px), opacity 1 → 0
```

```
Scale Fade (modals, dialogs):
  Duration: 200ms
  Easing: ease-spring
  Overlay: opacity 0 → 1, background rgba(0,0,0,0) → rgba(0,0,0,0.6)
  Modal: scale(0.95) → scale(1), opacity 0 → 1, translateY(10px) → translateY(0)
```

### 7.3 Loading States

#### Skeleton Loader
```
Background: --bg-surface-raised (or shimmer base)
Shimmer: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)
Animation: translateX(-100%) → translateX(100%), duration 1.5s, infinite, ease-smooth
Border-radius: matches container (radius-md for cards, radius-sm for text lines)
Pulse fallback (if shimmer perf is poor): opacity 0.4 ↔ 0.8, duration 2s, infinite
```

#### Inline Spinner
```
Size: 16px (button) / 24px (card) / 40px (page)
Stroke: 2px
Color: currentColor (inherits from parent) or --primary-500
Animation: rotate 360deg, 0.8s, linear, infinite
Track: transparent or --border-default (for partial circle spinners)
```

#### Page Loader (Full Screen)
```
Overlay: fixed, inset 0, bg --bg-base, opacity 1
Content: centered column, logo 48px + spinner 32px + text "Loading..." text-sm --text-muted
Animation: fade out 300ms after data ready, then unmount
```

### 7.4 Chart Animations

```
Line Chart Draw:
  Line path: stroke-dasharray animation, 1.2s, ease-smooth
  Points: scale(0) → scale(1), stagger 50ms per point, ease-bounce
  Tooltip: fade 150ms on hover, follow cursor with 4px lag (lerp 0.2)

Bar Chart Grow:
  Bars: scaleY(0) → scaleY(1), transform-origin bottom, stagger 30ms, ease-spring, 600ms total
  Value labels: fade in after bar reaches 80% height, 200ms delay

Pie/Donut Chart:
  Segments: stroke-dashoffset reveal, 800ms, ease-smooth, clockwise from top
  Hover segment: scale(1.05), filter brightness(1.1), 150ms
```

### 7.5 Micro-interactions

```
Button Press:
  Web: scale(0.98), 100ms, ease-smooth
  Mobile: ripple from touch point, 200ms, --primary-500 at 15% opacity

Card Hover:
  Web: translateY(-2px), shadow-card-hover, border --border-strong, 200ms, ease-smooth

Toggle Switch:
  Knob: translateX with spring easing, 200ms
  Background: color transition 150ms

Toast Notification:
  Enter: translateX(100%) → translateX(0), opacity 0 → 1, 300ms, ease-spring
  Exit: translateX(0) → translateX(120%), opacity 1 → 0, 250ms, ease-exit
  Auto-dismiss: 5000ms, progress bar shrinks from full width

Input Focus:
  Border: color 150ms, box-shadow 200ms ease-smooth
  Label: translateY(0) → translateY(-20px), scale(1) → scale(0.85), color --primary-400, 200ms

Pull-to-Refresh (Mobile):
  Indicator: rotate on drag, snap back with spring if not triggered
  Trigger threshold: 80dp pull
  Success: checkmark scale bounce, 300ms

Number Counter (KPI animation):
  Count up from 0 to value, 800ms, ease-exit
  Format with commas and 1 decimal place for large values
```

### 7.6 Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

On mobile, respect `AccessibilitySettings` reduced-motion flag. Disable shimmer, shorten all durations to 50ms.

---

## 8. Accessibility Requirements

### 8.1 Conformance Target

**WCAG 2.1 Level AA** minimum for all web content. Target AAA for text contrast where feasible.

### 8.2 Color Contrast Matrix

| Foreground | Background | Ratio | WCAG AA | WCAG AAA |
|---|---|---|---|---|
| `#F8FAFC` | `#0B0F19` | 18.2:1 | ✅ | ✅ |
| `#94A3B8` | `#0B0F19` | 7.2:1 | ✅ | ❌ (Large text only) |
| `#64748B` | `#0B0F19` | 4.6:1 | ✅ | ❌ |
| `#F8FAFC` | `#111827` | 16.8:1 | ✅ | ✅ |
| `#10B981` | `#0B0F19` | 8.4:1 | ✅ | ✅ |
| `#EF4444` | `#0B0F19` | 6.7:1 | ✅ | ❌ (Large text only) |
| `#F59E0B` | `#0B0F19` | 8.1:1 | ✅ | ✅ |
| `#3B82F6` | `#0B0F19` | 6.4:1 | ✅ | ❌ (Large text only) |

### 8.3 Focus States

- **All interactive elements** must have a visible focus indicator.
- Web: `outline: 2px solid var(--primary-400); outline-offset: 2px;` on `:focus-visible`
- Mobile: Android system focus ring ( TalkBack ) + custom `border: 2px solid --primary-400` on focused elements
- Focus must be trapped inside modals / dialogs when open.
- Return focus to trigger element on modal close.
- Skip-to-content link: first focusable element, invisible until focused, jumps to `<main>`.

### 8.4 Keyboard Navigation (Web)

| Key | Action |
|---|---|
| `Tab` | Move forward through interactive elements |
| `Shift + Tab` | Move backward |
| `Enter` / `Space` | Activate buttons, links, toggle switches |
| `Escape` | Close modals, dropdowns, dismiss toasts |
| `Arrow keys` | Navigate within dropdowns, radio groups, tabs, tables |
| `Home` / `End` | Jump to first / last item in list |
| `Ctrl/Cmd + K` | Open global search / command palette |

### 8.5 Screen Reader Labels

- **Icons alone**: Every icon button must have an `aria-label` or visually hidden `<span>` text.
- **Charts**: Use `aria-label` on SVG container describing the chart type and summary (e.g., "Line chart showing temperature readings over 7 days, average 23.5°C"). Provide a data table alternative (`<table>` hidden or off-screen) for screen readers.
- **Sensor readings**: Each reading card should announce: "{Sensor Type} reading: {value} {unit} at {time}, from {station name}".
- **Status changes**: Use `aria-live="polite"` for toast notifications, data updates, and async loading states.
- **Form errors**: Associate error messages with inputs via `aria-describedby` and `aria-invalid="true"`.
- **Loading states**: Announce "Loading station data" with `aria-live="polite"` and "Loading complete" when done.

### 8.6 Touch Targets (Mobile)

| Element | Minimum Size | Recommended Size | Padding |
|---|---|---|---|
| Buttons | 44dp x 44dp | 48dp x 48dp | — |
| List items | 48dp height | 56dp | — |
| Icon buttons | 44dp | 48dp | — |
| Form inputs | 44dp height | 56dp | — |
| Checkbox / radio | 44dp touch area | 48dp | — |
| Tab bar items | 48dp | 56dp | — |
| Inline links in text | 44dp | — | minimum 8dp vertical padding |

### 8.7 Safe Areas & Thumb Zones (Mobile)

```
Screen zones (portrait, average 6.5" phone):
  ┌─────────────────────────┐
  │  [O] Status bar (24dp)  │  ← System, avoid
  │  ┌─────────────────────┐│
  │  │                     ││  ← Secondary actions, search, filters
  │  │    TOP (hard)       ││
  │  │                     ││
  │  ├─────────────────────┤│
  │  │                     ││  ← Content, charts, scrollable lists
  │  │   MIDDLE (easy)     ││
  │  │                     ││
  │  ├─────────────────────┤│
  │  │    BOTTOM (easy)    ││  ← Primary actions, FAB, submit buttons
  │  │                     ││  ← Bottom nav (56dp) for thumb reach
  │  └─────────────────────┘│
  │  [O] System nav (48dp)  │  ← System gesture area
  └─────────────────────────┘
```

- **Primary actions** (Submit, Save, Next) must be in the bottom 25% of the screen or in a fixed bottom bar.
- **Destructive actions** (Delete, Cancel) should be in the top half or require confirmation.
- **Floating Action Button (FAB)**: 56dp diameter, placed 16dp from right edge and 16dp above bottom nav (or 24dp above system nav if no bottom nav).
- **Horizontal padding**: 20dp (space-5) minimum on mobile screens. 16dp for compact cards.
- **Keyboard handling**: On Android, use `android:windowSoftInputMode="adjustResize"` equivalent. Ensure the submit button is visible when the keyboard is open. Scroll focused input into view with 24dp padding above the keyboard.
- **Notch / cutout**: Use `SafeAreaView` from `react-native-safe-area-context`. Inset top: 44dp (notch), bottom: 34dp (home indicator) on modern devices. Minimum: 24dp top, 16dp bottom.

### 8.8 Text Scaling

- Support up to **200% font scaling** on mobile without breaking layouts.
- Use `flexWrap: 'wrap'` and `minHeight` instead of fixed heights for text containers.
- On web: respect `font-size` browser settings; avoid `px` for font sizes if possible (use `rem` / `em`).

### 8.9 Color-Blind Support

- Do not rely on color alone for status. Combine with:
  - Icons (`Wifi` for online, `WifiOff` for offline)
  - Text labels ("Online", "Offline", "Warning")
  - Patterns (solid vs. dashed lines in charts)
  - Shapes (circle, triangle, square for data points)
- Provide a **monochrome mode** toggle in settings (desaturates all chart colors, increases pattern differentiation).

---

## 9. Z-Index / Elevation Hierarchy

| Layer | Z-Index / Elevation | Content |
|---|---|---|
| Base | 0 / 0 | Page content, cards, static elements |
| Sticky | 10 / 2 | Sticky table headers, sticky nav |
| Floating | 20 / 4 | Floating labels, dropdown menus, tooltips |
| Overlay | 30 / 6 | Backdrops, modal overlays, drawers |
| Modal | 40 / 8 | Modals, dialogs, bottom sheets |
| Toast | 50 / 10 | Toast notifications, snackbars |
| Loading | 60 / 12 | Full-screen loading overlays |

---

## 10. Responsive Breakpoints (Web)

| Name | Width | Usage |
|---|---|---|
| `xs` | < 640px | Mobile web (single column, stacked cards, bottom nav if PWA) |
| `sm` | 640px | Small tablets, large phones (2-column grid) |
| `md` | 768px | Tablets (sidebar collapses to icon-only, 2–3 columns) |
| `lg` | 1024px | Small desktops (full sidebar, 3-column grid) |
| `xl` | 1280px | Standard desktops (3–4 columns, expanded charts) |
| `2xl` | 1536px | Large monitors (4+ columns, side-by-side charts) |

**Dashboard grid behavior:**
- `xs`: 1 column, cards stack vertically, charts are 100% width, tables scroll horizontally
- `sm`–`md`: 2 columns for KPI cards, charts stack
- `lg`–`xl`: 3 columns for KPI cards, 2-column chart layout
- `2xl`: 4 columns for KPI cards, 3-column chart layout, data table shows all columns

---

*End of Design System Document*
