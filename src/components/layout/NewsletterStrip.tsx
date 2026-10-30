import { useState } from "react";
import { toast } from "sonner";
import { submitEnquiry } from "@/lib/enquiries";
import { validateEmail } from "@/lib/validation";

export function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const error = validateEmail(email);
        if (error) {
          toast.error(error);
          return;
        }
        setSubmitting(true);
        const ok = await submitEnquiry({
          source: "newsletter",
          email: email.trim(),
          message: "Subscribed to newsletters from the footer.",
        });
        setSubmitting(false);
        if (!ok) {
          toast.error("Could not subscribe right now. Please try again.");
          return;
        }
        toast.success("Subscribed! We'll keep in touch.");
        setEmail("");
      }}
      className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted px-6 py-6 shadow-lg"
    >
      <h3 className="font-display text-2xl text-brand-ink">Subscribe Newsletters</h3>
      <div className="flex flex-1 min-w-[260px] items-center gap-2 rounded-full bg-white p-1.5 shadow-sm">
        <input
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 bg-transparent px-4 py-2 text-sm text-brand-ink outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-red px-5 py-2 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-60"
        >
          {submitting ? "Subscribing…" : "Subscribe Now"}
        </button>
      </div>
    </form>
  );
}
