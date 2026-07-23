"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type AccountMenuItem = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export default function AccountPill({
  displayName,
  items,
}: {
  displayName: string;
  items: AccountMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const letter = (displayName || "M").slice(0, 1).toUpperCase();

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[48px] w-full items-center gap-2.5 rounded-2xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--action-foreground)]" style={{ background: "var(--action-primary)" }}>
          {letter}
        </span>
        <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
          {displayName || "Conta"}
        </span>
        <ChevronDown size={16} className={`ml-auto transition ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-1.5 shadow-2xl"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-body text-sm font-semibold transition"
                  style={{
                    color: item.danger ? "var(--state-error)" : "var(--text-soft)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.danger
                      ? "rgba(201,106,91,0.12)"
                      : "var(--glass-soft)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
