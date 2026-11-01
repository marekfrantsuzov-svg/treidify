"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/cn";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE }, transitionEnd: { filter: "none", transform: "none" } },
};

/** A grid or stack whose direct <RevealItem> children arrive in a short, restrained stagger. */
export function Reveal({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "section" }) {
  const reduce = useReducedMotion();
  const Tag = as === "section" ? motion.section : motion.div;
  return (
    <Tag className={className} variants={container} initial={reduce ? false : "hidden"} animate="show">
      {children}
    </Tag>
  );
}

export function RevealItem({ className, children, id, ...rest }: { className?: string; children: React.ReactNode; id?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd" | "style">) {
  return <motion.div variants={item} className={cn("min-w-0", className)} id={id} {...(rest as object)}>{children}</motion.div>;
}

/** Fades and lifts a block into place once it scrolls into view. */
export function InView({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.55, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}
