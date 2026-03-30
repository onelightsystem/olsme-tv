# PayPal Live Integration — Changes Summary

**Date**: March 22, 2026  
**Status**: ✅ Ready for Deployment  
**Environment**: Firebase Functions v2 + Next.js 16 (Turbopack) + PayPal Live API

---

## Changes Made

### 1. Firebase Functions (`functions/src/index.ts`)

**Added 3 new callables + 1 webhook handler**:

#### `createPaypalOrder` (Callable)
- **Input**: `{ amount: string, tier: "tier1"|"tier2", period: "monthly"|"annual" }`
- **Output**: `{ orderID: string }`
- **Flow**:
  1. Authenticates user (throws 401 if not logged in)
  2. Validates amount (numeric), tier, period
  3. Calls PayPal Orders API: `POST /v2/checkout/orders`
  4. Returns order ID for frontend PayPal button
  5. Logs: "Created PayPal order {id} for user {uid}"

#### `capturePaypalOrder` (Callable)
- **Input**: `{ orderId: string, tier: "tier1"|"tier2", period: "monthly"|"annual" }`
- **Output**: `{ success: true, tier: string, status: "active" }`
- **Flow**:
  1. Authenticates user
  2. Validates orderId, tier, period
  3. Calls PayPal: `POST /v2/checkout/orders/{id}/capture`
  4. Verifies capture status = COMPLETED
  5. **Verifies order** (second check via `verifyPaypalOrder`)
  6. **Marks order used** (replay protection via `markPaypalOrderUsed`)
  7. Updates Firestore: `subscriptionTier`, `status`, `startDate`, `paypalOrderId`
  8. **Sets custom claims**: `isPremium`, `subscriptionTier`
  9. Logs action
  10. Returns success

#### `paypalWebhook` (HTTP Handler)
- **Endpoint**: `POST /paypalWebhook`
- **Purpose**: Optional webhook for `PAYMENT.CAPTURE.COMPLETED` events
- **Flow**:
  1. Verifies webhook signature (if PAYPAL_WEBHOOK_ID configured)
  2. Logs event details
  3. Stores webhook event in Firestore for reconciliation
  4. Returns 200 OK

### 2. Subscribe Page (`src/app/subscribe/page.tsx`)

**Updated PayPal button integration**:

**`createOrder` handler** (NEW):
```typescript
createOrder={async (_data, actions) => {
  const functions = getFunctions();
  const createOrder = httpsCallable(functions, 'createPaypalOrder');
  const result = await createOrder({
    amount: copy.amount,
    tier: tier.startsWith('tier2') ? 'tier2' : 'tier1',
    period: tier.endsWith('-annual') ? 'annual' : 'monthly',
  }) as {data: {orderID: string}};
  return result.data.orderID;
}}
```
- Calls backend `createPaypalOrder` callable
- Returns order ID to PayPal button

**`onApprove` handler** (UPDATED):
```typescript
onApprove={async (data, actions) => {
  if (!actions.order) return;
  await actions.order.capture();  // Client-side capture
  await handleApprove(tier, data.orderID);  // Backend finalization
}}
```
- Captures order on client (fast UI feedback)
- Calls `capturePaypalOrder` callable to finalize and set premium claim

**`handleApprove` function** (UPDATED):
- Now calls `capturePaypalOrder` instead of `updateSubscriptionStatus`
- Single backend call handles: capture verification + premium claim setup
- Toast + redirect on success

### 3. Premium Button (`src/components/ui/PremiumButton.tsx`)

**Updated for server-side order flow**:

**Added imports**:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useToast } from '@hooks/use-toast';
import { useRouter } from 'next/navigation';
```

**`createOrder` handler** (NEW):
```typescript
createOrder={async (_data, actions) => {
  const functions = getFunctions();
  const createOrder = httpsCallable(functions, 'createPaypalOrder');
  const result = await createOrder({
    amount,
    tier: 'tier2',
    period: 'monthly',
  }) as {data: {orderID: string}};
  return result.data.orderID;
}}
```

**`onApprove` handler** (NEW):
```typescript
onApprove={async (data, actions) => {
  if (!actions.order) return;
  await actions.order.capture();
  
  const functions = getFunctions();
  const captureOrder = httpsCallable(functions, 'capturePaypalOrder');
  await captureOrder({
    orderId: data.orderID,
    tier: 'tier2',
    period: 'monthly',
  });
  
  toast({ title: 'Premium activated', ... });
  router.push('/');
}}
```

### 4. Documentation

**Created**: `docs/PAYPAL_LIVE_INTEGRATION.md` (500+ lines)
- Architecture overview
- Configuration steps (API credentials, webhook)
- API reference (all 3 callables + webhook)
- Frontend integration examples
- Comprehensive testing steps (6 test scenarios)
- Troubleshooting guide
- Security checklist
- Future enhancements

---

## Security Features

✅ **No client-side secret exposure** — Backend creates/captures orders  
✅ **Two-stage verification** — Capture + verifyPaypalOrder check  
✅ **Replay protection** — markPaypalOrderUsed (Firestore transaction)  
✅ **Amount validation** — Compares PayPal charge to tier price  
✅ **Custom claims only** — Premium status immutable on client  
✅ **Firestore rules** — Block client writes to premium fields  
✅ **CORS enabled** — Callables work from frontend  
✅ **Comprehensive logging** — All actions logged for audit trail  

---

## Deployment Checklist

### Pre-Deployment

- [ ] Build verified: `npm run build` → `✓ Compiled successfully`
- [ ] Functions TypeScript: No errors detected
- [ ] All 3 callables added to `index.ts`
- [ ] Webhook handler added
- [ ] Frontend uses new callables (subscribe + PremiumButton)
- [ ] PayPal Live credentials ready (not sandbox)

### Deployment Steps

```bash
# 1. Set PayPal credentials in Firebase config
firebase functions:config:set \
  paypal.client_id="<YOUR_LIVE_CLIENT_ID>" \
  paypal.client_secret="<YOUR_LIVE_SECRET>"

