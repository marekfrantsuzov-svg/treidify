import Link from "next/link";
import { GlassIcon } from "@/components/icons/glass-icon";
import { quickTools } from "@/components/app/nav";

/** Mobile Home: one swipeable rail of the tools traders open most, in the same glass icon language as the tab bar. */
export function QuickTools() {
  return (
    <nav aria-label="Quick access" className="-mx-4 min-w-0 lg:hidden">
      <div className="tool-rail px-4 py-1">
        {quickTools.map((t, i) => (
          <Link key={t.href} href={t.href} className="tool-tile rise grid justify-items-center gap-1.5 text-center text-[11.5px] font-medium text-ink-2" style={{ "--d": `${i * 35}ms` } as React.CSSProperties}>
            <GlassIcon name={t.icon} size={54} />
            <span className="max-w-full truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
