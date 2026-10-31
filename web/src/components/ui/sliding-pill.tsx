"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const LEAD = 200;
const TRAIL = 340;

/**
 * Selection pill that travels between items, as in the design reference: the edge in the direction of
 * travel moves first and the trailing edge catches up, so the pill stretches across and settles.
 * Place it inside a `relative` container and mark the selected item with `data-active="true"`.
 * `watch` is any value that changes when the selection changes (usually the path or the selected tab).
 */
export function SlidingPill({ watch, className }: { watch: unknown; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<{ t: number; l: number; r: number; b: number } | null>(null);

  useLayoutEffect(() => {
    const pill = ref.current, box = pill?.parentElement;
    if (!pill || !box) return;
    const place = (animate: boolean) => {
      const el = box.querySelector<HTMLElement>('[data-active="true"]');
      if (!el) { pill.style.opacity = "0"; prev.current = null; return; }
      const bw = box.clientWidth, bh = box.clientHeight;
      const next = { t: el.offsetTop, l: el.offsetLeft, r: bw - el.offsetLeft - el.offsetWidth, b: bh - el.offsetTop - el.offsetHeight };
      const p = prev.current;
      const s = pill.style;
      if (!p || !animate) {
        s.setProperty("--pill-dt", "0ms"); s.setProperty("--pill-db", "0ms"); s.setProperty("--pill-dl", "0ms"); s.setProperty("--pill-dr", "0ms");
      } else {
        const down = next.t > p.t, right = next.l > p.l;
        s.setProperty("--pill-dt", `${down ? TRAIL : LEAD}ms`); s.setProperty("--pill-db", `${down ? LEAD : TRAIL}ms`);
        s.setProperty("--pill-dl", `${right ? TRAIL : LEAD}ms`); s.setProperty("--pill-dr", `${right ? LEAD : TRAIL}ms`);
      }
      s.setProperty("--pill-t", `${next.t}px`); s.setProperty("--pill-l", `${next.l}px`);
      s.setProperty("--pill-r", `${next.r}px`); s.setProperty("--pill-b", `${next.b}px`);
      s.opacity = "1";
      prev.current = next;
    };
    place(true);
    const ro = new ResizeObserver(() => place(false));
    ro.observe(box);
    return () => ro.disconnect();
  }, [watch]);

  return <span ref={ref} aria-hidden className={cn("nav-pill opacity-0", className)} />;
}
