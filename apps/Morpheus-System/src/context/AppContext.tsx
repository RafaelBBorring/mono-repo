"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppView, Psychologist, Reservation, Room } from "@/types";
import { isBillingActive } from "@/lib/billing";
import type { AuthUser, Clinic } from "@/lib/auth";
import { mapClinic, sha256, type SupabaseClinic, type SupabaseClinicDoctor } from "@/lib/auth";
import type { PlanId } from "@/lib/plans";
import { PLANS, getPlanById } from "@/lib/plans";
import {
  COLOR_PALETTES,
  generateId,
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
  authUser: AuthUser | null;
  clinic: Clinic | null;
  selectedPlan: PlanId | null;
  billingRequired: boolean;
  billingActive: boolean;
  checkoutEnabled: boolean;
  login: (email: string, passwordHash: string) => Promise<boolean>;
  signup: (data: { clinicName: string; email: string; passwordHash: string }) => Promise<boolean>;
  logout: () => void;
  setView: (view: AppView) => void;
  setActivePsych: (psych: Psychologist | null) => void;
  addRoom: (name: string) => Promise<Room | null>;
  deleteRoom: (id: number) => Promise<void>;
  addPsychologist: (data: { name: string; email?: string }) => Promise<{ psych: Psychologist; credentials: DoctorCredentials } | null>;
  deletePsychologist: (id: number) => Promise<void>;
  addReservation: (data: Omit<Reservation, "id">) => Promise<boolean>;
  removeReservation: (id: string) => Promise<void>;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshBilling: () => Promise<void>;
  startCheckout: (plan: PlanId, interval: "monthly" | "yearly", email?: string) => Promise<void>;
  startTrial: (email?: string) => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

interface DoctorCredentials {
  email: string;
  password: string;
}

const AppContext = createContext<AppContextType | null>(null);
const billingRequired = process.env.NEXT_PUBLIC_BILLING_REQUIRED === "true";
const checkoutEnabled = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_ENABLED !== "false";
const stripePaymentLinks: Record<string, string> = {};

const _elM = process.env.NEXT_PUBLIC_STRIPE_LINK_ESSENTIAL_MONTHLY;
const _elA = process.env.NEXT_PUBLIC_STRIPE_LINK_ESSENTIAL_ANUAL;
const _prM = process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_MONTHLY;
const _prA = process.env.NEXT_PUBLIC_STRIPE_LINK_PRO_ANUAL;
const _edM = process.env.NEXT_PUBLIC_STRIPE_LINK_ELITE_MONTHLY;
const _edA = process.env.NEXT_PUBLIC_STRIPE_LINK_ELITE_ANUAL;
if (_elM) stripePaymentLinks["essential-monthly"] = _elM;
if (_elA) stripePaymentLinks["essential-yearly"] = _elA;
if (_prM) stripePaymentLinks["pro-monthly"] = _prM;
if (_prA) stripePaymentLinks["pro-yearly"] = _prA;
if (_edM) stripePaymentLinks["elite-monthly"] = _edM;
if (_edA) stripePaymentLinks["elite-yearly"] = _edA;

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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const billingActive = clinic
    ? !billingRequired || !clinic.billingEnforced || isBillingActive({
        id: clinic.id,
        stripeStatus: clinic.stripeStatus,
        billingEnforced: clinic.billingEnforced,
        currentPeriodEnd: clinic.currentPeriodEnd,
        cancelAtPeriodEnd: clinic.cancelAtPeriodEnd,
        updatedAt: new Date().toISOString(),
      })
    : !billingRequired;

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

  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem("morpheus_auth");
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        setAuthUser(parsed);

        if (isSupabaseConfigured) {
          supabase
            .from("clinics")
            .select("*")
            .eq("id", parsed.clinicId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setClinic(mapClinic(data as SupabaseClinic));
            });
        }
      }
    } catch {}
    setLoading(false);
  }, [mounted]);

  const loadOperationalData = useCallback(async (clinicId: string) => {
    if (!isSupabaseConfigured) return;

    const filter = { column: "clinic_id", value: clinicId };

    const [roomsRes, psychsRes, reservsRes] = await Promise.all([
      supabase.from("rooms").select("*").eq(filter.column, filter.value).order("id"),
      supabase.from("psychologists").select("*").eq(filter.column, filter.value).order("id"),
      supabase.from("reservations").select("*").eq(filter.column, filter.value).order("date"),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (psychsRes.error) throw psychsRes.error;
    if (reservsRes.error) throw reservsRes.error;

    setRooms((roomsRes.data ?? []).map(mapRoom));
    setPsychologists((psychsRes.data ?? []).map(mapPsychologist));
    setReservations((reservsRes.data ?? []).map(mapReservation));
  }, []);

  const login = useCallback(
    async (email: string, passwordHash: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        console.error("Login: Supabase not configured");
        return false;
      }

      try {
        const { data: clinicRow, error: clinicError } = await supabase
          .from("clinics")
          .select("*")
          .eq("admin_email", email)
          .eq("admin_password_hash", passwordHash)
          .maybeSingle();

        if (clinicError) {
          console.error("Login: clinic query error", clinicError);
        }

        if (clinicRow) {
          const c = mapClinic(clinicRow as SupabaseClinic);
          const user: AuthUser = { role: "admin", clinicId: c.id, email: c.adminEmail, displayName: c.name };
          setAuthUser(user);
          setClinic(c);
          localStorage.setItem("morpheus_auth", JSON.stringify(user));

          if (billingActive || !billingRequired) {
            await loadOperationalData(c.id);
          }
          setView("admin");
          return true;
        }

        const { data: doctorRow } = await supabase
          .from("clinic_doctors")
          .select("*")
          .eq("email", email)
          .eq("password_hash", passwordHash)
          .maybeSingle();

        if (doctorRow) {
          const doc = doctorRow as SupabaseClinicDoctor;
          const { data: clinicData } = await supabase
            .from("clinics")
            .select("*")
            .eq("id", doc.clinic_id)
            .maybeSingle();

          if (!clinicData) return false;
          const c = mapClinic(clinicData as SupabaseClinic);

          const user: AuthUser = {
            role: "doctor",
            clinicId: c.id,
            email: doc.email,
            displayName: doc.display_name,
            psychologistId: doc.psychologist_id ?? undefined,
          };
          setAuthUser(user);
          setClinic(c);
          localStorage.setItem("morpheus_auth", JSON.stringify(user));

          if (billingActive || !billingRequired) {
            await loadOperationalData(c.id);
          }
          setView("psych");
          return true;
        }

        return false;
      } catch (err) {
        console.error("Login failed:", err);
        return false;
      }
    },
    [billingActive, loadOperationalData]
  );

  const signup = useCallback(
    async (data: { clinicName: string; email: string; passwordHash: string }): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;

      try {
        const { data: existing } = await supabase
          .from("clinics")
          .select("id")
          .eq("admin_email", data.email)
          .maybeSingle();

        if (existing) {
          addToast("Este e-mail já está cadastrado.", "error");
          return false;
        }

        const { data: newClinic, error } = await supabase
          .from("clinics")
          .insert({
            name: data.clinicName,
            admin_email: data.email,
            admin_password_hash: data.passwordHash,
            stripe_status: "inactive",
            billing_enforced: true,
          })
          .select()
          .single();

        if (error || !newClinic) {
          addToast("Erro ao criar conta.", "error");
          return false;
        }

        const c = mapClinic(newClinic as SupabaseClinic);
        const user: AuthUser = { role: "admin", clinicId: c.id, email: c.adminEmail, displayName: c.name };
        setAuthUser(user);
        setClinic(c);
        localStorage.setItem("morpheus_auth", JSON.stringify(user));

        addToast("Conta criada com sucesso!", "success");
        return true;
      } catch (err) {
        console.error("Signup failed:", err);
        addToast("Erro ao criar conta.", "error");
        return false;
      }
    },
    [addToast]
  );

  const logout = useCallback(() => {
    setAuthUser(null);
    setClinic(null);
    setRooms([]);
    setPsychologists([]);
    setReservations([]);
    setView("splash");
    setActivePsych(null);
    localStorage.removeItem("morpheus_auth");
  }, []);

  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) return;

    const channel = supabase.channel(`morpheus-${authUser.clinicId}`);

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => {
          const { data } = await supabase.from("rooms").select("*").eq("clinic_id", authUser.clinicId).order("id");
          if (data) setRooms(data.map(mapRoom));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "psychologists", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => {
          const { data } = await supabase.from("psychologists").select("*").eq("clinic_id", authUser.clinicId).order("id");
          if (data) setPsychologists(data.map(mapPsychologist));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => {
          const { data } = await supabase.from("reservations").select("*").eq("clinic_id", authUser.clinicId).order("date");
          if (data) setReservations(data.map(mapReservation));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  const refreshBilling = useCallback(async () => {
    if (!authUser || !isSupabaseConfigured) return;

    try {
      const { data } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", authUser.clinicId)
        .maybeSingle();

      if (data) {
        const c = mapClinic(data as SupabaseClinic);
        setClinic(c);
      }
    } catch {
      console.warn("Failed to refresh billing");
    }
  }, [authUser]);

  const ensureBillingAccess = useCallback(() => {
    if (billingActive) return true;
    addToast("Ative a assinatura para usar o sistema.", "error");
    return false;
  }, [addToast, billingActive]);

  const clinicIdForInsert = authUser?.clinicId;

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
        const row = { ...toReservationRow(data), clinic_id: clinicIdForInsert };
        const { error } = await supabase.from("reservations").insert(row);
        if (error) throw error;
        addToast("Reserva criada com sucesso!", "success");
        return true;
      } catch {
        addToast("Erro ao criar reserva.", "error");
        return false;
      }
    },
    [addToast, ensureBillingAccess, reservations, clinicIdForInsert]
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
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;

      const name = rawName.trim();
      if (!name) {
        addToast("Informe o nome da sala.", "error");
        return null;
      }

      try {
        const { data: existing } = await supabase
          .from("rooms")
          .select("id")
          .eq("clinic_id", clinicIdForInsert)
          .order("id", { ascending: false })
          .limit(1);

        const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
        const palette = COLOR_PALETTES[(nextId - 1) % COLOR_PALETTES.length];

        const { data, error } = await supabase
          .from("rooms")
          .insert({
            clinic_id: clinicIdForInsert,
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
    [addToast, ensureBillingAccess, clinicIdForInsert]
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
    async (data: { name: string; email?: string }): Promise<{ psych: Psychologist; credentials: DoctorCredentials } | null> => {
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;

      const name = data.name.trim();
      const email = data.email?.trim() || "";
      if (!name) {
        addToast("Informe o nome do profissional.", "error");
        return null;
      }
      if (!email) {
        addToast("Informe o e-mail do profissional.", "error");
        return null;
      }

      try {
        const { data: existing } = await supabase
          .from("psychologists")
          .select("id")
          .eq("clinic_id", clinicIdForInsert)
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
            clinic_id: clinicIdForInsert,
            name,
            short_name: cleanName,
            initials: initials || "PS",
            email: email,
            hex: palette.hex,
            rgb: palette.rgb,
            light_hex: palette.lightHex,
            light_rgb: palette.lightRgb,
          })
          .select()
          .single();

        if (error) throw error;
        const psych = mapPsychologist(inserted);

        const rawPassword = Math.random().toString(36).slice(2, 10);
        const passwordHash = await sha256(rawPassword);

        const { error: docError } = await supabase
          .from("clinic_doctors")
          .insert({
            clinic_id: clinicIdForInsert,
            psychologist_id: psych.id,
            email: email,
            password_hash: passwordHash,
            display_name: name,
          });

        if (docError) {
          console.error("Failed to create doctor login:", docError);
        }

        addToast(`${psych.shortName} adicionado(a) à clínica.`, "success");
        return { psych, credentials: { email, password: rawPassword } };
      } catch {
        addToast("Erro ao criar profissional.", "error");
        return null;
      }
    },
    [addToast, ensureBillingAccess, clinicIdForInsert]
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

  const startCheckout = useCallback(
    async (plan: PlanId, interval: "monthly" | "yearly", email?: string) => {
      if (!checkoutEnabled) {
        addToast("Checkout indisponivel neste ambiente.", "info");
        return;
      }

      const linkKey = `${plan}-${interval}`;
      const paymentLinkUrl = stripePaymentLinks[linkKey];
      if (paymentLinkUrl) {
        let url = paymentLinkUrl;
        if (email) {
          const separator = url.includes("?") ? "&" : "?";
          url = `${url}${separator}prefilled_email=${encodeURIComponent(email)}`;
        }
        window.location.href = url;
        return;
      }

      const endpoint = publicApiBaseUrl ? apiUrl("/api/stripe/checkout") : "/api/stripe/checkout";
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval, email, clinicId: authUser?.clinicId }),
        });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout indisponivel.");
        window.location.href = payload.url;
      } catch (err) {
        console.error("Checkout failed:", err);
        addToast("Nao foi possivel abrir o checkout.", "error");
      }
    },
    [addToast, authUser]
  );

  const startTrial = useCallback(
    async () => {
      if (!authUser || !isSupabaseConfigured) {
        addToast("Faça login antes de ativar o trial.", "error");
        return;
      }

      try {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);

        const { error } = await supabase
          .from("clinics")
          .update({
            stripe_status: "trialing",
            current_period_end: trialEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", authUser.clinicId);

        if (error) throw error;

        await refreshBilling();
        addToast("Trial de 7 dias ativado! Aproveite o Morpheus.", "success");
      } catch (err) {
        console.error("Trial activation failed:", err);
        addToast("Erro ao ativar o trial.", "error");
      }
    },
    [authUser, addToast, refreshBilling]
  );

  const openBillingPortal = useCallback(async () => {
    if (!checkoutEnabled) {
      addToast("Portal de cobranca indisponivel.", "info");
      return;
    }
    try {
      const response = await fetch(apiUrl("/api/stripe/portal"), { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Portal indisponivel.");
      window.location.href = payload.url;
    } catch (err) {
      console.error("Billing portal failed:", err);
      addToast("Nao foi possivel abrir o portal de cobranca.", "error");
    }
  }, [addToast]);

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
        authUser,
        clinic,
        selectedPlan,
        billingRequired,
        billingActive,
        checkoutEnabled,
        login,
        signup,
        logout,
        setView,
        setActivePsych,
        addRoom,
        deleteRoom,
        addPsychologist,
        deletePsychologist,
        addReservation,
        removeReservation,
        addToast,
        removeToast,
        toggleTheme,
        setTheme,
        refreshBilling,
        startCheckout,
        startTrial,
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
      activePsych: null as Psychologist | null,
      rooms: [] as Room[],
      psychologists: [] as Psychologist[],
      reservations: [] as Reservation[],
      toasts: [] as Toast[],
      theme: "light" as Theme,
      loading: false,
      authUser: null as AuthUser | null,
      clinic: null as Clinic | null,
      selectedPlan: null as PlanId | null,
      billingRequired,
      billingActive: !billingRequired,
      checkoutEnabled,
      login: (async () => false) as (email: string, passwordHash: string) => Promise<boolean>,
      signup: (async () => false) as (data: { clinicName: string; email: string; passwordHash: string }) => Promise<boolean>,
      logout: () => {},
      setView: () => {},
      setActivePsych: () => {},
      addRoom: (async () => null) as (name: string) => Promise<Room | null>,
      deleteRoom: (async () => {}) as (id: number) => Promise<void>,
      addPsychologist: (async () => null) as (data: { name: string; email?: string }) => Promise<Psychologist | null>,
      deletePsychologist: (async () => {}) as (id: number) => Promise<void>,
      addReservation: (async () => false) as (data: Omit<Reservation, "id">) => Promise<boolean>,
      removeReservation: (async () => {}) as (id: string) => Promise<void>,
      addToast: () => {},
      removeToast: () => {},
      toggleTheme: () => {},
      setTheme: (() => {}) as (theme: Theme) => void,
      refreshBilling: async () => {},
      startCheckout: (async () => {}) as (plan: PlanId, interval: "monthly" | "yearly", email?: string) => Promise<void>,
      startTrial: (async () => {}) as () => Promise<void>,
      openBillingPortal: async () => {},
    } as AppContextType;
  }
  return ctx;
}
