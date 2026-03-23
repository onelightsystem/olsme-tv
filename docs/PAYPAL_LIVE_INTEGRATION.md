# PayPal Live Integration Guide

**Status**: ✅ Complete - Live environment configured (no sandbox)  
**Date**: March 22, 2026  
**Environment**: Firebase Functions v2, PayPal Orders API v2

---

## Overview

This guide documents the end-to-end PayPal live payment flow for olsme.tv. All payment processing uses **PayPal Live API** (not sandbox).

### Architecture

```
Frontend                         Firebase Functions              PayPal API
─────────────────────────────────────────────────────────────────────────────

1. createPaypalOrder [callable]
   (tier, amount, period)    →   createPaypalOrder callable  →  POST /v2/checkout/orders
                                 (returns orderID)            ←  orderID (live)

2. PayPal Button Widget (client-side)
   (shows order & capture UI)

3. onApprove [client action]  →   capturePaypalOrder callable  →  POST /v2/checkout/orders/{id}/capture
   (orderId)                      - Capture API call
                                 - Verify order (second check)
                                 - Mark replay protection
                                 - Update Firestore
                                 - Set custom claims         ←  COMPLETED

4. [Optional] Webhook Listener
   paypalWebhook             ←   PayPal PAYMENT.CAPTURE.COMPLETED event
   (logs event for reconciliation)
```

---

## Configuration

### Environment Variables

**Firebase Functions Config** (set via `firebase functions:config:set`):
```bash
paypal.client_id=<LIVE_CLIENT_ID>
paypal.client_secret=<LIVE_SECRET>
paypal.api_base=https://api-m.paypal.com  # Live endpoint, not sandbox
paypal.webhook_id=<WEBHOOK_ID>           # Optional, for webhook signature verification
```

**Frontend Environment** (`.env.local`):
```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<SAME_CLIENT_ID>
```

### Retrieve from PayPal Dashboard (Live)

1. Go to **PayPal Business Account** → **Developer** → **Apps & Credentials**
2. Select **Live** tab (NOT Sandbox)
3. Copy **Client ID** and **Secret** from the app credentials
4. Log format: `oauth2/signature`

### Webhook Registration (Optional but Recommended)

1. Go to **Developer** → **Webhooks**
2. Create webhook pointing to: `https://<YOUR_FUNCTION_DOMAIN>/paypalWebhook`
3. Select event: **Payments - Capture Completed** (`PAYMENT.CAPTURE.COMPLETED`)
4. Copy **Webhook ID** to Firebase config

---

## API Callables

### 1. `createPaypalOrder`

**Purpose**: Server-side order creation (optional but safer than client-side)

**Request**:
```typescript
{
  amount: "1.00",        // USD, as string (PayPal format)
  tier: "tier2",         // "tier1" or "tier2"
  period: "monthly"      // "monthly" or "annual"
}
```

**Response**:
```typescript
{
  orderID: "3FR..." // PayPal Order ID
}
```

**Backend Flow**:
1. Validates user is authenticated
2. Validates amount is numeric, tier is valid, period is valid
3. Creates order via PayPal Orders API
4. Returns orderID for frontend PayPal button
5. Logs: "Created PayPal order {id} for user {uid}"

**Error Handling**:
- 401 Unauthenticated: User not logged in
- 400 Invalid argument: Bad tier/period/amount
- 500 Internal: PayPal API unreachable or misconfigured

---

### 2. `capturePaypalOrder`

**Purpose**: Server-side capture + premium claim setting

**Request**:
```typescript
{
  orderId: "3FR...",     // From PayPal (via onApprove)
  tier: "tier2",         // "tier1" or "tier2"
  period: "monthly"      // "monthly" or "annual"
}
```

**Response**:
```typescript
{
  success: true,
  tier: "tier2",
  status: "active"
}
```

**Backend Flow**:
1. Validates user is authenticated
2. Validates orderId, tier, period
3. **Captures** order via PayPal: `POST .../v2/checkout/orders/{id}/capture`
4. Verifies capture status = "COMPLETED"
5. **Verifies** order server-side (amount, currency, status)
6. **Marks** order as used (replay protection, Firestore)
7. **Updates** Firestore: subscriptionTier, status, startDate, paypalOrderId
8. **Sets custom claims**: isPremium=true/false, subscriptionTier=tier
9. Logs action
10. Returns success

**Critical Security**:
- 🔐 Two-stage verification (capture + verifyPaypalOrder)
- 🔐 Replay protection (markPaypalOrderUsed)
- 🔐 Server-side only (no client can forge payment)
- 🔐 Custom claims set on backend (immutable on client)

