# olsme.tv Security Hardening — Implementation Summary

**Date:** March 22, 2026  
**Status:** ✅ Implemented  
**Scope:** Signup flow, bot verification, premium field lockdown, custom claims

---

## Changes Made

### 1. **Turnstile Signup Flow: Credential Leak Prevention** ⚠️

**Vulnerability:** `auth-signup-form.tsx` was sending email/password/name to `/api/verify-turnstile` endpoint.  
**Risk:** Credentials exposure, potential logging in verify endpoint.

**Fix:** Split the flow into two stages:
- **Stage 1 (Verify):** Send **ONLY** `{ turnstileToken }` to `/api/verify-turnstile`
- **Stage 2 (Signup):** After verification succeeds, call `signUpWithEmail()` locally with credentials

**Files Changed:**
- `src/components/auth/auth-signup-form.tsx`: Removed email/password/name from verify POST; only send token
- `src/app/api/verify-turnstile/route.ts`: Added security check — reject request if email/password/name present

**Test:**
```bash
# Should fail with 400 "Invalid request"
curl -X POST http://localhost:9002/api/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"turnstileToken":"", "email":"test@example.com"}'

# Should succeed (if token valid)
curl -X POST http://localhost:9002/api/verify-turnstile \
  -H "Content-Type: application/json" \
  -d '{"turnstileToken":"valid-token"}'
```

---

### 2. **Premium Gating: Move to Custom Claims** 🔐

**Vulnerability:** `subscribe/page.tsx` was checking `userData.isPremium` from Firestore.  
**Risk:** Client could attempt to write `isPremium: true` directly (mitigated by rules, but unsafe pattern).

**Fix:** Read premium status from **server-set custom claims**, not Firestore.

**Implementation:**
- Early check via `currentUser.getIdTokenResult(true)` in `onAuthStateChanged` callback
- If `claims.isPremium === true || claims.subscriptionTier === 'tier2'` → redirect to `/` (avoid paywall)
- Firestore snapshot still reads for **profile data only** (displayName, email, liveId), not for access control

**Files Changed:**
- `src/app/subscribe/page.tsx`: Added claims check before mounting subscription UI

**Reason:** Custom claims are set server-side by Cloud Functions after PayPal verification and cannot be forged by client code. Reading from claims is the authoritative check.

---

### 3. **Firestore Rules: Reinforce Premium Field Lockdown** 🛡️

**Current State (Already In Place):**
```firstore
function serverManagedFields() {
  return ['isPremium', 'subscriptionTier', 'subscriptionStatus',
          'package', 'startDate', 'paypalOrderId'];
}

allow create: if request.auth != null
  && request.auth.uid == userId
  && !request.resource.data.keys().hasAny(serverManagedFields());

allow update: if request.auth != null
  && request.auth.uid == userId
  && request.resource.data.diff(resource.data).affectedKeys()
       .hasNone(serverManagedFields());
```

**What This Does:**
- Blocks any client write that **attempts to set** premium fields in `create` or `update`
- Uses Firestore's `diff()` to compare old vs. new data — blocks if any serverManagedFields changed

**Test (Should Fail):**
```typescript
// In browser console on /subscribe:
const db = getFirestore();
await setDoc(doc(db, 'users', auth.currentUser.uid), { isPremium: true }, { merge: true });
// → Permission denied error
```

---

### 4. **Turnstile Env Var: Add Validation** 📝

**Change:** Added console warning if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is not configured.

**Files Changed:**
- `src/components/auth/auth-signup-form.tsx`: Added dev-time warning log

**Effect:**
- Dev environments without the env var can still sign up (Turnstile widget hidden)
- Production deployment will fail loudly if sitekey missing

**Setup (Required for Production):**
1. Add to `.env.local` (development):
   ```
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-sitekey-here
   ```

2. Add to Firebase AppHosting / Vercel secrets (production):
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → sitekey
   - `TURNSTILE_SECRET_KEY` → secret (for functions)

---

## Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Premium fields locked in Firestore rules | ✅ | `diff()` blocks all client writes |
| Custom claims set by server after PayPal | ✅ | `updateSubscriptionStatus` callable sets `isPremium` |
| Subscribe page reads from claims | ✅ | Early check before rendering |
| Turnstile token not mixed with credentials | ✅ | Split into 2 stages |
| Verify endpoint rejects credentials | ✅ | Explicit type check in route |
| `npm audit` vulnerabilities | ⚠️ | 18 low severity — run `npm audit fix` |
| Turnstile sitekey in env var | ✅ | Configured with fallback warning |

---

## Testing Flow (End-to-End)

### Scenario 1: Normal Signup
```bash
1. User enters name, email, password
2. Form requests Turnstile verification (POST /api/verify-turnstile)
3. Turnstile returns 200 → token verified
4. Form calls signUpWithEmail() with credentials
5. User redirected to /subscribe
6. No custom claims yet → paywall shows
7. User completes PayPal purchase
8. PayPal callback → updateSubscriptionStatus callable runs
9. Custom claim isPremium=true is set
10. User refreshes or logs back in → redirected to / (premium access)
```

### Scenario 2: Attempted Client Exploit
```bash
1. User opens browser console on /subscribe page
2. Tries: await setDoc(..., { isPremium: true }, { merge: true })
3. Firebase returns: "Permission denied" (Firestore rule blocks)
4. subscribe page still shows (component reads from claims, not Firestore)
5. Refresh page → still on /subscribe (claims unchanged)
```

### Scenario 3: Missing Turnstile Config
```bash
1. Dev runs app without NEXT_PUBLIC_TURNSTILE_SITE_KEY
2. Console shows warning (isTurnstileConfigured = false)
3. Turnstile widget does NOT render
4. Signup still works (for local testing)
5. Production deploy fails if env var missing
```

---

## Remaining Vulnerabilities (Low Priority)

1. **No webhook replay protection:** PayPal IPN could theoretically be replayed.  
   *Mitigation:* `markPaypalOrderUsed()` in callable checks for reuse; would need webhook-specific tracking.

2. **CORS on callables:** Functions have `cors: true` to allow browser requests.  
   *Mitigation:* Firebase App Check can restrict to verified app instances (not yet enabled).

3. **npm vulnerabilities:** 18 low severity packages detected.  
   *Action:* Run `npm audit fix` for non-breaking updates; review breaking changes before upgrading.

---

## Deployment Checklist

Before deploying to production:

> **Current hosting mode (March 23, 2026):** Static export. Run `npm run build` then
> `firebase deploy --only hosting`. No SSR/Cloud Run step needed until SSR is restored.
> See [RESTORE_SSR.md](RESTORE_SSR.md) for the revert guide.

- [ ] Firestore rules redeployed: `firebase deploy --only firestore:rules`
- [ ] Cloud Functions redeployed: `firebase deploy --only functions`
- [ ] Environment variables set in Firebase AppHosting secrets:
  - [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - [ ] `TURNSTILE_SECRET_KEY`
  - [ ] `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET`
- [ ] Test signup flow end-to-end in staging
- [ ] Monitor logs for permission errors: `firebase functions:log`
- [ ] Run `npm audit` and review low vulnerabilities

---

## Future Hardening (Nice-to-Have)

- [ ] Firebase App Check: Restrict callables to verified client app
- [ ] Rate limiting on `/api/verify-turnstile` (prevent brute-force bot verification)
- [ ] Custom JWT claims refresh strategy (currently force-refresh on every /subscribe load)
- [ ] PayPal webhook validation (IPN signature verification)
- [ ] Admin interface to revoke or adjust subscriptions server-side

---

## Code Comments for Future Developers

Key files now include inline `// Security:` comments explaining:
1. Why credentials are split from Turnstile token verification
2. Why premium status must come from custom claims, not Firestore
3. Why Firestore rules use `diff()` to block field writes

These can be found in:
- `src/components/auth/auth-signup-form.tsx` (line ~110)
- `src/app/api/verify-turnstile/route.ts` (line ~24)
- `src/app/subscribe/page.tsx` (line ~130)
