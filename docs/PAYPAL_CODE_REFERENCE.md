# PayPal Live Integration — Code Changes Reference

## Summary

- ✅ Added `createPaypalOrder` callable to Firebase Functions
- ✅ Added `capturePaypalOrder` callable to Firebase Functions  
- ✅ Added `paypalWebhook` HTTP handler to Firebase Functions
- ✅ Updated `subscribe/page.tsx` to use new callables
- ✅ Updated `PremiumButton.tsx` to use new callables
- ✅ Build verified ✓ TypeScript checks ✓

---

## Key Code Patterns

### Pattern 1: Server-Side Order Creation

**Before** (client-side):
```typescript
createOrder={(_data, actions) => {
  return actions.order.create({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value: amount } }],
  });
}}
```

**After** (server-side):
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

---

### Pattern 2: Capture + Backend Finalization

**Before** (client-side capture only):
```typescript
onApprove={async (data, actions) => {
  if (!actions.order) return;
  await actions.order.capture();
  // No backend verification!
}}
```

**After** (client capture + backend verification):
```typescript
onApprove={async (data, actions) => {
  if (!actions.order) return;
  await actions.order.capture();  // Fast UI feedback
  
  const functions = getFunctions();
  const capturePaypalOrder = httpsCallable(functions, 'capturePaypalOrder');
  await capturePaypalOrder({
    orderId: data.orderID,
    tier: backendTier,
    period: billingPeriod,
  });
  
  toast({ title: 'Subscription active' });
  router.push('/');
}}
```

---

### Pattern 3: Backend Order Verification

**Functions code** (two-stage verification):
```typescript
// Stage 1: Capture with PayPal API
const response = await fetch(`${apiBase}/v2/checkout/orders/${orderId}/capture`, { ... });
const captured = await response.json();
if (captured.status !== "COMPLETED") throw error;

// Stage 2: Verify order details
await verifyPaypalOrder(orderId, tier);  // Checks amount, currency, status

// Stage 3: Replay protection
await markPaypalOrderUsed(orderId, uid, tier);  // Firestore transaction

// Stage 4: Update Firestore
await userRef.set({ subscriptionTier: tier, status: "active", ... }, {merge: true});

// Stage 5: Set custom claims
await getAuth().setCustomUserClaims(uid, {
  ...existingClaims,
  isPremium: tier === "tier2",
  subscriptionTier: tier,
});
```

---

## API Signatures

### createPaypalOrder

```typescript
// Input (Firestore CallableRequest)
type CreatePaypalOrderRequest = {
  amount: string;       // "1.00"
  tier: string;         // "tier1" | "tier2"
  period: string;       // "monthly" | "annual"
}

// Output (response.data)
type CreatePaypalOrderResponse = {
  orderID: string;      // "3FR12345..."
}

// Thrown errors
401 - "User must be authenticated"
400 - "Invalid amount" | "tier must be tier1 or tier2" | "period must be monthly or annual"
500 - "Payment service is not configured" | "Failed to create PayPal order"
```

### capturePaypalOrder

```typescript
// Input
type CapturePaypalOrderRequest = {
  orderId: string;      // "3FR12345..."
  tier: string;         // "tier1" | "tier2"
  period: string;       // "monthly" | "annual"
}

// Output
type CapturePaypalOrderResponse = {
  success: boolean;     // true
  tier: string;         // "tier1" | "tier2"
  status: string;       // "active"
}

// Thrown errors
400 - "Invalid argument" for missing/bad inputs
401 - "User must be authenticated"
402 - "Failed to capture PayPal order" (PayPal capture failed)
409 - "Payment amount or currency is invalid" for amount mismatch
409 - "This PayPal order has already been used" (replay attempt)
500 - "Failed to process payment" (Firestore/Auth error)
```

### paypalWebhook

```typescript
// Input (HTTP POST)
type PayPalWebhookEvent = {
  event_type?: string;   // "PAYMENT.CAPTURE.COMPLETED"
  resource?: {
    id?: string;         // Order ID
    status?: string;     // "COMPLETED"
    custom_id?: string;
  };
}

// Headers verified
"paypal-transmission-id"
"paypal-transmission-time"
"paypal-cert-url"
"paypal-auth-algo"
"paypal-transmission-sig"
"paypal-webhook-id"

// Response
200 - {received: true}
202 - (if webhook ID not configured, logs event unverified)
401 - {error: "Signature verification failed"}
405 - {error: "Method not allowed"} (non-POST)
500 - {error: "Internal error"} (exception during processing)
```

---

## Data Structures

### Firestore `/users/{uid}` (Updated by capturePaypalOrder)

```typescript
{
  subscriptionTier: "tier1" | "tier2",
  subscriptionStatus: "active" | "cancelled" | "suspended",
  status: "active" | "pending" | "inactive",
  startDate: Timestamp,
  package: "starter" | "premium",
  paypalOrderId: "3FR12345...",
  // ... other user fields
}
```

### Firestore `/paypalOrders/{orderId}` (Created by markPaypalOrderUsed)

```typescript
{
  uid: "user123...",
  tier: "tier1" | "tier2",
  createdAt: Timestamp,
}
```

### Firestore `/webhooks/{docId}` (Created by paypalWebhook handler)

