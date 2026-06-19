# Dual Theme System — Design Spec

## Summary
Replace the existing light/dark color palettes in `ThemeContext` with "Warm Minimal" (light) and "Glass Neon" (dark) themes. Add missing semantic tokens, persist theme choice, and fix all hardcoded colors.

## Architecture
All changes confined to `src/theme/ThemeContext.tsx` + targeted fixes in components that have hardcoded colors. No new files, no HTML changes, no new UI.

```
ThemeContext.tsx (update palettes, add tokens, add persistence)
  ├── settings.ts (add themeMode persistence — follows existing pattern)
  ├── DeckDetailScreen.tsx (fix hardcoded overlay)
  ├── TemplateEditorScreen.tsx (fix hardcoded overlay)
  ├── Skeleton.tsx (fix hardcoded shimmer — use theme tokens)
  ├── ImportScreen.tsx (fix hardcoded font — use theme token)
  ├── Confetti.tsx (fix hardcoded COLORS — use theme tokens)
  ├── HomeScreen.tsx (wire dailyWords icon bg/color to new tokens)
  └── AppNavigator.tsx (wire tab bar to new tab-* tokens)
```

## ColorScheme Changes

### New fields added to interface

| Field | Light | Dark | Purpose |
|-------|-------|------|---------|
| `textTertiary` | `#B5A899` | `#4A4A5A` | Muted/tertiary text |
| `surfaceBorder` | `#EDE6DC` | `rgba(255,255,255,0.08)` | Surface-level border (darker than page border) |
| `tabBarBackground` | `rgba(250,247,242,0.94)` | `rgba(8,8,13,0.92)` | Tab bar bg (frosted glass) |
| `tabActive` | `#C45D3E` | `#00E5A0` | Active tab color |
| `tabInactive` | `#B5A899` | `#4A4A5A` | Inactive tab color |
| `toastBackground` | `#2C2420` | `rgba(0,229,160,0.15)` | Toast/prompt bg |
| `toastText` | `#FAF7F2` | `#00E5A0` | Toast/prompt text |
| `canvasAlpha` | `0` | `1` | Particle canvas opacity (number) |
| `headingFontFamily` | `Playfair Display` | `Space Grotesk` | Heading font |
| `numFontFamily` | `Space Grotesk` | `JetBrains Mono` | Number/stat font |
| `ringDueLabelColor` | `textTertiary` | `accent` | Ring "Due" label color |
| `ringDueLabelWeight` | `'400'` | `'600'` | Ring "Due" label weight |
| `ringGlow` | `none` | `drop-shadow(0 0 8px rgba(0,229,160,0.3))` | Ring glow (dark only, SVG filter) |

### Existing fields updated

| Field | Light (old → new) | Dark (old → new) |
|-------|--------------------|--------------------|
| `primary` | `#4A90D9` → `#C45D3E` | `#5B9FE0` → `#00E5A0` |
| `secondary` | `#6C63FF` → `#5B8A72` | `#8B83FF` → `#3FB950` |
| `background` | `#F5F7FA` → `#FAF7F2` | `#0F1117` → `#08080D` |
| `surface` | `#FFFFFF` → `#FFFFFF` | `#1A1D26` → `rgba(255,255,255,0.04)` |
| `surfaceVariant` | `#F0F2F7` → `#F5F0E9` | `#222531` → `rgba(255,255,255,0.06)` |
| `text` | `#1A1A2E` → `#2C2420` | `#E4E6EB` → `#E8E6E3` |
| `textSecondary` | `#6B7280` → `#8C7E74` | `#9CA3AF` → `#6B6B7B` |
| `border` | `#E5E7EB` → `#EDE6DC` | `#2D3039` → `rgba(255,255,255,0.08)` |
| `success` | `#10B981` → `#5B8A72` | `#10B981` → `#3FB950` |
| `shadow` | `#0000001A` → `#2C2420` | `#00000040` → `transparent` |
| `overlay` | `rgba(0,0,0,0.5)` → `rgba(44,36,32,0.5)` | `rgba(0,0,0,0.7)` → `rgba(0,0,0,0.7)` |

### fields deleted
- `primaryDark` — unused, remove from interface and palettes

## Persistence

Add `themeMode` to settings.json (next to `appLanguage`). On ThemeProvider mount, read from settings. On `setMode()`, write to settings. Follows the same `getThemeMode`/`setThemeMode` pattern as existing settings.

## Component Fixes

1. **DeckDetailScreen.tsx:423** — replace `'rgba(0,0,0,0.5)'` with `colors.overlay`
2. **TemplateEditorScreen.tsx:230** — same
3. **Skeleton.tsx:37** — use `colors.surfaceVariant` instead of hardcoded `rgba()` strings
4. **ImportScreen.tsx:337** — use `colors.numFontFamily` instead of platform-specific monospace
5. **Confetti.tsx:12** — use theme accent/success/secondary colors instead of hardcoded array
6. **AppNavigator.tsx** — use `colors.tabBarBackground`, `colors.tabActive`, `colors.tabInactive`
7. **HomeScreen.tsx** — daily words icon: use `colors.success`/`colors.successSoft` instead of `colors.primary`/`withAlpha(colors.primary, ...)` when appropriate

## What does NOT change
- Theme toggle UI (3 chips: System/Light/Dark) — already exists and works
- Component layout/structure
- No new libraries or packages
- No DB schema changes
