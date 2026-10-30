import { assetUrl } from "@/data/media-map";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic, MagneticButton } from "@/components/motion/MagneticButton";
import { useParallax } from "@/hooks/use-parallax";
import { ArrowRight } from "lucide-react";
import { ProductTile } from "@/components/product/ProductTile";
import { Testimonials } from "@/components/sections/Testimonials";
import { CustomerStories } from "@/components/sections/CustomerStories";
import { EnquireModal } from "@/components/sections/EnquireModal";
import { useMedia, useProducts, useHeroSlides } from "@/lib/store";
import { submitEnquiry } from "@/lib/enquiries";
import {
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  capitalizeName,
  sanitizePhone,
  validateContactFields,
} from "@/lib/validation";

/* Site media — resolved from Supabase Storage when VITE_MEDIA_BASE_URL is set. */
const banner1 = { url: assetUrl("banner-1.png") };
const banner2 = { url: assetUrl("banner-2.png") };
const banner3 = { url: assetUrl("banner-3.png") };
const cat1 = { url: assetUrl("Cat1.png") };
const cat2 = { url: assetUrl("Cat2.png") };
const cat3 = { url: assetUrl("Cat3.png") };
const catBg1 = { url: assetUrl("Category_Bg1.png") };
const catBg2 = { url: assetUrl("Category_Bg2b.png") };
const pPremium = { url: assetUrl("Premium_Acrylic_Photos.png") };
const pFramed = { url: assetUrl("Framed_Acrylic_Photos.png") };
const pPillow = { url: assetUrl("Custom_Pillows.png") };
const pMagnet = { url: assetUrl("Fridge_magnets.png") };
const pNamePlate = { url: assetUrl("Custom_name_plates.png") };
const pKeychain = { url: assetUrl("Custom_Keychains.png") };
const ad1 = { url: assetUrl("Advertisment_Card.png") };
const ad2 = { url: assetUrl("Advertisement_card_2.png") };
const ad3 = { url: assetUrl("Advertisement_card_3.png") };
const gCorporate = { url: assetUrl("Corporate_gifting.png") };
const gAcrylic = { url: assetUrl("Custom_acrylic_phots.png") };
const gReturn = { url: assetUrl("Return_Gifts.png") };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "B Cube — More Than Décor. It's Personal." },
      {
        name: "description",
        content:
          "Personalised acrylic photos, framed pieces, clocks and gifts crafted for the moments that matter.",
      },
      { property: "og:title", content: "B Cube — More Than Décor. It's Personal." },
      {
        property: "og:description",
        content: "Personalised acrylic photos, framed pieces, clocks and gifts.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <Spotlight />
      <EnquireBand />
      <FeaturedGrid />
      <RelationshipBanner />
      <Testimonials />
      <ContactStrip />
      <MakeSpecial />
      <PerfectGifts />
      <CustomerStories />
      <EnquireModal />
    </>
  );
}

const bannerFallback: Record<string, string> = {
  "hero-1": banner1.url,
  "hero-2": banner2.url,
  "hero-3": banner3.url,
};

