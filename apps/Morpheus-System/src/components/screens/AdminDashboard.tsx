"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { HOURS, MONTHS, WEEKDAYS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import AppShell from "@/components/AppShell";
import AccountPill from "@/components/AccountPill";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import type { Psychologist, Reservation, Room } from "@/types";
import type { Clinic } from "@/lib/auth";
import type { PlanId } from "@/lib/plans";
import { PLANS, getPlanById } from "@/lib/plans";
import {
  BadgePlus,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DoorOpen,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  UserCog,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  format,
  isToday as dateFnsIsToday,
  parseISO,
  startOfWeek,
} from "date-fns";

const RoomSpatialMap = dynamic(() => import("@/components/visuals/RoomSpatialMap"), {
  ssr: false,
  loading: () => <div className="h-[520px] animate-pulse rounded-3xl bg-[var(--glass-soft)]" />,
});

type AdminSection = "overview" | "schedule" | "management" | "settings";
type AdminScheduleView = "grid" | "map";

const SLOT_HEIGHT = 52;
const BODY_HEIGHT = (HOURS.length - 1) * SLOT_HEIGHT;
const ROOM_LANE_MIN_WIDTH = 78;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getReservationPosition(reservation: Reservation) {
  const dayStart = timeToMinutes(HOURS[0]);
  const dayEnd = timeToMinutes(HOURS[HOURS.length - 1]);
  const start = Math.max(timeToMinutes(reservation.startTime), dayStart);
  const end = Math.min(timeToMinutes(reservation.endTime), dayEnd);
  const top = ((start - dayStart) / 30) * SLOT_HEIGHT;
  const height = Math.max(((end - start) / 30) * SLOT_HEIGHT - 10, 44);

  return { top, height };
}

function getNearestSlotTime(clientY: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const offset = Math.max(0, Math.min(clientY - rect.top, BODY_HEIGHT - SLOT_HEIGHT));
  const slot = Math.floor(offset / SLOT_HEIGHT);
  const dayStart = timeToMinutes(HOURS[0]);
  const startMinutes = dayStart + slot * 30;
  const endMinutes = Math.min(startMinutes + 60, timeToMinutes(HOURS[HOURS.length - 1]));

  return {
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
  };
}

