"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppView, BillingAccount, Psychologist, Reservation, Room } from "@/types";
import { isBillingActive } from "@/lib/billing";
import {
  COLOR_PALETTES,
  generateId,
  mapBillingAccount,
  mapRoom,
  mapPsychologist,
  mapReservation,
  toReservationRow,
} from "@/lib/data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

type Theme = "dark" | "light";

interface AppContextType {
  view: AppView;
  activePsych: Psychologist | null;
  rooms: Room[];
  psychologists: Psychologist[];
  reservations: Reservation[];
  toasts: Toast[];
  theme: Theme;
  loading: boolean;
  billingAccount: BillingAccount | null;
  billingRequired: boolean;
  billingActive: boolean;
  checkoutEnabled: boolean;
  setView: (view: AppView) => void;
  setActivePsych: (psych: Psychologist | null) => void;
  addRoom: (name: string) => Promise<Room | null>;
  deleteRoom: (id: number) => Promise<void>;
  addPsychologist: (data: { name: string; email?: string }) => Promise<Psychologist | null>;
  deletePsychologist: (id: number) => Promise<void>;
  addReservation: (data: Omit<Reservation, "id">) => Promise<boolean>;
  removeReservation: (id: string) => Promise<void>;
  validateAdminPin: (pin: string) => boolean;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshBilling: () => Promise<void>;
  startCheckout: (plan: "monthly" | "yearly", email?: string) => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);
const billingRequired = process.env.NEXT_PUBLIC_BILLING_REQUIRED === "true";
const checkoutEnabled = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED !== "false";
const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

