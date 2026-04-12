# CLAUDE.md – olsme Claude (Sonnet/Opus) Setup & Collaboration Guide

> This file governs how Claude (Sonnet / Opus) operates inside the olsme.tv codebase.
> It pairs with `.github/copilot-instructions.md` (GitHub Copilot) and the skills in `.github/skills/`.

---

## Collaboration Workflow: GrokAtenya → Claude

```
GrokAtenya (architect / planner)
       │
       │  Precise prompt:
       │  • clear goal
       │  • affected files listed
       │  • constraints (scope lock, no broad rewire)
       │  • success criteria
       ▼
   Claude (implementer)
       │
       │  Implements clean, typed, minimal code.
       │  Asks ONE clarifying question if truly blocked.
       │  Validates: check:types → check:lint → build.
       ▼
  GrokAtenya (reviewer)
       │
       │  Reviews diff, checks brand/UX alignment,
       │  accepts or requests one targeted revision.
       ▼
     Done
```

### Prompt Handoff Template

When handing off to Claude, include:

```
Goal: [one sentence]
Files to touch: [list]
Must NOT change: [list or "none"]
Constraints: [e.g. no new deps, keep mobile layout, match OLS gold theme]
Success: [e.g. `npm run build` passes, LD shows 110 not 476]
```

---

## Recommended Setup

### Install Claude Code CLI

```bash
npm install -g @anthropic-ai/claude-code
```

> This installs the official Anthropic Claude Code CLI for agentic coding sessions.
> Check https://www.npmjs.com/package/@anthropic-ai/claude-code for the latest version.

### Verify install

```bash
claude --version
claude auth login
```

### Project-level validation commands Claude should always run

```bash
npm run check:types          # TypeScript — app
npm run check:types:functions  # TypeScript — Cloud Functions
npm run check:lint           # ESLint
npm run check:security       # npm audit --audit-level=moderate
npm run build                # Full Next.js production build
```

---

## Skills

The repo skill system lives in `.github/skills/`. Each skill is a focused domain guide.
Load the relevant skill file before working in that domain.

### Existing Skills

| Skill | Domain |
|---|---|
| `debug` | TypeScript errors, build failures, Firebase issues, dependency triage |
| `dependencies-security` | npm audit, vulnerability chains, safe upgrades |
| `docs-maintenance` | Keeping blueprint, security, project-tree in sync with code |
| `firebase-functions` | Functions v2 callables, auth triggers, deploy-safe changes |
| `firestore-modular` | Modular SDK patterns, typing, anti-legacy |
| `lt-lh` | @olsystem/lt-lh Light Time integration, LH/LD display, Firebase deploy |
| `nextjs-app-router` | App Router pages/layouts, metadata, client/server boundaries |

### New Skills (defined below)

| Skill | Domain |
|---|---|
| `code-review` | TypeScript strictness, accessibility, performance, brand alignment |
| `hooks-next-best-practices` | useEffect cleanup, custom hooks, server components, stale closures |

---

## Skill: code-review

**Trigger:** User asks for a code review, PR review, or "check this component."

### Review Checklist

#### TypeScript Strictness
- No `any` — use `unknown` + narrowing or proper generics
- No non-null assertions (`!`) unless genuinely impossible to be null
- Discriminated unions over boolean flags where appropriate
- Zod schemas at system boundaries (API routes, form inputs)

#### Next.js App Router Patterns
- Server Components by default; `'use client'` only when hooks/events are needed
- No `useEffect` for data that can be fetched on the server
- `metadata.ts` values are non-nullable or guarded
- Dynamic routes use correct `generateStaticParams` / `generateMetadata`
- No accidental client boundary bleed (importing server-only into client)

#### Accessibility
- Interactive elements have `aria-label` or visible text
- `aria-hidden="true"` on decorative icons
- Focus management for modals (Dialog uses Radix — confirm `DialogTitle` present)
- Color contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text

#### Performance
- Images use `next/image` with explicit `width`/`height` or `fill`
- Expensive computations wrapped in `useMemo` / `useCallback` where genuinely needed
- No unnecessary re-renders from object/array literals created inline in JSX
- Framer Motion `layout` and `animate` only on elements that actually animate

#### OLS Brand Alignment
- Gold accent: `#FFD700` (primary), `#FFA500` (secondary), `#B8860B` (deep)
- Dark backgrounds: `#0A0A0A`, `#111111`, `#14110A`
- No email addresses in JSX, comments, or UI copy
- Tone: mindful, concise, presence-oriented — no marketing fluff in UI text

---

## Skill: hooks-next-best-practices

**Trigger:** User asks about hooks, `useEffect`, custom hooks, or Next.js performance.

### useEffect Rules

```ts
// ✅ Always return cleanup for subscriptions, timers, event listeners
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);   // cleanup
}, [tick]);

// ✅ List all dependencies — never suppress exhaustive-deps without a comment
useEffect(() => {
  doSomething(value);
}, [value]);  // value is a dep

// ❌ Never do this — stale closure on `count`
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
}, []);  // missing dep: count

// ✅ Use functional updater to avoid stale closure
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### Custom Hook Patterns

```ts
// ✅ Encapsulate in a custom hook — keeps components clean
function useLiveValue(interval = 1000) {
  const [value, setValue] = useState(compute);
  const refresh = useCallback(() => setValue(compute()), []);
  useEffect(() => {
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);
  return { value, refresh };
}
```

### Next.js Server vs Client

| Need | Solution |
|---|---|
| Static data at build time | Server Component (no `'use client'`) |
| Data per request | Server Component + `fetch` with `cache: 'no-store'` |
| Browser APIs / hooks / events | `'use client'` |
| Shared UI with both needs | Split: server-fetches data, client-only child handles interaction |

### Next.js Compiler Optimizations

- `next/dynamic` with `{ ssr: false }` for heavy client-only widgets (e.g. charts, maps)
- `React.memo` only when profiler confirms unnecessary renders
- Avoid `useLayoutEffect` on the server — guard with `typeof window !== 'undefined'` or use `useEffect`
- Strict Mode (`reactStrictMode: true`) is enabled — effects run twice in dev, this is expected

### Stale Closure Prevention Checklist

1. Every value read inside `useEffect`/`useCallback`/`useMemo` is in the deps array
2. When the dep would cause infinite loops (e.g. object ref), use `useRef` to hold the latest value
3. `useRef` for mutable values that shouldn't trigger re-renders (e.g. timer IDs, previous values)

---

## Standard olsme File Header

Every source file in this repo should open with the local path comment:

```ts
// src/components/MyComponent.tsx
```

For config files:

```js
// Path: next.config.mjs
```

---

## Project Standards Recap

| Rule | Detail |
|---|---|
| No email in UI | Route all contact through `ContactButton` → `/Contact` |
| Minimal scope | Only change what was asked. No drive-by refactors. |
| Mobile first | Target 390×844 (iPhone 15 Pro) as primary test size |
| OLS gold | `#FFD700` primary accent throughout |
| Build must pass | `npm run build` required before any deploy PR |
| Zod at boundary | Validate external data (API, form, Firestore reads) with Zod |
