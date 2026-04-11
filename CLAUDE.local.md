# CLAUDE.local.md — Local-Only Instructions (not committed)

## Environment

- macOS dev machine
- Firebase project: studio-4615914296
- Live URL: https://olsme.tv
- Dev server: http://localhost:9002

## Local Workflow

```bash
npm run dev                # Start dev server (webpack, port 9002)
firebase emulators:start   # Local Firebase emulators (if needed)
firebase deploy --only functions,hosting  # Deploy both
```

## Security Notes

- The root PAYPAL_*.md files (PAYPAL_CODE_REFERENCE.md, PAYPAL_DEPLOYMENT_SUMMARY.md,
  PAYPAL_INTEGRATION_COMPLETE.md, PAYPAL_QUICK_REFERENCE.md) are currently tracked in git.
  They contain no secrets but reveal internal architecture (Firestore collections, custom claims
  structure, error codes, validation logic). Consider moving to docs/ or .gitignore if repo
  becomes public.
- `.env.local` contains NEXT_PUBLIC_PAYPAL_CLIENT_ID — never commit .env files.
- PayPal secrets are in Firebase Functions config (`firebase functions:config:get paypal`).

## Branch Convention

- Current branch: 96/12.8
- Default branch: main

## Personal Preferences

- Never expose email addresses in UI or comments.
- Prefer minimal scope changes — avoid broad rewires unless explicitly requested.
- Navigation/menu tasks: enforce strict scope lock (unchanged vs changed list).
