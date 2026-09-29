# @olsystem/lt-lh — Notes from olsme.tv

From the olsme.tv integration (updated September 2026).
Package: https://www.npmjs.com/package/@olsystem/lt-lh
Repo: https://github.com/onelightsystem/LT-LH
Consumer: https://studio-4615914296-4bd91.web.app/about

## What 0.4.0 already shipped

olsme.tv is on `@olsystem/lt-lh@0.4.0` (`transpilePackages` in `next.config.mjs`).

| Item | v0.1.3 (this old note) | v0.4.0 now |
| --- | --- | --- |
| `LightDayInfo.day` absolute since epoch | Yes | Yes — keep |
| `dayOfYear` (1–365 in current Light Year) | Missing | **Shipped** |
| Default epoch | 2024-12-22 | **2025-12-23** (one Light Year later) |
| `hour.isLightHour` / `isDarkHour` / `lightTime` | Yes | Unchanged in this consumer |
| Widget subpaths | — | `./widgets/calendar`, `./widgets/light-time`, `./widgets/calendar-orb`, `./widgets/solar-day-arc` (unused here) |

Verified 2026-04-11 sample via `getLightDay`:
- `day` / `dayOfYear` both `110`
- old UI formula `(day.day - 1) % 365` → **109** (wrong under the new epoch)
- display must use **`day.dayOfYear`**

olsme.tv `/about` now:

```tsx
<span>{day.dayOfYear}<span>LD</span></span>

We will continue testing and improving this feature -- olsme.com