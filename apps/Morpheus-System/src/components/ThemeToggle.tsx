"use client";

import { useApp } from "@/context/AppContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();

  return (
    <button
      onClick={toggleTheme}
      className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--accent-lavender)] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-lavender)]/30 shadow-lg"
      title={`Mudar para tema ${theme === "dark" ? "claro" : "escuro"}`}
      aria-label={`Mudar para tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
