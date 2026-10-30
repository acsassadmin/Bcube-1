# 🔑 Supabase Edge Function Setup — Razorpay Integration

This guide explains how to deploy the **Razorpay payment function** to **Supabase**.

> ⚠️ **Important distinction:**
>
> - **Remote Functions** (Node.js) → can use npm packages like `razorpay` ✅
> - **Edge Functions** (Deno) → **cannot** use npm packages like `razorpay` ❌
>
> The code below is written for **Remote Functions (Node.js)**. If you need true
> **Edge Functions (Deno)**, see the alternative section at the end.

---

## 1. Prerequisites

- A Supabase project (https://app.supabase.com)
- A Razorpay account (https://dashboard.razorpay.com)
- Your Supabase project URL and anon/service role key
- Your Razorpay Key ID and Key Secret

### Get your credentials

| Credential                | Where to find                      |
| ------------------------- | ---------------------------------- |
| Supabase URL              | Dashboard → Project Settings → API |
| Supabase anon key         | Dashboard → Project Settings → API |
| Supabase service_role key | Dashboard → Project Settings → API |
| Razorpay Key ID           | Dashboard → Developers → API Keys  |
| Razorpay Key Secret       | Dashboard → Developers → API Keys  |

---

## 2. Supabase folder structure

```
supabase/
  functions/
    razorpay/
      index.ts         # The Razorpay function code
    razorpay-webhook/
      index.ts         # Webhook endpoint (if used)
```

**Option A: Use the existing Nitro function** (recommended for this project)

```
src/server/functions/razorpay.ts   # Move/copy this to supabase/functions/razorpay/index.ts
```

**Option B: Create a fresh Supabase project**

```
supabase/functions/
  razorpay/
    index.ts
```

---

## 3. Environment variables

In your Supabase Dashboard:

**Settings → Environment Variables**

```bash
# Razorpay (get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxx

# Supabase (Settings → API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

> 💡 For local testing, create a `.env` file in the root of your project:
>
> ```env
> RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
> RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxx
> SUPABASE_URL=https://your-project.supabase.co
> SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
> ```

---

## 4. Deploying to Supabase

### Option A: Using the Supabase CLI (recommended)

1. **Install the Supabase CLI**

   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. **Login to Supabase**

   ```bash
   supabase login
   ```

3. **Link your project**

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   (Get `YOUR_PROJECT_REF` from your project URL, e.g., `klpjyduruuqujsaxguex`)

4. **Create the function**

   ```bash
   mkdir -p supabase/functions/razorpay
   cp src/server/functions/razorpay.ts supabase/functions/razorpay/index.ts
   ```

5. **Deploy**

   ```bash
   supabase functions deploy razorpay
   ```

6. **Verify deployment**
   ```bash
   supabase functions list
   ```

### Option B: Using the Dashboard

1. Go to **Supabase Dashboard → Functions**
2. Click **New Function**
3. Name it `razorpay`
4. Paste the code from `src/server/functions/razorpay.ts` (see §5)
5. Set environment variables (Settings → Environment Variables)
6. Click **Save**
7. Note the function URL (e.g., `https://your-project.supabase.co/functions/v1/razorpay`)

---

## 5. The Razorpay Function Code

### 5.1 Remote Function (Node.js) — Recommended

This is the function that works with the existing project. Place it in
`supabase/functions/razorpay/index.ts`.

```typescript
/**
 * Razorpay Payment Function (Supabase Remote Function / Node.js)
 * ------------------------------------------------------------
 * Handles: create_order, verify, webhook
 */

import { defineEventHandler, readBody, readRawBody, getHeader, setHeader } from "h3";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

// ─── Environment variables ─────────────────────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn("[razorpay] ⚠ Razorpay keys not set in environment");
}

// Server-side Supabase client (service_role key => bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ───────────────────────────────────────────────
function getRazorpay(): Razorpay {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured.");
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

function readRawBodyHelper(event: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    event.node.req.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf8");
    });
    event.node.req.on("end", () => resolve(data));
    event.node.req.on("error", reject);
  });
}

async function updateOrderStatus(
  paymentReference: string,
  status: string,
  razorpayOrderId?: string,
) {
  try {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
        payment_provider: "razorpay",
        payment_reference: paymentReference,
        ...(razorpayOrderId ? { razorpay_order_id: razorpayOrderId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("payment_reference", paymentReference);

    if (error) {
      console.error("[razorpay] updateOrderStatus error:", error);
    }
  } catch (error) {
    console.error("[razorpay] updateOrderStatus exception:", error);
  }
}

// ─── Main handler ──────────────────────────────────────────
export default defineEventHandler(async (event) => {
  // CORS
  setHeader(event, "access-control-allow-origin", "*");
  setHeader(event, "access-control-allow-methods", "POST, OPTIONS");
  setHeader(event, "access-control-allow-headers", "Content-Type, x-razorpay-signature");

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const body = await readBody(event);
  const action = body?.action;

  switch (action) {
    // 1️⃣ CREATE ORDER
    case "create_order": {
      const { amount, currency = "INR", notes = {} } = body || {};
      if (!amount || amount <= 0) {
        return { ok: false, error: "Invalid amount (must be in paise, e.g. 199900)" };
      }

      try {
        const razorpay = getRazorpay();
        const order = await razorpay.orders.create({
          amount: Math.round(Number(amount)),
          currency,
          notes: notes as Record<string, string>,
        });

        return {
          ok: true,
          id: order.id,
          entity: order.entity,
          amount: order.amount,
          currency: order.currency,
          notes: order.notes,
          idempotency_key: order.idempotency_key,
        };
      } catch (error) {
        console.error("[razorpay] create_order error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // 2️⃣ VERIFY PAYMENT
    case "verify": {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return { ok: false, success: false, error: "Missing signature fields" };
      }

      try {
        const razorpay = getRazorpay();
        const isValid = razorpay.util.verifyPaymentSignature(
          {
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
          },
          razorpay_signature,
        );

        if (isValid) {
          await updateOrderStatus(razorpay_payment_id, "paid");
        }

        return { ok: true, success: isValid };
      } catch (error) {
        console.error("[razorpay] verify error:", error);
        return { ok: false, success: false, error: "Verification failed" };
      }
    }

    // 3️⃣ WEBHOOK
    case "webhook": {
      const rawBody = readRawBodyHelper(event);
      const signature = getHeader(event, "x-razorpay-signature") || "";

      if (!signature) {
        return { ok: false, error: "Missing x-razorpay-signature header" };
      }

      try {
        const razorpay = getRazorpay();
        const isValid = razorpay.util.verifySignature(rawBody, signature);

        if (isValid) {
          const webhookEvent = JSON.parse(rawBody);
          const eventType = webhookEvent.event;
          const payload = webhookEvent.payload;

          console.log(`[razorpay] Webhook received: ${eventType}`);

          // Handle payment.success
          if (eventType === "payment.success") {
            const { payment_id: paymentId, order_id: orderId } = payload;
            if (paymentId && orderId) {
              await updateOrderStatus(paymentId, "paid", orderId);
            }
          }

          // TODO: add handlers for other events:
          //   - payment.failed
          //   - payment.captured
          //   - payment.refunded
        }

        return { ok: true, success: isValid };
      } catch (error) {
        console.error("[razorpay] webhook error:", error);
        return {
          ok: false,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    default: {
      return { ok: false, error: `Unknown action: ${action}` };
    }
  }
});
```

---

## 6. Update the frontend (cart.tsx)

Update `src/routes/cart.tsx` to use the correct function URL (if not using
`supabase.functions.invoke`):

```typescript
// Option 1: Using supabase.functions.invoke (default)
const { data: rzpOrder, error: rzpError } = await supabase.functions.invoke("razorpay", {
  body: { action: "create_order", amount: result.amount * 100 },
});

// Option 2: Direct fetch (if deploying as a Remote Function)
const response = await fetch("https://your-project.supabase.co/functions/v1/razorpay", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "create_order", amount: result.amount * 100 }),
});
```

---

## 7. Configure the Razorpay Webhook

In the **Razorpay Dashboard → Webhooks**:

1. **URL**:

   ```
   https://your-project.supabase.co/functions/v1/razorpay-webhook
   ```

   _(or replace `razorpay-webhook` with the function name you chose)_

2. **Events to subscribe**:
   - ✅ `payment.success` (required)
   - ✅ `payment.failed` (recommended)
   - ✅ `payment.captured` (optional)

3. **Secret**: Use your Razorpay **Key Secret** (so the function can verify the signature)

4. **Verify webhook**:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/razorpay-webhook" \
     -H "Content-Type: application/json" \
     -H "x-razorpay-signature: your_signature_here" \
     -d '{"event": "payment.success", "payload": {"payment_id": "pay_...", "order_id": "order_..."}}'
   ```

---

## 8. Update Supabase Database (Optional but recommended)

Add a `razorpay_order_id` column to the `orders` table:

```sql
ALTER TABLE orders
ADD COLUMN razorpay_order_id TEXT;
```

This allows you to track which Razorpay order corresponds to which database order.

---

## 9. Security Notes

1. **Never expose `RAZORPAY_KEY_SECRET` to the browser** – only the publishable key (`VITE_RAZORPAY_KEY_ID`) goes in `cart.tsx`.
2. **Use `service_role` key in the function** – it allows bypassing RLS to update orders. In production, consider:
   - Adding an RLS policy for order updates
   - Adding a `role` column and checking it before updating
3. **Verify all signatures** – Always verify Razorpay signatures before trusting payment events.
4. **Rate limit the webhook** – Prevent duplicate webhook events from processing twice.

---

## 10. Troubleshooting

| Issue                                   | Solution                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `Missing RAZORPAY_KEY_ID`               | Set `RAZORPAY_KEY_ID` in Supabase env vars                                     |
| `Missing RAZORPAY_KEY_SECRET`           | Set `RAZORPAY_KEY_SECRET` in Supabase env vars                                 |
| `Cannot find module 'razorpay'`         | The `razorpay` package must be installed in the Supabase function dependencies |
| `Webhook signature verification failed` | Check that you used the correct Key Secret                                     |
| `Function not found`                    | Run `supabase functions deploy razorpay`                                       |
| `ERR_CONNECTION_REFUSED`                | Check that the function is deployed and the URL is correct                     |

---

## 11. Alternative: Pure Edge Function (Deno, no npm packages)

If you truly need **Edge Functions** (Deno runtime), you cannot use the `razorpay`
npm package. You would need to implement the signature verification manually:

```typescript
// Pure Deno implementation of Razorpay signature verification
function verifyRazorpaySignature(rawBody: string, signature: string, keySecret: string): boolean {
  const crypto = await import("crypto");
  const hmac = crypto.createHmac("sha256", keySecret);
  hmac.update(rawBody);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

But for the full Razorpay integration (creating orders, verifying signatures),
**Remote Functions (Node.js) are strongly recommended** as they use the official
`razorpay` npm package.

---

## 📋 Quick Reference

| Step            | Command/Action                                                |
| --------------- | ------------------------------------------------------------- |
| Install CLI     | `npm install -g supabase`                                     |
| Login           | `supabase login`                                              |
| Link project    | `supabase link --project-ref YOUR_REF`                        |
| Deploy function | `supabase functions deploy razorpay`                          |
| List functions  | `supabase functions list`                                     |
| Set env vars    | Dashboard → Settings → Environment Variables                  |
| Webhook URL     | `https://<project>.supabase.co/functions/v1/razorpay-webhook` |

---

_This integration was added as part of the B Cube checkout flow._
