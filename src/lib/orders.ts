import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/hooks/use-cart";

export type CheckoutDetails = {
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export type PlaceOrderInput = {
  details: CheckoutDetails;
  items: CartItem[];
  subtotal: number;
};

/**
 * Saves an order and its lines. Payment is not collected yet — a payment
 * provider can later update `status` / `payment_reference` on the order row.
 */

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<{ ok: boolean; orderId?: string; amount?: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { ok: false };

  const finalSubtotal = Math.round(input.subtotal);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({ ...input.details, user_id: userId, subtotal: Math.round(input.subtotal) })
    .select("id")
    .single();

  if (error || !order) {
    console.error("order failed", error);
    return { ok: false };
  }

  const lines = input.items.map((i) => ({
    order_id: order.id,
    slug: i.slug,
    name: i.name,
    qty: i.qty,
    unit_price: Math.round(Number(i.config?.["price"] ?? 0)) || 0,
    config: (i.config ?? {}) as never,
  }));

  if (lines.length > 0) {
    const { error: lineError } = await supabase.from("order_items").insert(lines);
    if (lineError) {
      console.error("order items failed", lineError);
      return { ok: false };
    }
  }

  return { ok: true, orderId: order.id, amount: finalSubtotal };
}

// export async function placeOrder(
//   input: PlaceOrderInput,
// ): Promise<{ ok: boolean; orderId?: string }> {
//   const { data: sessionData } = await supabase.auth.getSession();
//   const userId = sessionData.session?.user.id;
//   if (!userId) return { ok: false };

//   const { data: order, error } = await supabase
//     .from("orders")
//     .insert({ ...input.details, user_id: userId, subtotal: Math.round(input.subtotal) })
//     .select("id")
//     .single();

//   if (error || !order) {
//     console.error("order failed", error);
//     return { ok: false };
//   }

//   const lines = input.items.map((i) => ({
//     order_id: order.id,
//     slug: i.slug,
//     name: i.name,
//     qty: i.qty,
//     unit_price: Math.round(Number(i.config?.["price"] ?? 0)) || 0,
//     config: (i.config ?? {}) as never,
//   }));

//   if (lines.length > 0) {
//     const { error: lineError } = await supabase.from("order_items").insert(lines);
//     if (lineError) {
//       console.error("order items failed", lineError);
//       return { ok: false };
//     }
//   }

//   return { ok: true, orderId: order.id };
// }
