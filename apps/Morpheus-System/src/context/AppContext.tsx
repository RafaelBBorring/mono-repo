"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
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

interface AppContextType {
  view: AppView;
  activePsych: Psychologist | null;
  reservations: Reservation[];
  toasts: Toast[];
  setView: (view: AppView) => void;
  setActivePsych: (psych: Psychologist | null) => void;
  addReservation: (data: Omit<Reservation, "id">) => boolean;
  removeReservation: (id: string) => void;
  validateAdminPin: (pin: string) => boolean;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("splash");
  const [activePsych, setActivePsych] = useState<Psychologist | null>(null);
  const [reservations, setReservations] =
    useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  return (
    <AppContext.Provider
      value={{
        view,
        activePsych,
        reservations,
        toasts,
        setView,
        setActivePsych,
        addReservation,
        removeReservation,
        validateAdminPin,
        addToast,
        removeToast,
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
