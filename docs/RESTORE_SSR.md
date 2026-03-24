# Restore SSR Mode – olsme.tv (after Firebase Hosting bug fix)

**Last updated:** March 23, 2026  
**Status:** Static export mode is ACTIVE. SSR is currently disabled.

---

## Introduction

On March 23, 2026, olsme.tv was temporarily switched from SSR (Server-Side Rendering via Firebase Hosting + Cloud Run) to a static HTML export. This was necessary because Firebase Hosting's SSR finalization step was failing with a Cloud Run revision conflict:

```
409 ALREADY_EXISTS: Revision named 'ssrstudio46159142964bd9-00001-qiv'
with different configuration already exists.
```

This is a known firebase-tools bug tracked in:
- https://github.com/firebase/firebase-tools/issues/10148
- https://github.com/firebase/firebase-tools/issues/10155

**Use this guide when:**
- A firebase-tools release confirms the 409 finalization bug is fixed, **and**
- You want to restore full SSR: server-rendered HTML, faster first paint, dynamic rendering of `/profile`, `/subscribe`, etc.

**Do not follow this guide until the bug is confirmed fixed** in your installed firebase-tools version.

---

## Prerequisites

Before starting:

1. **Update firebase-tools** to the version that resolves the 409 revision conflict:
   ```bash
   npm install -g firebase-tools@latest
   firebase --version   # confirm >= fixed version
   ```
2. Confirm `npm run build` still passes on the current codebase.
3. Have access to the Firebase project: `studio-4615914296-4bd91`.

---

## Step-by-Step Revert Instructions

### Step 1 — Remove `output: 'export'` from `next.config.ts`

**Current (static mode):**
```ts
const nextConfig = {
  // TEMPORARY: static export mode while SSR Cloud Run deploy is blocked (409 bug).
  // To revert to SSR: remove this line and restore firebase.json frameworksBackend block.
  output: 'export',
  turbopack: {},
  // ...
};
```

**After (SSR mode):**
```ts
const nextConfig = {
  turbopack: {},
  // ...
};
```

Simply delete the `output: 'export'` line and the two comment lines above it.

---

### Step 2 — Restore `firebase.json` to SSR/frameworks mode

**Current (static mode):**
```json
{
  "functions": {
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "source": "functions",
    "runtime": "nodejs22"
  },
  "hosting": {
    "public": "out",
    "cleanUrls": true,
    "trailingSlash": false,
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  },
  "emulators": {
    "functions": { "port": 5001 },
    "hosting": { "port": 9002 },
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "port": 4001 },
    "hub": { "port": 4401 }
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

**After (SSR mode)** — replace the `hosting` block:
```json
{
  "functions": {
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "source": "functions",
    "runtime": "nodejs22"
  },
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "us-central1"
    }
  },
  "emulators": {
    "functions": { "port": 5001 },
    "hosting": { "port": 9002 },
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "port": 4001 },
    "hub": { "port": 4401 }
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

> Note: `pinTag: true` has been intentionally left out. That option was part of the troubleshooting path that led to the 409 conflict. Only re-add it if explicitly needed.

---

### Step 3 — Restore the three API routes from their stub state

During the static export migration, the three API routes were stubbed with a static GET and the original POST handlers were wrapped in a block comment. Restore each file by:

1. Delete everything from `export const dynamic = 'force-static';` through the opening `/* ---- ORIGINAL POST HANDLER` comment.
2. Uncomment the original POST handler body (remove the `/* ----` opening and `---- END ORIGINAL POST HANDLER ---- */` closing).

Files to restore:
- `src/app/api/ipfs/route.ts`
- `src/app/api/ipfs-upload/route.ts`
- `src/app/api/verify-turnstile/route.ts`

---

### Step 4 — Remove the `export` script from `package.json`

**Current (static mode):**
```json
"scripts": {
  "build": "next build",
  "export": "next build",
  ...
}
```

**After (SSR mode):**
```json
"scripts": {
  "build": "next build",
  ...
}
```

Delete the `"export": "next build"` line.

---

### Step 5 — Delete the static `out/` folder

```bash
rm -rf out
```

This folder is only needed for static deploys. When using SSR, Firebase Hosting frameworks deploys from source directly via the Cloud Run function.

---

### Step 6 — Build (SSR mode, no export)

```bash
npm run build
```

Expected output: routes show as `ƒ (Dynamic)` for API routes, `○ (Static)` for pre-renderable pages. No `out/` folder is created.

---

### Step 7 — Deploy

```bash
firebase deploy --only hosting --project studio-4615914296-4bd91
```

**Expected success signal:**
```
✔  hosting[studio-4615914296-4bd91]: version finalized
✔  hosting[studio-4615914296-4bd91]: release complete
✔  Deploy complete!
Hosting URL: https://studio-4615914296-4bd91.web.app
```

---

## Verification Checklist

After deploy, confirm the following:

- [ ] Homepage (`/`) loads — check DevTools > Network > first HTML document is server-rendered (look for full HTML content in response, not a bare shell)
- [ ] `/about` renders correctly
- [ ] `/dev-log` renders correctly
- [ ] `/subscribe` loads PayPal buttons (client-side SDK still works)
- [ ] Sign in → `/profile` shows authenticated user data
- [ ] `/api/verify-turnstile` returns a proper response (not the 503 static stub)
- [ ] DevTools Console: no `force-static` or static stub errors
- [ ] DevTools Console: no CORS 403 from callable functions
- [ ] DevTools Network: first-document response time < 1s (SSR benefit)

---

## Rollback

If the 409 bug reappears after updating firebase-tools, revert to static mode immediately:

```bash
# 1. Restore static config in next.config.ts and firebase.json (re-apply Step 1/2 in reverse)
# 2. Rebuild and re-export
npm run build
# 3. Re-deploy static
firebase deploy --only hosting --project studio-4615914296-4bd91
```

Keep the stub pattern in the API routes — they are designed to be toggled safely.

---

Welcome back to full SSR mode — faster, more dynamic awakening experience.
