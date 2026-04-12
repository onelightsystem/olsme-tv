# CLAUDE.local.md — Project Development Notes

## Environment

- Primary development environment: local macOS setup
- Firebase project: refer to the repository's configured project/alias locally
- Live URL: refer to the deployed hosting domain for the current environment
- Dev server: local development server URL and port are defined by local tooling/config

## Local Workflow

```bash
npm run dev                              # Start the local dev server
firebase emulators:start                 # Local Firebase emulators (if needed)
firebase deploy --only functions,hosting # Deploy both
```

## Security Notes

- Repository documentation may describe implementation details; avoid adding secrets or
  unnecessary environment-specific identifiers to committed markdown files.
- `.env.local` and other local environment files must never be committed.
- Keep PayPal and other service secrets in managed configuration/secrets systems rather than
  committed files.

## Branch Convention

- Use the team's current feature-branch naming convention.
- Default branch: main

## Personal Preferences

- Never expose email addresses in UI or comments.
- Prefer minimal scope changes — avoid broad rewires unless explicitly requested.
- Navigation/menu tasks: enforce strict scope lock (unchanged vs changed list).
