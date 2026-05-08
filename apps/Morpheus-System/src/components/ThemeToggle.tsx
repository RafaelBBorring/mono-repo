"use client";

import { useApp } from "@/context/AppContext";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors"
      title={`Mudar para tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
