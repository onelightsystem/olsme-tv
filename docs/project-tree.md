# Project Tree

Generated from `git ls-files | tree --fromfile` (tracked files only). Regenerate after significant structural changes.

```
.
├── .claude
│   └── CLAUDE.md
├── .env.example
├── .firebaserc
├── .github
│   ├── instructions
│   │   └── instructions.md
│   └── skills
│       ├── debug
│       │   └── SKILL.md
│       ├── dependencies-security
│       │   └── SKILL.md
│       ├── docs-maintenance
│       │   └── SKILL.md
│       ├── firebase-functions
│       │   └── SKILL.md
│       ├── firestore-modular
│       │   └── SKILL.md
│       ├── lt-lh
│       │   └── SKILL.md
│       ├── nextjs-app-router
│       │   └── SKILL.md
│       └── public-repo-transition
│           └── SKILL.md
├── .gitignore
├── .idx
│   ├── dev.nix
│   └── icon.png
├── .modified
├── .npmrc
├── .vscode
│   └── settings.json
├── apphosting.yaml
├── CLAUDE.local.md
├── components.json
├── docs
│   ├── blueprint.md
│   ├── DEPLOY.md
│   ├── LT-LH-PACKAGE-SUGGESTION.md
│   ├── project-tree.md
│   ├── PUBLIC_REPO.md
│   ├── RESTORE_SSR.md
│   └── security.md
├── eslint.config.js
├── firebase.json
├── firestore.rules
├── functions
│   ├── eslint.config.js
│   ├── package-lock.json
│   ├── package.json
│   ├── src
│   │   └── index.ts
│   ├── tsconfig.dev.json
│   └── tsconfig.json
├── next.config.mjs
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
│   └── robots.txt
├── README.md
├── src
│   ├── ai
│   │   ├── actions.ts
│   │   ├── dev.ts
│   │   ├── flows
│   │   │   └── generate-politeness-prompt.ts
│   │   └── genkit.ts
│   ├── app
│   │   ├── about
│   │   │   └── page.tsx
│   │   ├── admin
│   │   │   ├── error.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── notifications
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── referrals
│   │   │   │   └── page.tsx
│   │   │   ├── users
│   │   │   │   ├── logs
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── verifications
│   │   │       └── page.tsx
│   │   ├── api
│   │   │   ├── ipfs
│   │   │   │   └── route.ts
│   │   │   ├── ipfs-upload
│   │   │   │   └── route.ts
│   │   │   └── verify-turnstile
│   │   │       └── route.ts
│   │   ├── dev-log
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── metadata.ts
│   │   ├── page.tsx
│   │   ├── profile
│   │   │   └── page.tsx
│   │   ├── search
│   │   │   └── page.tsx
│   │   ├── signin
│   │   │   └── page.tsx
│   │   └── subscribe
│   │       └── page.tsx
│   ├── components
│   │   ├── admin
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── auth
│   │   │   ├── auth-modal.tsx
│   │   │   ├── auth-signup-form.tsx
│   │   │   └── auth-signup-modal.tsx
│   │   ├── chat
│   │   │   ├── chat-controls.tsx
│   │   │   ├── chat-panel.tsx
│   │   │   ├── login-modal.tsx
│   │   │   ├── video-player.tsx
│   │   │   └── waiting-screen.tsx
│   │   ├── DeveloperLogTimeline.tsx
│   │   ├── GateOfProtection.tsx
│   │   ├── Header.tsx
│   │   ├── landing
│   │   │   ├── landing-signup-form.tsx
│   │   │   └── subscription-cards.tsx
│   │   ├── layout
│   │   │   └── header.tsx
│   │   └── ui
│   │       ├── accordion.tsx
│   │       ├── alert-dialog.tsx
│   │       ├── alert.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── calendar.tsx
│   │       ├── card.tsx
│   │       ├── carousel.tsx
│   │       ├── chart.tsx
│   │       ├── checkbox.tsx
│   │       ├── collapsible.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── menubar.tsx
│   │       ├── popover.tsx
│   │       ├── PremiumButton.tsx
│   │       ├── progress.tsx
│   │       ├── radio-group.tsx
│   │       ├── scroll-area.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── skeleton.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── toast.tsx
│   │       ├── toaster.tsx
│   │       └── tooltip.tsx
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib
│       ├── developer-log.ts
│       ├── firebase
│       │   ├── config.ts
│       │   └── firebase.ts
│       ├── ipfs
│       │   └── kubo-client.ts
│       ├── ipfs-client.ts
│       ├── placeholder-images.json
│       ├── placeholder-images.ts
│       ├── subscription.ts
│       └── utils.ts
├── tailwind.config.ts
└── tsconfig.json
```
