"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Display-only count-up for headline figures: the final value renders on the server, then on first
 * mount the number eases in from slightly below it. The value itself is never altered.
 */
export function CountUp({ value, format, from = 0.9, duration = 650 }: { value: number; format: (v: number) => string; from?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) { setShown(value); return; }
    done.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now(), a = value * from;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(k < 1 ? a + (value - a) * e : value);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, from, duration]);
  return <>{format(shown)}</>;
}
