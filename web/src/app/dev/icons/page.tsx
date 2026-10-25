import { notFound } from "next/navigation";
import { GlassIcon, type GlassIconName } from "@/components/icons/glass-icon";

const names: GlassIconName[] = ["dashboard", "macro", "markets", "news", "ai", "journal", "coach", "community", "calendar", "settings", "profile", "bell", "search", "upload", "shield", "link", "spark", "more", "gold", "dollar", "yield", "silver"];

/** Development only: the glass icon system at several sizes, for visual review in both themes. */
export default function Icons() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-5xl p-8">
      {[28, 40, 64].map((size) => (
        <div key={size} className="mb-8 flex flex-wrap gap-5">
          {names.map((n, i) => <div key={n} className="grid justify-items-center gap-1 text-[10px] text-ink-3"><GlassIcon name={n} size={size} active={i === 0} />{size === 64 && n}</div>)}
        </div>
      ))}
    </main>
  );
}
