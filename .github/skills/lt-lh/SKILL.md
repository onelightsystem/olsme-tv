---
name: lt-lh
description: Integrate, upgrade, or debug the @olsystem/lt-lh Light Time package in olsme-tv. Covers display logic, package version gaps, Firebase deploy resolution, and vendoring strategy.
---
## When to Use

Use for tasks involving:

- Adding or updating OLS Light Time (LH / LD) displays anywhere in the app
- Upgrading `@olsystem/lt-lh` to a new version
- Fixing LD value display (dayOfYear vs absolute day count)
- Resolving Firebase remote build failures caused by local `file:` package paths
- LH/dh conditional styling (light hour vs dark hour toggle appearance)

Keywords: light time, light hour, LH, dark hour, dh, light day, LD, dayOfYear, lt-lh, olsystem, OLS calendar.

---

## Key Concepts

| Term | Meaning | Example |
|---|---|---|
| Light Hour (LH) | Hours 6AM–5PM (1LH–12LH) | `6LH` |
| Dark Hour (dh) | Hours 6PM–5AM (1dh–12dh) | `3dh` |
| Light Day (LD) | Day within the current Light Year (0–364) | `110LD` |
| Absolute day | Total days since epoch Dec 22, 2024 | `476` — do NOT display this |
| `day.day` | Absolute count (v0.1.3) | Use `(day.day - 1) % 365` for display |
| `day.dayOfYear` | Per-year day (future version ≥ 0.1.4) | Use directly when available |

---

## Integration Pattern

### Import (from npm registry)
```ts
import { useLightTime } from '@olsystem/lt-lh';
```

### Hook usage
```tsx
const { hour, day } = useLightTime();

// Display Light Day correctly:
const ldDisplay = (day.day - 1) % 365;  // until @olsystem/lt-lh exposes dayOfYear

// LH vs dh conditional:
hour.isLightHour  // true = daytime (yellow/gold styling)
hour.isDarkHour   // true = nighttime (dark bg, white text)
hour.lightTime    // e.g. "6LH" or "3dh"
```

### next.config.mjs requirement
```js
transpilePackages: ['@olsystem/lt-lh'],
```
Always required — the package ships ESM and must be transpiled by Next.js.

---

## Firebase Deploy — Local Package Pitfall

**Never use `file:../LT-LH` in production.**

Firebase remote build servers cannot access local paths.
If `@olsystem/lt-lh` is not yet published on npm, vendor the source:

1. Copy `src/core.ts`, `src/types.ts`, `src/useLightTime.ts` into `src/lib/lt-lh.ts`
2. Update import to `@/lib/lt-lh`
3. Remove `file:` dep from `package.json`
4. Once published to npm, do the reverse: `npm install @olsystem/lt-lh`, restore import, delete `src/lib/lt-lh.ts`

---

## Styling Guidelines

### Light Hour toggle (daytime)
```tsx
style={{ background: 'linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #FFA500 100%)' }}
// text: text-black
```

### Dark Hour toggle (nighttime)
```tsx
style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #1A1A1A 100%)',
         border: '1px solid rgba(255,255,255,0.12)' }}
// text: text-white
```

---

## Upgrading `@olsystem/lt-lh`

1. `npm view @olsystem/lt-lh version` — check latest
2. `npm install @olsystem/lt-lh@latest`
3. Check if `LightDayInfo` now exposes `dayOfYear` (see dist/index.d.ts)
4. If yes: replace `(day.day - 1) % 365` with `day.dayOfYear` in [src/app/about/page.tsx](../../src/app/about/page.tsx)
5. Run `npm run check:types && npm run build`

See [docs/LT-LH-PACKAGE-SUGGESTION.md](../../docs/LT-LH-PACKAGE-SUGGESTION.md) for the open `dayOfYear` request to the package maintainer.

---

## Validate

```bash
npm run check:types
npm run build
```

A working build with Turbopack (Firebase path) uses bare `next build`.
Local dev uses `next dev --webpack` and `next build --webpack`.
Both must succeed before deploying.

## Done Criteria

- `hour.lightTime` displays correctly with conditional LH/dh styling
- `(day.day - 1) % 365` (or `day.dayOfYear`) shows the per-year day (e.g. 110), not the absolute count (e.g. 476)
- `npm run build` passes with Turbopack (no local `file:` path in deps)
- `firebase deploy --only hosting` completes without module-not-found errors