function Hero() {
  const { media } = useMedia();
  const heroSlides = useHeroSlides();
  const slides = heroSlides.map((s) => ({
    ...s,
    img: media(s.image_slot, bannerFallback[s.image_slot] ?? banner1.url),
  }));
  const [i, setI] = useState(0);
  const go = (n: number) => setI((n + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <section className="w-full px-4 pb-8 pt-3 sm:px-6 md:px-[56px] md:pb-[40px] md:pt-[16px]">
      <div className="relative w-full overflow-hidden rounded-[25px]">
        <div
          className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${i * 100}%)` }}
        >
          {slides.map((s, k) => (
            <div key={s.tagline} className="relative w-full shrink-0">
              <img
                src={s.img}
                alt={s.alt}
                className="h-[60vh] min-h-[360px] w-full object-cover md:h-[90vh]"
                loading={k === 0 ? "eager" : "lazy"}
                fetchPriority={k === 0 ? "high" : "low"}
                decoding="async"
              />
              <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-5 px-6 pt-14 text-center md:pt-24">
                <h1
                  className={`max-w-2xl md:max-w-3xl lg:max-w-none lg:whitespace-nowrap font-display text-2xl italic leading-tight sm:text-3xl md:text-4xl lg:text-5xl ${s.light ? "text-white" : "text-brand-ink"}`}
                >
                  {s.tagline}
                </h1>
                <Magnetic>
                  <Link
                    to="/product"
                    search={{ tab: "custom" }}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-red-dark"
                  >
                    Explore <ArrowRight className="h-4 w-4" />
                  </Link>
                </Magnetic>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((s, k) => (
            <button
              key={s.tagline}
              aria-label={`Go to slide ${k + 1}`}
              onClick={() => go(k)}
              className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-brand-yellow" : "w-2 bg-brand-ink/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Spotlight() {
  const { media } = useMedia();
  const bgIdle = catBg1.url;
  const bgHover = catBg2.url;
  const items = [
    { label: "Custom Acrylic Pictures", img: cat1.url, tab: "custom" as const },
    { label: "Corporate Gifting", img: cat2.url, tab: "corporate" as const },
    { label: "Return Gifts", img: cat3.url, tab: "return" as const },
  ];
  return (
    <section className="container mx-auto px-4 py-14">
      <Reveal as="h2" className="text-center font-display text-3xl md:text-4xl text-brand-ink">
        Product categories
      </Reveal>
      <div className="mt-8 md:mt-12 grid gap-6 md:gap-10 grid-cols-3 place-items-center">
        {items.map((it, idx) => (
          <Reveal key={it.label} delay={idx * 90}>
            <Link
              key={it.label}
              to="/product"
              search={{ tab: it.tab }}
              className="group flex min-w-0 flex-col items-center"
            >
              <div className="relative h-28 w-28 sm:h-40 sm:w-40 md:h-52 md:w-52 lg:h-72 lg:w-72">
                <img
                  src={bgIdle}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain transition-opacity duration-200 group-hover:opacity-0"
                />
                <img
                  src={bgHover}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
                <img
                  src={it.img}
                  alt={it.label}
                  loading="lazy"
                  className="absolute inset-0 m-auto h-20 w-20 sm:h-28 sm:w-28 md:h-40 md:w-40 lg:h-56 lg:w-56 object-contain drop-shadow-md"
                />
              </div>
              <p className="mt-3 md:mt-4 text-center text-xs sm:text-sm md:text-base lg:text-lg font-medium text-brand-ink">
                {it.label}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function EnquireBand() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  return (
    <section className="bg-brand-yellow my-12">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 px-4 py-10 items-center">
        <Reveal
          as="h2"
          className="font-display text-5xl text-brand-red leading-none rotate-[-2deg]"
        >
          Enquire
          <br />
          Now
        </Reveal>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const error = validateContactFields(form);
            if (error) {
              toast.error(error);
              return;
            }
            const ok = await submitEnquiry({
              source: "home",
              ...form,
              name: form.name.trim(),
              email: form.email.trim(),
            });
            if (!ok) return toast.error("Could not send your enquiry. Please try again.");
            toast.success("Enquiry sent — we'll be in touch!");
            setForm({ name: "", email: "", phone: "", message: "" });
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Name"
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: capitalizeName(e.target.value) })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            required
            type="email"
            placeholder="Email"
            autoComplete="email"
            maxLength={254}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <input
            required
            type="tel"
            inputMode="numeric"
            placeholder="Phone (10 digits)"
            autoComplete="tel-national"
            pattern="[6-9][0-9]{9}"
            title="Enter a 10-digit mobile number starting with 6–9"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red"
          />
          <textarea
            placeholder="Message"
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="rounded-md bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-red sm:row-span-2 sm:col-start-2 sm:row-start-1 sm:h-full"
          />
          <div className="flex items-center justify-between sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-xs text-brand-ink">
              <input type="checkbox" defaultChecked /> I agree to be contacted
            </label>
            <MagneticButton className="rounded-md bg-brand-red px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark">
              Send
            </MagneticButton>
          </div>
        </form>
      </div>
    </section>
  );
}

function FeaturedGrid() {
  const { image } = useProducts();
  const fallback: Record<string, string> = {
    "premium-acrylic-photo": pPremium.url,
    "framed-acrylic-photo": pFramed.url,
    pillows: pPillow.url,
    "fridge-magnet": pMagnet.url,
    "name-plate": pNamePlate.url,
    keychain: pKeychain.url,
  };
  const featured = [
    { slug: "premium-acrylic-photo", name: "Premium Acrylic Photo" },
    { slug: "framed-acrylic-photo", name: "Framed Acrylic Photos" },
    { slug: "pillows", name: "Custom Pillows" },
    { slug: "fridge-magnet", name: "Fridge Magnets" },
    { slug: "name-plate", name: "Custom Name Plates" },
    { slug: "keychain", name: "Custom Keychains" },
  ].map((p) => ({ ...p, img: image(p.slug) || fallback[p.slug]! }));
  return (
    <section className="container mx-auto px-4 py-12">
      <Reveal as="h2" className="text-center font-display text-3xl md:text-4xl text-brand-ink">
        Acrylic photos, framed pieces, clocks &amp; sets
      </Reveal>
      <div className="mt-8 md:mt-10 grid grid-cols-2 md:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-8 md:gap-y-12">
        {featured.map((p, idx) => (
          <Reveal key={p.slug} delay={idx * 80}>
            <ProductTile name={p.name} slug={p.slug} img={p.img} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function RelationshipBanner() {
  const { media } = useMedia();
  const layer = useParallax<HTMLImageElement>(0.045, 1.1);
  return (
    <section className="my-12 overflow-hidden">
      <img
        ref={layer}
        src={media("ad-1", ad1.url)}
        alt="Enriching relationships through thoughtful gifts"
        className="w-full will-change-transform"
        loading="lazy"
      />
      {/* <p>fneugbhfbe{media("ad-1", ad1.url)}</p> */}
    </section>
  );
}

function ContactStrip() {
  const { media } = useMedia();
  return (
    <section className="my-12">
      <Link to="/contact" className="block">
        <img
          src={media("ad-2", ad2.url)}
          alt="To know more about our products — call +91 93632 96919 or email bcube@gmail.com"
          className="w-full"
          loading="lazy"
        />
      </Link>
    </section>
  );
}

function MakeSpecial() {
  const { media } = useMedia();
  const cats = [
    { name: "Corporate Gifting", img: media("special-1", gCorporate.url) },
    { name: "Customised Pictures", img: media("special-2", gAcrylic.url) },
    { name: "Premium Gifting", img: media("special-3", gCorporate.url) },
    { name: "Return Gifts", img: media("special-4", gReturn.url) },
  ];
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 items-center">
        <Reveal
          as="h2"
          className="font-display text-4xl md:text-5xl leading-tight text-brand-ink text-center lg:text-left lg:ml-24"
        >
          Make
          <br />
          Celebrations
          <br />
          Special With
        </Reveal>
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-10 items-end">
          {cats.map((c, idx) => (
            <Reveal key={c.name} delay={idx * 80}>
              <ProductTile name={c.name} img={c.img} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerfectGifts() {
  const { media } = useMedia();
  const layer = useParallax<HTMLImageElement>(0.045, 1.1);
  return (
    <section className="my-12 overflow-hidden">
      <img
        ref={layer}
        src={media("ad-3", ad3.url)}
        alt="Find the perfect gifts — discover gifts by recipient, relationships and occasions"
        className="w-full will-change-transform"
        loading="lazy"
      />
    </section>
  );
}
