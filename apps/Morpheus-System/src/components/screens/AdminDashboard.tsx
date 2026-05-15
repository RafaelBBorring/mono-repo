"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { HOURS, MONTHS, WEEKDAYS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import type { Psychologist, Reservation, Room } from "@/types";
import type { Clinic } from "@/lib/auth";
import type { PlanId } from "@/lib/plans";
import { PLANS, getPlanById } from "@/lib/plans";
import {
  BadgePlus,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DoorOpen,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Trash2,
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

const LibraryVinesScene = dynamic(
  () => import("@/components/visuals/MorpheusThree").then((mod) => mod.LibraryVinesScene),
  { ssr: false, loading: () => <div className="fixed inset-0 soft-grid opacity-20" /> }
);

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="morpheus-screen-wash fixed inset-0 z-0" />

      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-40 overflow-hidden border-b border-[var(--border-light)] bg-[var(--glass-strong)] backdrop-blur-2xl">
          <LibraryVinesScene className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full opacity-70" />
          <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--action-primary)] text-[var(--action-foreground)] shadow-xl sm:h-12 sm:w-12 sm:rounded-2xl">
                <BookOpen size={20} />
              </span>
              <div className="hidden sm:block">
                <p className="font-body text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Biblioteca operacional
                </p>
                <p className="font-body text-sm font-bold text-[var(--text-soft)]">
                  {formatDateLong(todayISO)}
                </p>
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center lg:block">
              <h1 className="font-brand text-2xl font-semibold tracking-[0.28em] aurora-text xl:text-3xl">
                MORPHEUS
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--accent-lavender)] sm:inline-flex sm:px-4 sm:py-3">
                <Shield size={18} />
                Admin
              </span>
              <Button variant="ghost" size="sm" onClick={() => setView("workspace")}>
                <Building2 size={18} />
                <span className="hidden sm:inline">Clínicas</span>
              </Button>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => setView("splash")}>
                <LogOut size={18} />
                <span className="hidden sm:inline">Sair</span>
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)] sm:hidden"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <nav className={`relative z-10 mx-auto max-w-7xl px-4 pb-3 sm:px-6 sm:pb-4 ${mobileMenuOpen ? "block" : "hidden"} sm:block`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:overflow-x-auto">
              <AdminNavButton active={section === "overview"} onClick={() => { setSection("overview"); setMobileMenuOpen(false); }} icon={<Sparkles size={18} />}>
                Hoje
              </AdminNavButton>
              <AdminNavButton active={section === "schedule"} onClick={() => { setSection("schedule"); setMobileMenuOpen(false); }} icon={<CalendarRange size={18} />}>
                Agenda completa
              </AdminNavButton>
              <AdminNavButton active={section === "management"} onClick={() => { setSection("management"); setMobileMenuOpen(false); }} icon={<UsersRound size={18} />}>
                Gerenciamento
              </AdminNavButton>
              <AdminNavButton active={section === "settings"} onClick={() => { setSection("settings"); setMobileMenuOpen(false); }} icon={<Settings size={18} />}>
                Plano & Cobrança
              </AdminNavButton>
            </div>
          </nav>
        </header>

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
          <section className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl premium-panel p-5 md:flex-row md:items-center lg:p-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)] sm:h-12 sm:w-12 sm:rounded-2xl"
                  aria-label="Semana anterior"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="min-w-[160px] text-center sm:min-w-[190px]">
                  <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Semana
                  </p>
                  <p className="font-brand text-xl font-semibold sm:text-2xl">{weekLabel}</p>
                </div>
                <button
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)] sm:h-12 sm:w-12 sm:rounded-2xl"
                  aria-label="Próxima semana"
                >
                  <ChevronRight size={22} />
                </button>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="rounded-xl px-3 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)] sm:rounded-2xl sm:px-4 sm:py-3"
                  >
                    Hoje
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="md"
                  onClick={() => openReservation({})}
                  variant="gradient"
                >
                  <Plus size={20} />
                  Nova Reserva
                </Button>
                <div className="flex items-center gap-1 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] p-1 sm:rounded-2xl">
                  <ModeButton active={scheduleView === "grid"} onClick={() => setScheduleView("grid")} icon={<LayoutGrid size={18} />} label="Grade" />
                  <ModeButton active={scheduleView === "map"} onClick={() => setScheduleView("map")} icon={<CalendarClock size={18} />} label="Livre agora" />
                </div>
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
      </div>

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
    </div>
  );
}

