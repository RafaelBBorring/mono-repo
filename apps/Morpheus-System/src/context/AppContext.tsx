"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  AppView,
  Psychologist,
  Reservation,
} from "@/types";
import {
  INITIAL_RESERVATIONS,
  ADMIN_PIN,
  generateId,
} from "@/lib/data";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

type Theme = "dark" | "light";

interface AppContextType {
  view: AppView;
  activePsych: Psychologist | null;
  reservations: Reservation[];
  toasts: Toast[];
  theme: Theme;
  setView: (view: AppView) => void;
  setActivePsych: (psych: Psychologist | null) => void;
  addReservation: (data: Omit<Reservation, "id">) => boolean;
  removeReservation: (id: string) => void;
  validateAdminPin: (pin: string) => boolean;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("splash");
  const [activePsych, setActivePsych] = useState<Psychologist | null>(null);
  const [reservations, setReservations] =
    useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || "dark";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = useCallback((newTheme: Theme) => {
    const html = typeof document !== "undefined" ? document.documentElement : null;
    if (!html) return;

    if (newTheme === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
    localStorage.setItem("theme", newTheme);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const addToast = useCallback(
    (message: string, type: Toast["type"]) => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addReservation = useCallback(
    (data: Omit<Reservation, "id">): boolean => {
      const hasConflict = reservations.some(
        (r) =>
          r.roomId === data.roomId &&
          r.date === data.date &&
          data.startTime < r.endTime &&
          data.endTime > r.startTime
      );

      if (hasConflict) {
        addToast(
          "Conflito de horário! Sala ocupada neste período.",
          "error"
        );
        return false;
      }

      setReservations((prev) => [...prev, { ...data, id: generateId() }]);
      addToast("Reserva criada com sucesso!", "success");
      return true;
    },
    [reservations, addToast]
  );

  const removeReservation = useCallback(
    (id: string) => {
      setReservations((prev) => prev.filter((r) => r.id !== id));
      addToast("Reserva removida.", "info");
    },
    [addToast]
  );

  const validateAdminPin = useCallback((pin: string) => {
    return pin === ADMIN_PIN;
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AppContext.Provider
      value={{
        view,
        activePsych,
        reservations,
        toasts,
        theme,
        setView,
        setActivePsych,
        addReservation,
        removeReservation,
        validateAdminPin,
        addToast,
        removeToast,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
