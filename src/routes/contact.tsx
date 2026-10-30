import { assetUrl } from "@/data/media-map";
import { createFileRoute } from "@tanstack/react-router";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { submitEnquiry } from "@/lib/enquiries";
import { useMedia } from "@/lib/store";
import {
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  capitalizeName,
  sanitizePhone,
  validateContactFields,
} from "@/lib/validation";

/* Site media — resolved from Supabase Storage when VITE_MEDIA_BASE_URL is set. */
const logo = { url: assetUrl("LOGO.png") };
const ad2 = { url: assetUrl("Advertisement_card_2.png") };

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact B Cube — Personalised Gifts & Bulk Orders" },
      {
        name: "description",
        content:
          "Talk to B Cube about custom acrylic photos, décor and bulk corporate gifting. Send an enquiry and we'll reply within a day.",
      },
      { property: "og:title", content: "Contact B Cube — Personalised Gifts & Bulk Orders" },
      { property: "og:description", content: "Send us your gifting brief and we'll bring it to life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

/** Shape the backend endpoint should accept for a contact enquiry. */
export type ContactEnquiry = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const emptyEnquiry: ContactEnquiry = { name: "", email: "", phone: "", message: "" };

function ContactPage() {
  const { media } = useMedia();
  return (
    <>
      <ContactSection />
      <section className="my-12">
        <img
          src={media("ad-2", ad2.url)}
          alt="To know more about our products — call or email B Cube"
          className="w-full"
          loading="lazy"
          decoding="async"
        />
      </section>
    </>
  );
}

function ContactSection() {
  const [form, setForm] = useState<ContactEnquiry>(emptyEnquiry);
  const [submitting, setSubmitting] = useState(false);

  const set =
    (key: keyof ContactEnquiry, sanitize?: (value: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: sanitize ? sanitize(e.target.value) : e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateContactFields(form);
    if (error) {
      toast.error(error);
      return;
    }
    if (!form.message.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    setSubmitting(true);
    const ok = await submitEnquiry({
      source: "contact",
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
    });
    if (ok) {
      toast.success("Thanks! We'll get back to you shortly.");
      setForm(emptyEnquiry);
    } else {
      toast.error("Could not send your enquiry. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <img
            src={logo.url}
            alt="B Cube logo"
            width={224}
            height={224}
            decoding="async"
            className="h-36 w-36 object-contain md:h-56 md:w-56"
          />
          <h1 className="mt-6 font-display text-3xl text-brand-ink md:text-5xl">Contact us</h1>
          <p className="mt-3 max-w-md text-sm text-brand-ink/70 md:text-base">
            Tell us what you have in mind — a gift, a décor piece, or a bulk order. We'll make it come to real life.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="rounded-[25px] bg-brand-yellow p-6 sm:p-8 md:p-[40px]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              value={form.name}
              onChange={set("name", capitalizeName)}
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              required
            />
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={set("phone", sanitizePhone)}
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              title="Enter a 10-digit mobile number starting with 6–9"
              required
            />
            <div className="sm:col-span-2">
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-brand-ink/70">Message</label>
              <textarea
                value={form.message}
                onChange={set("message")}
                rows={4}
                maxLength={MESSAGE_MAX_LENGTH}
                required
                className="mt-1 w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm text-brand-ink outline-none focus:border-brand-red"
              />
            </div>
          </div>
          <MagneticButton
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
          >
            Send enquiry <ArrowRight className="h-4 w-4" />
          </MagneticButton>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  autoComplete,
  inputMode,
  maxLength,
  pattern,
  title,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  pattern?: string;
  title?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-brand-ink/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        className="mt-1 w-full rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-brand-ink outline-none focus:border-brand-red"
      />
    </div>
  );
}
