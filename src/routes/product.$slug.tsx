import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useReducer, useState, useRef, useEffect, useMemo, type ChangeEvent, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  UploadCloud, Shapes, LayoutPanelTop, Ruler, MousePointerClick,
  ImageIcon, ArrowLeft, RotateCcw, MessageCircle, Boxes,
} from "lucide-react";
import { findProduct, customAcrylic, corporateGifting, returnGifts, getProductMode } from "@/data/products";
import { ProductTile } from "@/components/product/ProductTile";
import { imgBySlug, productImageFallback } from "@/data/product-images";
import { Testimonials } from "@/components/sections/Testimonials";
import { CustomerStories } from "@/components/sections/CustomerStories";
import { useCart } from "@/hooks/use-cart";
import { flyToCart } from "@/lib/cart-fly";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { computePrice, formatPrice } from "@/data/pricing";
import { useProducts, usePricing } from "@/lib/store";
import { uploadProductPhoto } from "@/lib/uploads";
import {
  MIN_BULK_QUANTITY,
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  capitalizeName,
  isValidPincode,
  sanitizePhone,
  sanitizePincode,
  sanitizeQuantity,
  validateContactFields,
} from "@/lib/validation";
import roomImg from "@/assets/room-preview.jpg";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = findProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.product.name} — B Cube` : "Product — B Cube" },
      { name: "description", content: loaderData ? `Customise your ${loaderData.product.name} with B Cube — upload, choose, preview, order.` : "Customise your B Cube product." },
      { property: "og:title", content: loaderData ? `${loaderData.product.name} — B Cube` : "Product — B Cube" },
      { property: "og:description", content: "Personalised acrylic photos, frames and gifts, made to order by B Cube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-3xl text-brand-red">Product not found</h1>
      <Link to="/product" search={{ tab: 'custom' }} className="mt-6 inline-block rounded-full bg-brand-red px-5 py-2 text-white">Back to products</Link>
    </div>
  ),
  component: ProductPage,
});

// --- Wizard state ---

type Shape =
  | "rectangle" | "square" | "rounded" | "circle" | "oval" | "heart" | "triangle"
  | "hexagon" | "pentagon" | "octagon" | "diamond" | "star" | "arch";
type FrameMode = "without" | "with";
type Orientation = "portrait" | "landscape";
type State = {
  step: number;
  imageUrl?: string;
  /** Storage path in the `product-uploads` bucket (persist with the order). */
  imagePath?: string;
  frame: FrameMode;
  shape: Shape;
  frameColor: string;
  orientation: Orientation;
  addText: boolean;
  text: string;
  textColor: string;
  textSize: "S" | "M" | "L";
  size: string;
  thickness: string;
  /** Artwork framing inside the container (backend: persist with the order). */
  imgScale: number;
  imgX: number;
  imgY: number;
};
type Action =
  | { type: "next" } | { type: "prev" } | { type: "go"; step: number }
  | { type: "patch"; patch: Partial<State> } | { type: "reset" };

const initial: State = {
  step: 1, frame: "without", shape: "rectangle", frameColor: "#dc2626",
  orientation: "portrait", addText: false, text: "", textColor: "#dc2626",
  textSize: "M", size: "12 x 9", thickness: "3 mm",
  imgScale: 1, imgX: 0, imgY: 0,
};


/** Per-product defaults — framed pieces start with the frame on. */
function initialFor(slug: string): State {
  if (slug === "framed-acrylic-photo") return { ...initial, frame: "with" };
  return initial;
}

function makeReducer(base: State) {
  return function reducer(s: State, a: Action): State {
    switch (a.type) {
      case "next": return { ...s, step: Math.min(5, s.step + 1) };
      case "prev": return { ...s, step: Math.max(1, s.step - 1) };
      case "go": return { ...s, step: a.step };
      case "patch": return { ...s, ...a.patch };
      case "reset": return { ...base };
    }
  };
}


const STEPS = [
  { id: 1, label: "Upload Image" },
  { id: 2, label: "Frame" },
  { id: 3, label: "Layout and Text" },
  { id: 4, label: "Size and thickness" },
  { id: 5, label: "Preview" },
];

/** Geometry per shape — applied identically to the swatch and the live preview. */
const SHAPE_STYLE: Record<Shape, CSSProperties> = {
  rectangle: {},
  square: {},
  rounded: { borderRadius: "1.25rem" },
  circle: { borderRadius: "50%" },
  oval: { borderRadius: "50% / 40%" },
  arch: { borderRadius: "50% 50% 6px 6px / 45% 45% 6px 6px" },
  heart: { clipPath: "polygon(50% 100%, 15% 68%, 2% 45%, 2% 28%, 12% 14%, 30% 10%, 43% 17%, 50% 27%, 57% 17%, 70% 10%, 88% 14%, 98% 28%, 98% 45%, 85% 68%)" },
  triangle: { clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" },
  hexagon: { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" },
  pentagon: { clipPath: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)" },
  octagon: { clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)" },
  diamond: { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  star: { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
};

/** Shapes that only read correctly on a 1:1 canvas. */
const SQUARE_SHAPES: Shape[] = [
  "square", "circle", "heart", "triangle", "hexagon", "pentagon", "octagon", "diamond", "star",
];

const SHAPE_LIST: Shape[] = [
  "rectangle", "rounded", "square", "circle", "oval", "arch",
  "heart", "triangle", "hexagon", "pentagon", "octagon", "diamond",
];

const SIZES = ["12 x 9", "16 x 12", "18 x 12", "21 x 15", "30 x 20"];
const THICKNESSES = ["3 mm", "5 mm", "8 mm"];

/**
 * Maps the selected size + orientation to preview dimensions.
 * The piece keeps the true aspect ratio of the chosen size — it is never
 * stretched to the panel — and squares/circles stay perfectly 1:1.
 */
function previewDimensions(state: State) {
  const [a, b] = state.size.split(" x ").map((n) => Number(n));
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  const t = (long - 12) / (30 - 12); // 0 → 1 across the size range
  const longPct = 26 + t * 20; // 26% → 46% of the panel width
  const ratio = SQUARE_SHAPES.includes(state.shape) ? 1 : short / long;
  const isPortrait = state.orientation === "portrait";
  const widthPct = isPortrait ? longPct * ratio : longPct;
  return {
    width: `${widthPct}%`,
    aspectRatio: isPortrait ? `${ratio} / 1` : `1 / ${ratio}`,
  } satisfies CSSProperties;
}

/** Thicker acrylic casts a deeper shadow (drop-shadow so clipped shapes keep it). */
function thicknessShadow(thickness: string) {
  const mm = Number(thickness.split(" ")[0]);
  const y = Math.round(mm * 1.6);
  const blur = Math.round(mm * 2.2);
  return `drop-shadow(0 ${y}px ${blur}px rgba(15,23,42,${(0.2 + mm * 0.04).toFixed(2)}))`;
}


function ProductPage() {
  const { product } = Route.useLoaderData();
  const mode = getProductMode(product.slug);
  const base = useMemo(() => initialFor(product.slug), [product.slug]);
  const reducer = useMemo(() => makeReducer(base), [base]);
  const [state, dispatch] = useReducer(reducer, base);
  const { addItem } = useCart();

  /** Card artwork doubles as the preview image for non-configurable products.
      TODO(backend): let admins upload/replace both the card and preview image. */
  const { image: catalogImage, bySlug: catalogRow } = useProducts();

  const pricing = usePricing(product.slug);
  const productImage = catalogImage(product.slug) || imgBySlug[product.slug] || productImageFallback;
  const price = computePrice({
    slug: product.slug,
    frame: state.frame,
    shape: state.shape,
    size: state.size,
    thickness: state.thickness,
    addText: state.addText,
  }, pricing);

  const onBuy = (buyerInfo: Record<string, string>) => {
    // Visual: fly the preview into the cart icon before the toast lands.
    flyToCart(
      document.querySelector<HTMLElement>("[data-fly-source]"),
      mode === "wizard" ? (state.imageUrl ?? productImage) : productImage,
    );
    addItem({ slug: product.slug, name: product.name, config: { ...state, mode, price, buyerInfo } });
    toast.success(
      mode === "wizard" ? `${product.name} added to cart!` : "Thanks! We'll get back to you shortly.",
    );
    dispatch({ type: "reset" });
  };

  return (
    <>
      <section className="bg-muted/40 pt-6 pb-14">
        <div className="container mx-auto px-4">
          <Link
            to="/product"
            search={{ tab: 'custom' }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm text-brand-ink transition hover:border-brand-red hover:text-brand-red"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          {mode === "wizard" && (
            <div className="mt-6">
              <Stepper current={state.step} onGo={(s) => dispatch({ type: "go", step: s })} />
            </div>
          )}

          {/* Fixed configurator height (matches the tallest step) so both columns
              stay the same size across every step. */}
          <div
            className="mt-8 grid gap-6 lg:grid-cols-2 items-stretch"
            style={{ ["--config-h" as string]: "600px" }}
          >
            {mode === "wizard" ? (
              <PreviewPane
                state={state}
                dispatch={dispatch}
                productImage={productImage}
                showProductImage={false}
                clockFace={product.slug === "wall-clocks"}
              />
            ) : (
              <SimpleProductPane image={productImage} name={product.name} />
            )}

            <div className="flex min-h-[420px] flex-col rounded-2xl bg-white border border-border p-5 sm:p-6 md:p-7 shadow-sm lg:h-[var(--config-h)]">

              {mode !== "wizard" ? (
                <EnquiryCard mode={mode} name={product.name} onBuy={onBuy} />
              ) : (
                <>
                  {state.step === 1 && <StepUpload state={state} dispatch={dispatch} price={price} slug={product.slug} />}
                  {state.step === 2 && <StepFrame state={state} dispatch={dispatch} price={price} />}
                  {state.step === 3 && <StepLayout state={state} dispatch={dispatch} price={price} />}
                  {state.step === 4 && <StepSize state={state} dispatch={dispatch} price={price} />}
                  {state.step === 5 && <StepPreviewForm onBuy={onBuy} dispatch={dispatch} price={price} />}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <ProductInfo name={product.name} description={catalogRow(product.slug)?.description} />
      <Testimonials heading="Why customers love it" groupIds={[testimonialGroupFor(product.slug)]} />
      <CustomerStories />
      <ExploreMore currentSlug={product.slug} />
    </>
  );
}

/** Picks the testimonial group that matches this product. */
function testimonialGroupFor(slug: string): string {
  if (["premium-acrylic-photo", "acrylic-desk-photo", "photo-albums", "fridge-magnet"].includes(slug)) return "acrylic-photos";
  if (["framed-acrylic-photo", "wall-clocks", "acrylic-cutouts-decor"].includes(slug)) return "acrylic-clear-photos";
  if (["name-plate", "acrylic-monogram", "keychain", "luggage-tags"].includes(slug)) return "name-decors";
  return "creative-gifts";
}

// --- Stepper ---

function Stepper({ current, onGo }: { current: number; onGo: (s: number) => void }) {
  return (
    <ol className="mx-auto flex w-full max-w-4xl items-start">
      {STEPS.map((s, i) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-start last:flex-none">
            <button
              onClick={() => onGo(s.id)}
              className="flex w-12 shrink-0 flex-col items-center gap-1.5 sm:w-20 md:w-24 sm:gap-2"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-semibold transition sm:h-9 sm:w-9 sm:text-xs ${
                  active || done ? "border-brand-red text-brand-red" : "border-border text-muted-foreground bg-white"
                }`}
              >
                {active ? <span className="h-2.5 w-2.5 rounded-full bg-brand-red sm:h-3 sm:w-3" /> : String(s.id).padStart(2, "0")}
              </span>
              <span className={`text-center text-[9px] leading-tight sm:text-[11px] ${active ? "text-brand-red font-semibold" : done ? "text-brand-red" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className={`mt-[14px] h-0 min-w-2 flex-1 border-t-2 border-dashed sm:mt-[18px] ${done ? "border-brand-red/60" : "border-border"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// --- Preview ---

/** Non-configurable products: large product shot on a premium white/grey backdrop. */
function SimpleProductPane({ image, name }: { image: string; name: string }) {
  return (
    <div data-fly-source className="relative grid h-[360px] place-items-center overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_50%_35%,#ffffff_0%,#f4f4f5_55%,#e4e4e7_100%)] p-8 lg:h-[var(--config-h)]">
      <img
        src={image}
        alt={name}
        loading="lazy"
        decoding="async"
        className="max-h-full w-auto max-w-[85%] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.18)]"
      />
    </div>
  );
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function PreviewPane({
  state, dispatch, productImage, showProductImage = false, clockFace = false,
}: { state: State; dispatch?: React.Dispatch<Action>; productImage?: string; showProductImage?: boolean; clockFace?: boolean }) {
  const shapeStyle = SHAPE_STYLE[state.shape];
  const dims = previewDimensions(state);
  const artwork = state.imageUrl ?? (showProductImage ? productImage : undefined);
  const editable = Boolean(state.imageUrl && dispatch);

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  // Kept in a ref so the native (non-passive) wheel listener never reads stale state.
  const viewRef = useRef({ scale: state.imgScale, x: state.imgX, y: state.imgY });
  viewRef.current = { scale: state.imgScale, x: state.imgX, y: state.imgY };

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !editable) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = clamp(viewRef.current.scale * Math.exp(-dy * 0.0015), 1, 4);
      dispatch?.({ type: "patch", patch: { imgScale: next } });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [editable, dispatch]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editable) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: state.imgX, oy: state.imgY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dispatch?.({ type: "patch", patch: { imgX: d.ox + (e.clientX - d.x), imgY: d.oy + (e.clientY - d.y) } });
  };
  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-border bg-stone-100 lg:h-[var(--config-h)]">
      <img src={roomImg} alt="Room preview" width={1024} height={1024} className="absolute inset-0 h-full w-full object-cover" />
      <div
        data-fly-source
        className="absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
        style={{ ...dims, filter: thicknessShadow(state.thickness) }}
      >
        <div
          className={`relative h-full w-full ${state.frame === "with" ? "p-1.5" : ""}`}
          style={{
            ...shapeStyle,
            ...(state.frame === "with" ? { backgroundColor: state.frameColor } : {}),
          }}
        >
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative h-full w-full overflow-hidden bg-white grid place-items-center ${editable ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
            style={shapeStyle}
          >

            {artwork ? (
              <img
                src={artwork}
                alt="Your artwork"
                draggable={false}
                className="h-full w-full select-none object-cover"
                style={{
                  transform: `translate(${state.imgX}px, ${state.imgY}px) scale(${state.imgScale})`,
                  transformOrigin: "center",
                }}
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[10px]">Your photo here</span>
              </div>
            )}
            {clockFace && <ClockOverlay />}
            {state.addText && state.text && (
              <p
                className={`absolute bottom-2 left-0 right-0 text-center font-display ${state.textSize === "S" ? "text-[10px]" : state.textSize === "L" ? "text-base" : "text-xs"}`}
                style={{ color: state.textColor }}
              >
                {state.text}
              </p>
            )}
          </div>
        </div>
      </div>
      {editable && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-full bg-white/85 px-4 py-2 text-xs text-brand-ink backdrop-blur">
          <span className="hidden sm:inline whitespace-nowrap">Drag to move</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            aria-label="Zoom photo"
            value={state.imgScale}
            onChange={(e) => dispatch?.({ type: "patch", patch: { imgScale: Number(e.target.value) } })}
            className="h-1 flex-1 cursor-pointer accent-brand-red"
          />
          <button
            type="button"
            onClick={() => dispatch?.({ type: "patch", patch: { imgScale: 1, imgX: 0, imgY: 0 } })}
            className="whitespace-nowrap rounded-full border border-border px-2 py-0.5 hover:border-brand-red"
          >
            Fit
          </button>
        </div>
      )}
      {!editable && (state.step === 4 || state.step === 5) && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-4 py-1.5 text-xs text-brand-ink">
          {state.size} inches · {state.thickness} thick
        </div>
      )}
    </div>

  );
}

