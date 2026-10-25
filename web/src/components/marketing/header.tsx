"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { mainNav, productNav } from "@/config/site";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setOpen(false); setProductOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div
        className={cn(
          "mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-full px-3 pl-5 transition-[background,box-shadow,border-color] duration-300",
          scrolled || open ? "glass glass-strong" : "border border-transparent",
        )}
      >
        <Wordmark />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 lg:flex">
          <div className="relative" onMouseEnter={() => setProductOpen(true)} onMouseLeave={() => setProductOpen(false)}>
            <button
              className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-ink-2 transition-colors hover:text-ink"
              aria-expanded={productOpen}
              aria-haspopup="true"
              onClick={() => setProductOpen((v) => !v)}
            >
              Product <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", productOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute left-0 top-full pt-3"
                >
                  <div className="glass glass-strong grid w-[600px] grid-cols-2 gap-1 rounded-3xl p-2 shadow-[var(--shadow-lg)]">
                    {productNav.map((item) => (
                      <Link key={item.href} href={item.href} className="rounded-2xl p-3 transition-colors hover:bg-accent-soft">
                        <div className="text-sm font-semibold text-ink">{item.title}</div>
                        <div className="mt-0.5 text-[13px] leading-snug text-ink-3">{item.blurb}</div>
                      </Link>
                    ))}
                    <Link href="/features" className="rounded-2xl p-3 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft">
                      See all features →
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn("rounded-full px-3 py-2 text-sm text-ink-2 transition-colors hover:text-ink", pathname === item.href && "text-ink")}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden md:inline-flex" />
          <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm text-ink-2 hover:text-ink sm:block">
            Sign in
          </Link>
          <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
            Get Started Free
          </ButtonLink>
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-ink lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass glass-strong mx-auto mt-2 max-h-[calc(100dvh-5.5rem)] max-w-7xl overflow-y-auto rounded-[28px] p-3 lg:hidden"
          >
            <nav aria-label="Mobile" className="grid gap-1">
              <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Product</p>
              {productNav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl px-3 py-2.5 text-[15px] text-ink hover:bg-accent-soft">
                  {item.title}
                </Link>
              ))}
              <div className="my-2 h-px bg-[var(--border)]" />
              {mainNav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl px-3 py-2.5 text-[15px] text-ink hover:bg-accent-soft">
                  {item.title}
                </Link>
              ))}
              <div className="mt-3 flex items-center justify-between gap-3 px-1">
                <ThemeToggle />
                <div className="flex gap-2">
                  <ButtonLink href="/login" variant="secondary" size="sm">Sign in</ButtonLink>
                  <ButtonLink href="/signup" size="sm">Get Started Free</ButtonLink>
                </div>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