```typescript
{
  event: "PAYMENT.CAPTURE.COMPLETED" | "...",
  orderId: "3FR12345...",
  status: "COMPLETED",
  timestamp: Timestamp,
}
```

### Firestore `/logs/{docId}` (Created by various functions)

```typescript
{
  userId: "user123...",
  action: "createPaypalOrder" | "capturePaypalOrder" | "...",
  details?: {
    orderId?: string,
    tier?: "tier1" | "tier2",
    period?: "monthly" | "annual",
  },
  timestamp: Timestamp,
}
```

### Custom Claims (Set by capturePaypalOrder)

```typescript
{
  isPremium: true | false,
  subscriptionTier: "tier1" | "tier2",
  politenessLevel?: "bronze" | "silver" | "gold",
  verificationLevel?: "level1" | "...",
  decentralizedId?: string,
  isAdmin?: boolean,
  email?: string,
  // ... other claims
}
```

---

## Error Flow Diagram

```
createPaypalOrder()
  ├─ Auth check (401 if not logged in)
  ├─ Input validation (400 if invalid)
  └─ PayPal create order API (500 if fails)
       └─ Return orderID

capturePaypalOrder()
  ├─ Auth check (401)
  ├─ Input validation (400)
  ├─ PayPal capture API (402 if fails)
  ├─ verifyPaypalOrder()
  │   ├─ PayPal get order API (402 if fails)
  │   ├─ Status check: COMPLETED (402 if not)
  │   └─ Amount validation (402 if mismatch)
  ├─ markPaypalOrderUsed()
  │   └─ Firestore transaction (409 if already used)
  ├─ Firestore update (500 if fails)
  ├─ Custom claims set (500 if fails)
  └─ Return success

paypalWebhook() [POST]
  ├─ Method check (405 if not POST)
  ├─ Signature verification (401 if invalid, 202 if not configured)
  ├─ Event parsing
  ├─ Firestore logging (500 if fails)
  └─ Return 200 OK
```

---

## Testing Values

### Valid Inputs

```typescript
// Happy path
createPaypalOrder({
  amount: "0.01",           // Cents: 1 penny for testing
  tier: "tier2",            // Premium
  period: "monthly",        // Monthly billing
})

capturePaypalOrder({
  orderId: "3FR12345...",    // From createPaypalOrder response
  tier: "tier2",
  period: "monthly",
})
```

### Invalid Inputs (Should error)

```typescript
// Bad tier
createPaypalOrder({ amount: "1.00", tier: "tier3", period: "monthly" })
// Expected: 400 "tier must be tier1 or tier2"

// Bad period
createPaypalOrder({ amount: "1.00", tier: "tier2", period: "quarterly" })
// Expected: 400 "period must be monthly or annual"

// Non-numeric amount
createPaypalOrder({ amount: "abc", tier: "tier2", period: "monthly" })
// Expected: 400 "Invalid amount"

// Replay attack
capturePaypalOrder({ orderId: "3FR...", tier: "tier2", period: "monthly" })
capturePaypalOrder({ orderId: "3FR...", tier: "tier2", period: "monthly" }) // Same order twice
// Expected on 2nd call: 409 "This PayPal order has already been used"

// Unauthenticated
// Call createPaypalOrder without Firebase auth
// Expected: 401 "User must be authenticated"
```

---

## Environment Variables

### Required (Firebase Functions Config)

```bash
functions.config.paypal.client_id = "YOUR_LIVE_CLIENT_ID"
functions.config.paypal.client_secret = "YOUR_LIVE_SECRET"
```

### Optional

```bash
functions.config.paypal.api_base = "https://api-m.paypal.com"        # Default
functions.config.paypal.webhook_id = "YOUR_WEBHOOK_ID"               # For signature verification
functions.config.paypal.tier1_amount = "0.25"                        # For validation (optional)
functions.config.paypal.tier1_currency = "USD"
functions.config.paypal.tier2_amount = "1.00"
functions.config.paypal.tier2_currency = "USD"
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
```

---

## Logging Examples

### Successful Flow

```
[INFO] Created PayPal order 3FR12345 for user uid123 (tier=tier2, amount=1.00)
[INFO] Captured order 3FR12345 and set premium status for user uid123
[INFO] Claims set for user uid123: isPremium=true, subscriptionTier=tier2
```

### Error Flow

```
[ERROR] PayPal create order failed: 401 UNAUTHORIZED
[WARN] PayPal order 3FR12345 has non-completed status: APPROVED
[WARN] Attempted reuse of PayPal orderId 3FR12345 by user uid123
[ERROR] PayPal order 3FR12345 amount mismatch. Expected 1.00 USD, got 0.50 USD
```

---

## Migration Notes

- ✅ Existing `updateSubscriptionStatus` callable still works (backward compatible)
- ✅ No breaking changes to Firestore schema
- ✅ No breaking changes to custom claims format
- ✅ Can gradually roll out without affecting existing users
- ✅ Both old and new flow work simultaneously

---

## Rollback

If needed, revert these files:

```bash
git checkout HEAD~1 functions/src/index.ts
git checkout HEAD~1 src/app/subscribe/page.tsx
git checkout HEAD~1 src/components/ui/PremiumButton.tsx
firebase deploy --only functions,hosting
```

The old flow via `updateSubscriptionStatus` will still work as fallback.