/** Hour markers + hands drawn over the artwork for clock products. */
function ClockOverlay() {
  const r = 40;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g fill="currentColor" className="text-brand-ink">
        {Array.from({ length: 12 }).map((_, i) => {
          const rad = (i * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={i}
              x={50 + r * Math.cos(rad)}
              y={50 + r * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={i % 3 === 0 ? 7 : 5.5}
              fontWeight={i % 3 === 0 ? 700 : 500}
            >
              {i === 0 ? 12 : i}
            </text>
          );
        })}
        <line x1="50" y1="50" x2={50 + 20 * Math.cos((40 - 90) * Math.PI / 180)} y2={50 + 20 * Math.sin((40 - 90) * Math.PI / 180)} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="50" y1="50" x2={50 + 30 * Math.cos((-68 - 90) * Math.PI / 180)} y2={50 + 30 * Math.sin((-68 - 90) * Math.PI / 180)} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      </g>
      <circle cx="50" cy="50" r="2" className="fill-brand-red" />
    </svg>
  );
}




// --- Step card chrome ---

function StepHeader({
  Icon, title, subtitle, onReset,
}: { Icon: typeof UploadCloud; title: string; subtitle?: string; onReset?: () => void }) {
  return (
    <div className="flex items-start gap-3 pb-4 sm:gap-4 sm:pb-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border text-brand-ink">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl text-brand-ink sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand-red hover:text-brand-red"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      )}
    </div>
  );
}

