import { useEffect, useRef, useState } from "react";
import { ArrowRight, ImageIcon } from "lucide-react";
import { useTestimonialGroups } from "@/lib/store";
import { Link } from "@tanstack/react-router";

/**
 * Loads/plays a clip only once it is close to the viewport, so the page never
 * downloads 24 videos up front.
 */
function LazyVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <video
      ref={ref}
      src={visible ? src : undefined}
      className="h-[180px] w-full rounded-lg bg-black/5 object-cover sm:h-[240px] md:h-[300px]"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
    />
  );
}

export function Testimonials({
  heading = "Testimonials",
  groupIds,
}: {
  heading?: string;
  /** Optional filter — render only these testimonial groups. */
  groupIds?: string[];
}) {
  const all = useTestimonialGroups();
  const groups = groupIds ? all.filter((g) => groupIds.includes(g.id)) : all;
  return (
    <section className="w-full px-4 py-12 sm:px-6 md:px-[40px]">
      <h2 className="mb-8 text-center font-display text-3xl text-brand-ink md:text-4xl">{heading}</h2>
      <div className="flex w-full flex-col gap-6">
        {groups.map((group) => (
          <article key={group.id} className="w-full rounded-[25px] bg-brand-yellow p-5 sm:p-8 md:p-[40px]">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[3fr_1fr]">
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
                {Array.from({ length: 6 }).map((_, k) => {
                  const src = group.videos[k];
                  return src ? (
                    <LazyVideo key={k} src={src} />
                  ) : (
                    <div
                      key={k}
                      className="grid h-[180px] w-full place-items-center rounded-lg bg-white/70 sm:h-[240px] md:h-[300px]"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  );
                })}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl text-brand-ink">{group.title}</h3>
                <p className="mt-2 text-sm text-brand-ink/80">{group.body}</p>
                <Link
                  to="/product"
                  search={{ tab: "custom" }}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-red px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-red-dark"
                >
                  Explore <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