function formatDateLong(date: string) {
  return parseISO(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function AdminDashboard() {
  const {
    reservations,
    rooms,
    psychologists,
    setView,
    theme,
    addRoom,
    deleteRoom,
    addPsychologist,
    deletePsychologist,
    loading,
    clinic,
    billingActive,
    refreshBilling,
    startCheckout,
    startTrial,
    openBillingPortal,
    authUser,
    user,
    logout,
    updateAccount,
  } = useApp();
  const [section, setSection] = useState<AdminSection>("overview");
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleView, setScheduleView] = useState<AdminScheduleView>("grid");
  const [showNewModal, setShowNewModal] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<Reservation>>({});
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [roomName, setRoomName] = useState("");
  const [psychName, setPsychName] = useState("");
  const [psychEmail, setPsychEmail] = useState("");
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<number | null>(null);
  const [confirmDeletePsych, setConfirmDeletePsych] = useState<number | null>(null);

  const isDark = theme === "dark";
  const todayISO = format(new Date(), "yyyy-MM-dd");

  const weekDays = useMemo(() => {
    const base = addWeeks(new Date(), weekOffset);
    const weekStart = startOfWeek(base, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const dd = addDays(weekStart, i);
      return {
        iso: format(dd, "yyyy-MM-dd"),
        num: dd.getDate(),
        name: WEEKDAYS[dd.getDay()],
        isToday: dateFnsIsToday(dd),
      };
    });
  }, [weekOffset]);

  const weekLabel = `${weekDays[0].num} - ${weekDays[6].num} ${
    MONTHS[new Date(`${weekDays[6].iso}T00:00:00`).getMonth()]
  }`;

  const todayReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.date === todayISO)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [reservations, todayISO]
  );

  function openReservation(prefill: Partial<Reservation> = {}) {
    setPrefillData(prefill);
    setShowNewModal(true);
  }

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await addRoom(roomName);
    if (created) setRoomName("");
  }

  const [lastCredentials, setLastCredentials] = useState<{ email: string; password: string } | null>(null);

  async function submitPsychologist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await addPsychologist({ name: psychName, email: psychEmail });
    if (result) {
      setPsychName("");
      setPsychEmail("");
    }
  }

  function openAccountSettings() {
    setAccountName(user?.displayName || authUser?.displayName || "");
    setAccountEmail(user?.email || authUser?.email || "");
    setAccountPassword("");
    setAccountModalOpen(true);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAccount(true);
    const ok = await updateAccount({
      displayName: accountName,
      email: accountEmail,
      password: accountPassword || undefined,
    });
    setSavingAccount(false);
    if (ok) setAccountModalOpen(false);
  }

  function handleLogout() {
    logout();
    setView("login");
  }

  function goToLanding() {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    window.location.href = `${basePath}/landing`;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-lavender)] border-t-transparent" />
          <p className="font-body text-lg text-[var(--text-muted)]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Hoje", icon: <Sparkles size={18} />, active: section === "overview", onClick: () => setSection("overview") },
    { id: "schedule", label: "Agenda", icon: <CalendarRange size={18} />, active: section === "schedule", onClick: () => setSection("schedule") },
    { id: "management", label: "Gerenciamento", icon: <UsersRound size={18} />, active: section === "management", onClick: () => setSection("management") },
    { id: "settings", label: "Assinatura", icon: <Settings size={18} />, active: section === "settings", onClick: () => setSection("settings") },
  ];

  const accountItems = [
    { icon: <Building2 size={17} />, label: "Minhas clínicas", onClick: () => setView("workspace") },
    { icon: <UserCog size={17} />, label: "Alterar dados da conta", onClick: openAccountSettings },
    { icon: <Home size={17} />, label: "Landing page", onClick: goToLanding },
    { icon: <LogOut size={17} />, label: "Sair", onClick: handleLogout, danger: true },
  ];

  return (
    <>
    <AppShell
      subtitle="Biblioteca operacional"
      routeKey={section}
      navItems={navItems}
      accountSlot={
        <AccountPill displayName={user?.displayName || authUser?.displayName || "Conta"} items={accountItems} />
      }
      primaryAction={
        <Button variant="gradient" size="lg" onClick={() => openReservation({})}>
          <Plus size={20} /> Nova reserva
        </Button>
      }
    >
      {section === "overview" && (
        <AdminOverview
          rooms={rooms}
          psychologists={psychologists}
          reservations={todayReservations}
          isDark={isDark}
          onNew={() => openReservation({ date: todayISO })}
          onOpenSchedule={() => setSection("schedule")}
          onOpenManagement={() => setSection("management")}
          onDetail={setDetailRes}
        />
      )}

      {section === "schedule" && (
        <section className="mx-auto max-w-[1800px] px-6 py-10 lg:px-10 lg:py-14">
          <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl premium-panel p-6 md:flex-row md:items-center lg:p-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)]"
                aria-label="Semana anterior"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="min-w-[180px] text-center">
                <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Semana
                </p>
                <p className="font-brand text-2xl font-semibold">{weekLabel}</p>
              </div>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)]"
                aria-label="Próxima semana"
              >
                <ChevronRight size={22} />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="rounded-2xl px-4 py-2.5 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Hoje
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-surface)] p-1">
              <ModeButton active={scheduleView === "grid"} onClick={() => setScheduleView("grid")} icon={<LayoutGrid size={18} />} label="Grade" />
              <ModeButton active={scheduleView === "map"} onClick={() => setScheduleView("map")} icon={<CalendarClock size={18} />} label="Livre agora" />
            </div>
          </div>

          {scheduleView === "grid" ? (
            <AdminManagedSchedule
              weekDays={weekDays}
              rooms={rooms}
              psychologists={psychologists}
              reservations={reservations}
              isDark={isDark}
              onBook={openReservation}
              onDetail={setDetailRes}
            />
          ) : (
            <AdminAvailabilityMap
              weekDays={weekDays}
              rooms={rooms}
              psychologists={psychologists}
              reservations={reservations}
              isDark={isDark}
              onBook={openReservation}
              onDetail={setDetailRes}
            />
          )}
        </section>
      )}

      {section === "management" && (
        <AdminManagement
          rooms={rooms}
          psychologists={psychologists}
          isDark={isDark}
          roomName={roomName}
          psychName={psychName}
          psychEmail={psychEmail}
          confirmDeleteRoom={confirmDeleteRoom}
          confirmDeletePsych={confirmDeletePsych}
          onRoomName={setRoomName}
          onPsychName={setPsychName}
          onPsychEmail={setPsychEmail}
          onSubmitRoom={submitRoom}
          onSubmitPsychologist={submitPsychologist}
          onDeleteRoom={deleteRoom}
          onDeletePsychologist={deletePsychologist}
          onConfirmDeleteRoom={setConfirmDeleteRoom}
          onConfirmDeletePsych={setConfirmDeletePsych}
        />
      )}

      {section === "settings" && (
        <AdminSettings
          clinic={clinic}
          billingActive={billingActive}
          onRefresh={refreshBilling}
          onCheckout={startCheckout}
          onTrial={startTrial}
          onPortal={openBillingPortal}
        />
      )}
    </AppShell>

      <NewReservationModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        prefill={prefillData}
      />
      <ReservationDetailModal
        open={!!detailRes}
        onClose={() => setDetailRes(null)}
        reservation={detailRes}
      />

      <AnimatePresence>
        {accountModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={submitAccount}
              className="w-full max-w-lg rounded-3xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-6 shadow-2xl"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
                    Conta
                  </p>
                  <h2 className="mt-2 font-brand text-3xl font-semibold">Dados de acesso</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-light)] text-[var(--text-muted)] transition hover:border-red-400 hover:text-red-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2 font-body text-sm font-bold text-[var(--text-soft)]">
                  Nome de usuario
                  <div className="relative">
                    <UserCog size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                      className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 font-body text-base font-semibold text-[var(--text-primary)] focus:border-[var(--accent-lavender)] focus:outline-none"
                    />
                  </div>
                </label>

                <label className="grid gap-2 font-body text-sm font-bold text-[var(--text-soft)]">
                  E-mail
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={accountEmail}
                      onChange={(event) => setAccountEmail(event.target.value)}
                      className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 font-body text-base font-semibold text-[var(--text-primary)] focus:border-[var(--accent-lavender)] focus:outline-none"
                    />
                  </div>
                </label>

                <label className="grid gap-2 font-body text-sm font-bold text-[var(--text-soft)]">
                  Nova senha
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(event) => setAccountPassword(event.target.value)}
                      placeholder="Deixe em branco para manter"
                      className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 font-body text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lavender)] focus:outline-none"
                    />
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="gradient" size="lg" disabled={savingAccount}>
                  {savingAccount ? "Salvando..." : "Salvar alteracoes"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => setAccountModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type WeekDay = {
  iso: string;
  num: number;
  name: string;
  isToday: boolean;
};

function AdminOverview({
  rooms,
  psychologists,
  reservations,
  isDark,
  onNew,
  onOpenSchedule,
  onOpenManagement,
  onDetail,
}: {
  rooms: Room[];
  psychologists: Psychologist[];
  reservations: Reservation[];
  isDark: boolean;
  onNew: () => void;
  onOpenSchedule: () => void;
  onOpenManagement: () => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => window.clearInterval(id);
  }, []);
  void tick;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextReservationId = reservations.find((r) => timeToMinutes(r.startTime) > nowMin)?.id;
  const todayISO = format(new Date(), "yyyy-MM-dd");

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-10 lg:py-14">
      <section className="relative overflow-hidden rounded-[2rem] premium-panel p-6 md:p-8 lg:p-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2.5 font-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-[var(--accent-sky)]">
              <span className="h-px w-8" style={{ background: "var(--aurora-gradient)" }} />
              Agendamentos do dia
            </span>
            <h2 className="mt-5 font-brand text-4xl font-semibold leading-[1.02] md:text-5xl lg:text-6xl">
              Hoje é <span className="aurora-text">{formatDateLong(todayISO)}.</span>
            </h2>
            <p className="mt-6 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg lg:leading-9">
              Tudo que precisa de atenção antes de abrir a agenda completa — sessões em andamento, próximas reservas e o espaço da clínica em tempo real.
            </p>
          </div>
          <Button variant="gradient" size="lg" onClick={onNew} className="shrink-0">
            <Plus size={22} />
            Nova Reserva
          </Button>
        </div>

        <motion.div
          className="mt-10 grid gap-4 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <MetricCard value={String(reservations.length)} label="reservas hoje" icon={<CalendarDays size={22} />} />
          <MetricCard value={String(rooms.length)} label="salas criadas" icon={<DoorOpen size={22} />} />
          <MetricCard value={String(psychologists.length)} label="profissionais" icon={<UsersRound size={22} />} />
        </motion.div>

        <div className="mt-8 grid gap-4">
          {reservations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border-medium)] p-10 text-center">
              <p className="font-brand text-2xl font-semibold">Nenhuma reserva para hoje.</p>
              <p className="mt-3 font-body text-[var(--text-muted)]">
                A agenda está livre para receber novos atendimentos.
              </p>
            </div>
          ) : (
            reservations.map((reservation) => (
              <AdminTodayReservation
                key={reservation.id}
                reservation={reservation}
                rooms={rooms}
                psychologists={psychologists}
                isDark={isDark}
                isNext={reservation.id === nextReservationId}
                onClick={() => onDetail(reservation)}
              />
            ))
          )}
        </div>
      </section>

      <aside className="grid gap-6 lg:gap-8">
        <button
          onClick={onOpenSchedule}
          className="group min-h-[220px] rounded-3xl premium-panel p-7 text-left transition hover:-translate-y-1 hover:border-[var(--accent-lavender)] md:min-h-[260px]"
        >
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--glass-soft)] text-[var(--accent-lavender)]">
            <CalendarRange size={28} />
          </div>
          <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Opção 1
          </p>
          <h3 className="mt-3 font-brand text-3xl font-semibold lg:text-4xl">Agenda completa</h3>
          <p className="mt-4 font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg">
            Grade semanal por sala e visualização rápida de horários livres.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 font-body text-sm font-extrabold text-[var(--accent-lavender)]">
            Abrir agenda
            <ChevronRight size={18} className="transition group-hover:translate-x-1" />
          </span>
        </button>

        <button
          onClick={onOpenManagement}
          className="group min-h-[220px] rounded-3xl premium-panel p-7 text-left transition hover:-translate-y-1 hover:border-[var(--accent-mint)] md:min-h-[260px]"
        >
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--glass-soft)] text-[var(--accent-mint)]">
            <BadgePlus size={28} />
          </div>
          <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Opção 2
          </p>
          <h3 className="mt-3 font-brand text-3xl font-semibold lg:text-4xl">Gerenciamento</h3>
          <p className="mt-4 font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg">
            Crie salas, cadastre psicólogas e prepare a estrutura da clínica.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 font-body text-sm font-extrabold text-[var(--accent-mint)]">
            Configurar clínica
            <ChevronRight size={18} className="transition group-hover:translate-x-1" />
          </span>
        </button>
      </aside>
    </main>
  );
}

