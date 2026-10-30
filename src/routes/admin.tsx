import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save,
  Image as ImageIcon,
  ImageOff,
  Video,
  Package,
  IndianRupee,
  FileText,
  ShoppingBag,
  Mail,
  Info,
  Plus,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/data/pricing";
import { staticAbout, type AboutContent } from "@/lib/store";
import { signProductPhoto } from "@/lib/uploads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — B Cube Store Manager" },
      { name: "description", content: "Manage B Cube artwork, products, pricing, site copy, orders and enquiries." },
      { property: "og:title", content: "Admin — B Cube Store Manager" },
      { property: "og:description", content: "Internal store management for B Cube." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { id: "media", label: "Images & videos", Icon: ImageIcon },
  { id: "products", label: "Products", Icon: Package },
  { id: "pricing", label: "Prices", Icon: IndianRupee },
  { id: "content", label: "Site text", Icon: FileText },
  { id: "about", label: "About page", Icon: Info },
  { id: "orders", label: "Orders", Icon: ShoppingBag },
  { id: "enquiries", label: "Enquiries", Icon: Mail },
] as const;
type TabId = (typeof TABS)[number]["id"];

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<TabId>("media");

  if (loading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;

  if (!user)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          Please{" "}
          <Link to="/login" className="font-semibold text-brand-red underline">
            sign in
          </Link>{" "}
          with your admin account.
        </p>
      </Shell>
    );

  if (!isAdmin)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          This account does not have admin access yet. Ask an existing admin to grant it.
        </p>
      </Shell>
    );

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-brand-red text-white" : "border border-border bg-white text-brand-ink hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "media" && <MediaTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "pricing" && <PricingTab />}
      {tab === "content" && <ContentTab />}
      {tab === "about" && <AboutTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "enquiries" && <EnquiriesTab />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 pb-24 pt-6 md:pb-16">
      <div className="container mx-auto px-4">
        <h1 className="font-display text-3xl text-brand-ink md:text-4xl">Store manager</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          Everything on the website — artwork, products, prices and copy — is edited here.
        </p>
        {children}
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[25px] border border-border bg-white p-5 md:p-6">{children}</div>;
}

function SaveButton({
  onClick,
  busy,
  disabled,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex items-center gap-2 rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
    </button>
  );
}

/* ------------------------------------------------------------------ media */

function MediaTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "media"],
    queryFn: async () => {
      const { data, error } = await supabase.from("media").select("slot, kind, url, label").order("slot");
      if (error) throw error;
      return data;
    },
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const updates = Object.entries(draft);
    for (const [slot, url] of updates) {
      const { error } = await supabase.from("media").update({ url }).eq("slot", slot);
      if (error) {
        setBusy(false);
        toast.error(`Could not update ${slot}`);
        return;
      }
    }
    setBusy(false);
    setDraft({});
    await qc.invalidateQueries();
    toast.success("Artwork updated");
  }

  async function saveImage(slot: string, url: string) {
    setDraft((d) => ({ ...d, [slot]: url }));
    const { error } = await supabase.from("media").update({ url }).eq("slot", slot);
    if (error) {
      toast.error(`Could not update ${slot}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin", "media"] });
    setDraft((d) => {
      const next = { ...d };
      delete next[slot];
      return next;
    });
    toast.success("Image updated");
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-muted-foreground">
        Uploaded images save automatically. For video slots, paste a link and click Save changes.
      </p>
      <div className="space-y-4">
        {(data ?? []).map((m) => (
          <div key={m.slot} className="grid gap-3 border-b border-border pb-4 last:border-0 sm:grid-cols-[120px_1fr]">
            <div className="flex items-center gap-3">
              {m.kind === "video" ? (
                <div className="grid h-16 w-24 place-items-center rounded-lg bg-muted">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (draft[m.slot] ?? m.url) ? (
                <img
                  src={draft[m.slot] ?? m.url}
                  alt=""
                  className="h-16 w-24 rounded-lg bg-muted object-contain"
                />
              ) : (
                <div className="grid h-16 w-24 place-items-center rounded-lg bg-muted">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-ink">{m.label || m.slot}</p>
              {m.kind === "image" ? (
                <div className="mt-1">
                  <ImageUpload
                    initialUrl={draft[m.slot] ?? m.url}
                    onUploaded={(url) => void saveImage(m.slot, url)}
                    showPreview={false}
                  />
                </div>
              ) : (
                <input
                  value={draft[m.slot] ?? m.url}
                  onChange={(e) => setDraft((d) => ({ ...d, [m.slot]: e.target.value }))}
                  className="mt-1 w-full rounded-full border border-border px-4 py-2 text-xs outline-none focus:border-brand-red"
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <SaveButton onClick={() => void save()} busy={busy} />
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- products */

function ProductsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("slug, name, category, mode, image_url, published, sort_order, description")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const [draft, setDraft] = useState<
    Record<string, { name?: string; image_url?: string; published?: boolean; description?: string }>
  >({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    for (const [slug, patch] of Object.entries(draft)) {
      const { error } = await supabase.from("products").update(patch).eq("slug", slug);
      if (error) {
        setBusy(false);
        toast.error(`Could not update ${slug}`);
        return;
      }
    }
    setBusy(false);
    setDraft({});
    await qc.invalidateQueries();
    toast.success("Products updated");
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-muted-foreground">
        Rename products, swap their picture, edit the description shown on the product page, or hide them from the shop.
      </p>
      <div className="space-y-4">
        {(data ?? []).map((p) => {
          const d = draft[p.slug] ?? {};
          return (
            <div key={p.slug} className="grid gap-3 border-b border-border pb-4 last:border-0 sm:grid-cols-[90px_1fr_auto] sm:items-start">
              {(d.image_url ?? p.image_url) ? (
                <img
                  src={d.image_url ?? p.image_url}
                  alt=""
                  className="h-16 w-20 rounded-lg bg-muted object-contain"
                />
              ) : (
                <div className="grid h-16 w-20 place-items-center rounded-lg bg-muted">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <input
                  value={d.name ?? p.name}
                  onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...x[p.slug], name: e.target.value } }))}
                  className="w-full rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-brand-red"
                />
                <ImageUpload
                  initialUrl={d.image_url ?? p.image_url}
                  onUploaded={(url) =>
                    setDraft((x) => ({ ...x, [p.slug]: { ...x[p.slug], image_url: url } }))
                  }
                  showPreview={false}
                />
                <textarea
                  rows={5}
                  placeholder="Description shown on the product page. Start a line with “-” to make a bullet point."
                  value={d.description ?? p.description ?? ""}
                  onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...x[p.slug], description: e.target.value } }))}
                  className="w-full rounded-2xl border border-border p-3 text-xs outline-none focus:border-brand-red"
                />
                <p className="text-[11px] text-muted-foreground">
                  {p.category} · {p.mode === "wizard" ? "step-by-step designer" : p.mode === "bulk" ? "bulk quote" : "custom enquiry"}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={d.published ?? p.published}
                  onChange={(e) => setDraft((x) => ({ ...x, [p.slug]: { ...x[p.slug], published: e.target.checked } }))}
                />
                Visible
              </label>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <SaveButton onClick={() => void save()} busy={busy} />
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- pricing */

type PricingRow = {
  product_slug: string;
  base: number;
  framed: number;
  shape: Record<string, number>;
  size: Record<string, number>;
  thickness: Record<string, number>;
  text_price: number;
};

function PricingTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_pricing")
        .select("product_slug, base, framed, shape, size, thickness, text_price")
        .order("product_slug");
      if (error) throw error;
      return (data ?? []) as unknown as PricingRow[];
    },
  });
  const slugs = useMemo(() => (data ?? []).map((r) => r.product_slug), [data]);
  const [slug, setSlug] = useState("");
  useEffect(() => {
    if (!slug && slugs.length > 0) setSlug(slugs[0]!);
  }, [slug, slugs]);

  const row = (data ?? []).find((r) => r.product_slug === slug);
  const [draft, setDraft] = useState<PricingRow | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(row ? { ...row } : null), [row?.product_slug, row?.base]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    const { product_slug, ...patch } = draft;
    const { error } = await supabase
      .from("product_pricing")
      .update(patch as never)
      .eq("product_slug", product_slug);
    setBusy(false);
    if (error) return toast.error("Could not save prices");
    await qc.invalidateQueries();
    toast.success("Prices updated");
  }

  function setGroup(group: "shape" | "size" | "thickness", key: string, value: number) {
    setDraft((d) => (d ? { ...d, [group]: { ...d[group], [key]: value } } : d));
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-full border border-border px-4 py-2 text-sm"
        >
          {slugs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <SaveButton onClick={() => void save()} busy={busy} />
      </div>

      {draft && (
        <div className="mt-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="Base price" value={draft.base} onChange={(v) => setDraft({ ...draft, base: v })} />
            <NumberField label="With frame (extra)" value={draft.framed} onChange={(v) => setDraft({ ...draft, framed: v })} />
            <NumberField label="Engraved text (extra)" value={draft.text_price} onChange={(v) => setDraft({ ...draft, text_price: v })} />
          </div>
          {(["shape", "size", "thickness"] as const).map((group) => (
            <div key={group}>
              <h3 className="mb-2 font-display text-lg capitalize text-brand-ink">{group} extras</h3>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Object.entries(draft[group]).map(([key, value]) => (
                  <NumberField key={key} label={key} value={value} onChange={(v) => setGroup(group, key, v)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-brand-red"
      />
    </label>
  );
}

/* ---------------------------------------------------------------- content */

const CONTENT_KEYS = [
  { key: "hero_slides", label: "Homepage banner taglines" },
  { key: "testimonial_groups", label: "Testimonial blocks & videos" },
  { key: "reviews", label: "Customer reviews" },
] as const;

type ContentKey = (typeof CONTENT_KEYS)[number]["key"];

type HeroSlideContent = {
  image_slot: string;
  tagline: string;
  alt: string;
  light: boolean;
};

type TestimonialGroupContent = {
  id: string;
  title: string;
  body: string;
  videos: string[];
};

type ReviewContent = {
  name: string;
  quote: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function heroSlidesFrom(value: unknown): HeroSlideContent[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const row = asRecord(item);
        return {
          image_slot: asString(row.image_slot),
          tagline: asString(row.tagline),
          alt: asString(row.alt),
          light: row.light === true,
        };
      })
    : [];
}

function testimonialGroupsFrom(value: unknown): TestimonialGroupContent[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const row = asRecord(item);
        return {
          id: asString(row.id),
          title: asString(row.title),
          body: asString(row.body),
          videos: Array.isArray(row.videos)
            ? row.videos.filter((video): video is string => typeof video === "string")
            : [],
        };
      })
    : [];
}

function reviewsFrom(value: unknown): ReviewContent[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const row = asRecord(item);
        return { name: asString(row.name), quote: asString(row.quote) };
      })
    : [];
}

function contentPayload(key: ContentKey, value: unknown) {
  if (key === "hero_slides") return heroSlidesFrom(value);
  if (key === "testimonial_groups") {
    return testimonialGroupsFrom(value).map((group) => ({
      ...group,
      videos: group.videos.filter(Boolean),
    }));
  }
  return reviewsFrom(value);
}

function ContentField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-brand-red"
      />
    </label>
  );
}

function ContentTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-border p-3 text-sm outline-none focus:border-brand-red"
      />
    </label>
  );
}

function SegmentHeader({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-brand-ink">{title}</p>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-red transition hover:bg-muted"
      >
        <Trash2 className="h-3.5 w-3.5" /> Remove
      </button>
    </div>
  );
}

function AddSegmentButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-white px-4 py-2 text-xs font-semibold text-brand-ink transition hover:bg-muted"
    >
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function heroSlotNumber(slot: string) {
  const match = /^hero-(\d+)$/.exec(slot);
  return match ? Number(match[1]) : 0;
}

function HeroSlidesEditor({
  value,
  onChange,
}: {
  value: HeroSlideContent[];
  onChange: (value: HeroSlideContent[]) => void;
}) {
  function update(index: number, patch: Partial<HeroSlideContent>) {
    onChange(value.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)));
  }

  const slotCount = Math.max(
    value.length,
    ...value.map((slide) => heroSlotNumber(slide.image_slot)),
  );
  const slotOptions = Array.from({ length: slotCount }, (_, i) => `hero-${i + 1}`);

  function updateSlot(index: number, slot: string) {
    const current = value[index]?.image_slot ?? "";
    if (slot === current) return;

    const swapIndex = value.findIndex((slide, i) => i !== index && slide.image_slot === slot);
    if (swapIndex === -1) {
      update(index, { image_slot: slot });
      return;
    }

    const next = [...value];
    const selected = next[index];
    const existing = next[swapIndex];
    if (!selected || !existing) return;
    next[index] = existing;
    next[swapIndex] = selected;
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {value.map((slide, index) => {
        const options =
          slide.image_slot && !slotOptions.includes(slide.image_slot)
            ? [...slotOptions, slide.image_slot]
            : slotOptions;

        return (
          <div key={index} className="rounded-2xl border border-border p-4">
            <SegmentHeader
              title={`Slide ${index + 1}`}
              onRemove={() => onChange(value.filter((_, i) => i !== index))}
            />
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Image slot
                </span>
                <select
                  value={slide.image_slot}
                  onChange={(e) => updateSlot(index, e.target.value)}
                  className="mt-1 w-full rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-brand-red"
                >
                  <option value="">Select a slot</option>
                  {options.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
              <ContentField
                label="Tagline"
                value={slide.tagline}
                onChange={(next) => update(index, { tagline: next })}
              />
              <ContentField
                label="Alt text"
                value={slide.alt}
                onChange={(next) => update(index, { alt: next })}
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={slide.light}
                  onChange={(e) => update(index, { light: e.target.checked })}
                />
                Light text over the image
              </label>
            </div>
          </div>
        );
      })}
      {value.length === 0 && <p className="text-sm text-muted-foreground">No banner slides yet.</p>}
      <AddSegmentButton
        onClick={() =>
          onChange([
            ...value,
            { image_slot: `hero-${slotCount + 1}`, tagline: "", alt: "", light: false },
          ])
        }
      >
        Add slide
      </AddSegmentButton>
    </div>
  );
}

function TestimonialGroupsEditor({
  value,
  onChange,
}: {
  value: TestimonialGroupContent[];
  onChange: (value: TestimonialGroupContent[]) => void;
}) {
  function update(index: number, patch: Partial<TestimonialGroupContent>) {
    onChange(value.map((group, i) => (i === index ? { ...group, ...patch } : group)));
  }

  function updateVideo(groupIndex: number, videoIndex: number, url: string) {
    onChange(
      value.map((group, i) =>
        i === groupIndex
          ? { ...group, videos: group.videos.map((video, j) => (j === videoIndex ? url : video)) }
          : group,
      ),
    );
  }

  function removeVideo(groupIndex: number, videoIndex: number) {
    onChange(
      value.map((group, i) =>
        i === groupIndex
          ? { ...group, videos: group.videos.filter((_, j) => j !== videoIndex) }
          : group,
      ),
    );
  }

  return (
    <div className="space-y-4">
      {value.map((group, index) => (
        <div key={index} className="rounded-2xl border border-border p-4">
          <SegmentHeader
            title={group.title || `Group ${index + 1}`}
            onRemove={() => onChange(value.filter((_, i) => i !== index))}
          />
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <ContentField
              label="Group ID"
              value={group.id}
              placeholder="acrylic-photos"
              onChange={(next) => update(index, { id: next })}
            />
            <ContentField
              label="Title"
              value={group.title}
              onChange={(next) => update(index, { title: next })}
            />
          </div>
          <div className="mt-3">
            <ContentTextArea
              label="Description"
              value={group.body}
              onChange={(next) => update(index, { body: next })}
            />
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Videos
              </p>
              <AddSegmentButton onClick={() => update(index, { videos: [...group.videos, ""] })}>
                Add video
              </AddSegmentButton>
            </div>
            <div className="mt-3 space-y-2">
              {group.videos.map((video, videoIndex) => (
                <div
                  key={videoIndex}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3"
                >
                  {video ? (
                    <video
                      src={video}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-20 w-32 shrink-0 rounded-lg border border-border bg-black object-cover"
                    />
                  ) : (
                    <div className="grid h-20 w-32 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-muted">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <VideoUpload
                    url={video}
                    onUploaded={(url) => updateVideo(index, videoIndex, url)}
                  />
                  <button
                    type="button"
                    onClick={() => removeVideo(index, videoIndex)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-red transition hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ))}
              {group.videos.length === 0 && (
                <p className="text-xs text-muted-foreground">No videos yet.</p>
              )}
            </div>
          </div>
        </div>
      ))}
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">No testimonial groups yet.</p>
      )}
      <AddSegmentButton
        onClick={() => onChange([...value, { id: "", title: "", body: "", videos: [] }])}
      >
        Add group
      </AddSegmentButton>
    </div>
  );
}

function ReviewsEditor({
  value,
  onChange,
}: {
  value: ReviewContent[];
  onChange: (value: ReviewContent[]) => void;
}) {
  function update(index: number, patch: Partial<ReviewContent>) {
    onChange(value.map((review, i) => (i === index ? { ...review, ...patch } : review)));
  }

  return (
    <div className="space-y-4">
      {value.map((review, index) => (
        <div key={index} className="rounded-2xl border border-border p-4">
          <SegmentHeader
            title={`Review ${index + 1}`}
            onRemove={() => onChange(value.filter((_, i) => i !== index))}
          />
          <div className="mt-3 space-y-3">
            <ContentField
              label="Customer name"
              value={review.name}
              onChange={(next) => update(index, { name: next })}
            />
            <ContentTextArea
              label="Quote"
              value={review.quote}
              onChange={(next) => update(index, { quote: next })}
            />
          </div>
        </div>
      ))}
      {value.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
      <AddSegmentButton onClick={() => onChange([...value, { name: "", quote: "" }])}>
        Add review
      </AddSegmentButton>
    </div>
  );
}

function ContentTab() {
  const qc = useQueryClient();
  const [key, setKey] = useState<ContentKey>(CONTENT_KEYS[0].key);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "content", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? null) as unknown;
    },
  });
  const [draft, setDraft] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(null), [key]);

  const value = draft !== null ? draft : data;

  async function save() {
    setBusy(true);
    const payload = contentPayload(key, draft !== null ? draft : data);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key, value: payload as never }, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error("Could not save");
    await qc.invalidateQueries();
    setDraft(null);
    toast.success("Site content updated");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={key}
          onChange={(e) => {
            setDraft(null);
            setKey(e.target.value as ContentKey);
          }}
          className="rounded-full border border-border px-4 py-2 text-sm"
        >
          {CONTENT_KEYS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <SaveButton onClick={() => void save()} busy={busy} disabled={isLoading || isError} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Add or remove sections and upload new videos, then save. Each block is stored as a JSON
        payload.
      </p>

      <div className="mt-5">
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load this content. Refresh the page and try again.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : key === "hero_slides" ? (
          <HeroSlidesEditor value={heroSlidesFrom(value)} onChange={(next) => setDraft(next)} />
        ) : key === "testimonial_groups" ? (
          <TestimonialGroupsEditor
            value={testimonialGroupsFrom(value)}
            onChange={(next) => setDraft(next)}
          />
        ) : (
          <ReviewsEditor value={reviewsFrom(value)} onChange={(next) => setDraft(next)} />
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------ about page */

const ABOUT_FIELDS = [
  { key: "hero_heading", label: "Banner heading", long: false },
  { key: "hero_subheading", label: "Banner sub-heading", long: false },
  { key: "about_heading", label: "“About us” heading", long: false },
  { key: "about_body", label: "“About us” text", long: true },
  { key: "testimonials_heading", label: "Testimonials heading", long: false },
  { key: "who_heading", label: "“Who we are” heading", long: false },
  { key: "who_body", label: "“Who we are” text", long: true },
] as const;

function AboutTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "about"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("value").eq("key", "about_page").maybeSingle();
      if (error) throw error;
      return { ...staticAbout, ...((data?.value ?? {}) as Partial<AboutContent>) } as AboutContent;
    },
  });
  const [draft, setDraft] = useState<Partial<AboutContent>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!data) return;
    setBusy(true);
    const value = { ...data, ...draft };
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "about_page", value: value as never }, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error("Could not save the About page");
    setDraft({});
    await qc.invalidateQueries();
    toast.success("About page updated");
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-muted-foreground">Edit every piece of text on the About us page.</p>
      <div className="space-y-4">
        {ABOUT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</span>
            {f.long ? (
              <textarea
                rows={6}
                value={draft[f.key] ?? data?.[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-border p-3 text-sm outline-none focus:border-brand-red"
              />
            ) : (
              <input
                value={draft[f.key] ?? data?.[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="mt-1 w-full rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-brand-red"
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-5">
        <SaveButton onClick={() => void save()} busy={busy} />
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- orders */

type OrderConfig = Record<string, unknown>;

type AdminOrderItem = {
  name: string;
  qty: number;
  unit_price: number;
  slug: string;
  config?: OrderConfig | null;
};

type AdminOrder = {
  id: string;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  subtotal: number;
  status: string;
  created_at: string;
  order_items: AdminOrderItem[];
};

const CONFIG_LABELS: Record<string, string> = {
  mode: "Order type",
  shape: "Shape",
  frame: "Frame",
  frameColor: "Frame colour",
  orientation: "Orientation",
  size: "Size",
  thickness: "Thickness",
  addText: "Custom text",
  text: "Text",
  textColor: "Text colour",
  textSize: "Text size",
  imgScale: "Image zoom",
  imgX: "Image position X",
  imgY: "Image position Y",
  quantity: "Quantity",
  pincode: "Pincode",
  idea: "Customer's idea",
  message: "Customer message",
};

const CONFIG_PRIMARY_KEYS = [
  "mode",
  "shape",
  "frame",
  "frameColor",
  "orientation",
  "size",
  "thickness",
  "addText",
  "text",
  "textColor",
  "textSize",
  "imgScale",
  "imgX",
  "imgY",
];

const BUYER_INFO_KEYS = ["quantity", "pincode", "idea", "message"];
const HIDDEN_CONFIG_KEYS = new Set(["step", "imageUrl", "imagePath", "price", "buyerInfo"]);
const HIDDEN_BUYER_KEYS = new Set(["name", "email", "phone", "address", "mode"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatConfigValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (key === "frame") return value === "with" ? "With frame" : "Without frame";
    if (key === "mode") {
      if (value === "wizard") return "Customised product";
      if (value === "bulk") return "Bulk order";
      if (value === "custom-enquiry") return "Custom enquiry";
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  return JSON.stringify(value);
}

function buildConfigRows(config: OrderConfig) {
  const rows: { key: string; label: string; value: string; color?: string }[] = [];
  const seen = new Set<string>();

  const push = (key: string, value: unknown) => {
    if (seen.has(key)) return;
    const text = formatConfigValue(key, value);
    if (text === null) return;
    seen.add(key);
    const color =
      /colou?r$/i.test(key) && typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)
        ? value
        : undefined;
    rows.push({ key, label: CONFIG_LABELS[key] ?? humanizeKey(key), value: text, color });
  };

  for (const key of CONFIG_PRIMARY_KEYS) push(key, config[key]);

  const buyerInfo = isRecord(config.buyerInfo) ? config.buyerInfo : {};
  for (const key of BUYER_INFO_KEYS) push(key, buyerInfo[key]);

  for (const [key, value] of Object.entries(config)) {
    if (HIDDEN_CONFIG_KEYS.has(key)) continue;
    push(key, value);
  }
  for (const [key, value] of Object.entries(buyerInfo)) {
    if (HIDDEN_BUYER_KEYS.has(key)) continue;
    push(key, value);
  }

  return rows;
}

function extensionFromType(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function OrderItemDetails({
  item,
  order,
  index,
}: {
  item: AdminOrderItem;
  order: AdminOrder;
  index: number;
}) {
  const config = isRecord(item.config) ? item.config : {};
  const savedPath = typeof config.imagePath === "string" ? config.imagePath : undefined;
  const savedUrl = typeof config.imageUrl === "string" ? config.imageUrl : undefined;
  const [imageUrl, setImageUrl] = useState<string | null>(savedUrl ?? null);
  const [imageFailed, setImageFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setImageFailed(false);
    if (!savedPath) {
      setImageUrl(savedUrl ?? null);
      return () => {
        active = false;
      };
    }
    void signProductPhoto(savedPath).then((url) => {
      if (active && url) setImageUrl(url);
    });
    return () => {
      active = false;
    };
  }, [savedPath, savedUrl]);

  async function downloadArtwork() {
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeFilename(item.slug || "artwork")}-${shortOrderId(order.id)}-${index + 1}.${extensionFromType(blob.type)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Artwork downloaded");
    } catch (error) {
      console.error("artwork download failed", error);
      window.open(imageUrl, "_blank", "noopener,noreferrer");
      toast.info("Artwork opened in a new tab — save it from there.");
    } finally {
      setDownloading(false);
    }
  }

  const rows = buildConfigRows(config);
  const lineTotal = item.unit_price * item.qty;

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={`${item.name} artwork`}
              className="h-full w-full object-contain p-1"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <ImageOff className="h-5 w-5" />
              <span className="text-[10px]">No artwork</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-ink">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qty {item.qty} · {formatPrice(item.unit_price)} each
              </p>
            </div>
            <p className="font-display text-lg text-brand-red">{formatPrice(lineTotal)}</p>
          </div>

          {imageUrl && (
            <button
              type="button"
              onClick={() => void downloadArtwork()}
              disabled={downloading}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-red px-3 py-1.5 text-xs font-semibold text-brand-red transition hover:bg-brand-red hover:text-white disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "Downloading…" : "Download artwork"}
            </button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-1.5 break-words text-right font-medium text-brand-ink">
                {row.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-border"
                    style={{ backgroundColor: row.color }}
                  />
                )}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function OrderDetailsDialog({
  order,
  onClose,
}: {
  order: AdminOrder | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!order}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-[25px] p-0 sm:rounded-[25px]">
        {order && (
          <>
            <div className="shrink-0 border-b border-border bg-white px-5 py-4 pr-14 md:px-6">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-brand-ink">
                  Order #{shortOrderId(order.id)}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()} · {order.status}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch] md:px-6">
              <section className="grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </h3>
                  <p className="mt-2 break-words font-display text-lg text-brand-ink">
                    {order.customer_name || "Customer"}
                  </p>
                  {order.phone && (
                    <a
                      href={`tel:${order.phone}`}
                      className="mt-1 block text-sm text-brand-red hover:underline"
                    >
                      {order.phone}
                    </a>
                  )}
                  {order.email && (
                    <a
                      href={`mailto:${order.email}`}
                      className="block break-all text-sm text-brand-red hover:underline"
                    >
                      {order.email}
                    </a>
                  )}
                </div>

                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Delivery address
                  </h3>
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-brand-ink">
                    {order.address || "—"}
                  </p>
                  {order.notes && (
                    <p className="mt-2 break-words text-xs italic text-muted-foreground">
                      Notes: {order.notes}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Items ({order.order_items.length})
                  </h3>
                  <p className="font-display text-lg text-brand-red">{formatPrice(order.subtotal)}</p>
                </div>
                <div className="space-y-4">
                  {order.order_items.map((item, index) => (
                    <OrderItemDetails
                      key={`${order.id}-${index}`}
                      item={item}
                      order={order}
                      index={index}
                    />
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrdersTab() {
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, customer_name, email, phone, address, notes, subtotal, status, created_at, order_items(name, qty, unit_price, slug, config)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminOrder[];
    },
  });

  if (!data || data.length === 0)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      </Card>
    );

  return (
    <>
      <div className="space-y-4">
        {data.map((o) => {
          const itemCount = o.order_items.reduce((sum, item) => sum + item.qty, 0);
          return (
            <Card key={o.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg text-brand-ink">
                      {o.customer_name || "Customer"}
                    </p>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Order #{shortOrderId(o.id)} · {new Date(o.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.phone}
                    {o.email && ` · ${o.email}`}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                    {o.order_items.map((item) => `${item.name} × ${item.qty}`).join(", ")}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="font-display text-xl text-brand-red">{formatPrice(o.subtotal)}</p>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-red px-4 py-2 text-xs font-semibold text-brand-red transition hover:bg-brand-red hover:text-white"
                  >
                    <Eye className="h-3.5 w-3.5" /> View details
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <OrderDetailsDialog order={selected} onClose={() => setSelected(null)} />
    </>
  );
}

/* -------------------------------------------------------------- enquiries */

function EnquiriesTab() {
  const { data } = useQuery({
    queryKey: ["admin", "enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enquiries")
        .select("id, source, name, email, phone, message, payload, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!data || data.length === 0)
    return (
      <Card>
        <p className="text-sm text-muted-foreground">No enquiries yet.</p>
      </Card>
    );

  return (
    <div className="space-y-4">
      {data.map((e) => (
        <Card key={e.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-lg text-brand-ink">{e.name || "Anonymous"}</p>
            <span className="rounded-full bg-brand-yellow px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
              {e.source}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(e.created_at).toLocaleString()} · {e.phone} {e.email && `· ${e.email}`}
          </p>
          {e.message && <p className="mt-2 text-sm text-brand-ink">{e.message}</p>}
          {e.payload && Object.keys(e.payload as object).length > 0 && (
            <pre className="mt-2 overflow-x-auto rounded-xl bg-muted/60 p-3 text-[11px]">
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}
