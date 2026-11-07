"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Re-mounts on every section change: each page arrives with a short fade and a 6px lift. Opacity and transform only
 * (no blur filter, which repaints the whole page), and short enough that navigation never feels held back.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
