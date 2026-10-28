import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ReqPayload {
  action: string;
  amount?: number;
  currency?: string;
  order_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  notes?: Record<string, string>;
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID") || "";
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Service-role client (bypasses RLS) for trusted server-side DB writes.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function razorpayRequest(method: string, path: string, body?: any) {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function verifySignature(
  secret: string,
  data: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === signature;
}

async function updateOrderStatus(
  razorpayOrderId: string,
  status: string,
) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({
      status,
      payment_provider: "razorpay",
      payment_reference: razorpayOrderId,
      razorpay_order_id: razorpayOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpayOrderId);
  if (error) console.error("[razorpay] updateOrderStatus error:", error);
}

const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "Content-Type, Authorization, apikey, x-client-info, x-razorpay-signature",
  "content-type": "application/json",
};

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, _ctx) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }
    if (req.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed" },
        { status: 405, headers },
      );
    }

    let body: ReqPayload;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400, headers },
      );
    }

    switch (body.action) {
      case "create_order": {
        const { amount, currency = "INR", notes = {} } = body;
        if (!amount || amount <= 0) {
          return Response.json(
            { ok: false, error: "Invalid amount (paise)" },
            { status: 400, headers },
          );
        }
        try {
          const res = await razorpayRequest("POST", "/orders", {
            amount: Math.round(amount),
            currency,
            notes,
          });
          const data = await res.json();
          if (!res.ok) {
            return Response.json(
              {
                ok: false,
                error: data.error?.description || "Create order failed",
              },
              { status: 400, headers },
            );
          }
          return Response.json(
            {
              ok: true,
              id: data.id,
              amount: data.amount,
              currency: data.currency,
            },
            { status: 200, headers },
          );
        } catch (err) {
          return Response.json(
            { ok: false, error: String(err) },
            { status: 500, headers },
          );
        }
      }

      case "verify": {
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        } = body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return Response.json(
            { ok: false, error: "Missing signature fields" },
            { status: 400, headers },
          );
        }
        try {
          const isValid = await verifySignature(
            RAZORPAY_KEY_SECRET,
            `${razorpay_order_id}|${razorpay_payment_id}`,
            razorpay_signature,
          );
          if (isValid) {
            await updateOrderStatus(razorpay_order_id, "paid");
          }
          return Response.json(
            { ok: true, success: isValid },
            { status: 200, headers },
          );
        } catch (err) {
          return Response.json(
            { ok: false, success: false, error: String(err) },
            { status: 500, headers },
          );
        }
      }

      case "webhook": {
        const signature = req.headers.get("x-razorpay-signature") || "";
        const rawBody = await req.text();
        try {
          const isValid = await verifySignature(
            RAZORPAY_KEY_SECRET,
            rawBody,
            signature,
          );
          if (isValid) {
            const event = JSON.parse(rawBody);
            if (event.event === "payment.success") {
              const { order_id: razorpayOrderId } =
                event.payload?.payment?.entity || {};
              if (razorpayOrderId) {
                await updateOrderStatus(razorpayOrderId, "paid");
              }
            }
          }
          return Response.json(
            { ok: true, success: isValid },
            { status: 200, headers },
          );
        } catch (err) {
          return Response.json(
            { ok: false, success: false, error: String(err) },
            { status: 500, headers },
          );
        }
      }

      default:
        return Response.json(
          { ok: false, error: "Unknown action: " + body.action },
          { status: 400, headers },
        );
    }
  }),
};
