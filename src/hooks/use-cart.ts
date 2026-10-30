import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "bcube-cart";

/**
 * A line in the cart. `config` carries the full configurator state (shape, size,
 * thickness, price, buyer info…) so the order can be re-priced and rendered.
 *
 * Storage: guests keep their cart in the browser. Once the visitor signs in the
 * cart is mirrored into the `carts` table so it follows them across devices.
 */
export type CartItem = {
  id: string;
  slug: string;
  name: string;
  qty: number;
  config?: Record<string, unknown>;
};

function normalise(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i, idx) => {
      const config = (i["config"] as Record<string, unknown> | undefined) ?? undefined;
      const nestedQty = config?.buyerInfo
        ? Number((config.buyerInfo as Record<string, unknown>)["quantity"])
        : undefined;
      const fallbackQty = typeof i["qty"] === "number" && i["qty"] > 0 ? (i["qty"] as number) : 1;
      const parsedQty = nestedQty && nestedQty > 0 && !isNaN(nestedQty) ? nestedQty : fallbackQty;
      if (config) {
        const buyerInfo = (config.buyerInfo as Record<string, unknown> | undefined)
          ? { ...(config.buyerInfo as Record<string, unknown>) }
          : {};
        buyerInfo.quantity = parsedQty;
        config.buyerInfo = buyerInfo;
      }
      return {
        id:
          typeof i["id"] === "string"
            ? (i["id"] as string)
            : `line-${idx}-${String(i["slug"] ?? "")}`,
        slug: String(i["slug"] ?? ""),
        name: String(i["name"] ?? ""),
        qty: parsedQty,
        config,
      };
    });
}
function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return normalise(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("bcube-cart-update"));
}

async function persist(userId: string | null, items: CartItem[]) {
  if (!userId) return;
  await supabase.from("carts").upsert({ user_id: userId, items: items as never });
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    setItems(read());
    const sync = () => setItems(read());
    window.addEventListener("storage", sync);
    window.addEventListener("bcube-cart-update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("bcube-cart-update", sync);
    };
  }, []);

  // Merge the saved cart in once the visitor is known.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null;
      userId.current = uid;
      if (!uid || !active) return;
      const { data: row } = await supabase
        .from("carts")
        .select("items")
        .eq("user_id", uid)
        .maybeSingle();
      const remote = normalise(row?.items);
      const local = read();
      const merged =
        local.length > 0
          ? [...remote.filter((r) => !local.some((l) => l.id === r.id)), ...local]
          : remote;
      if (!active) return;
      write(merged);
      setItems(merged);
      await persist(uid, merged);
    });
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback((next: CartItem[]) => {
    write(next);
    setItems(next);
    void persist(userId.current, next);
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "id" | "qty"> & Partial<Pick<CartItem, "qty">>) => {
      commit([
        ...read(),
        {
          ...item,
          qty: item.qty ?? 1,
          id: `${item.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
      ]);
    },
    [commit],
  );

  const removeItem = useCallback(
    (id: string) => commit(read().filter((i) => i.id !== id)),
    [commit],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      // Allow any quantity from 1 upwards — no minimum order quantity.
      const nextQty = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;

      const updatedItems = read().map((item) => {
        if (item.id !== id) return item;
        const updatedConfig = item.config ? { ...item.config } : {};
        const buyerInfo = (updatedConfig.buyerInfo as Record<string, unknown> | undefined)
          ? { ...(updatedConfig.buyerInfo as Record<string, unknown>) }
          : {};
        buyerInfo.quantity = nextQty;
        updatedConfig.buyerInfo = buyerInfo;
        return {
          ...item,
          qty: nextQty,
          config: updatedConfig,
        };
      });

      commit(updatedItems);
    },
    [commit],
  );
  const clear = useCallback(() => commit([]), [commit]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((sum, i) => {
    const price = Number(i.config?.["price"] ?? 0);
    return sum + (Number.isFinite(price) ? price : 0) * i.qty;
  }, 0);

  return { items, count, subtotal, addItem, removeItem, setQty, clear };
}
