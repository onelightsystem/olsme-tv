# @olsystem/lt-lh — Package Improvement Suggestions

> From the olsme.tv integration (April 2026)
> For the attention of the `@olsystem/lt-lh` maintainer.

---

## 1. Expose `dayOfYear` from `getLightDay` / `LightDayInfo`

### Problem

`LightDayInfo.day` returns the **absolute day count since the epoch** (Dec 22, 2024).

On April 11, 2026 this returns `476`, which is technically correct but
**not what most UIs want to display**. Users expect to see the day within the
current Light Year (i.e. `110`), not a monotonically growing counter.

Internally `getLightDay` already computes this as `dayInYear`:

```ts
// core.ts (v0.1.3 — internal, not exported)
const dayInYear = ((day - 1) % 365) + 1;
```

It just never makes it into the returned object.

### Suggested Fix

Add `dayOfYear` to `LightDayInfo` and return it from `getLightDay`:

```ts
// types.ts
export interface LightDayInfo {
  /** Absolute day since epoch (Dec 22, 2024). Monotonically increasing. */
  day: number;
  /** Day within the current Light Year (0–364). Use this for display. e.g. 110 */
  dayOfYear: number;
  quarter: number;
  quarterLabel: string;
  year: number;
}
```

```ts
// core.ts — getLightDay return value
return {
  day,
  dayOfYear: (day - 1) % 365,   // 0-anchored: Day 1 of year = 0, Day 365 = 364
  quarter,
  quarterLabel: `Q${quarter}`,
  year: lightYearBase + yearOffset,
};
```

> **Note on anchoring:** `(day - 1) % 365` gives `0` on the first day of the
> year (Winter Solstice) and `364` on the last. If a 1-based display is preferred,
> use `((day - 1) % 365) + 1` — just document the choice clearly.

### Current workaround in olsme.tv

```tsx
// About page — inline until package exposes dayOfYear
<span>{(day.day - 1) % 365}LD</span>
```

### Impact

- Non-breaking addition — existing consumers using `day.day` are unaffected.
- Removes the need for every consumer to repeat the modulo formula inline.
- Enables correct LD display out of the box.

---

## 2. (Optional) Clarify `day` vs `dayOfYear` in JSDoc

Once both fields exist, add a quick note in the JSDoc:

```ts
/** Absolute day counter since the Light Calendar epoch (Dec 22, 2024). 
 *  Use `dayOfYear` for display. */
day: number;

/** Day within the current Light Year (0–364). Resets every Winter Solstice. */
dayOfYear: number;
```

---

## 3. (Optional) Export `DEFAULT_EPOCH` constant

Consumers sometimes want to display the epoch date or do their own math.
Export it from the public API:

```ts
export const LIGHT_CALENDAR_EPOCH = "2024-12-22";
```

---

## Summary Table

| Field | v0.1.3 | Suggested |
|---|---|---|
| `day` — absolute since epoch | ✅ | ✅ keep |
| `dayOfYear` — within Light Year | ❌ missing | ➕ add |
| `LIGHT_CALENDAR_EPOCH` constant | ❌ internal | ➕ optional export |

Repo: https://github.com/onelightsystem/LT-LH  
Package: https://www.npmjs.com/package/@olsystem/lt-lh
