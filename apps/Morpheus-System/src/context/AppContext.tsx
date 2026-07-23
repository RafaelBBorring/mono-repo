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
import type {
  AuthUser,
  Clinic,
  ClinicInvitation,
  User,
  UserWorkspace,
} from "@/lib/auth";
import {
  mapClinic,
  mapUser,
  mapClinicInvitation,
  type SupabaseClinic,
  type SupabaseUser,
} from "@/lib/auth";
import type { PlanId } from "@/lib/plans";
import { getPlanById } from "@/lib/plans";
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

interface DoctorCredentials {
  email: string;
  password: string;
}

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
  user: User | null;
  workspaces: UserWorkspace[];
  pendingInvitations: ClinicInvitation[];
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  signup: (data: { clinicName?: string; email: string; password: string; role: "admin" | "doctor" }) => Promise<boolean>;
  logout: () => void;
  setView: (view: AppView) => void;
  setActivePsych: (psych: Psychologist | null) => void;
  addRoom: (name: string) => Promise<Room | null>;
  deleteRoom: (id: number) => Promise<void>;
  addPsychologist: (data: { name: string; email?: string }) => Promise<{ psych: Psychologist; credentials?: DoctorCredentials } | null>;
  deletePsychologist: (id: number) => Promise<void>;
  addReservation: (data: Omit<Reservation, "id">) => Promise<boolean>;
  removeReservation: (id: string) => Promise<void>;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  refreshBilling: () => Promise<void>;
  validateCoupon: (code: string) => Promise<{ valid: boolean; coupon?: { id: string; code: string; label: string; discountPct: number }; error?: string }>;
  startCheckout: (plan: PlanId, interval: "monthly" | "yearly", email?: string, isTrial?: boolean, couponCode?: string) => Promise<void>;
  startTrial: (email?: string) => Promise<void>;
  openBillingPortal: () => Promise<void>;
  selectWorkspace: (clinicId: string) => Promise<void>;
  inviteDoctor: (email: string, name: string) => Promise<{ success: boolean; credentials?: DoctorCredentials; inviteLink?: string }>;
  createClinic: (name: string) => Promise<boolean>;
  loadWorkspaces: () => Promise<UserWorkspace[]>;
  acceptInvitation: (token: string) => Promise<boolean>;
  updateAccount: (data: { displayName?: string; email?: string; password?: string }) => Promise<boolean>;
  serverApiAvailable: boolean;
  cancelSubscription: () => Promise<void>;
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

const _trialLink = process.env.NEXT_PUBLIC_STRIPE_LINK_TRIAL;
if (_trialLink) stripePaymentLinks["trial"] = _trialLink;

const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
const serverApiAvailable = process.env.NEXT_PUBLIC_SERVER_API_AVAILABLE !== "false";

function apiUrl(path: string) {
  return publicApiBaseUrl ? `${publicApiBaseUrl}${path}` : path;
}

