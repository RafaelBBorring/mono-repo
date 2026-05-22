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
  sha256,
  type SupabaseClinic,
  type SupabaseClinicDoctor,
  type SupabaseUser,
  type SupabaseClinicInvitation,
} from "@/lib/auth";
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
  login: (email: string, passwordHash: string) => Promise<boolean>;
  signup: (data: { clinicName?: string; email: string; passwordHash: string; role: "admin" | "doctor" }) => Promise<boolean>;
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
  startCheckout: (plan: PlanId, interval: "monthly" | "yearly", email?: string) => Promise<void>;
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
  }, [user, workspaces, loadPendingInvitations, addToast]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem("morpheus_auth");
      const savedUserId = localStorage.getItem("morpheus_user_id");
      if (saved) {
        const parsed = JSON.parse(saved) as AuthUser;
        setAuthUser(parsed);
        if (savedUserId && isSupabaseConfigured) {
          supabase.from("users").select("*").eq("id", savedUserId).maybeSingle()
            .then(({ data }) => { if (data) setUser(mapUser(data as SupabaseUser)); });
        }
        if (isSupabaseConfigured && parsed.clinicId) {
          supabase.from("clinics").select("*").eq("id", parsed.clinicId).maybeSingle()
            .then(({ data }) => { if (data) setClinic(mapClinic(data as SupabaseClinic)); });
          if (savedUserId) {
            supabase.from("clinic_doctors").select("clinic_id, role, psychologist_id, clinics(id, name)").eq("user_id", savedUserId)
              .then(({ data: memberships }) => {
                if (memberships && memberships.length > 0) {
                  setWorkspaces(memberships.map((m: any) => ({
                    clinicId: m.clinic_id, clinicName: m.clinics?.name || "Clínica",
                    role: m.role === "admin" ? "admin" : "doctor", psychologistId: m.psychologist_id ?? undefined,
                  })));
                }
              });
          }
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
      if (!isSupabaseConfigured) return false;
      try {
        const { data: userRow } = await supabase.from("users").select("*").eq("email", email).eq("password_hash", passwordHash).maybeSingle();
        if (userRow) {
          const u = mapUser(userRow as SupabaseUser);
          setUser(u);
          localStorage.setItem("morpheus_user_id", u.id);
          const { data: memberships } = await supabase.from("clinic_doctors").select("clinic_id, role, psychologist_id, clinics(id, name)").eq("user_id", u.id);
          if (memberships && memberships.length > 0) {
            const ws: UserWorkspace[] = memberships.map((m: any) => ({
              clinicId: m.clinic_id, clinicName: m.clinics?.name || "Clínica",
              role: m.role === "admin" ? "admin" : "doctor", psychologistId: m.psychologist_id ?? undefined,
            }));
            setWorkspaces(ws);
            if (ws.length === 1) {
              const single = ws[0];
              const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", single.clinicId).maybeSingle();
              if (clinicData) {
                const c = mapClinic(clinicData as SupabaseClinic);
                const aud: AuthUser = single.role === "admin"
                  ? { role: "admin", clinicId: c.id, email: u.email, displayName: u.displayName }
                  : { role: "doctor", clinicId: c.id, email: u.email, displayName: u.displayName, psychologistId: single.psychologistId };
                setAuthUser(aud);
                setClinic(c);
                localStorage.setItem("morpheus_auth", JSON.stringify(aud));
                localStorage.setItem("morpheus_workspace", single.clinicId);
                await loadOperationalData(c.id);
                if (single.role === "admin") {
                  loadPendingInvitations(single.clinicId);
                  const ba = !billingRequired || !c.billingEnforced || isBillingActive({
                    id: c.id, stripeStatus: c.stripeStatus, billingEnforced: c.billingEnforced,
                    currentPeriodEnd: c.currentPeriodEnd, cancelAtPeriodEnd: c.cancelAtPeriodEnd, updatedAt: new Date().toISOString(),
                  });
                  setView(ba ? "admin" : "billing");
                } else {
                  setView("psych");
                }
                return true;
              }
            }
            setAuthUser({ role: "admin", clinicId: "", email: u.email, displayName: u.displayName });
            localStorage.setItem("morpheus_auth", JSON.stringify({ role: "admin", clinicId: "", email: u.email, displayName: u.displayName }));
            setView("workspace");
            return true;
          }
          setAuthUser({ role: "admin", clinicId: "", email: u.email, displayName: u.displayName });
          localStorage.setItem("morpheus_auth", JSON.stringify({ role: "admin", clinicId: "", email: u.email, displayName: u.displayName }));
          setView("workspace");
          return true;
        }

        const { data: clinicRow } = await supabase.from("clinics").select("*").eq("admin_email", email).eq("admin_password_hash", passwordHash).maybeSingle();
        if (clinicRow) {
          const c = mapClinic(clinicRow as SupabaseClinic);
          setAuthUser({ role: "admin", clinicId: c.id, email: c.adminEmail, displayName: c.name });
          setClinic(c);
          localStorage.setItem("morpheus_auth", JSON.stringify({ role: "admin", clinicId: c.id, email: c.adminEmail, displayName: c.name }));
          localStorage.setItem("morpheus_workspace", c.id);
          await loadOperationalData(c.id);
          const ba = !billingRequired || !c.billingEnforced || isBillingActive({
            id: c.id, stripeStatus: c.stripeStatus, billingEnforced: c.billingEnforced,
            currentPeriodEnd: c.currentPeriodEnd, cancelAtPeriodEnd: c.cancelAtPeriodEnd, updatedAt: new Date().toISOString(),
          });
          setView(ba ? "admin" : "billing");
          return true;
        }

        const { data: doctorRow } = await supabase.from("clinic_doctors").select("*").eq("email", email).eq("password_hash", passwordHash).maybeSingle();
        if (doctorRow) {
          const doc = doctorRow as SupabaseClinicDoctor;
          const { data: clinicData } = await supabase.from("clinics").select("*").eq("id", doc.clinic_id).maybeSingle();
          if (!clinicData) return false;
          const c = mapClinic(clinicData as SupabaseClinic);
          const aud: AuthUser = { role: "doctor", clinicId: c.id, email: doc.email, displayName: doc.display_name, psychologistId: doc.psychologist_id ?? undefined };
          setAuthUser(aud);
          setClinic(c);
          localStorage.setItem("morpheus_auth", JSON.stringify(aud));
          localStorage.setItem("morpheus_workspace", c.id);
          await loadOperationalData(c.id);
          setView("psych");
          return true;
        }
        return false;
      } catch (err) {
        console.error("Login failed:", err);
        return false;
      }
    },
    [loadOperationalData, loadPendingInvitations]
  );

  const signup = useCallback(
    async (data: { clinicName?: string; email: string; passwordHash: string; role: "admin" | "doctor" }): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      try {
        const { data: existingUser } = await supabase.from("users").select("id").eq("email", data.email).maybeSingle();
        if (existingUser) { addToast("Este e-mail já está cadastrado.", "error"); return false; }
        const { data: newUser, error: userError } = await supabase.from("users").insert({ email: data.email, password_hash: data.passwordHash, display_name: data.email.split("@")[0] }).select().single();
        if (userError || !newUser) { addToast("Erro ao criar usuário.", "error"); return false; }
        const u = mapUser(newUser as SupabaseUser);
        setUser(u);
        localStorage.setItem("morpheus_user_id", u.id);
        if (data.role === "doctor" || !data.clinicName) {
          addToast("Conta criada! Peça ao administrador para convidar seu e-mail.", "success");
          setView("login");
          return true;
        }
        const { data: newClinic, error: clinicError } = await supabase.from("clinics").insert({
          name: data.clinicName, admin_email: data.email, admin_password_hash: data.passwordHash,
          user_id: u.id, stripe_status: "inactive", billing_enforced: true,
        }).select().single();
        if (clinicError || !newClinic) { console.error("Clinic creation error:", clinicError); addToast(`Erro ao criar clínica: ${clinicError?.message || "desconhecido"}`, "error"); return false; }
        const c = mapClinic(newClinic as SupabaseClinic);
        await supabase.from("clinic_doctors").insert({ clinic_id: c.id, user_id: u.id, email: data.email, password_hash: data.passwordHash, display_name: data.clinicName, role: "admin" });
        const aud: AuthUser = { role: "admin", clinicId: c.id, email: u.email, displayName: u.displayName };
        setAuthUser(aud);
        setClinic(c);
        setWorkspaces([{ clinicId: c.id, clinicName: c.name, role: "admin" }]);
        localStorage.setItem("morpheus_auth", JSON.stringify(aud));
        localStorage.setItem("morpheus_workspace", c.id);
        addToast("Conta criada com sucesso!", "success");
        return true;
      } catch (err) { console.error("Signup failed:", err); addToast("Erro ao criar conta.", "error"); return false; }
    }, [addToast]
  );

  const createClinic = useCallback(
    async (name: string): Promise<boolean> => {
      if (!user || !isSupabaseConfigured) return false;
      try {
        const { data: newClinic, error } = await supabase.from("clinics").insert({
          name: name.trim(), admin_email: user.email, admin_password_hash: "",
          user_id: user.id, stripe_status: "inactive", billing_enforced: true,
        }).select().single();
        if (error || !newClinic) { console.error("Create clinic error:", error); addToast(`Erro ao criar clínica: ${error?.message || "desconhecido"}`, "error"); return false; }
        const c = mapClinic(newClinic as SupabaseClinic);
        await supabase.from("clinic_doctors").insert({ clinic_id: c.id, user_id: user.id, email: user.email, password_hash: "", display_name: user.displayName, role: "admin" });
        setWorkspaces((prev) => [...prev, { clinicId: c.id, clinicName: c.name, role: "admin" }]);
        addToast(`Clínica "${c.name}" criada!`, "success");
        return true;
      } catch { addToast("Erro ao criar clínica.", "error"); return false; }
    }, [user, addToast]
  );

  const inviteDoctor = useCallback(
    async (email: string, name: string): Promise<{ success: boolean; credentials?: DoctorCredentials; inviteLink?: string }> => {
      if (!authUser || !isSupabaseConfigured || authUser.role !== "admin") return { success: false };
      const te = email.trim().toLowerCase();
      const tn = name.trim();
      if (!te || !tn) { addToast("Informe nome e e-mail.", "error"); return { success: false }; }
      try {
        const { data: eu } = await supabase.from("users").select("id").eq("email", te).maybeSingle();
        if (!eu) { addToast("Usuário não encontrado. O profissional precisa criar uma conta primeiro.", "error"); return { success: false }; }
        const { data: em } = await supabase.from("clinic_doctors").select("id").eq("user_id", eu.id).eq("clinic_id", authUser.clinicId).maybeSingle();
        if (em) { addToast("Este profissional já está na clínica.", "error"); return { success: false }; }
        await supabase.from("clinic_doctors").insert({ clinic_id: authUser.clinicId, user_id: eu.id, email: te, password_hash: "", display_name: tn, role: "doctor" });
        addToast(`${tn} adicionado(a) à clínica.`, "success");
        return { success: true };
      } catch { addToast("Erro ao convidar.", "error"); return { success: false }; }
    }, [authUser, addToast]
  );

  const acceptInvitation = useCallback(
    async (token: string): Promise<boolean> => {
      if (!user || !isSupabaseConfigured) return false;
      try {
        const { data: inv } = await supabase.from("clinic_invitations").select("*").eq("token", token).eq("accepted", false).maybeSingle();
        if (!inv) { addToast("Convite inválido ou expirado.", "error"); return false; }
        const i = inv as SupabaseClinicInvitation;
        if (new Date(i.expires_at) < new Date()) { addToast("Convite expirado.", "error"); return false; }
        await supabase.from("clinic_doctors").insert({ clinic_id: i.clinic_id, user_id: user.id, email: user.email, password_hash: "", display_name: user.displayName, role: i.role });
        await supabase.from("clinic_invitations").update({ accepted: true }).eq("id", i.id);
        addToast("Convite aceito!", "success");
        await loadWorkspaces();
        return true;
      } catch { addToast("Erro ao aceitar convite.", "error"); return false; }
    }, [user, addToast, loadWorkspaces]
  );

  const logout = useCallback(() => {
    setAuthUser(null); setClinic(null); setUser(null); setWorkspaces([]); setPendingInvitations([]);
    setRooms([]); setPsychologists([]); setReservations([]); setView("splash"); setActivePsych(null);
    localStorage.removeItem("morpheus_auth"); localStorage.removeItem("morpheus_user_id"); localStorage.removeItem("morpheus_workspace");
  }, []);

  useEffect(() => {
    if (!authUser || !isSupabaseConfigured) return;
    const channel = supabase.channel(`morpheus-${authUser.clinicId}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => { const { data } = await supabase.from("rooms").select("*").eq("clinic_id", authUser.clinicId).order("id"); if (data) setRooms(data.map(mapRoom)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "psychologists", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => { const { data } = await supabase.from("psychologists").select("*").eq("clinic_id", authUser.clinicId).order("id"); if (data) setPsychologists(data.map(mapPsychologist)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `clinic_id=eq.${authUser.clinicId}` },
        async () => { const { data } = await supabase.from("reservations").select("*").eq("clinic_id", authUser.clinicId).order("date"); if (data) setReservations(data.map(mapReservation)); })
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
    try { const { error } = await supabase.from("reservations").delete().eq("id", id); if (error) throw error; addToast("Reserva removida.", "info"); }
    catch { addToast("Erro ao remover.", "error"); }
  }, [addToast, ensureBillingAccess]);

  const addRoom = useCallback(
    async (rawName: string): Promise<Room | null> => {
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;
      const name = rawName.trim();
      if (!name) { addToast("Informe o nome da sala.", "error"); return null; }
      try {
        const { data: existing } = await supabase.from("rooms").select("id").eq("clinic_id", clinicIdForInsert).order("id", { ascending: false }).limit(1);
        const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
        const palette = COLOR_PALETTES[(nextId - 1) % COLOR_PALETTES.length];
        const { data, error } = await supabase.from("rooms").insert({ clinic_id: clinicIdForInsert, name, hex: palette.hex, rgb: palette.rgb, light_hex: palette.lightHex, light_rgb: palette.lightRgb }).select().single();
        if (error) throw error;
        addToast(`${name} criada.`, "success"); return mapRoom(data);
      } catch { addToast("Erro ao criar sala.", "error"); return null; }
    }, [addToast, ensureBillingAccess, clinicIdForInsert]
  );

  const deleteRoom = useCallback(async (id: number) => {
    if (!ensureBillingAccess()) return;
    try { const { error } = await supabase.from("rooms").delete().eq("id", id); if (error) throw error; addToast("Sala removida.", "success"); }
    catch { addToast("Erro ao remover.", "error"); }
  }, [addToast, ensureBillingAccess]);

  const addPsychologist = useCallback(
    async (data: { name: string; email?: string }): Promise<{ psych: Psychologist; credentials?: DoctorCredentials } | null> => {
      if (!ensureBillingAccess() || !clinicIdForInsert) return null;
      const name = data.name.trim(); const email = data.email?.trim() || "";
      if (!name) { addToast("Informe o nome.", "error"); return null; }
      if (!email) { addToast("Informe o e-mail.", "error"); return null; }
      try {
        const { data: eu } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
        if (!eu) { addToast("Usuário não encontrado. O profissional precisa criar uma conta primeiro.", "error"); return null; }
        const { data: em } = await supabase.from("clinic_doctors").select("id").eq("user_id", eu.id).eq("clinic_id", clinicIdForInsert).maybeSingle();
        if (em) { addToast("Já está na clínica.", "error"); return null; }
        const { data: existing } = await supabase.from("psychologists").select("id").eq("clinic_id", clinicIdForInsert).order("id", { ascending: false }).limit(1);
        const nextId = existing && existing.length > 0 ? existing[0].id + 1 : 1;
        const palette = COLOR_PALETTES[(nextId - 1) % COLOR_PALETTES.length];
        const cleanName = name.replace(/^dr\.?\s+|^dra\.?\s+/i, "");
        const initials = cleanName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
        const { data: inserted, error } = await supabase.from("psychologists").insert({
          clinic_id: clinicIdForInsert, name, short_name: cleanName, initials: initials || "PS", email,
          hex: palette.hex, rgb: palette.rgb, light_hex: palette.lightHex, light_rgb: palette.lightRgb,
        }).select().single();
        if (error) throw error;
        const psych = mapPsychologist(inserted);
        await supabase.from("clinic_doctors").insert({ clinic_id: clinicIdForInsert, user_id: eu.id, psychologist_id: psych.id, email, password_hash: "", display_name: name, role: "doctor" });
        addToast(`${psych.shortName} adicionado(a).`, "success");
        return { psych };
      } catch { addToast("Erro ao criar profissional.", "error"); return null; }
    }, [addToast, ensureBillingAccess, clinicIdForInsert]
  );

  const deletePsychologist = useCallback(async (id: number) => {
    if (!ensureBillingAccess()) return;
    try { const { error } = await supabase.from("psychologists").delete().eq("id", id); if (error) throw error; addToast("Removido.", "success"); }
    catch { addToast("Erro ao remover.", "error"); }
  }, [addToast, ensureBillingAccess]);

  const startCheckout = useCallback(
    async (plan: PlanId, interval: "monthly" | "yearly", email?: string, isTrial = false) => {
      if (!checkoutEnabled) { addToast("Checkout indisponivel.", "info"); return; }
      const linkKey = `${plan}-${interval}`;
      const paymentLinkUrl = stripePaymentLinks[linkKey];
      if (paymentLinkUrl && !isTrial) {
        let url = paymentLinkUrl;
        if (email) { url += `${url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(email)}`; }
        window.location.href = url; return;
      }
      try {
        const response = await fetch(apiUrl("/api/stripe/checkout"), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval, email, clinicId: authUser?.clinicId, trial: isTrial }),
        });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) throw new Error(payload.error || "Checkout indisponivel.");
        window.location.href = payload.url;
      } catch (err) { console.error("Checkout failed:", err); addToast("Nao foi possivel abrir o checkout.", "error"); }
    }, [addToast, authUser]
  );

  const startTrial = useCallback(
    async (email?: string) => {
      const trialLink = stripePaymentLinks["trial"];
      if (trialLink) {
        let url = trialLink;
        if (email) { url += `${url.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(email)}`; }
        window.location.href = url; return;
      }
      await startCheckout("essential", "monthly", email, true);
    }, [startCheckout]
  );

  const openBillingPortal = useCallback(async () => {
    if (!checkoutEnabled) { addToast("Portal indisponível.", "info"); return; }
    try {
      const response = await fetch(apiUrl("/api/stripe/portal"), { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Portal indisponível.");
      window.location.href = payload.url;
    } catch (err) { console.error("Portal failed:", err); addToast("Não foi possível abrir o portal.", "error"); }
  }, [addToast]);

  const updateAccount = useCallback(async (data: { displayName?: string; email?: string; password?: string }) => {
    if (!user?.id) return false;
    try {
      const updates: Record<string, string> = {};
      if (data.displayName) updates["display_name"] = data.displayName;
      if (data.email) updates["email"] = data.email;
      if (data.password) updates["password_hash"] = await sha256(data.password);
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
      const response = await fetch(apiUrl("/api/stripe/cancel"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clinicId: clinic.id }) });
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
      addToast, removeToast, toggleTheme, setTheme, refreshBilling, startCheckout, startTrial, openBillingPortal,
      selectWorkspace, inviteDoctor, createClinic, loadWorkspaces, acceptInvitation, updateAccount, serverApiAvailable, cancelSubscription,
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
      login: (async () => false) as (email: string, passwordHash: string) => Promise<boolean>,
      signup: (async () => false) as (data: { clinicName?: string; email: string; passwordHash: string; role: "admin" | "doctor" }) => Promise<boolean>,
      logout: () => {}, setView: () => {}, setActivePsych: () => {},
      addRoom: (async () => null) as (name: string) => Promise<Room | null>,
      deleteRoom: (async () => {}) as (id: number) => Promise<void>,
      addPsychologist: (async () => null) as (data: { name: string; email?: string }) => Promise<Psychologist | null>,
      deletePsychologist: (async () => {}) as (id: number) => Promise<void>,
      addReservation: (async () => false) as (data: Omit<Reservation, "id">) => Promise<boolean>,
      removeReservation: (async () => {}) as (id: string) => Promise<void>,
      addToast: () => {}, removeToast: () => {}, toggleTheme: () => {},
      setTheme: (() => {}) as (theme: Theme) => void, refreshBilling: async () => {},
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
