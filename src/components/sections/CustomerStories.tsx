import { Star } from "lucide-react";
import { useReviews } from "@/lib/store";

export function CustomerStories() {
  const reviews = useReviews();
  return (
    <section className="py-12 overflow-hidden">
      <h2 className="text-center font-display text-3xl md:text-4xl text-brand-ink">
        Customer's Stories
      </h2>
      <p className="mt-2 mb-8 text-center text-sm font-medium tracking-wide text-brand-ink/70">
        Customer Reviews for BCUBE
      </p>
      <div className="relative w-full overflow-hidden">
        <div className="flex w-max animate-marquee-x gap-6">
          {[...reviews, ...reviews].map((t, k) => (
            <article
              key={`${t.name}-${k}`}
              className="w-[300px] sm:w-[360px] shrink-0 rounded-2xl bg-brand-red p-6 text-white text-center"
            >
              <div className="flex justify-center gap-1 text-brand-yellow">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed">"{t.quote}"</p>
              <p className="mt-3 text-xs font-semibold text-white/90">~ {t.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