function apiUrl(path: string) {
  return publicApiBaseUrl ? `${publicApiBaseUrl}${path}` : path;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("splash");
  const [activePsych, setActivePsych] = useState<Psychologist | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [billingAccount, setBillingAccount] = useState<BillingAccount | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const billingActive = billingAccount ? isBillingActive(billingAccount) : !billingRequired;

  const applyTheme = useCallback((newTheme: Theme) => {
    const html = typeof document !== "undefined" ? document.documentElement : null;
    if (!html) return;

    html.classList.toggle("light", newTheme === "light");
    html.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  }, []);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const initialTheme = savedTheme || "light";
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, [applyTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const loadOperationalData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase public environment variables are missing.");
    }

    const [roomsRes, psychsRes, reservsRes] = await Promise.all([
      supabase.from("rooms").select("*").order("id"),
      supabase.from("psychologists").select("*").order("id"),
      supabase.from("reservations").select("*").order("date"),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (psychsRes.error) throw psychsRes.error;
    if (reservsRes.error) throw reservsRes.error;

    setRooms((roomsRes.data ?? []).map(mapRoom));
    setPsychologists((psychsRes.data ?? []).map(mapPsychologist));
    setReservations((reservsRes.data ?? []).map(mapReservation));
  }, []);

  const refreshBilling = useCallback(async () => {
    if (!isSupabaseConfigured) {
      addToast("Supabase nao configurado neste ambiente.", "error");
      return;
    }

    if (!billingRequired) {
      setBillingAccount(null);
      await loadOperationalData();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("billing_accounts")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error) throw error;
      const mappedBilling = data ? mapBillingAccount(data) : null;
      setBillingAccount(mappedBilling);

      if (!billingRequired || isBillingActive(mappedBilling)) {
        await loadOperationalData();
      }
    } catch (err) {
      console.warn("Failed to load billing status:", err);
      setBillingAccount(null);
    }
  }, [addToast, loadOperationalData]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        if (!isSupabaseConfigured) {
          addToast("Supabase nao configurado neste ambiente.", "error");
          setRooms([]);
          setPsychologists([]);
          setReservations([]);
          return;
        }

        if (!billingRequired) {
          setBillingAccount(null);
          await loadOperationalData();
          return;
        }

        const { data: billingData } = await supabase
          .from("billing_accounts")
          .select("*")
          .eq("id", "default")
          .maybeSingle();
        const mappedBilling = billingData ? mapBillingAccount(billingData) : null;
        setBillingAccount(mappedBilling);

        if (billingRequired && !isBillingActive(mappedBilling)) {
          setRooms([]);
          setPsychologists([]);
          setReservations([]);
          return;
        }

        await loadOperationalData();
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
        addToast("Erro ao carregar dados do servidor.", "error");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [addToast, loadOperationalData]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase.channel("morpheus-realtime");

    if (billingRequired) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "billing_accounts" },
        async () => {
          await refreshBilling();
        }
      );
    }

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        async () => {
          const { data } = await supabase.from("rooms").select("*").order("id");
          if (data) setRooms(data.map(mapRoom));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "psychologists" },
        async () => {
          const { data } = await supabase.from("psychologists").select("*").order("id");
          if (data) setPsychologists(data.map(mapPsychologist));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        async () => {
          const { data } = await supabase.from("reservations").select("*").order("date");
          if (data) setReservations(data.map(mapReservation));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBilling]);

  const ensureBillingAccess = useCallback(() => {
    if (billingActive) return true;
    addToast("Ative a assinatura para usar o sistema.", "error");
    return false;
  }, [addToast, billingActive]);

  const startCheckout = useCallback(
    async (plan: "monthly" | "yearly", email?: string) => {
      if (!checkoutEnabled) {
        addToast("Checkout indisponivel no modo estatico do GitHub Pages.", "info");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/stripe/checkout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email }),
        });
        const payload = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !payload.url) {
          throw new Error(payload.error || "Checkout indisponível.");
        }

        window.location.href = payload.url;
      } catch (err) {
        console.error("Checkout failed:", err);
        addToast("Não foi possível abrir o checkout.", "error");
      }
    },
    [addToast]
  );

  const openBillingPortal = useCallback(async () => {
    if (!checkoutEnabled) {
      addToast("Portal de cobranca indisponivel no modo estatico do GitHub Pages.", "info");
      return;
    }

    try {
      const response = await fetch(apiUrl("/api/stripe/portal"), { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Portal indisponível.");
      }

      window.location.href = payload.url;
    } catch (err) {
      console.error("Billing portal failed:", err);
      addToast("Não foi possível abrir o portal de cobrança.", "error");
    }
  }, [addToast]);

  const addReservation = useCallback(
    async (data: Omit<Reservation, "id">): Promise<boolean> => {
      if (!ensureBillingAccess()) return false;

      const hasConflict = reservations.some(
        (reservation) =>
          reservation.roomId === data.roomId &&
          reservation.date === data.date &&
          data.startTime < reservation.endTime &&
          data.endTime > reservation.startTime
      );

      if (hasConflict) {
        addToast("Conflito de horário! Sala ocupada neste período.", "error");
        return false;
      }

      try {
        const row = toReservationRow(data);
        const { error } = await supabase.from("reservations").insert(row);
        if (error) throw error;
        addToast("Reserva criada com sucesso!", "success");
        return true;
      } catch {
        addToast("Erro ao criar reserva.", "error");
        return false;
      }
    },
    [addToast, ensureBillingAccess, reservations]
  );

  const removeReservation = useCallback(
    async (id: string) => {
      if (!ensureBillingAccess()) return;

      try {
        const { error } = await supabase.from("reservations").delete().eq("id", id);
        if (error) throw error;
        addToast("Reserva removida.", "info");
      } catch {
        addToast("Erro ao remover reserva.", "error");
      }
    },
    [addToast, ensureBillingAccess]
  );

  const addRoom = useCallback(
    async (rawName: string): Promise<Room | null> => {
      if (!ensureBillingAccess()) return null;

      const name = rawName.trim();
      if (!name) {
        addToast("Informe o nome da sala.", "error");
        return null;
      }

      try {
        const { data: existing } = await supabase
          .from("rooms")
          .select("id")
          .order("id", { ascending: false })
          .limit(1);

        const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
        const palette = COLOR_PALETTES[(nextId - 1) % COLOR_PALETTES.length];

        const { data, error } = await supabase
          .from("rooms")
          .insert({
            name,
            hex: palette.hex,
            rgb: palette.rgb,
            light_hex: palette.lightHex,
            light_rgb: palette.lightRgb,
          })
          .select()
          .single();

        if (error) throw error;
        const room = mapRoom(data);
        addToast(`${name} criada com sucesso.`, "success");
        return room;
      } catch {
        addToast("Erro ao criar sala.", "error");
        return null;
      }
    },
    [addToast, ensureBillingAccess]
  );

  const deleteRoom = useCallback(
    async (id: number) => {
      if (!ensureBillingAccess()) return;

      try {
        const { error } = await supabase.from("rooms").delete().eq("id", id);
        if (error) throw error;
        addToast("Sala removida com sucesso.", "success");
      } catch {
        addToast("Erro ao remover sala.", "error");
      }
    },
    [addToast, ensureBillingAccess]
  );

  const addPsychologist = useCallback(
    async (data: { name: string; email?: string }): Promise<Psychologist | null> => {
      if (!ensureBillingAccess()) return null;

      const name = data.name.trim();
      if (!name) {
        addToast("Informe o nome do profissional.", "error");
        return null;
      }

      try {
        const { data: existing } = await supabase
          .from("psychologists")
          .select("id")
          .order("id", { ascending: false })
          .limit(1);

        const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
        const palette = COLOR_PALETTES[(nextId - 1) % COLOR_PALETTES.length];
        const cleanName = name.replace(/^dr\.?\s+|^dra\.?\s+/i, "");
        const initials = cleanName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase())
          .join("");

        const { data: inserted, error } = await supabase
          .from("psychologists")
          .insert({
            name,
            short_name: cleanName,
            initials: initials || "PS",
            email: data.email?.trim() || null,
            hex: palette.hex,
            rgb: palette.rgb,
            light_hex: palette.lightHex,
            light_rgb: palette.lightRgb,
          })
          .select()
          .single();

        if (error) throw error;
        const psych = mapPsychologist(inserted);
        addToast(`${psych.shortName} adicionado(a) à clínica.`, "success");
        return psych;
      } catch {
        addToast("Erro ao criar profissional.", "error");
        return null;
      }
    },
    [addToast, ensureBillingAccess]
  );

  const deletePsychologist = useCallback(
    async (id: number) => {
      if (!ensureBillingAccess()) return;

      try {
        const { error } = await supabase.from("psychologists").delete().eq("id", id);
        if (error) throw error;
        addToast("Profissional removido com sucesso.", "success");
      } catch {
        addToast("Erro ao remover profissional.", "error");
      }
    },
    [addToast, ensureBillingAccess]
  );

  const validateAdminPin = useCallback((pin: string) => pin === "1234", []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AppContext.Provider
      value={{
        view,
        activePsych,
        rooms,
        psychologists,
        reservations,
        toasts,
        theme,
        loading,
        billingAccount,
        billingRequired,
        billingActive,
        checkoutEnabled,
        setView,
        setActivePsych,
        addRoom,
        deleteRoom,
        addPsychologist,
        deletePsychologist,
        addReservation,
        removeReservation,
        validateAdminPin,
        addToast,
        removeToast,
        toggleTheme,
        setTheme,
        refreshBilling,
        startCheckout,
        openBillingPortal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      view: "splash" as AppView,
      activePsych: null,
      rooms: [] as Room[],
      psychologists: [] as Psychologist[],
      reservations: [] as Reservation[],
      toasts: [] as Toast[],
      theme: "light" as Theme,
      loading: false,
      billingAccount: null,
      billingRequired,
      billingActive: !billingRequired,
      checkoutEnabled,
      setView: () => {},
      setActivePsych: () => {},
      addRoom: (async () => null) as (name: string) => Promise<Room | null>,
      deleteRoom: (async () => {}) as (id: number) => Promise<void>,
      addPsychologist: (async () => null) as (data: { name: string; email?: string }) => Promise<Psychologist | null>,
      deletePsychologist: (async () => {}) as (id: number) => Promise<void>,
      addReservation: (async () => false) as (data: Omit<Reservation, "id">) => Promise<boolean>,
      removeReservation: (async () => {}) as (id: string) => Promise<void>,
      validateAdminPin: (() => false) as (pin: string) => boolean,
      addToast: () => {},
      removeToast: () => {},
      toggleTheme: () => {},
      setTheme: (() => {}) as (theme: Theme) => void,
      refreshBilling: async () => {},
      startCheckout: async () => {},
      openBillingPortal: async () => {},
    } as AppContextType;
  }
  return ctx;
}
