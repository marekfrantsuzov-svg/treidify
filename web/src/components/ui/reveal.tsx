"use client";

import { motion } from "motion/react";

/** Short fade-and-rise entrance when scrolled into view, once. Disabled automatically under reduced motion. */
export function Reveal({ children, delay = 0, className, y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: Math.min(y, 16) }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