function MetricCard({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-[1.25rem] border border-[var(--border-light)] p-5"
      style={{
        background:
          "linear-gradient(160deg, var(--glass-soft), color-mix(in srgb, var(--bg-elevated) 55%, transparent))",
      }}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl" style={{ background: "var(--aurora-gradient)" }} aria-hidden="true" />
      <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--action-foreground)] shadow-lg" style={{ background: "var(--aurora-gradient)" }}>
        {icon}
      </div>
      <p className="relative font-brand text-4xl font-semibold lg:text-5xl">{value}</p>
      <p className="relative mt-1 font-body text-sm font-bold text-[var(--text-muted)]">{label}</p>
    </motion.div>
  );
}

function AdminTodayReservation({
  reservation,
  rooms,
  psychologists,
  isDark,
  isNext,
  onClick,
}: {
  reservation: Reservation;
  rooms: Room[];
  psychologists: Psychologist[];
  isDark: boolean;
  isNext?: boolean;
  onClick: () => void;
}) {
  const room = rooms.find((item) => item.id === reservation.roomId);
  const psych = psychologists.find((item) => item.id === reservation.psychId);
  if (!room || !psych) return null;

  const roomColor = themeHex(room, isDark);
  const roomRgb = themeRgb(room, isDark);
  const psychColor = themeHex(psych, isDark);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(reservation.startTime);
  const endMin = timeToMinutes(reservation.endTime);
  const isNow = nowMin >= startMin && nowMin < endMin;
  const progress = isNow ? Math.min(1, Math.max(0, (nowMin - startMin) / Math.max(1, endMin - startMin))) : 0;

  return (
    <button
      onClick={onClick}
      className="group relative grid gap-4 overflow-hidden rounded-2xl border p-5 text-left transition hover:-translate-y-1 md:grid-cols-[120px_1fr_auto]"
      style={{
        borderColor: isNow ? psychColor : `rgba(${roomRgb},${isDark ? 0.32 : 0.24})`,
        background: `linear-gradient(135deg, rgba(${roomRgb},${isDark ? 0.14 : 0.09}), var(--glass-soft))`,
        boxShadow: isNow ? `0 14px 40px rgba(${themeRgb(psych, isDark)},${isDark ? 0.22 : 0.14})` : undefined,
      }}
    >
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: psychColor }} aria-hidden="true" />
      <div>
        <p className="font-brand text-2xl font-semibold lg:text-3xl" style={{ color: roomColor }}>
          {reservation.startTime}
        </p>
        <p className="font-body text-sm font-bold text-[var(--text-muted)]">
          até {reservation.endTime}
        </p>
        {(isNow || isNext) && (
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] font-extrabold uppercase tracking-[0.14em]"
            style={{
              color: isNow ? "#fff" : psychColor,
              background: isNow ? psychColor : "transparent",
              border: isNow ? "none" : `1px solid ${psychColor}`,
            }}
          >
            {isNow && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
            {isNow ? "Em sessão" : "A seguir"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-brand text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">{room.name}</p>
        <p className="mt-1 truncate font-body text-sm text-[var(--text-muted)] lg:text-base">
          {reservation.notes || "Atendimento reservado"}
        </p>
        <span className="mt-1 inline-block font-body text-xs font-bold" style={{ color: psychColor }}>
          {psych.shortName}
        </span>
        {isNow && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-deep)]">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: psychColor }} />
          </div>
        )}
      </div>
      <span
        className="inline-flex h-fit items-center rounded-xl border px-3 py-2 font-body text-sm font-extrabold lg:rounded-2xl lg:px-4 lg:py-3"
        style={{ color: psychColor, borderColor: psychColor }}
      >
        {psych.initials}
      </span>
    </button>
  );
}

