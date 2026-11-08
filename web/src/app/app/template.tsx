"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// False for the first page of a visit (server render and hydration agree), true for every section opened after it.
let mountedOnce = false;

/**
 * Re-mounts on every section change: each page after the first arrives with a short fade and a 6px lift. Opacity and transform only
 * (no blur filter, which repaints the whole page), and short enough that navigation never feels held back.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [animate] = useState(() => mountedOnce);
  useEffect(() => { mountedOnce = true; }, []);
  return (
    <motion.div
      initial={reduce || !animate ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