type WeekDay = {
  iso: string;
  num: number;
  name: string;
  isToday: boolean;
};

function AdminNavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-4 py-2 font-body text-sm font-extrabold transition sm:w-auto sm:rounded-2xl"
      style={{
        borderColor: active ? "var(--accent-lavender)" : "var(--border-light)",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        background: active ? "var(--bg-elevated)" : "var(--glass-soft)",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

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
  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8 lg:py-12">
      <section className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
              Agendamentos do dia
            </p>
            <h2 className="mt-4 font-brand text-3xl font-semibold md:text-4xl lg:text-5xl">
              Resumo simples e direto.
            </h2>
            <p className="mt-5 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg lg:leading-9">
              Tudo que precisa chamar atenção hoje aparece aqui antes de abrir a agenda completa.
            </p>
          </div>
          <Button variant="gradient" size="lg" onClick={onNew} className="shrink-0">
            <Plus size={22} />
            Nova Reserva
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <MetricCard value={String(reservations.length)} label="reservas hoje" icon={<CalendarDays size={22} />} />
          <MetricCard value={String(rooms.length)} label="salas criadas" icon={<DoorOpen size={22} />} />
          <MetricCard value={String(psychologists.length)} label="profissionais" icon={<UsersRound size={22} />} />
        </div>

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
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-primary)] text-[var(--accent-lavender)]">
        {icon}
      </div>
      <p className="font-brand text-3xl font-semibold lg:text-4xl">{value}</p>
      <p className="mt-1 font-body text-sm font-bold text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function AdminTodayReservation({
  reservation,
  rooms,
  psychologists,
  isDark,
  onClick,
}: {
  reservation: Reservation;
  rooms: Room[];
  psychologists: Psychologist[];
  isDark: boolean;
  onClick: () => void;
}) {
  const room = rooms.find((item) => item.id === reservation.roomId);
  const psych = psychologists.find((item) => item.id === reservation.psychId);
  if (!room || !psych) return null;

  const roomColor = themeHex(room, isDark);
  const roomRgb = themeRgb(room, isDark);
  const psychColor = themeHex(psych, isDark);

  return (
    <button
      onClick={onClick}
      className="grid gap-4 rounded-2xl border p-5 text-left transition hover:-translate-y-1 md:grid-cols-[110px_1fr_auto]"
      style={{
        borderColor: `rgba(${roomRgb},${isDark ? 0.32 : 0.24})`,
        background: `linear-gradient(135deg, rgba(${roomRgb},${isDark ? 0.13 : 0.08}), var(--glass-soft))`,
      }}
    >
      <div>
        <p className="font-brand text-2xl font-semibold lg:text-3xl" style={{ color: roomColor }}>
          {reservation.startTime}
        </p>
        <p className="font-body text-sm font-bold text-[var(--text-muted)]">
          até {reservation.endTime}
        </p>
      </div>
      <div className="min-w-0">
        <p className="font-brand text-xl font-semibold text-[var(--text-primary)] lg:text-2xl">{room.name}</p>
        <p className="mt-1 truncate font-body text-sm text-[var(--text-muted)] lg:text-base">
          {reservation.notes || "Atendimento reservado"}
        </p>
      </div>
      <span className="inline-flex items-center rounded-xl border px-3 py-2 font-body text-sm font-extrabold lg:rounded-2xl lg:px-4 lg:py-3" style={{ color: psychColor, borderColor: psychColor }}>
        {psych.shortName}
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
        background: day.isToday ? "rgba(216,200,252,0.055)" : "rgba(255,255,255,0.015)",
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
      className="absolute left-2 right-2 overflow-hidden rounded-xl border p-2 text-left transition hover:z-10 hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-lavender)]/40"
      style={{
        top,
        height,
        color: psychColor,
        background: `rgba(${psychRgb},${isDark ? 0.25 : 0.14})`,
        borderColor: `rgba(${psychRgb},${isDark ? 0.55 : 0.38})`,
        boxShadow: `0 10px 28px rgba(${psychRgb},${isDark ? 0.16 : 0.1})`,
      }}
      title={`${psych.name} - ${reservation.startTime} às ${reservation.endTime}`}
    >
      <span className="block truncate font-brand text-sm font-bold leading-tight">{psych.initials}</span>
      <span className="block truncate font-body text-xs font-extrabold leading-tight text-[var(--text-soft)]">
        {reservation.startTime}
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
  return (
    <div className="rounded-3xl premium-panel p-3 md:p-4">
      <div className="mb-5 flex flex-col gap-2 px-2">
        <p className="font-body text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--accent-mint)]">
          Mapa de disponibilidade
        </p>
        <p className="font-body text-sm text-[var(--text-muted)] md:text-base">
          Cada bloco mostra os primeiros horários livres de 1 hora. Clique em um horário para reservar.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-light)] md:rounded-[1.5rem]">
        <div className="grid min-w-[900px] md:min-w-[1180px]" style={{ gridTemplateColumns: "160px repeat(7, minmax(130px, 1fr))" }}>
          <div className="sticky left-0 z-20 border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3 font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)] md:p-4">
            Sala
          </div>
          {weekDays.map((day) => (
            <div key={day.iso} className="border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3 text-center md:p-4">
              <p className="font-body text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">{day.name}</p>
              <p className="font-brand text-xl font-semibold md:text-2xl">{day.num}</p>
            </div>
          ))}

          {rooms.map((room) => {
            const roomColor = themeHex(room, isDark);
            return (
              <div key={room.id} className="contents">
                <div className="sticky left-0 z-10 flex min-h-[140px] items-center gap-2 border-b border-r border-[var(--border-medium)] bg-[var(--bg-primary)] p-3 md:min-h-[150px] md:gap-3 md:p-4">
                  <span className="h-3.5 w-3.5 rounded-full md:h-4 md:w-4" style={{ background: roomColor }} />
                  <span className="font-brand text-base font-semibold md:text-xl">{room.name}</span>
                </div>
                {weekDays.map((day) => {
                  const dayReservations = reservations
                    .filter((reservation) => reservation.roomId === room.id && reservation.date === day.iso)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const freeSlots = findFreeSlots(dayReservations).slice(0, 4);
                  const roomRgb = themeRgb(room, isDark);

                  return (
                    <div
                      key={`${room.id}-${day.iso}`}
                      className="min-h-[140px] border-b border-r border-[var(--border-medium)] p-2 md:min-h-[150px] md:p-3"
                      style={{ background: day.isToday ? `rgba(${roomRgb},0.07)` : "rgba(255,255,255,0.012)" }}
                    >
                      {freeSlots.length > 0 ? (
                        <div className="grid gap-1.5 md:gap-2">
                          {freeSlots.map((slot) => (
                            <button
                              key={`${slot.startTime}-${slot.endTime}`}
                              onClick={() => onBook({ roomId: room.id, date: day.iso, startTime: slot.startTime, endTime: slot.endTime })}
                              className="rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] px-2 py-1.5 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent-mint)] md:rounded-2xl md:px-3 md:py-2"
                            >
                              <span className="block font-brand text-base font-semibold text-[var(--accent-mint)] md:text-lg">
                                {slot.startTime}
                              </span>
                              <span className="font-body text-xs font-bold text-[var(--text-muted)]">
                                livre até {slot.endTime}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[110px] items-center justify-center rounded-xl border border-dashed border-[var(--border-light)] text-center md:rounded-2xl md:min-h-[120px]">
                          <span className="font-body text-xs font-bold text-[var(--text-muted)] md:text-sm">Sem janelas livres</span>
                        </div>
                      )}
                      {dayReservations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 md:mt-3 md:gap-1.5">
                          {dayReservations.slice(0, 3).map((reservation) => {
                            const psych = psychologists.find((item) => item.id === reservation.psychId);
                            if (!psych) return null;
                            const color = themeHex(psych, isDark);
                            return (
                              <button
                                key={reservation.id}
                                onClick={() => onDetail(reservation)}
                                className="rounded-full border px-2 py-1 font-body text-[10px] font-extrabold md:text-[11px]"
                                style={{ color, borderColor: color }}
                              >
                                {psych.initials}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
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
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:px-8 lg:py-12">
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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
        <div className="mb-8 flex items-center gap-3">
          <CreditCard size={28} className="text-[var(--accent-lavender)]" />
          <div>
            <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
              Plano & Cobrança
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
