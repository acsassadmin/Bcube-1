import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { submitEnquiry } from "@/lib/enquiries";
import { useScrollTrigger } from "@/hooks/use-scroll-trigger";
import {
  NAME_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  capitalizeName,
  sanitizePhone,
  validateContactFields,
} from "@/lib/validation";

export function EnquireModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  useScrollTrigger(3, () => setOpen(true));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateContactFields(form);
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    const ok = await submitEnquiry({ source: "home-modal", ...form, name: form.name.trim(), email: form.email.trim() });
    setSubmitting(false);
    if (!ok) {
      toast.error("Could not send your enquiry. Please try again.");
      return;
    }
    toast.success("Enquiry sent — we'll be in touch!");
    setForm({ name: "", email: "", phone: "", message: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-[25px] border-none bg-brand-yellow p-0 shadow-2xl sm:max-w-lg">
        <div className="p-6 sm:p-8">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-brand-ink/70 transition-colors hover:bg-white/50 hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <DialogTitle className="font-display text-3xl italic text-brand-red sm:text-4xl">
            Enquire Now
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-brand-ink/80">
            Tell us what you need and we'll get back to you shortly.
          </DialogDescription>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
            <input
              required
              placeholder="Name"
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: capitalizeName(e.target.value) })}
              className="rounded-xl bg-white px-4 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:ring-2 focus:ring-brand-red"
            />
            <input
              required
              type="email"
              placeholder="Email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl bg-white px-4 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:ring-2 focus:ring-brand-red"
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
              className="rounded-xl bg-white px-4 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:ring-2 focus:ring-brand-red"
            />
            <textarea
              placeholder="Message"
              rows={3}
              maxLength={MESSAGE_MAX_LENGTH}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="rounded-xl bg-white px-4 py-3 text-sm text-brand-ink outline-none placeholder:text-brand-ink/50 focus:ring-2 focus:ring-brand-red"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-brand-ink">
                <input type="checkbox" defaultChecked className="accent-brand-red" /> I agree to be contacted
              </label>
              <MagneticButton
                type="submit"
                disabled={submitting}
                className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-dark disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send"}
              </MagneticButton>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
