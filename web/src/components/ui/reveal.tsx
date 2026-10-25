"use client";

import { motion } from "motion/react";

/** Spring entrance when scrolled into view, once. Disabled automatically under reduced motion. */
export function Reveal({ children, delay = 0, className, y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", stiffness: 120, damping: 22, mass: 0.9, delay }}
    >
      {children}
    </motion.div>
  );
}
