import { assetUrl } from "@/data/media-map";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ShoppingCart,
  LogIn,
  Home,
  Package,
  Info,
  Phone,
  LogOut,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { CART_ARRIVE_EVENT } from "@/lib/cart-fly";
import { useMedia } from "@/lib/store";

/* Site media — resolved from Supabase Storage when VITE_MEDIA_BASE_URL is set. */
const logo = { url: assetUrl("LOGO.png") };

const navItems = [
  { to: "/", label: "B Cube", Icon: Home },
  { to: "/product", label: "Product", Icon: Package },
  { to: "/about", label: "About us", Icon: Info },
  { to: "/contact", label: "Contact us", Icon: Phone },
];

/** Shakes the icon / pops the counter whenever a flying product lands in the cart. */
function useCartArrival() {
  const [pulse, setPulse] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const onArrive = () => {
      setPulse((n) => n + 1);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPulse(0), 700);
    };
    window.addEventListener(CART_ARRIVE_EVENT, onArrive);
    return () => {
      window.removeEventListener(CART_ARRIVE_EVENT, onArrive);
      window.clearTimeout(timer.current);
    };
  }, []);
  return pulse > 0;
}

export function Header() {
  const { count } = useCart();
  const arrived = useCartArrival();
  const { user, isAdmin } = useAuth();
  const { media } = useMedia();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    void navigate({ to: "/login", replace: true });
  }

  return (
    <>
      <header className="sticky top-2 z-40 mx-2 rounded-[25px] border border-white/40 bg-white/30 backdrop-blur-2xl backdrop-saturate-150 md:mx-4">
        <div className="container mx-auto flex items-center gap-4 px-4 py-1.5 md:gap-6">
          <Link
            to="/"
            className="flex items-center shrink-0 transition-transform duration-300 hover:scale-105"
          >
            <img
              src={media("logo", logo.url)}
              alt="B Cube logo"
              className="h-11 w-11 md:h-14 md:w-14 object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full bg-brand-yellow px-2 py-1.5 shadow-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/40"
                activeProps={{
                  className:
                    "rounded-full px-3 py-1.5 text-sm font-semibold text-brand-red bg-white/70",
                }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/cart"
              data-cart-target
              className="relative inline-flex items-center gap-2 rounded-full border border-brand-red px-3 py-1.5 text-sm font-medium text-brand-red transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-red/5 md:px-4"
            >
              <span className="hidden sm:inline">Cart</span>{" "}
              <ShoppingCart className={`h-4 w-4 ${arrived ? "cart-shake" : ""}`} />
              {count > 0 && (
                <span
                  key={count}
                  className={`absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-yellow text-[10px] font-bold text-brand-ink ${arrived ? "badge-pop" : ""}`}
                >
                  {count}
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/20 px-3 py-1.5 text-sm font-semibold text-brand-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/50 md:px-4"
              >
                <span className="hidden sm:inline">Admin</span> <Shield className="h-4 w-4" />
              </Link>
            )}
            {user ? (
              <button
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-brand-ink transition-all duration-300 hover:-translate-y-0.5 hover:brightness-95 md:px-4"
              >
                <span className="hidden sm:inline">Sign out</span> <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-brand-ink transition-all duration-300 hover:-translate-y-0.5 hover:brightness-95 md:px-4"
              >
                <span className="hidden sm:inline">Login</span> <LogIn className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-2 bottom-2 z-50 flex items-center justify-around rounded-[25px] border border-white/40 bg-brand-yellow/55 px-2 py-2 backdrop-blur-2xl backdrop-saturate-150 md:hidden">
        {navItems.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-medium text-brand-ink transition-transform duration-200 active:scale-90"
            activeProps={{
              className:
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl bg-white/70 px-2 py-1 text-[11px] font-semibold text-brand-red",
            }}
            activeOptions={{ exact: to === "/" }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
        {/* Mobile cart landing point for the add-to-cart flight */}
        <Link
          to="/cart"
          data-cart-target
          className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1 text-[11px] font-medium text-brand-ink transition-transform duration-200 active:scale-90"
          activeProps={{
            className:
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl bg-white/70 px-2 py-1 text-[11px] font-semibold text-brand-red",
          }}
        >
          <ShoppingCart className={`h-5 w-5 shrink-0 ${arrived ? "cart-shake" : ""}`} />
          <span className="truncate">Cart</span>
          {count > 0 && (
            <span
              className={`absolute right-1 top-0 grid h-4 w-4 place-items-center rounded-full bg-brand-red text-[9px] font-bold text-white ${arrived ? "badge-pop" : ""}`}
            >
              {count}
            </span>
          )}
        </Link>
      </nav>
    </>
  );
}
