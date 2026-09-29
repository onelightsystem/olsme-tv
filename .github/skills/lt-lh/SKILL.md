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

Current installed version: `@olsystem/lt-lh@0.4.0`.

| Term | Meaning | Example |
|---|---|---|
| Light Hour (LH) | Hours 6AM–5PM (1LH–12LH) | `6LH` |
| Dark Hour (dh) | Hours 6PM–5AM (1dh–12dh) | `3dh` |
| Light Day (LD) | Day within the current Light Year | `110LD` |
| Absolute day (`day.day`) | Days since the package's epoch. **Epoch changed in 0.4.0** from `2024-12-22` to
  `2025-12-23` — do not assume a fixed offset between versions. | varies by version |
| `day.dayOfYear` | Day within the current Light Year (1–365). **Available since 0.4.0** — use this directly for
  display, do not derive it from `day.day`. | `110` |

**Do not use the `(day.day - 1) % 365` workaround anymore.** It was only valid against the pre-0.4.0 epoch and
  will silently produce an off-by-one/wrong value now that the epoch shifted. Always use `day.dayOfYear` directly.

---

## Integration Pattern

### Import (from npm registry)
```ts
import { useLightTime } from '@olsystem/lt-lh';
```

### Hook usage
```tsx
const { hour, day } = useLightTime();

// Display Light Day correctly (0.4.0+):
const ldDisplay = day.dayOfYear;  // 1–365, already per-year — no math needed

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
3. Read `node_modules/@olsystem/lt-lh/dist/index.d.ts` directly for the real shipped API — published versions
   have changed `LightDayInfo`/`LightTimeConfig` shape and the epoch default before; don't assume the previous
   version's contract still holds.
4. Runtime-verify epoch/day-numbering assumptions before trusting a diff:
   ```bash
   npx tsx --eval "import('@olsystem/lt-lh').then(m => console.log(m.getLightDay(new Date())));"
   ```
5. Update [src/app/about/page.tsx](../../../src/app/about/page.tsx) to use `day.dayOfYear` directly if not
   already.
6. Run `npm run check:types && npm run build`

See [docs/LT-LH-PACKAGE-SUGGESTION.md](../../../docs/LT-LH-PACKAGE-SUGGESTION.md) for the open `dayOfYear` request to the package maintainer.

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
- `day.dayOfYear` (1–365) is used directly for the Light Day display — no `% 365` math against `day.day`
- `npm run build` passes with Turbopack (no local `file:` path in deps)
- `firebase deploy --only hosting` completes without module-not-found errors
