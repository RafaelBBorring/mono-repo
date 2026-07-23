"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import AppBackdrop from "@/components/visuals/AppBackdrop";
import { Menu, X } from "lucide-react";

export type AppNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: ReactNode;
};

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-0 rounded-[28%] rotate-45"
        style={{ background: "var(--aurora-gradient)", opacity: 0.95 }}
      />
      <span
        className="absolute rounded-[28%]"
        style={{ inset: size * 0.16, background: "var(--bg-primary)" }}
      />
      <span
        className="absolute rounded-[20%]"
        style={{ inset: size * 0.3, background: "var(--aurora-gradient)" }}
      />
    </span>
  );
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="leading-none">
      <p className="font-body text-[15px] font-extrabold tracking-[0.26em] text-[var(--text-primary)]">
        MORPHEUS
      </p>
      {subtitle && (
        <p className="mt-1.5 font-body text-[9px] font-bold uppercase tracking-[0.32em] text-[var(--text-muted)]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function AppShell({
  subtitle,
  navItems,
  accountSlot,
  primaryAction,
  routeKey,
  children,
}: {
  subtitle?: string;
  navItems: AppNavItem[];
  accountSlot?: ReactNode;
  primaryAction?: ReactNode;
  routeKey?: string;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              item.onClick();
              setDrawerOpen(false);
            }}
            className="group relative flex min-h-[50px] items-center gap-3.5 rounded-2xl px-4 font-body text-[15px] font-semibold transition-all"
            style={{
              color: item.active ? "var(--text-primary)" : "var(--text-muted)",
              background: item.active ? "var(--glass-soft)" : "transparent",
            }}
          >
            {item.active && (
              <motion.span
                layoutId="appshell-active"
                className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full"
                style={{ background: "var(--aurora-gradient)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
              style={{
                color: item.active ? "var(--accent-lavender)" : "inherit",
                background: item.active ? "var(--bg-elevated)" : "transparent",
              }}
            >
              {Icon}
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge}
          </button>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-7 pb-6">
        <Link href="/landing" className="inline-flex items-center gap-3" aria-label="Morpheus — início">
          <BrandMark />
          <Wordmark subtitle={subtitle} />
        </Link>
      </div>

      <div className="px-3 pb-2">
        <p className="px-4 pb-2 font-body text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-soft)]">
          Navegação
        </p>
        {nav}
      </div>

      <div className="mt-auto px-3 pb-3">
        <div className="mb-2 px-4">
          <p className="font-body text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-soft)]">
            Aparência
          </p>
        </div>
        <div className="flex items-center gap-2 px-1 pb-3">
          <ThemeToggle />
          {accountSlot}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <AppBackdrop className="absolute inset-0" />
        <div className="absolute inset-0 morpheus-screen-wash" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-[var(--border-light)] bg-[var(--glass-strong)] backdrop-blur-2xl lg:block">
        {sidebarInner}
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border-light)] bg-[var(--glass-strong)] px-4 py-3 backdrop-blur-2xl lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-primary)]"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <Link href="/landing" className="inline-flex items-center gap-2.5" aria-label="Morpheus — início">
          <BrandMark size={26} />
          <span className="font-body text-[13px] font-extrabold tracking-[0.26em] text-[var(--text-primary)]">
            MORPHEUS
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[280px] border-r border-[var(--border-light)] bg-[var(--bg-elevated)] backdrop-blur-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-muted)]"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
              {sidebarInner}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 lg:pl-[264px]">
        {primaryAction && (
          <div className="pointer-events-none fixed right-6 bottom-6 z-30 flex justify-end lg:right-8 lg:bottom-8">
            <div className="pointer-events-auto">{primaryAction}</div>
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={routeKey ?? "default"}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