function PriceTag({ price }: { price: number }) {
  return (
    <div className="flex items-baseline justify-center gap-2">
      <span className="text-xs text-muted-foreground">Total</span>
      {/* TODO(backend): pricing comes from src/data/pricing.ts — swap for API values. */}
      <span className="font-display text-2xl text-brand-red">{formatPrice(price)}</span>
    </div>
  );
}

function ContinueButton({ onClick, disabled, price }: { onClick: () => void; disabled?: boolean; price: number }) {
  return (
    <div className="mt-auto flex flex-col items-center gap-3 pt-6">
      <PriceTag price={price} />
      <MagneticButton
        onClick={onClick}
        disabled={disabled}
        className={`w-full max-w-xs rounded-full px-6 py-3 text-sm font-semibold transition ${
          disabled
            ? "bg-brand-yellow/40 text-brand-ink/40 cursor-not-allowed"
            : "bg-brand-yellow text-brand-ink hover:brightness-95"
        }`}
      >
        Continue
      </MagneticButton>
    </div>
  );
}

// --- Steps ---

function StepUpload({ state, dispatch, price, slug }: { state: State; dispatch: React.Dispatch<Action>; price: number; slug: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const accept = async (f?: File) => {
    if (!f || uploading) return;
    if (f.size > 50 * 1024 * 1024) { toast.error("Max 50MB"); return; }
    // Instant local preview, then swap in the stored file from the bucket.
    const localUrl = URL.createObjectURL(f);
    dispatch({ type: "patch", patch: { imageUrl: localUrl, imagePath: undefined, imgScale: 1, imgX: 0, imgY: 0 } });
    setUploading(true);
    try {
      const { path, url } = await uploadProductPhoto(f, slug);
      dispatch({ type: "patch", patch: { imageUrl: url, imagePath: path } });
      URL.revokeObjectURL(localUrl);
    } catch {
      toast.error("Upload failed. Please try again.");
      dispatch({ type: "patch", patch: { imageUrl: undefined, imagePath: undefined } });
      URL.revokeObjectURL(localUrl);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <StepHeader
        Icon={UploadCloud}
        title="Upload image"
        subtitle="Select and upload the files of your choice"
        onReset={() => dispatch({ type: "reset" })}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); accept(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-white p-6 sm:p-8 text-center transition hover:border-brand-red"
      >
        <p className="font-display text-lg text-brand-ink">Choose a file or drag &amp; drop it here</p>
        <p className="mt-1 text-sm text-muted-foreground">JPEG and PNG formats, up to 50MB</p>
        <UploadCloud className="mx-auto my-6 h-10 w-10 text-brand-ink/70" strokeWidth={1.5} />
        <span className="inline-block rounded-full border border-border bg-white px-6 py-2 text-sm">Browse File</span>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={(e: ChangeEvent<HTMLInputElement>) => accept(e.target.files?.[0])} className="hidden" />
      </div>
      {uploading && <p className="mt-3 text-center text-xs text-muted-foreground">Uploading…</p>}
      {!uploading && state.imagePath && <p className="mt-3 text-center text-xs text-emerald-600">Image uploaded ✓</p>}
      <ContinueButton price={price} disabled={!state.imagePath || uploading} onClick={() => dispatch({ type: "next" })} />
    </div>
  );
}

function StepFrame({ state, dispatch, price }: { state: State; dispatch: React.Dispatch<Action>; price: number }) {
  const colors = ["#dc2626", "#0f172a", "#ffffff", "#d4af37"];
  return (
    <div className="flex h-full flex-col">
      <StepHeader Icon={Shapes} title="Shapes" subtitle="Pick a silhouette and frame finish" onReset={() => dispatch({ type: "reset" })} />
      <div className="mb-6 flex gap-2">
        {(["without", "with"] as const).map((m) => (
          <button
            key={m}
            onClick={() => dispatch({ type: "patch", patch: { frame: m } })}
            className={`rounded-full px-5 py-2 text-xs font-medium border transition ${state.frame === m ? "bg-brand-red text-white border-brand-red" : "border-brand-red text-brand-red"}`}
          >
            {m === "without" ? "Without Frame" : "With Frame"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-2 sm:gap-3">
        {SHAPE_LIST.map((id) => (
          <button
            key={id}
            onClick={() => dispatch({ type: "patch", patch: { shape: id } })}
            aria-label={id}
            className={`aspect-square rounded-xl border-2 grid place-items-center transition ${state.shape === id ? "border-brand-yellow bg-brand-yellow/10" : "border-border hover:border-brand-red/40"}`}
          >
            <span
              className={`bg-brand-red/70 ${SQUARE_SHAPES.includes(id) ? "h-7 w-7" : "h-5 w-8"}`}
              style={SHAPE_STYLE[id]}
            />

          </button>
        ))}
      </div>
      {state.frame === "with" && (
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm">Frame Colour</span>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button key={c} onClick={() => dispatch({ type: "patch", patch: { frameColor: c } })} className={`h-6 w-6 rounded ${state.frameColor === c ? "ring-2 ring-offset-2 ring-brand-red" : ""}`} style={{ backgroundColor: c, border: c === "#ffffff" ? "1px solid #ccc" : undefined }} />
            ))}
          </div>
        </div>
      )}
      <ContinueButton price={price} onClick={() => dispatch({ type: "next" })} />
    </div>
  );
}

function StepLayout({ state, dispatch, price }: { state: State; dispatch: React.Dispatch<Action>; price: number }) {
  const colors = ["#dc2626", "#0f172a", "#d4af37", "#1d4ed8"];
  return (
    <div className="flex h-full flex-col">
      <StepHeader Icon={LayoutPanelTop} title="Layout and Text" subtitle="Choose an orientation and add a message" onReset={() => dispatch({ type: "reset" })} />
      <div className="grid grid-cols-2 gap-3">
        {(["portrait", "landscape"] as const).map((o) => (
          <button
            key={o}
            onClick={() => dispatch({ type: "patch", patch: { orientation: o } })}
            className={`rounded-xl border-2 p-4 sm:p-5 grid place-items-center gap-2 transition ${state.orientation === o ? "border-brand-yellow bg-brand-yellow/10" : "border-border"}`}
          >
            <div className={`bg-stone-200 ${o === "portrait" ? "w-12 h-16" : "w-16 h-12"} rounded`} />
            <span className={`text-xs ${state.orientation === o ? "text-brand-red font-medium" : "text-muted-foreground"}`}>{o === "portrait" ? "Portrait" : "Landscape"}</span>
          </button>
        ))}
      </div>
      <label className="mt-6 flex items-center gap-3">
        <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-stone-200 cursor-pointer">
          <input type="checkbox" checked={state.addText} onChange={(e) => dispatch({ type: "patch", patch: { addText: e.target.checked } })} className="sr-only peer" />
          <span className="absolute inset-0 rounded-full peer-checked:bg-brand-red/30" />
          <span className="absolute h-5 w-5 rounded-full bg-white transition translate-x-0.5 peer-checked:translate-x-5 peer-checked:bg-brand-red" />
        </span>
        <span className="text-sm">Add Text</span>
      </label>
      {state.addText && (
        <div className="mt-4 space-y-3">
          <input
            value={state.text}
            onChange={(e) => dispatch({ type: "patch", patch: { text: e.target.value } })}
            placeholder="Enter text here"
            className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Text Colour</span>
              {colors.map((c) => (
                <button key={c} onClick={() => dispatch({ type: "patch", patch: { textColor: c } })} className={`h-5 w-5 rounded-full ${state.textColor === c ? "ring-2 ring-offset-1 ring-brand-red" : ""}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Text Size</span>
              <select value={state.textSize} onChange={(e) => dispatch({ type: "patch", patch: { textSize: e.target.value as State["textSize"] } })} className="rounded-md border border-border bg-white px-3 py-1.5 text-sm">
                <option value="S">Small</option>
                <option value="M">Medium</option>
                <option value="L">Large</option>
              </select>
            </div>
          </div>
        </div>
      )}
      <ContinueButton price={price} onClick={() => dispatch({ type: "next" })} />
    </div>
  );
}

function StepSize({ state, dispatch, price }: { state: State; dispatch: React.Dispatch<Action>; price: number }) {
  return (
    <div className="flex h-full flex-col">
      <StepHeader Icon={Ruler} title="Size and thickness" subtitle="Every piece is cut to order" onReset={() => dispatch({ type: "reset" })} />
      <p className="mb-2 text-sm text-brand-red">Select Size :</p>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <button key={s} onClick={() => dispatch({ type: "patch", patch: { size: s } })} className={`rounded-xl border-2 px-4 py-2 text-sm transition ${state.size === s ? "border-brand-yellow bg-brand-yellow/10" : "border-border"}`}>{s}</button>
        ))}
      </div>
      <p className="mt-6 mb-2 text-sm text-brand-red">Select Thickness :</p>
      <div className="flex flex-wrap gap-2">
        {THICKNESSES.map((t) => (
          <button key={t} onClick={() => dispatch({ type: "patch", patch: { thickness: t } })} className={`rounded-xl border-2 px-4 py-2 text-sm transition ${state.thickness === t ? "border-brand-yellow bg-brand-yellow/10" : "border-border"}`}>{t}</button>
        ))}
      </div>
      <ContinueButton price={price} onClick={() => dispatch({ type: "next" })} />
    </div>
  );
}

const BUYER_FIELD_LIST = [
  {
    k: "name",
    label: "Name",
    placeholder: "Enter name here",
    type: "text",
    autoComplete: "name",
    maxLength: NAME_MAX_LENGTH,
    inputMode: undefined,
    pattern: undefined,
    title: undefined,
    sanitize: capitalizeName,
  },
  {
    k: "phone",
    label: "Phone number",
    placeholder: "Enter 10-digit number",
    type: "tel",
    autoComplete: "tel-national",
    inputMode: "numeric" as const,
    pattern: "[6-9][0-9]{9}",
    title: "Enter a 10-digit mobile number starting with 6–9",
    sanitize: sanitizePhone,
  },
  {
    k: "email",
    label: "Email",
    placeholder: "Enter email here",
    type: "email",
    autoComplete: "email",
    maxLength: 254,
    inputMode: undefined,
    pattern: undefined,
    title: undefined,
    sanitize: (v: string) => v,
  },
] as const;

function BuyerFields({
  form, setForm, compact = false,
}: { form: Record<string, string>; setForm: (f: Record<string, string>) => void; compact?: boolean }) {
  return (
    <>
      {BUYER_FIELD_LIST.map(({ k, label, placeholder, type, sanitize, ...attrs }) => (
        <div key={k}>
          <label className={`${compact ? "text-xs" : "text-sm"} text-brand-red`}>{label}</label>
          <input
            required
            type={type}
            value={form[k] ?? ""}
            onChange={(e) => setForm({ ...form, [k]: sanitize(e.target.value) })}
            placeholder={placeholder}
            {...attrs}
            className={`mt-1 w-full rounded-full border border-border bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-brand-red ${compact ? "py-2" : "py-2.5"}`}
          />
        </div>
      ))}
    </>
  );
}

function StepPreviewForm({
  onBuy, dispatch, price,
}: { onBuy: (info: Record<string, string>) => void; dispatch: React.Dispatch<Action>; price: number }) {
  const [form, setForm] = useState<Record<string, string>>({ name: "", phone: "", email: "", idea: "", address: "", pincode: "" });
  const [accepted, setAccepted] = useState(true);
  return (
    <div className="flex h-full flex-col">
      <StepHeader Icon={MousePointerClick} title="Preview" subtitle="Confirm your details and place the order" onReset={() => dispatch({ type: "reset" })} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!accepted) { toast.error("Please accept the terms"); return; }
          const error = validateContactFields(form);
          if (error) { toast.error(error); return; }
          if (!isValidPincode(form.pincode)) { toast.error("Please enter a valid 6-digit pincode."); return; }
          if (form.address.trim().length < 10) { toast.error("Please enter your full delivery address."); return; }
          onBuy({ ...form, name: form.name.trim(), email: form.email.trim() });
          setForm({ name: "", phone: "", email: "", idea: "", address: "", pincode: "" });
          setAccepted(true);
        }}
        className="flex flex-1 flex-col"
      >
        {/* Two-column compact grid so the whole step fits without scrolling. */}
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <BuyerFields form={form} setForm={setForm} compact />
          <div>
            <label className="text-xs text-brand-red">Pincode</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="shrink-0 rounded-full border border-border bg-white px-3 py-2 text-sm">🇮🇳 Ind</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                title="Enter a valid 6-digit pincode"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: sanitizePincode(e.target.value) })}
                placeholder="Enter Pincode"
                className="w-full min-w-0 rounded-full border border-border bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-brand-red">Your idea</label>
            <textarea
              rows={2}
              value={form.idea}
              onChange={(e) => setForm({ ...form, idea: e.target.value })}
              placeholder="Tell us what you have in mind"
              className="mt-1 w-full resize-none rounded-2xl border border-border bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <label className="text-xs text-brand-red">Delivery address</label>
            <textarea
              required
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Door no, street, city, state"
              className="mt-1 w-full resize-none rounded-2xl border border-border bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="accent-brand-red" />
          Accept to all terms and conditions
        </label>
        <div className="mt-auto flex flex-col items-center gap-3 pt-4">
          <PriceTag price={price} />
          <MagneticButton type="submit" className="w-full max-w-xs rounded-full bg-brand-yellow px-6 py-3 text-sm font-semibold text-brand-ink hover:brightness-95">Buy Now</MagneticButton>
        </div>
      </form>
    </div>
  );
}

function EnquiryCard({
  mode, name, onBuy,
}: { mode: "custom-enquiry" | "bulk"; name: string; onBuy: (info: Record<string, string>) => void }) {
  const [form, setForm] = useState<Record<string, string>>({ name: "", phone: "", email: "", quantity: "", message: "" });
  const bulk = mode === "bulk";
  return (
    <div className="flex h-full flex-col">
      <StepHeader
        Icon={bulk ? Boxes : MessageCircle}
        title={bulk ? "Order in bulk" : "Contact us for your own custom gifts and ideas"}
        subtitle={bulk
          ? `${name} is made and shipped in bulk quantities — tell us how many you need and we'll send a tailored quote.`
          : "We'll make it come to real-life."}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const error = validateContactFields(form);
          if (error) { toast.error(error); return; }
          if (bulk) {
            const quantity = Number(form.quantity);
            if (!Number.isInteger(quantity) || quantity < MIN_BULK_QUANTITY) {
              toast.error(`Please enter a quantity of at least ${MIN_BULK_QUANTITY}.`);
              return;
            }
          }
          onBuy({ ...form, mode, name: form.name.trim(), email: form.email.trim() });
          setForm({ name: "", phone: "", email: "", quantity: "", message: "" });
        }}
        className="flex flex-1 flex-col space-y-4"
      >
        <BuyerFields form={form} setForm={setForm} />
        {bulk && (
          <div>
            <label className="text-sm text-brand-red">Quantity</label>
            <input
              required
              type="number"
              inputMode="numeric"
              min={MIN_BULK_QUANTITY}
              step={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: sanitizeQuantity(e.target.value) })}
              placeholder="e.g. 50"
              className="mt-1 w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        )}
        <div>
          <label className="text-sm text-brand-red">Your idea</label>
          <textarea
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder={bulk ? "Branding, packaging, delivery date…" : "Tell us what you have in mind"}
            className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <div className="mt-auto flex justify-center pt-2">
          <button type="submit" className="w-full max-w-xs rounded-full bg-brand-yellow px-6 py-3 text-sm font-semibold text-brand-ink hover:brightness-95">
            {bulk ? "Get Bulk Quote" : "Send Enquiry"}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Content below ---

const DEFAULT_DESCRIPTION = `Commemorate your special moments with this beautifully personalised piece, designed specifically for celebrations. A meaningful and lasting reminder of the love you share, it adds elegance to any home.

- Material: Made with high-quality faux leather, glass, and MDF for durability and an elegant finish.
- Quick dispatch from Chennai
- Unidirectional pixel-perfect direct printing on Acrylic
- Ultra HD print with the highest DPI (Resolution)
- Acrylic undergoes chemical treatment before printing
- Never peel off, even in a moisture environment
- Unidirectional mode ensures each picture receives 2x printing time
- Same day processing of orders
- Advanced utilization of Artificial Intelligence (AI)`;

/** Renders admin-editable copy: plain paragraphs, plus "-" prefixed bullet lines. */
function ProductInfo({ name, description }: { name: string; description?: string }) {
  const text = (description ?? "").trim() || DEFAULT_DESCRIPTION;
  const blocks: Array<{ type: "p" | "ul"; lines: string[] }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const isBullet = line.startsWith("-") || line.startsWith("•") || line.startsWith("*");
    const content = isBullet ? line.slice(1).trim() : line;
    const last = blocks[blocks.length - 1];
    if (isBullet && last?.type === "ul") last.lines.push(content);
    else blocks.push({ type: isBullet ? "ul" : "p", lines: [content] });
  }

  return (
    <section className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl text-brand-ink">{name}</h1>
      <div className="mt-4 space-y-3 text-sm text-brand-ink/90">
        {blocks.map((b, i) =>
          b.type === "p" ? (
            <p key={i}>{b.lines[0]}</p>
          ) : (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {b.lines.map((l, k) => (
                <li key={k}>{l}</li>
              ))}
            </ul>
          ),
        )}
      </div>
    </section>
  );
}


function ExploreMore({ currentSlug }: { currentSlug: string }) {
  const { image: catalogImage } = useProducts();
  const category = corporateGifting.some((p) => p.slug === currentSlug)
    ? corporateGifting
    : returnGifts.some((p) => p.slug === currentSlug)
      ? returnGifts
      : customAcrylic;
  const more = category.filter((p) => p.slug !== currentSlug).slice(0, 6);
  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="text-center font-display text-3xl md:text-4xl text-brand-ink mb-10">Explore More</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-14">
        {more.map((p) => (
          <ProductTile
            key={p.slug}
            name={p.name}
            slug={p.slug}
            img={catalogImage(p.slug) || imgBySlug[p.slug] || productImageFallback}
            compact={p.slug === "wall-clocks"}
          />
        ))}
      </div>
    </section>
  );
}
