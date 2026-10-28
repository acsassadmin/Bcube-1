import { assetUrl } from "@/data/media-map";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { customAcrylic, corporateGifting, returnGifts } from "@/data/products";
import { ProductTile } from "@/components/product/ProductTile";
import { imgBySlug } from "@/data/product-images";
import { useProducts } from "@/lib/store";

const cat1 = { url: assetUrl("Cat1.png") };
const cat2 = { url: assetUrl("Cat2.png") };
const cat3 = { url: assetUrl("Cat3.png") };
const catBg1 = { url: assetUrl("Category_Bg1.png") };
const catBg2 = { url: assetUrl("Category_Bg2b.png") };
// const catBg1Url =
//   "https://klpjyduruuqujsaxguex.supabase.co/storage/v1/object/public/site-media/Category%20Bg2.png";
// const catBg1 = { url: catBg1Url };
// const catBg2 = {
//   url: "https://klpjyduruuqujsaxguex.supabase.co/storage/v1/object/public/site-media/Category%20Bg2.png",
// };
const ad1 = { url: assetUrl("Advertisment_Card.png") };
const ad2 = { url: assetUrl("Advertisement_card_2.png") };
const gCorporate = { url: assetUrl("Corporate_gifting.png") };
const gReturn = { url: assetUrl("Return_Gifts.png") };

type Tab = "custom" | "corporate" | "return";

export const Route = createFileRoute("/product/")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => {
    const t = search.tab;
    return { tab: t === "corporate" || t === "return" ? t : "custom" };
  },
  head: () => ({
    meta: [
      { title: "Our Products — B Cube Personalised Gifts" },
      {
        name: "description",
        content:
          "Browse B Cube's custom acrylic pictures, corporate gifting and return gift collections — personalised, premium and made to order.",
      },
      { property: "og:title", content: "Our Products — B Cube Personalised Gifts" },
      {
        property: "og:description",
        content: "Custom acrylic pictures, corporate gifting and return gifts by B Cube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductListing,
});

const tabs: { id: Tab; label: string; img: string }[] = [
  { id: "custom", label: "Custom Acrylic Pictures", img: cat1.url },
  { id: "corporate", label: "Corporate Gifting", img: cat2.url },
  { id: "return", label: "Return Gifts", img: cat3.url },
];

function ProductListing() {
  const { tab } = Route.useSearch();
  return (
    <>
      <section className="w-full px-4 sm:px-6 md:px-[56px] py-10 md:py-14">
        <h1 className="text-center font-display text-3xl md:text-5xl text-brand-ink">
          Our Products
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-brand-ink/70">
          Pick a collection — every piece is personalised and made to order.
        </p>

        <div className="mt-8 md:mt-10 lg:mt-12 grid grid-cols-3 gap-6 md:gap-8 lg:gap-10 place-items-center">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <Link
                key={t.id}
                to="/product"
                search={{ tab: t.id }}
                resetScroll={false}
                className="group flex min-w-0 flex-col items-center"
              >
                <div className="relative h-28 w-28 sm:h-40 sm:w-40 md:h-52 md:w-52 lg:h-72 lg:w-72">
                  <img
                    src={catBg1.url}
                    alt=""
                    aria-hidden
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${active ? "opacity-0" : "group-hover:opacity-0"}`}
                  />
                  <img
                    src={catBg2.url}
                    alt=""
                    aria-hidden
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  />
                  <img
                    src={t.img}
                    alt={t.label}
                    loading="lazy"
                    className="absolute inset-0 m-auto h-20 w-20 sm:h-28 sm:w-28 md:h-40 md:w-40 lg:h-56 lg:w-56 object-contain drop-shadow-md"
                  />
                </div>
                <p
                  className={`mt-3 md:mt-4 text-center text-xs sm:text-sm md:text-base lg:text-lg font-medium ${active ? "text-brand-red font-semibold" : "text-brand-ink"}`}
                >
                  {t.label}
                </p>
                {/* <p>img: {t.img}</p> */}
                {active && <span className="mt-2 h-1 w-12 rounded-full bg-brand-red" />}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-4">
        {tab === "custom" && <Panel title="Custom Acrylic Pictures" items={customAcrylic} />}
        {tab === "corporate" && (
          <Panel title="Corporate Gifting" items={corporateGifting} fallback={gCorporate.url} />
        )}
        {tab === "return" && (
          <Panel title="Return Gifts" items={returnGifts} fallback={gReturn.url} />
        )}
      </section>

      <section className="my-12">
        <img
          src={ad1.url}
          alt="Enriching relationships through thoughtful gifts"
          className="w-full"
          loading="lazy"
        />
      </section>

      <EnquireBand />

      <section className="my-12">
        <Link to="/contact" className="block">
          <img
            src={ad2.url}
            alt="To know more about our products — call +91 93632 96919 or email bcube@gmail.com"
            className="w-full"
            loading="lazy"
          />
        </Link>
      </section>
    </>
  );
}

function Panel({
  title,
  items,
  fallback,
}: {
  title: string;
  items: { slug: string; name: string }[];
  fallback?: string;
}) {
  const { image: productImage } = useProducts();
  return (
    <>
      <h2 className="text-center font-display text-3xl md:text-4xl text-brand-ink">{title}</h2>
      <div className="mt-8 md:mt-10 grid grid-cols-2 md:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-8 md:gap-y-12">
        {items.map((p) => (
          <ProductTile
            key={p.slug}
            name={p.name}
            slug={p.slug}
            img={productImage(p.slug) || imgBySlug[p.slug] || fallback}
            compact={p.slug === "wall-clocks"}
          />
        ))}
      </div>
    </>
  );
}

function EnquireBand() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  return (
    <section className="bg-brand-yellow my-12">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 px-4 py-10 items-center">
        <h2 className="font-display text-5xl text-brand-red leading-none rotate-[-2deg]">
          Enquire
          <br />
          Now
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Enquiry sent — we'll be in touch!");
            setForm({ name: "", email: "", phone: "", message: "" });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            required
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <textarea
            placeholder="Message"
            rows={1}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red sm:row-span-2 sm:col-start-2 sm:row-start-1 sm:h-full"
          />
          <div className="flex items-center justify-between sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs text-brand-ink">
              <input type="checkbox" defaultChecked /> I agree to be contacted
            </label>
            <button className="inline-flex items-center gap-2 rounded-full bg-brand-red px-6 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark">
              Send <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
