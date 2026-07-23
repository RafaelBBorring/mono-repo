"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  d.classList.remove("light", "dark");
  d.classList.add(theme);
  d.style.colorScheme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

export default function LandingThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readTheme());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  if (!mounted) {
    return <span className={className} aria-hidden="true" />;
  }

  return (
    <button
      onClick={toggle}
      className={className}
      title={`Mudar para tema ${theme === "dark" ? "claro" : "escuro"}`}
      aria-label={`Mudar para tema ${theme === "dark" ? "claro" : "escuro"}`}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