# Optional: Set webhook ID (for webhook signature verification)
firebase functions:config:set \
  paypal.webhook_id="<YOUR_WEBHOOK_ID>"

# 2. Deploy functions
firebase deploy --only functions

# 3. Deploy hosting (app)
firebase deploy --only hosting

# 4. Verify in Firebase Console
# - Functions: Check logs for successful deployments
# - Hosting: Verify new code is live

# 5. Test in staging/production
# - Go to /subscribe
# - Select tier, click PayPal button
# - Approve test payment ($0.01)
# - Check claims via Firebase Console
```

### Post-Deployment

- [ ] New functions appear in Firebase Console
- [ ] PAYPAL_CLIENT_ID in app environment variables
- [ ] Test payment creates order (check functions logs)
- [ ] Capture succeeds and sets custom claims
- [ ] User can see premium status in app
- [ ] Replay protection works (reuse same order → error)

---

## Testing Scenarios

### Test 1: Happy Path (Full Flow)
```
1. User: /subscribe → Select Premium
2. Frontend: Call createPaypalOrder → Get orderID
3. PayPal Button: Show checkout UI
4. User: Approve payment ($1.00)
5. Frontend: Capture order + call capturePaypalOrder
6. Backend: Verify + Mark used + Set claims
7. Result: Premium unlocked, redirect to /
```

**Expected Logs**:
```
Created PayPal order 3FR... for user uid123
Captured order 3FR... and set premium status for user uid123
```

### Test 2: Replay Protection
```
1. Use same orderId from Test 1
2. Call capturePaypalOrder again
3. Expected: 409 "This PayPal order has already been used"
```

### Test 3: Amount Mismatch (Negative)
```
1. Create order for $1.00
2. PayPal captures only $0.50
3. Call capturePaypalOrder
4. Expected: 402 "Payment amount or currency is invalid"
```

### Test 4: Missing Credentials (Negative)
```
1. Remove PAYPAL_CLIENT_SECRET from Firebase config
2. Call createPaypalOrder
3. Expected: 500 "Payment service is not configured"
```

### Test 5: Invalid Tier (Negative)
```
1. Call createPaypalOrder with tier: "tier3"
2. Expected: 400 "tier must be \"tier1\" or \"tier2\""
```

### Test 6: Unauthenticated (Negative)
```
1. Call createPaypalOrder without logging in
2. Expected: 401 "User must be authenticated"
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `functions/src/index.ts` | +3 callables, +1 webhook handler (~500 lines) |
| `src/app/subscribe/page.tsx` | Updated `createOrder` and `onApprove` handlers |
| `src/components/ui/PremiumButton.tsx` | Added imports, updated `createOrder`/`onApprove` |
| `docs/PAYPAL_LIVE_INTEGRATION.md` | **NEW** — 500+ line integration guide |

---

## Rollback Plan

If issues arise post-deployment:

```bash
# 1. Revert functions to previous version
git checkout HEAD~1 functions/src/index.ts
firebase deploy --only functions

# 2. Revert frontend if needed
git checkout HEAD~1 src/app/subscribe/page.tsx
git checkout HEAD~1 src/components/ui/PremiumButton.tsx
npm run build && firebase deploy --only hosting

# 3. Check logs for failures
firebase functions:log

# 4. Contact PayPal support if API issues
```

---

## Environment

**Requirements**:
- ✅ Node.js 18+ (Firebase Functions v2)
- ✅ Firebase CLI latest
- ✅ PayPal Live API credentials (not sandbox)
- ✅ .env.local with NEXT_PUBLIC_PAYPAL_CLIENT_ID

**API Endpoints**:
- **Live**: `https://api-m.paypal.com/v2/checkout/orders`
- **Not** Sandbox: `https://api-m.sandbox.paypal.com`

**Custom Claims** (set by backend):
```typescript
{
  isPremium: true|false,
  subscriptionTier: "tier1"|"tier2",
  ...existingClaims
}
```

---

## Support & Docs

**External**:
- PayPal Orders API v2: https://developer.paypal.com/docs/api/orders/v2/
- Firebase Functions: https://firebase.google.com/docs/functions
- Firebase Auth Custom Claims: https://firebase.google.com/docs/auth/admin-sdk-setup

**Internal**:
- Integration Guide: `docs/PAYPAL_LIVE_INTEGRATION.md`
- Security: `docs/SECURITY_HARDENING.md`