function AdminManagedSchedule({
  weekDays,
  rooms,
  psychologists,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  weekDays: WeekDay[];
  rooms: Room[];
  psychologists: Psychologist[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (prefill: Partial<Reservation>) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const dayMinWidth = Math.max(rooms.length * ROOM_LANE_MIN_WIDTH, 280);

  return (
    <div className="rounded-3xl premium-panel p-3 md:p-4">
      <RoomLegend rooms={rooms} isDark={isDark} />
      <div className="overflow-auto rounded-2xl border border-[var(--border-light)] md:rounded-[1.5rem]">
        <div
          className="grid min-w-[900px] md:min-w-[1280px]"
          style={{
            gridTemplateColumns: `80px repeat(7, minmax(${dayMinWidth}px, 1fr))`,
            gridTemplateRows: "110px auto",
          }}
        >
          <div className="sticky left-0 top-0 z-30 flex items-end border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3">
            <span className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Horário
            </span>
          </div>

          <WeekHeader weekDays={weekDays} rooms={rooms} isDark={isDark} />
          <TimeRuler />

          {weekDays.map((dd) => (
            <DayRoomColumn
              key={dd.iso}
              day={dd}
              rooms={rooms}
              psychologists={psychologists}
              reservations={reservations.filter((r) => r.date === dd.iso)}
              isDark={isDark}
              onBook={onBook}
              onDetail={onDetail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomLegend({ rooms, isDark }: { rooms: Room[]; isDark: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 px-1 md:gap-3">
      {rooms.map((room) => (
        <div key={room.id} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] px-3 py-2">
          <span className="h-3 w-3 rounded-full" style={{ background: themeHex(room, isDark) }} />
          <span className="font-body text-sm font-bold text-[var(--text-soft)]">{room.name}</span>
        </div>
      ))}
    </div>
  );
}

function TimeRuler() {
  return (
    <div
      className="sticky left-0 z-20 relative border-r border-[var(--border-medium)] bg-[var(--bg-primary)]"
      style={{ height: BODY_HEIGHT }}
    >
      {HOURS.map((hour, index) => {
        const isHalfHour = hour.endsWith(":30");
        return (
          <div
            key={hour}
            className="absolute left-0 right-0 -translate-y-1/2 px-3 font-brand"
            style={{ top: index * SLOT_HEIGHT }}
          >
            <span className={isHalfHour ? "text-xs text-[var(--text-muted)] opacity-55" : "text-sm text-[var(--text-soft)]"}>
              {hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WeekHeader({
  weekDays,
  rooms,
  isDark,
}: {
  weekDays: WeekDay[];
  rooms: Room[];
  isDark: boolean;
}) {
  return (
    <>
      {weekDays.map((dd) => (
        <div
          key={dd.iso}
          className="border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3 text-center"
        >
          <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {dd.name}
          </p>
          <div
            className="mx-auto mt-2 flex h-10 w-10 items-center justify-center rounded-xl border font-brand text-xl font-semibold sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl"
            style={{
              background: dd.isToday ? "var(--glass-soft)" : "transparent",
              borderColor: dd.isToday ? "var(--accent-lavender)" : "transparent",
              color: dd.isToday ? "var(--accent-lavender)" : "var(--text-primary)",
            }}
          >
            {dd.num}
          </div>
          <div className="mt-2 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}>
            {rooms.map((room) => (
              <span
                key={`${dd.iso}-${room.id}`}
                className="mx-auto block h-2 w-2 rounded-full"
                style={{ background: themeHex(room, isDark), opacity: dd.isToday ? 1 : 0.62 }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function DayRoomColumn({
  day,
  rooms,
  psychologists,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  day: WeekDay;
  rooms: Room[];
  psychologists: Psychologist[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (prefill: Partial<Reservation>) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  return (
    <div
      className="relative border-r border-[var(--border-medium)]"
      style={{
        height: BODY_HEIGHT,
        background: day.isToday ? "color-mix(in srgb, var(--accent-lavender) 7%, transparent)" : "transparent",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 50px, var(--border-subtle) 50px, var(--border-subtle) 52px)",
        }}
      />
      <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(${ROOM_LANE_MIN_WIDTH}px, 1fr))` }}>
        {rooms.map((room) => {
          const roomReservations = reservations
            .filter((reservation) => reservation.roomId === room.id)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const roomRgb = themeRgb(room, isDark);

          return (
            <div
              key={`${day.iso}-${room.id}`}
              className="group relative h-full cursor-pointer border-l border-[var(--border-medium)] transition-colors hover:bg-[var(--glass-soft)]"
              style={{ background: `rgba(${roomRgb},${isDark ? 0.018 : 0.026})` }}
              onClick={(event) => {
                const slot = getNearestSlotTime(event.clientY, event.currentTarget);
                onBook({ roomId: room.id, date: day.iso, startTime: slot.startTime, endTime: slot.endTime });
              }}
            >
              <div className="absolute inset-x-2 top-2 h-8 rounded-xl border border-dashed opacity-0 transition-opacity group-hover:opacity-100" style={{ borderColor: `rgba(${roomRgb},0.35)` }} />
              {roomReservations.map((reservation) => (
                <ManagedReservationMarker
                  key={reservation.id}
                  reservation={reservation}
                  psychologists={psychologists}
                  isDark={isDark}
                  onClick={() => onDetail(reservation)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManagedReservationMarker({
  reservation,
  psychologists,
  isDark,
  onClick,
}: {
  reservation: Reservation;
  psychologists: Psychologist[];
  isDark: boolean;
  onClick: () => void;
}) {
  const psych = psychologists.find((p) => p.id === reservation.psychId);
  if (!psych) return null;

  const psychColor = themeHex(psych, isDark);
  const psychRgb = themeRgb(psych, isDark);
  const { top, height } = getReservationPosition(reservation);

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="group absolute left-1 right-1 overflow-hidden rounded-xl border p-2 text-left transition hover:z-10 hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-lavender)]/40"
      style={{
        top,
        height,
        color: psychColor,
        background: `linear-gradient(135deg, rgba(${psychRgb},${isDark ? 0.3 : 0.16}), color-mix(in srgb, var(--bg-elevated) 70%, transparent))`,
        borderColor: `rgba(${psychRgb},${isDark ? 0.6 : 0.42})`,
        boxShadow: `0 10px 28px rgba(${psychRgb},${isDark ? 0.18 : 0.1})`,
      }}
      title={`${psych.name} · ${reservation.startTime} às ${reservation.endTime}`}
    >
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: psychColor }}
        aria-hidden="true"
      />
      <span className="block truncate pl-1.5 font-brand text-sm font-bold leading-tight">{psych.shortName}</span>
      <span className="block truncate pl-1.5 font-body text-[11px] font-extrabold leading-tight text-[var(--text-soft)]">
        {reservation.startTime}–{reservation.endTime}
      </span>
    </button>
  );
}

function AdminAvailabilityMap({
  weekDays,
  rooms,
  psychologists,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  weekDays: WeekDay[];
  rooms: Room[];
  psychologists: Psychologist[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (prefill: Partial<Reservation>) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDate = new Date();
  const todayDay: WeekDay = {
    iso: today,
    num: todayDate.getDate(),
    name: WEEKDAYS[todayDate.getDay()],
    isToday: true,
  };
  const todayReservations = reservations.filter((r) => r.date === today);
  const dayMinWidth = Math.max(rooms.length * ROOM_LANE_MIN_WIDTH, 280);

  return (
    <div className="grid gap-6">
      <RoomSpatialMap
        rooms={rooms}
        reservations={reservations}
        date={today}
        psychologists={psychologists}
        onSelect={(room) => onBook({ roomId: room.id, date: today })}
      />
      <div className="rounded-3xl premium-panel p-3 md:p-4">
        <div className="mb-4 flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
              O dia nas salas
            </p>
            <h3 className="mt-1 font-brand text-2xl font-semibold md:text-3xl">
              {formatDateLong(today)}
            </h3>
            <p className="mt-1 font-body text-sm text-[var(--text-muted)] md:text-base">
              Todas as horas do dia, sala por sala. Clique num horário livre para reservar.
            </p>
          </div>
          <RoomLegend rooms={rooms} isDark={isDark} />
        </div>
        <div className="overflow-auto rounded-2xl border border-[var(--border-light)] md:rounded-[1.5rem]">
          <div
            className="grid min-w-[760px] md:min-w-[980px]"
            style={{
              gridTemplateColumns: `80px minmax(${dayMinWidth}px, 1fr)`,
              gridTemplateRows: "110px auto",
            }}
          >
            <div className="sticky left-0 top-0 z-30 flex items-end border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3">
              <span className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Horário
              </span>
            </div>
            <WeekHeader weekDays={[todayDay]} rooms={rooms} isDark={isDark} />
            <TimeRuler />
            <DayRoomColumn
              day={todayDay}
              rooms={rooms}
              psychologists={psychologists}
              reservations={todayReservations}
              isDark={isDark}
              onBook={onBook}
              onDetail={onDetail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function findFreeSlots(dayReservations: Reservation[]) {
  const slots = HOURS.slice(0, -2).map((hour) => {
    const startMinutes = timeToMinutes(hour);
    return {
      startTime: hour,
      endTime: minutesToTime(startMinutes + 60),
    };
  });

  return slots.filter((slot) => {
    return !dayReservations.some(
      (reservation) => slot.startTime < reservation.endTime && slot.endTime > reservation.startTime
    );
  });
}

function AdminManagement({
  rooms,
  psychologists,
  isDark,
  roomName,
  psychName,
  psychEmail,
  confirmDeleteRoom,
  confirmDeletePsych,
  onRoomName,
  onPsychName,
  onPsychEmail,
  onSubmitRoom,
  onSubmitPsychologist,
  onDeleteRoom,
  onDeletePsychologist,
  onConfirmDeleteRoom,
  onConfirmDeletePsych,
}: {
  rooms: Room[];
  psychologists: Psychologist[];
  isDark: boolean;
  roomName: string;
  psychName: string;
  psychEmail: string;
  confirmDeleteRoom: number | null;
  confirmDeletePsych: number | null;
  onRoomName: (value: string) => void;
  onPsychName: (value: string) => void;
  onPsychEmail: (value: string) => void;
  onSubmitRoom: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitPsychologist: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteRoom: (id: number) => Promise<void>;
  onDeletePsychologist: (id: number) => Promise<void>;
  onConfirmDeleteRoom: (id: number | null) => void;
  onConfirmDeletePsych: (id: number | null) => void;
}) {
  const inputClass = "w-full rounded-xl border border-[var(--border-medium)] bg-[var(--bg-primary)] px-4 py-3 font-body text-base text-[var(--text-primary)] outline-none transition md:rounded-2xl md:px-5 md:py-4";

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:px-10 lg:py-14">
      <section className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
        <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
          Estrutura da clínica
        </p>
        <h2 className="mt-4 font-brand text-3xl font-semibold md:text-4xl lg:text-5xl">Crie a clínica do seu jeito.</h2>
        <p className="mt-5 font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg lg:leading-9">
          Salas e profissionais são adicionados ao ambiente e passam a aparecer na agenda e nos formulários.
        </p>

        <div className="mt-10 grid gap-8">
          <form onSubmit={onSubmitRoom} className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-5 md:rounded-3xl">
            <div className="mb-5 flex items-center gap-3">
              <DoorOpen size={24} className="text-[var(--accent-mint)]" />
              <h3 className="font-brand text-xl font-semibold md:text-2xl">Nova sala</h3>
            </div>
            <input
              value={roomName}
              onChange={(event) => onRoomName(event.target.value)}
              className={inputClass}
              placeholder="Ex.: Sala Ipê, Sala Azul, Online 01"
            />
            <Button type="submit" variant="gradient" size="md" fullWidth className="mt-4">
              <Plus size={20} />
              Criar sala
            </Button>
          </form>

          <form onSubmit={onSubmitPsychologist} className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-5 md:rounded-3xl">
            <div className="mb-5 flex items-center gap-3">
              <UserRoundPlus size={24} className="text-[var(--accent-lavender)]" />
              <h3 className="font-brand text-xl font-semibold md:text-2xl">Convidar profissional</h3>
            </div>
            <p className="mb-3 font-body text-sm text-[var(--text-muted)]">
              O profissional precisa ter uma conta criada em /app antes de ser adicionado.
            </p>
            <div className="grid gap-3">
              <input
                value={psychName}
                onChange={(event) => onPsychName(event.target.value)}
                className={inputClass}
                placeholder="Ex.: Dr. Fernando, Dra. Jessica"
              />
              <input
                value={psychEmail}
                onChange={(event) => onPsychEmail(event.target.value)}
                className={inputClass}
                placeholder="Email cadastrado do profissional"
                type="email"
              />
            </div>
            <Button type="submit" variant="gradient" size="md" fullWidth className="mt-4">
              <UserRoundPlus size={20} />
              Adicionar à clínica
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:gap-8">
        <div className="rounded-3xl premium-panel p-5 md:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Salas
              </p>
              <h3 className="font-brand text-2xl font-semibold md:text-3xl">{rooms.length} ambientes</h3>
            </div>
            <CheckCircle2 size={26} className="text-[var(--accent-mint)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room) => {
              const color = themeHex(room, isDark);
              const rgb = themeRgb(room, isDark);
              const isConfirming = confirmDeleteRoom === room.id;
              return (
                <div
                  key={room.id}
                  className="group relative rounded-2xl border p-5 md:rounded-3xl"
                  style={{
                    borderColor: `rgba(${rgb},${isDark ? 0.32 : 0.24})`,
                    background: `rgba(${rgb},${isDark ? 0.1 : 0.06})`,
                  }}
                >
                  {isConfirming ? (
                    <div className="flex flex-col gap-3">
                      <p className="font-body text-sm font-bold text-[var(--state-error)]">Excluir {room.name}?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onDeleteRoom(room.id)}
                          className="flex-1 rounded-xl border border-[var(--state-error)] bg-[rgba(201,106,91,0.12)] px-3 py-2 font-body text-sm font-bold text-[var(--state-error)] transition hover:bg-[rgba(201,106,91,0.18)]"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => onConfirmDeleteRoom(null)}
                          className="flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border font-brand text-lg font-semibold md:h-12 md:w-12 md:rounded-2xl md:text-xl" style={{ color, borderColor: color }}>
                          {String(room.id).padStart(2, "0")}
                        </span>
                        <button
                          onClick={() => onConfirmDeleteRoom(room.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition hover:bg-[rgba(201,106,91,0.13)] hover:text-[var(--state-error)] group-hover:opacity-100"
                          title={`Excluir ${room.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="font-brand text-xl font-semibold md:text-2xl">{room.name}</p>
                      <p className="mt-2 font-body text-sm font-bold text-[var(--text-muted)]">Disponível para reservas</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl premium-panel p-5 md:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                Profissionais
              </p>
              <h3 className="font-brand text-2xl font-semibold md:text-3xl">{psychologists.length} contas</h3>
            </div>
            <UsersRound size={26} className="text-[var(--accent-lavender)]" />
          </div>
          <div className="grid gap-4">
            {psychologists.map((psych) => {
              const color = themeHex(psych, isDark);
              const rgb = themeRgb(psych, isDark);
              const isConfirming = confirmDeletePsych === psych.id;
              return (
                <div
                  key={psych.id}
                  className="group flex items-center gap-4 rounded-2xl border p-4 md:rounded-3xl"
                  style={{
                    borderColor: `rgba(${rgb},${isDark ? 0.32 : 0.24})`,
                    background: `rgba(${rgb},${isDark ? 0.09 : 0.055})`,
                  }}
                >
                  {isConfirming ? (
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="font-body text-sm font-bold text-[var(--state-error)]">Excluir {psych.shortName}?</p>
                      <div className="flex gap-2 sm:ml-auto">
                        <button
                          onClick={() => onDeletePsychologist(psych.id)}
                          className="rounded-xl border border-[var(--state-error)] bg-[rgba(201,106,91,0.12)] px-3 py-2 font-body text-sm font-bold text-[var(--state-error)] transition hover:bg-[rgba(201,106,91,0.18)]"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => onConfirmDeletePsych(null)}
                          className="rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-brand text-base font-semibold md:h-14 md:w-14 md:rounded-2xl md:text-lg" style={{ color, borderColor: color }}>
                        {psych.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-brand text-lg font-semibold md:text-xl">{psych.name}</p>
                        <p className="truncate font-body text-sm font-bold text-[var(--text-muted)]">{psych.email || "Acesso local configurado"}</p>
                      </div>
                      <button
                        onClick={() => onConfirmDeletePsych(psych.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition hover:bg-[rgba(201,106,91,0.13)] hover:text-[var(--state-error)] group-hover:opacity-100"
                        title={`Excluir ${psych.shortName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminSettings({
  clinic,
  billingActive,
  onRefresh,
  onCheckout,
  onTrial,
  onPortal,
}: {
  clinic: Clinic | null;
  billingActive: boolean;
  onRefresh: () => Promise<void>;
  onCheckout: (plan: PlanId, interval: "monthly" | "yearly", email?: string) => Promise<void>;
  onTrial: (email?: string) => Promise<void>;
  onPortal: () => Promise<void>;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [interval, setInterval_] = useState<"monthly" | "yearly">("monthly");

  if (!clinic) return null;

  const currentPlan = PLANS.find((p) => {
    if (!clinic.stripePriceId) return false;
    return true;
  });

  const plan = getPlanById(selectedPlan);
  const price = interval === "monthly" ? plan.monthlyLabel : plan.yearlyLabel;

  async function handleSubscribe() {
    setLoadingAction(`sub-${selectedPlan}-${interval}`);
    await onCheckout(selectedPlan, interval);
    setLoadingAction(null);
  }

  async function handleTrial() {
    setLoadingAction("trial");
    await onTrial();
    setLoadingAction(null);
  }

  async function handlePortal() {
    setLoadingAction("portal");
    await onPortal();
    setLoadingAction(null);
  }

  const statusLabel = clinic.stripeStatus === "active" ? "Ativa" :
    clinic.stripeStatus === "trialing" ? "Trial" :
    clinic.stripeStatus === "past_due" ? "Atrasada" :
    clinic.stripeStatus === "canceled" ? "Cancelada" :
    clinic.stripeStatus === "inactive" ? "Inativa" : clinic.stripeStatus;

  const statusColor = clinic.stripeStatus === "active" || clinic.stripeStatus === "trialing"
    ? "var(--accent-mint)"
    : clinic.stripeStatus === "past_due"
      ? "var(--state-error)"
      : "var(--text-muted)";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:px-6 lg:px-10 lg:py-14">
      <section className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
        <div className="mb-8 flex items-center gap-3">
          <CreditCard size={28} className="text-[var(--accent-lavender)]" />
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
              Assinatura
            </p>
            <h2 className="font-brand text-3xl font-semibold md:text-4xl">Gerencie sua assinatura</h2>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-5 md:rounded-3xl md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Status da assinatura
              </p>
              <p className="mt-2 font-brand text-2xl font-semibold" style={{ color: statusColor }}>
                {statusLabel}
              </p>
              {clinic.currentPeriodEnd && (
                <p className="mt-1 font-body text-sm font-bold text-[var(--text-muted)]">
                  Vigência até {new Date(clinic.currentPeriodEnd).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                <RefreshCw size={16} />
                Revalidar
              </button>
              {clinic.stripeCustomerId && (
                <button
                  onClick={handlePortal}
                  disabled={loadingAction === "portal"}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] disabled:opacity-60"
                >
                  <CreditCard size={16} />
                  {loadingAction === "portal" ? "Abrindo..." : "Portal Stripe"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setInterval_("monthly")}
            className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
              interval === "monthly"
                ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setInterval_("yearly")}
            className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
              interval === "yearly"
                ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Anual <span className="text-[var(--accent-mint)]">(20% off)</span>
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => {
            const isSelected = selectedPlan === p.id;
            const pPrice = interval === "monthly" ? p.monthlyLabel : p.yearlyLabel;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`relative flex flex-col rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? "border-[var(--accent-lavender)] bg-[var(--bg-elevated)] shadow-xl ring-2 ring-[var(--accent-lavender)]"
                    : "border-[var(--border-light)] bg-[var(--bg-elevated)] hover:border-[var(--accent-lavender)]"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-3 py-1 font-body text-[10px] font-extrabold text-[var(--action-foreground)]">
                    {p.badge}
                  </span>
                )}
                <h3 className="font-brand text-xl font-semibold">{p.name}</h3>
                <p className="mt-1 font-body text-xs text-[var(--text-muted)]">{p.description}</p>
                <div className="my-3">
                  <span className="font-brand text-2xl font-bold">{pPrice}</span>
                </div>
                <ul className="space-y-1 text-sm font-body text-[var(--text-soft)]">
                  <li>Até {p.maxRooms} salas</li>
                  <li>Até {p.maxDoctors} profissionais</li>
                  <li>Até {p.maxWorkspaces} {p.maxWorkspaces === 1 ? "clínica" : "clínicas"}</li>
                </ul>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="gradient"
            size="lg"
            onClick={handleSubscribe}
            disabled={loadingAction !== null}
          >
            <CreditCard size={20} />
            {loadingAction?.startsWith("sub") ? "Abrindo..." : `Assinar ${plan.name} — ${price}`}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleTrial}
            disabled={loadingAction !== null}
          >
            <Sparkles size={20} />
            {loadingAction === "trial" ? "Abrindo..." : "Testar grátis 7 dias (requer cartão)"}
          </Button>
        </div>
      </section>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-extrabold transition sm:rounded-xl sm:px-4 sm:py-3"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        background: active ? "var(--bg-primary)" : "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