function readableServiceError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("enotfound")
  ) {
    return "O serviço de acesso está indisponível. Verifique a conexão do Supabase e tente novamente.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos ou use o acesso pelo Google.";
  }

  if (normalized.includes("email address not authorized")) {
    return "O serviço de e-mail ainda não está autorizado para este endereço.";
  }

  return message || fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("splash");
  const [activePsych, setActivePsych] = useState<Psychologist | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [selectedPlan] = useState<PlanId | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ClinicInvitation[]>([]);

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
    const initialTheme =
      savedTheme ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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

  const loadWorkspaces = useCallback(async (): Promise<UserWorkspace[]> => {
    if (!user || !isSupabaseConfigured) return [];
    try {
      const { data: memberships } = await supabase
        .from("clinic_doctors")
        .select("clinic_id, role, psychologist_id, clinics(id, name)")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) return [];
      const ws: UserWorkspace[] = memberships.map((m: any) => ({
        clinicId: m.clinic_id,
        clinicName: m.clinics?.name || "Clínica",
        role: m.role === "admin" ? "admin" : "doctor",
        psychologistId: m.psychologist_id ?? undefined,
      }));
      setWorkspaces(ws);
      return ws;
    } catch {
      return [];
    }
  }, [user]);

  const loadPendingInvitations = useCallback(async (clinicId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from("clinic_invitations")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("accepted", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (data) setPendingInvitations(data.map(mapClinicInvitation));
    } catch {}
  }, []);

  const loadOperationalData = useCallback(async (clinicId: string) => {
    if (!isSupabaseConfigured) return;
    const filter = { column: "clinic_id", value: clinicId };
    const rangeStart = new Date();
    rangeStart.setFullYear(rangeStart.getFullYear() - 1);
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 2);
    const startDate = rangeStart.toISOString().slice(0, 10);
    const endDate = rangeEnd.toISOString().slice(0, 10);
    const [roomsRes, psychsRes, reservsRes] = await Promise.all([
      supabase.from("rooms").select("id,name,hex,rgb,light_hex,light_rgb,created_at").eq(filter.column, filter.value).order("id"),
      supabase.from("psychologists").select("id,name,short_name,initials,email,hex,rgb,light_hex,light_rgb,created_at").eq(filter.column, filter.value).order("id"),
      supabase.from("reservations").select("id,room_id,psych_id,date,start_time,end_time,notes,created_at").eq(filter.column, filter.value).gte("date", startDate).lte("date", endDate).order("date").order("start_time"),
    ]);
    if (roomsRes.error) throw roomsRes.error;
    if (psychsRes.error) throw psychsRes.error;
    if (reservsRes.error) throw reservsRes.error;
    setRooms((roomsRes.data ?? []).map(mapRoom));
    setPsychologists((psychsRes.data ?? []).map(mapPsychologist));
    setReservations((reservsRes.data ?? []).map(mapReservation));
  }, []);

  const selectWorkspace = useCallback(async (clinicId: string) => {
    if (!user || !isSupabaseConfigured) return;
    const ws = workspaces.find((w) => w.clinicId === clinicId);
    if (!ws) return;
    try {
      const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", clinicId).maybeSingle();
      if (!clinicData) { addToast("Clínica não encontrada.", "error"); return; }
      const c = mapClinic(clinicData as SupabaseClinic);
      const authUserData: AuthUser = ws.role === "admin"
        ? { role: "admin", clinicId: c.id, email: user.email, displayName: user.displayName }
        : { role: "doctor", clinicId: c.id, email: user.email, displayName: user.displayName, psychologistId: ws.psychologistId };
      setAuthUser(authUserData);
      setClinic(c);
      localStorage.setItem("morpheus_auth", JSON.stringify(authUserData));
      localStorage.setItem("morpheus_workspace", clinicId);
      await loadOperationalData(c.id);
      if (ws.role === "admin") {
        loadPendingInvitations(clinicId);
        const ba = !billingRequired || !c.billingEnforced || isBillingActive({
          id: c.id, stripeStatus: c.stripeStatus, billingEnforced: c.billingEnforced,
          currentPeriodEnd: c.currentPeriodEnd, cancelAtPeriodEnd: c.cancelAtPeriodEnd, updatedAt: new Date().toISOString(),
        });
        setView(ba ? "admin" : "billing");
      } else {
        setView("psych");
      }
    } catch (err) {
      console.error("selectWorkspace failed:", err);
      addToast("Erro ao acessar a clínica.", "error");
    }
  }, [user, workspaces, loadPendingInvitations, loadOperationalData, addToast]);

  const hydrateAuthenticatedUser = useCallback(async (authAccount: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    const { data: profileRow } = await supabase.from("users").select("*").eq("id", authAccount.id).maybeSingle();
    const fallbackName = String(authAccount.user_metadata?.display_name || authAccount.user_metadata?.full_name || authAccount.email?.split("@")[0] || "Usuário");
    const currentUser = profileRow
      ? mapUser(profileRow as SupabaseUser)
      : { id: authAccount.id, email: authAccount.email || "", displayName: fallbackName };
    setUser(currentUser);
    localStorage.setItem("morpheus_user_id", currentUser.id);

    const { data: memberships, error } = await supabase
      .from("clinic_doctors")
      .select("clinic_id, role, psychologist_id, clinics(id, name)")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    const nextWorkspaces: UserWorkspace[] = (memberships ?? []).map((membership: any) => ({
      clinicId: membership.clinic_id,
      clinicName: membership.clinics?.name || "Clínica",
      role: membership.role === "admin" ? "admin" : "doctor",
      psychologistId: membership.psychologist_id ?? undefined,
    }));
    setWorkspaces(nextWorkspaces);

    const rememberedId = localStorage.getItem("morpheus_workspace");
    const selected = nextWorkspaces.find((workspace) => workspace.clinicId === rememberedId)
      || (nextWorkspaces.length === 1 ? nextWorkspaces[0] : undefined);
    if (!selected) {
      const placeholder: AuthUser = { role: "admin", clinicId: "", email: currentUser.email, displayName: currentUser.displayName };
      setAuthUser(placeholder);
      setClinic(null);
      setView("workspace");
      return true;
    }

    const { data: clinicData, error: clinicError } = await supabase.from("clinics").select("*").eq("id", selected.clinicId).maybeSingle();
    if (clinicError || !clinicData) throw clinicError || new Error("Clínica não encontrada.");
    const currentClinic = mapClinic(clinicData as SupabaseClinic);
    const currentAuthUser: AuthUser = selected.role === "admin"
      ? { role: "admin", clinicId: currentClinic.id, email: currentUser.email, displayName: currentUser.displayName }
      : { role: "doctor", clinicId: currentClinic.id, email: currentUser.email, displayName: currentUser.displayName, psychologistId: selected.psychologistId };
    setAuthUser(currentAuthUser);
    setClinic(currentClinic);
    localStorage.setItem("morpheus_auth", JSON.stringify(currentAuthUser));
    localStorage.setItem("morpheus_workspace", currentClinic.id);
    await loadOperationalData(currentClinic.id);
    if (selected.role === "admin") {
      await loadPendingInvitations(currentClinic.id);
      const hasBilling = !billingRequired || !currentClinic.billingEnforced || isBillingActive({
        id: currentClinic.id,
        stripeStatus: currentClinic.stripeStatus,
        billingEnforced: currentClinic.billingEnforced,
        currentPeriodEnd: currentClinic.currentPeriodEnd,
        cancelAtPeriodEnd: currentClinic.cancelAtPeriodEnd,
        updatedAt: new Date().toISOString(),
      });
      setView(hasBilling ? "admin" : "billing");
    } else {
      setView("psych");
    }
    return true;
  }, [loadOperationalData, loadPendingInvitations]);

  useEffect(() => {
    if (!mounted || !isSupabaseConfigured) {
      if (mounted) setLoading(false);
      return;
    }
    let alive = true;
    const loadingWatchdog = window.setTimeout(() => {
      if (alive) setLoading(false);
    }, 1200);
    void (async () => {
      let authTimeout: number | undefined;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const timeout = new Promise<never>((_, reject) => {
          authTimeout = window.setTimeout(() => reject(new Error("Tempo limite ao validar a sessão.")), 5000);
        });
        const { data, error } = await Promise.race([supabase.auth.getUser(), timeout]);
        if (!alive) return;
        if (error) throw error;
        if (data.user) await hydrateAuthenticatedUser(data.user);
      } catch (restoreError) {
        console.error("Session restore failed:", restoreError);
        await supabase.auth.signOut().catch(() => undefined);
      } finally {
        if (authTimeout) window.clearTimeout(authTimeout);
        window.clearTimeout(loadingWatchdog);
        if (alive) setLoading(false);
      }
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setClinic(null);
        setUser(null);
        setWorkspaces([]);
      }
    });
    return () => {
      alive = false;
      window.clearTimeout(loadingWatchdog);
      listener.subscription.unsubscribe();
    };
  }, [mounted, hydrateAuthenticatedUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        addToast("O serviço de acesso ainda não foi configurado.", "error");
        return false;
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const invalidCredentials = error.message.toLowerCase().includes("invalid login credentials");
          addToast(invalidCredentials ? "E-mail ou senha incorretos." : readableServiceError(error, "Não foi possível entrar."), "error");
          return false;
        }
        if (!data.user) {
          addToast("Não foi possível identificar sua conta.", "error");
          return false;
        }
        return await hydrateAuthenticatedUser(data.user);
      } catch (err) {
        console.error("Login failed:", err);
        addToast(readableServiceError(err, "Não foi possível entrar."), "error");
        return false;
      }
    },
    [addToast, hydrateAuthenticatedUser]
  );

  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      addToast("O serviço de acesso ainda não foi configurado.", "error");
      return false;
    }
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const redirectTo = `${window.location.origin}${basePath}/app?action=workspace`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
      return true;
    } catch (error) {
      addToast(readableServiceError(error, "Não foi possível entrar com Google."), "error");
      return false;
    }
  }, [addToast]);

  const signup = useCallback(
    async (data: { clinicName?: string; email: string; password: string; role: "admin" | "doctor" }): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        addToast("O serviço de acesso ainda não foi configurado.", "error");
        return false;
      }
      try {
        const displayName = data.clinicName?.trim() || data.email.split("@")[0];
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { display_name: displayName } },
        });
        if (authError || !authData.user) {
          addToast(readableServiceError(authError, "Erro ao criar usuário."), "error");
          return false;
        }
        if (!authData.session) {
          addToast("Conta criada. Confirme seu e-mail para continuar.", "success");
          setView("login");
          return true;
        }
        if (data.role === "admin" && data.clinicName) {
          const { error: clinicError } = await supabase.rpc("create_morpheus_clinic", { clinic_name: data.clinicName.trim() });
          if (clinicError) throw clinicError;
        }
        await hydrateAuthenticatedUser(authData.user);
        addToast(data.role === "admin" ? "Conta e clínica criadas com sucesso!" : "Conta criada. Agora aceite o convite da clínica.", "success");
        return true;
      } catch (err) {
        console.error("Signup failed:", err);
        addToast(readableServiceError(err, "Erro ao criar conta."), "error");
        return false;
      }
    }, [addToast, hydrateAuthenticatedUser]
  );

  const createClinic = useCallback(
    async (name: string): Promise<boolean> => {
      if (!user || !isSupabaseConfigured) return false;
      try {
        const { error } = await supabase.rpc("create_morpheus_clinic", { clinic_name: name.trim() });
        if (error) {
          if (error.message.includes("workspace_plan_limit")) addToast("Seu plano atingiu o limite de clínicas.", "error");
          else addToast(`Erro ao criar clínica: ${error.message}`, "error");
          return false;
        }
        await loadWorkspaces();
        addToast(`Clínica "${name.trim()}" criada!`, "success");
        return true;
      } catch { addToast("Erro ao criar clínica.", "error"); return false; }
    }, [user, addToast, loadWorkspaces]
  );

  const inviteDoctor = useCallback(
    async (email: string, name: string): Promise<{ success: boolean; credentials?: DoctorCredentials; inviteLink?: string }> => {
      if (!authUser || !isSupabaseConfigured || authUser.role !== "admin") return { success: false };
      const te = email.trim().toLowerCase();
      const tn = name.trim();
      if (!te || !tn) { addToast("Informe nome e e-mail.", "error"); return { success: false }; }
      try {
        const { data: invitation, error } = await supabase.from("clinic_invitations").insert({
          clinic_id: authUser.clinicId,
          email: te,
          role: "doctor",
        }).select("token").single();
        if (error || !invitation) throw error || new Error("Convite não criado.");
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const inviteLink = `${window.location.origin}${basePath}/app?action=accept_invite&invite=${invitation.token}`;
        addToast(`Convite de ${tn} criado.`, "success");
        return { success: true, inviteLink };
      } catch { addToast("Erro ao convidar.", "error"); return { success: false }; }
    }, [authUser, addToast]
  );

  const acceptInvitation = useCallback(
    async (token: string): Promise<boolean> => {
      if (!user || !isSupabaseConfigured) return false;
      try {
        const { error } = await supabase.rpc("accept_morpheus_invitation", { invitation_token: token });
        if (error) { addToast("Convite inválido, expirado ou destinado a outro e-mail.", "error"); return false; }
        addToast("Convite aceito!", "success");
        await loadWorkspaces();
        return true;
      } catch { addToast("Erro ao aceitar convite.", "error"); return false; }
    }, [user, addToast, loadWorkspaces]
  );

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    setAuthUser(null); setClinic(null); setUser(null); setWorkspaces([]); setPendingInvitations([]);
    setRooms([]); setPsychologists([]); setReservations([]); setView("splash"); setActivePsych(null);
    localStorage.removeItem("morpheus_auth"); localStorage.removeItem("morpheus_user_id"); localStorage.removeItem("morpheus_workspace");
  }, []);

  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) return;
    const channel = supabase.channel(`morpheus-${authUser.clinicId}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => { const { data } = await supabase.from("rooms").select("id,name,hex,rgb,light_hex,light_rgb,created_at").eq("clinic_id", authUser.clinicId).order("id"); if (data) setRooms(data.map(mapRoom)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "psychologists", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => { const { data } = await supabase.from("psychologists").select("id,name,short_name,initials,email,hex,rgb,light_hex,light_rgb,created_at").eq("clinic_id", authUser.clinicId).order("id"); if (data) setPsychologists(data.map(mapPsychologist)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => {
          const rangeStart = new Date(); rangeStart.setFullYear(rangeStart.getFullYear() - 1);
          const rangeEnd = new Date(); rangeEnd.setFullYear(rangeEnd.getFullYear() + 2);
          const { data } = await supabase.from("reservations").select("id,room_id,psych_id,date,start_time,end_time,notes,created_at").eq("clinic_id", authUser.clinicId).gte("date", rangeStart.toISOString().slice(0, 10)).lte("date", rangeEnd.toISOString().slice(0, 10)).order("date").order("start_time");
          if (data) setReservations(data.map(mapReservation));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const refreshBilling = useCallback(async () => {
    if (!authUser || !isSupabaseConfigured) return;
    try {
      const { data } = await supabase.from("clinics").select("*").eq("id", authUser.clinicId).maybeSingle();
      if (data) setClinic(mapClinic(data as SupabaseClinic));
    } catch { console.warn("Failed to refresh billing"); }
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
      const hasConflict = reservations.some((r) => r.roomId === data.roomId && r.date === data.date && data.startTime < r.endTime && data.endTime > r.startTime);
      if (hasConflict) { addToast("Conflito de horário!", "error"); return false; }
      try {
        const row = { ...toReservationRow(data), clinic_id: clinicIdForInsert };
        const { error } = await supabase.from("reservations").insert(row);
        if (error) throw error;
        addToast("Reserva criada!", "success"); return true;
      } catch { addToast("Erro ao criar reserva.", "error"); return false; }
    }, [addToast, ensureBillingAccess, reservations, clinicIdForInsert]
  );

  const removeReservation = useCallback(async (id: string) => {
    if (!ensureBillingAccess()) return;
    try { const { error } = await supabase.from("reservations").delete().eq("id", id).eq("clinic_id", clinicIdForInsert); if (error) throw error; addToast("Reserva removida.", "info"); }
    catch { addToast("Erro ao remover.", "error"); }
  }, [addToast, ensureBillingAccess]);

  const addRoom = useCallback(
    async (rawName: string): Promise<Room | null> => {
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;
      const name = rawName.trim();
      if (!name) { addToast("Informe o nome da sala.", "error"); return null; }
      const plan = getPlanById(clinic?.planId || "essential");
      if (rooms.length >= plan.maxRooms) { addToast(`O plano ${plan.name} permite até ${plan.maxRooms} salas.`, "error"); return null; }
      try {
        const palette = COLOR_PALETTES[rooms.length % COLOR_PALETTES.length];
        const { data, error } = await supabase.from("rooms").insert({ clinic_id: clinicIdForInsert, name, hex: palette.hex, rgb: palette.rgb, light_hex: palette.lightHex, light_rgb: palette.lightRgb }).select().single();
        if (error) throw error;
        addToast(`${name} criada.`, "success"); return mapRoom(data);
      } catch { addToast("Erro ao criar sala.", "error"); return null; }
    }, [addToast, ensureBillingAccess, clinicIdForInsert, clinic?.planId, rooms.length]
  );

  const deleteRoom = useCallback(async (id: number) => {
    if (!ensureBillingAccess()) return;
    if (!clinicIdForInsert) { addToast("Sessão inválida. Reinicie a sessão.", "error"); return; }
    try {
      await supabase.from("reservations").delete().eq("room_id", id).eq("clinic_id", clinicIdForInsert);
      const { error, count } = await supabase.from("rooms").delete({ count: "exact" }).eq("id", id).eq("clinic_id", clinicIdForInsert);
      if (error) throw error;
      if (count === 0) { addToast("Sem permissão para remover — verifique a assinatura da clínica.", "error"); return; }
      setRooms((prev) => prev.filter((r) => r.id !== id));
      setReservations((prev) => prev.filter((r) => r.roomId !== id));
      addToast("Sala removida.", "success");
    } catch (err) {
      console.error("deleteRoom failed:", err);
      addToast(`Erro ao remover: ${readableServiceError(err, "tente novamente")}`, "error");
    }
  }, [addToast, ensureBillingAccess, clinicIdForInsert]);

  const addPsychologist = useCallback(
    async (data: { name: string; email?: string }): Promise<{ psych: Psychologist; credentials?: DoctorCredentials } | null> => {
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;
      const name = data.name.trim(); const email = data.email?.trim() || "";
      if (!name) { addToast("Informe o nome.", "error"); return null; }
      if (!email) { addToast("Informe o e-mail.", "error"); return null; }
      const plan = getPlanById(clinic?.planId || "essential");
      if (psychologists.length >= plan.maxDoctors) { addToast(`O plano ${plan.name} permite até ${plan.maxDoctors} profissionais.`, "error"); return null; }
      try {
        const { data: result, error } = await supabase.rpc("invite_morpheus_doctor", {
          target_clinic: clinicIdForInsert,
          doctor_name: name,
          doctor_email: email.toLowerCase(),
        });
        if (error || !result?.[0]) throw error || new Error("Convite não criado.");
        const { data: inserted } = await supabase.from("psychologists").select("*").eq("clinic_id", clinicIdForInsert).eq("id", result[0].psychologist_id).single();
        if (!inserted) throw new Error("Profissional não encontrado após o convite.");
        const psych = mapPsychologist(inserted);
        if (result[0].invitation_token) {
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          const inviteLink = `${window.location.origin}${basePath}/app?action=accept_invite&invite=${result[0].invitation_token}`;
          await navigator.clipboard?.writeText(inviteLink).catch(() => undefined);
          addToast(`${psych.shortName} convidado(a). O link foi copiado.`, "success");
        } else {
          addToast(`${psych.shortName} adicionado(a).`, "success");
        }
        return { psych };
      } catch { addToast("Erro ao criar profissional.", "error"); return null; }
    }, [addToast, ensureBillingAccess, clinicIdForInsert, clinic?.planId, psychologists.length]
  );

  const deletePsychologist = useCallback(async (id: number) => {
    if (!ensureBillingAccess()) return;
    if (!clinicIdForInsert) { addToast("Sessão inválida. Reinicie a sessão.", "error"); return; }
    try {
      await supabase.from("reservations").delete().eq("psych_id", id).eq("clinic_id", clinicIdForInsert);
      const { error, count } = await supabase.from("psychologists").delete({ count: "exact" }).eq("id", id).eq("clinic_id", clinicIdForInsert);
      if (error) throw error;
      if (count === 0) { addToast("Sem permissão para remover — verifique a assinatura da clínica.", "error"); return; }
      setPsychologists((prev) => prev.filter((p) => p.id !== id));
      setReservations((prev) => prev.filter((r) => r.psychId !== id));
      addToast("Removido.", "success");
    } catch (err) {
      console.error("deletePsychologist failed:", err);
      addToast(`Erro ao remover: ${readableServiceError(err, "tente novamente")}`, "error");
    }
  }, [addToast, ensureBillingAccess, clinicIdForInsert]);

  const validateCoupon = useCallback(
    async (code: string): Promise<{ valid: boolean; coupon?: { id: string; code: string; label: string; discountPct: number }; error?: string }> => {
      if (!code.trim()) return { valid: false, error: "Informe o codigo do cupom." };
      try {
        const response = await fetch(apiUrl("/api/coupons/validate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const payload = (await response.json()) as { id?: string; code?: string; label?: string; discountPct?: number; error?: string };
        if (!response.ok || payload.error) return { valid: false, error: payload.error || "Cupom invalido." };
        return { valid: true, coupon: { id: payload.id!, code: payload.code!, label: payload.label!, discountPct: payload.discountPct! } };
      } catch {
        return { valid: false, error: "Erro ao validar cupom." };
      }
    }, []
  );

  const startCheckout = useCallback(
    async (plan: PlanId, interval: "monthly" | "yearly", email?: string, isTrial = false, couponCode?: string) => {
      if (!checkoutEnabled) { addToast("Checkout indisponivel.", "info"); return; }
      const linkKey = `${plan}-${interval}`;
      const paymentLinkUrl = stripePaymentLinks[linkKey];
      if (!serverApiAvailable && paymentLinkUrl && !isTrial && !couponCode) {
        let url = paymentLinkUrl;
        if (email) { url += `${url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(email)}`; }
        window.location.href = url; return;
      }
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Sessão expirada.");
        const response = await fetch(apiUrl("/api/stripe/checkout"), {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ plan, interval, email, clinicId: authUser?.clinicId, trial: isTrial, couponCode }),
        });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout indisponivel.");
        window.location.href = payload.url;
      } catch (err) {
        console.error("Checkout failed:", err);
        addToast(readableServiceError(err, "Não foi possível abrir o checkout."), "error");
      }
    }, [addToast, authUser]
  );

  const startTrial = useCallback(
    async (email?: string) => {
      const trialLink = stripePaymentLinks["trial"];
      if (!serverApiAvailable && trialLink) {
        let url = trialLink;
        if (email) { url += `${url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(email)}`; }
        window.location.href = url; return;
      }
      await startCheckout("essential", "monthly", email, true);
    }, [startCheckout]
  );

  const openBillingPortal = useCallback(async () => {
    if (!checkoutEnabled) { addToast("Portal indisponivel.", "info"); return; }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada.");
      const response = await fetch(apiUrl("/api/stripe/portal"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ clinicId: clinic?.id }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Portal indisponível.");
      window.location.href = payload.url;
    } catch (err) { console.error("Portal failed:", err); addToast("Não foi possível abrir o portal.", "error"); }
  }, [addToast, clinic]);

  const updateAccount = useCallback(async (data: { displayName?: string; email?: string; password?: string }) => {
    if (!user?.id) return false;
    try {
      const updates: Record<string, string> = {};
      if (data.displayName) updates["display_name"] = data.displayName;
      if (data.email) updates["email"] = data.email;
      const authUpdates: { email?: string; password?: string; data?: { display_name: string } } = {};
      if (data.email) authUpdates.email = data.email;
      if (data.password) authUpdates.password = data.password;
      if (data.displayName) authUpdates.data = { display_name: data.displayName };
      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) throw authError;
      }
      const { error } = await supabase.from("users").update(updates).eq("id", user.id);
      if (error) throw error;
      setUser({ ...user, displayName: data.displayName ?? user.displayName, email: data.email ?? user.email });
      if (data.displayName && authUser) {
        setAuthUser({ ...authUser, displayName: data.displayName });
      }
      addToast("Conta atualizada!", "success");
      return true;
    } catch (err) {
      console.error("updateAccount failed:", err);
      addToast("Erro ao atualizar conta.", "error");
      return false;
    }
  }, [user, authUser, addToast]);

  const cancelSubscription = useCallback(async () => {
    if (!clinic?.stripeSubscriptionId) { addToast("Nenhuma assinatura para cancelar.", "info"); return; }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada.");
      const response = await fetch(apiUrl("/api/stripe/cancel"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ clinicId: clinic.id }) });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Falha ao cancelar.");
      addToast("Assinatura cancelada.", "success");
      await refreshBilling();
    } catch (err) {
      console.error("Cancel failed:", err);
      addToast("Erro ao cancelar assinatura.", "error");
    }
  }, [clinic, addToast, refreshBilling]);

  if (!mounted) return <>{children}</>;

  return (
    <AppContext.Provider value={{
      view, activePsych, rooms, psychologists, reservations, toasts, theme, loading,
      authUser, clinic, selectedPlan, billingRequired, billingActive, checkoutEnabled,
      user, workspaces, pendingInvitations, login, signup, logout, setView, setActivePsych,
      addRoom, deleteRoom, addPsychologist, deletePsychologist, addReservation, removeReservation,
      addToast, removeToast, toggleTheme, setTheme, refreshBilling, validateCoupon, startCheckout, startTrial, openBillingPortal,
      selectWorkspace, inviteDoctor, createClinic, loadWorkspaces, acceptInvitation, updateAccount, serverApiAvailable, cancelSubscription, loginWithGoogle,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      view: "splash" as AppView, activePsych: null as Psychologist | null, rooms: [] as Room[],
      psychologists: [] as Psychologist[], reservations: [] as Reservation[], toasts: [] as Toast[],
      theme: "light" as Theme, loading: false, authUser: null as AuthUser | null, clinic: null as Clinic | null,
      selectedPlan: null as PlanId | null, billingRequired, billingActive: !billingRequired, checkoutEnabled,
      user: null as User | null, workspaces: [] as UserWorkspace[], pendingInvitations: [] as ClinicInvitation[],
      login: (async () => false) as (email: string, password: string) => Promise<boolean>,
      loginWithGoogle: (async () => false) as () => Promise<boolean>,
      signup: (async () => false) as (data: { clinicName?: string; email: string; password: string; role: "admin" | "doctor" }) => Promise<boolean>,
      logout: () => {}, setView: () => {}, setActivePsych: () => {},
      addRoom: (async () => null) as (name: string) => Promise<Room | null>,
      deleteRoom: (async () => {}) as (id: number) => Promise<void>,
      addPsychologist: (async () => null) as (data: { name: string; email?: string }) => Promise<Psychologist | null>,
      deletePsychologist: (async () => {}) as (id: number) => Promise<void>,
      addReservation: (async () => false) as (data: Omit<Reservation, "id">) => Promise<boolean>,
      removeReservation: (async () => {}) as (id: string) => Promise<void>,
      addToast: () => {}, removeToast: () => {}, toggleTheme: () => {},
      setTheme: (() => {}) as (theme: Theme) => void, refreshBilling: async () => {},
      validateCoupon: (async () => ({ valid: false })) as (code: string) => Promise<{ valid: boolean; coupon?: { id: string; code: string; label: string; discountPct: number }; error?: string }>,
      startCheckout: (async () => {}) as (plan: PlanId, interval: "monthly" | "yearly", email?: string) => Promise<void>,
      startTrial: (async () => {}) as () => Promise<void>, openBillingPortal: async () => {},
      selectWorkspace: (async () => {}) as (clinicId: string) => Promise<void>,
      inviteDoctor: (async () => ({ success: false })) as (email: string, name: string) => Promise<{ success: boolean; credentials?: DoctorCredentials; inviteLink?: string }>,
      createClinic: (async () => false) as (name: string) => Promise<boolean>,
      loadWorkspaces: (async () => []) as () => Promise<UserWorkspace[]>,
      acceptInvitation: (async () => false) as (token: string) => Promise<boolean>,
      updateAccount: (async () => false) as (data: { displayName?: string; email?: string; password?: string }) => Promise<boolean>,
      serverApiAvailable: false,
      cancelSubscription: (async () => {}) as () => Promise<void>,
    } as AppContextType;
  }
  return ctx;
}