**Error Handling**:
- 400 Invalid argument: Missing/bad orderId/tier/period
- 402 Permission denied: PayPal order capture failed
- 409 Conflict: Order already used (replay attempt)
- 500 Internal: Firestore/Auth error

---

### 3. `paypalWebhook` (Optional)

**Purpose**: Webhook backup (logs PAYMENT.CAPTURE.COMPLETED events)

**Endpoint**:
```
POST https://<YOUR_FUNCTION_DOMAIN>/paypalWebhook
```

**Headers Verified**:
- `paypal-transmission-id`
- `paypal-transmission-time`
- `paypal-cert-url`
- `paypal-auth-algo`
- `paypal-transmission-sig`
- `paypal-webhook-id`

**Backend Flow**:
1. Validates HTTP method = POST
2. Verifies webhook signature with PayPal (if PAYPAL_WEBHOOK_ID set)
3. Extracts event type and resource
4. If `PAYMENT.CAPTURE.COMPLETED`:
   - Logs: "Webhook: PAYMENT.CAPTURE.COMPLETED for order {id}, status={status}"
   - Stores event in `webhooks` collection for reconciliation
5. Returns 200 OK

**Note**: Webhook is backup only. Primary flow is `capturePaypalOrder` callable.

---

## Frontend Integration

### Subscribe Page (`src/app/subscribe/page.tsx`)

**createOrder** (called by PayPal button):
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

**onApprove** (called after user approves in PayPal UI):
```typescript
onApprove={async (data, actions) => {
  if (!actions.order) return;
  
  // Capture on client side
  await actions.order.capture();
  
  // Call backend to finalize payment and set premium claim
  const functions = getFunctions();
  const capturePaypalOrder = httpsCallable(functions, 'capturePaypalOrder');
  await capturePaypalOrder({
    orderId: data.orderID,
    tier: backendTier,
    period: billingPeriod,
  });

  toast({ title: 'Subscription active', ... });
  router.push('/');
}}
```

### Premium Button (`src/components/ui/PremiumButton.tsx`)

Same pattern as subscribe page:
- `createPaypalOrder` → `createOrder`
- Client-side capture
- `capturePaypalOrder` → finalize
- Toast + redirect

---

## Testing Steps

### Prerequisites

```bash
# 1. Ensure build passes
npm run build
# Output: ✓ Compiled successfully, 14/14 pages generated

# 2. Deploy functions
firebase deploy --only functions
# Output: ✓ Deploy complete

# 3. Set environment variables (if not already set)
firebase functions:config:set paypal.client_id="<LIVE_ID>" paypal.client_secret="<LIVE_SECRET>"
firebase deploy --only functions
```

### Test 1: Create Order (Happy Path)

**Goal**: Verify `createPaypalOrder` callable

```bash
# Via Firebase Console (Cloud Functions test tab)
# Call createPaypalOrder with:
# {
#   "amount": "0.01",
#   "tier": "tier2",
#   "period": "monthly"
# }

# Expected:
# - Status: 200
# - Response: { "orderID": "3FR..." }
# - Function logs: "Created PayPal order 3FR... for user {uid}"
```

### Test 2: Capture Order (Happy Path)

**Goal**: Verify full capture + premium claim flow

```bash
# Via Firebase Console or dev/staging site:

# 1. Login as test user: test@example.com / password
# 2. Go to /subscribe
# 3. Select Premium, click PayPal button
# 4. Approve payment in PayPal (use sandbox card or test account)
#    - Card: 4111 1111 1111 1111
#    - Expiry: 12/25
#    - CVC: 123
# 5. After approval, watch console output

# Expected:
# - Frontend toast: "Subscription active"
# - Redirect to / (home)
# - Check user claims via Firebase Console:
#   - Claims.isPremium = true
#   - Claims.subscriptionTier = "tier2"
# - Check Firestore /users/{uid}:
#   - subscriptionStatus = "active"
#   - paypalOrderId = "3FR..."
# - Check Functions logs:
#   - "Captured order 3FR... and set premium status"
#   - "Set custom claims for user {uid}"
```

### Test 3: Replay Protection

**Goal**: Verify order can't be reused

```bash
# 1. After Test 2, try to use same orderId again
# 2. Call capturePaypalOrder with original orderId
# 3. Expected error: "This PayPal order has already been used" (409)
# 4. Check Functions logs: "Attempted reuse of PayPal orderId"
```

### Test 4: Webhook Logging (Optional)

**Goal**: Verify webhook accepts PAYMENT.CAPTURE.COMPLETED

```bash
# If webhook is registered:

# 1. Complete another payment via /subscribe
# 2. Check Firestore /webhooks collection:
#    - Should have document with event: "PAYMENT.CAPTURE.COMPLETED"
#    - orderId matches captured payment
#    - status: "COMPLETED"
# 3. Check Functions logs:
#    - "Webhook: PAYMENT.CAPTURE.COMPLETED for order {id}"
```

