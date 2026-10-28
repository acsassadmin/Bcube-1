/**
 * Razorpay Payment Functions (Nitro Serverless)
 * ----------------------------------------------
 * Handles Razorpay payment operations for B Cube shop.
 *
 * Actions (invoked client-side via `supabase.functions.invoke("razorpay", {...})`):
 *   - create_order:   Create a Razorpay order (and save order record)
 *   - verify:         Verify Razorpay payment signature
 *   - webhook:        Handle Razorpay webhook (payment.success)
 *
 * Environment variables (.env):
 *   RAZORPAY_KEY_ID       - Razorpay test/live key ID (e.g. rzp_test_xxxxxxxxxxxx)
 *   RAZORPAY_KEY_SECRET   - Razorpay test/live key secret
 *   SUPABASE_URL                  - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY     - Supabase service_role key (needed for DB writes)
 *
 * client-side usage:
 *   // Create order
 *   const { data, error } = await supabase.functions.invoke("razorpay", {
 *     body: { action: "create_order", amount: 199900, currency: "INR" },
 *   });
 *
 *   // Verify signature after payment
 *   const { data: verifyData } = await supabase.functions.invoke("razorpay", {
 *     body: {
 *       action: "verify",
 *       razorpay_order_id: response.razorpay_order_id,
 *       razorpay_payment_id: response.razorpay_payment_id,
 *       razorpay_signature: response.razorpay_signature,
 *     },
 *   });
 *
 * Deployment to Supabase (Remote Functions):
 *   1. Create a new function named "razorpay" in Supabase dashboard
 *   2. Paste this code into the function
 *   3. Set env vars in Supabase dashboard (Settings -> Environment Variables)
 *   4. Configure webhook in Razorpay dashboard:
 *        URL: https://<project>.supabase.co/functions/v1/razorpay-webhook
 *        Events: payment.success
 *
 * NOTE:
 *   - This is a Node.js (Remote Function) function, NOT a Deno Edge Function.
 *     Supabase Edge Functions use Deno and cannot import npm packages like `razorpay`.
 */

import {
  defineEventHandler,
  readBody,
  readRawBody,
  getHeader,
  setHeader,
} from "h3";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ───────────────────────────────
// Environment variables
// ───────────────────────────────
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn(
    "[razorpay] ⚠ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in environment",
  );
}

// Server-side Supabase client (service_role key => bypasses RLS).
// For production, restrict access to an admin role / use proper RLS policies.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ───────────────────────────────
// Helpers
// ───────────────────────────────

/**
 * Returns a configured Razorpay SDK instance.
 */
function getRazorpay(): Razorpay {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

/**
 * Reads the raw request body (needed for webhook signature verification).
 */
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

/**
 * Updates the order status in Supabase.
 */
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
        ...(razorpayOrderId
          ? { razorpay_order_id: razorpayOrderId }
          : {}),
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

// ───────────────────────────────
// Handler
// ───────────────────────────────
export default defineEventHandler(async (event) => {
  // CORS headers (required for browser SDK calls)
  setHeader(event, "access-control-allow-origin", "*");
  setHeader(event, "access-control-allow-methods", "POST, OPTIONS");
  setHeader(
    event,
    "access-control-allow-headers",
    "Content-Type, Authorization, apikey, x-razorpay-signature",
  );

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const body = await readBody(event);
  const action = body?.action;

  switch (action) {
    // ───────────────────────────────────────────────────────
    // 1. CREATE ORDER  --  create a Razorpay order
    // ───────────────────────────────────────────────────────
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

    // ───────────────────────────────────────────────────────
    // 2. VERIFY  --  verify the Razorpay payment signature
    // ───────────────────────────────────────────────────────
    case "verify": {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = body || {};

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

        // If the signature is valid, mark the order as paid in the DB.
        if (isValid) {
          await updateOrderStatus(razorpay_payment_id, "paid");
        }

        return { ok: true, success: isValid };
      } catch (error) {
        console.error("[razorpay] verify error:", error);
        return { ok: false, success: false, error: "Verification failed" };
      }
    }

    // ───────────────────────────────────────────────────────
    // 3. WEBHOOK  --  handle Razorpay webhook events
    // ───────────────────────────────────────────────────────
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

          // Handle payment.success -- mark order as paid
          if (eventType === "payment.success") {
            const { payment_id: paymentId, order_id: orderId } = payload;
            if (paymentId && orderId) {
              await updateOrderStatus(paymentId, "paid", orderId);
            }
          }

          // TODO: add handlers for other events:
          //   - payment.failed  -> set status = "failed"
          //   - payment.captured -> set status = "paid"
          //   - payment.refunded -> set status = "refunded"
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