### Test 5: Amount Validation (Negative Test)

**Goal**: Verify mismatched amounts are rejected

```bash
# 1. Manually create order for $1.00 (tier2-monthly)
# 2. Approve in PayPal for correct amount ($1.00)
# 3. Call capturePaypalOrder
# 4. Should succeed (amounts match)

# 5. Create order for $1.00 but PayPal captures only $0.50
# 6. Call capturePaypalOrder
# 7. Expected: verifyPaypalOrder fails with "Payment amount or currency is invalid"
```

### Test 6: Missing Credentials (Negative Test)

**Goal**: Verify graceful failure when config is missing

```bash
# 1. Temporarily remove PAYPAL_CLIENT_SECRET from Firebase config
# 2. Call createPaypalOrder
# 3. Expected: 500 error "Payment service is not configured"
# 4. Check logs: "PayPal credentials are not configured"
# 5. Restore config
```

---

## Troubleshooting

### "Failed to create PayPal order"

**Causes**:
- ❌ PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set in Firebase config
- ❌ Client ID is from Sandbox, not Live
- ❌ Network issue (firewall blocking api-m.paypal.com)

**Fix**:
```bash
# Verify credentials
firebase functions:config:get paypal

# Should show client_id and client_secret from Live app
# If missing, set them:
firebase functions:config:set paypal.client_id="<LIVE_ID>" paypal.client_secret="<LIVE_SECRET>"

# Redeploy functions
firebase deploy --only functions
```

### "Payment amount or currency is invalid"

**Causes**:
- ❌ User created order for $1.00 but PayPal charged different amount
- ❌ Frontend sent wrong amount to `createPaypalOrder`

**Fix**:
- Verify PAYPAL_TIER2_AMOUNT and PAYPAL_TIER2_CURRENCY are set (optional but helps)
- Check PayPal transaction history for actual charged amount
- Clear browser cache and try again

### "This PayPal order has already been used"

**Expected for replay attempts**, but if happens on first capture:
- ❌ User refreshed page and accidentally called capturePaypalOrder twice
- ❌ Race condition in concurrent requests

**Fix**:
- This is protected behavior (good!)
- User needs to create a new order and pay again
- Monitor logs for patterns

### Order in Firestore but claims not set

**Cause**: capturePaypalOrder succeeded in Firestore step but failed in custom claims step

**Fix**:
```javascript
// Manually set claims in Firebase Console
// Go to Project → Authentication → User → Custom Claims
// Add: { "isPremium": true, "subscriptionTier": "tier2" }
```

### "PAYPAL_WEBHOOK_ID not configured"

**Expected log if webhook ID not set in config**

**To fix**:
1. Register webhook in PayPal Dashboard (see Configuration section)
2. Set PAYPAL_WEBHOOK_ID:
   ```bash
   firebase functions:config:set paypal.webhook_id="<WH_ID>"
   firebase deploy --only functions
   ```

---

## Security Checklist

- ✅ **No client-side order creation**: Backend creates orders
- ✅ **Two-stage verification**: Capture + verifyPaypalOrder
- ✅ **Replay protection**: markPaypalOrderUsed (Firestore transaction)
- ✅ **Amount validation**: Compares PayPal amount to expected tier price
- ✅ **Custom claims only**: Premium status immutable on client
- ✅ **Firestore rules**: Block client writes to premium fields (diff check)
- ✅ **Webhook signature**: Verified with PayPal API (if configured)
- ✅ **Logging**: All actions logged for audit trail
- ✅ **CORS enabled**: Callables accessible from frontend

---

## Future Enhancements

1. **Subscription Webhooks**: Handle BILLING.SUBSCRIPTION.PAYMENT.FAILED for recurring
2. **Refund Handling**: PAYMENT.CAPTURE.REFUNDED event listener
3. **Admin Downgrade**: Callable to remove premium status (testing/disputes)
4. **Payment History**: UI to show past transactions in user account
5. **Invoice PDF**: Generate and email invoice after capture
6. **App Check**: Require Firebase App Check token on capturePaypalOrder for extra security

---

## Support

**PayPal API Docs**: https://developer.paypal.com/docs/api/orders/v2/
**Firebase Functions**: https://firebase.google.com/docs/functions
**Custom Claims**: https://firebase.google.com/docs/auth/admin-sdk-setup#set_custom_claims_on_a_user_account

**Live vs Sandbox**:
- Live: Production payments (real money), `https://api-m.paypal.com`
- Sandbox: Test environment, `https://api-m.sandbox.paypal.com`

This integration uses **Live API** for production-ready payments.
