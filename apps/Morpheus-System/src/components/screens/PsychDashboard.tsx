"use client";

import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/context/AppContext";
import { HOURS, MONTHS, WEEKDAYS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import AvailabilityModal from "@/components/modals/AvailabilityModal";
import type { Psychologist, Reservation, Room } from "@/types";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  LayoutList,
  LogOut,
  Menu,
  PanelLeftOpen,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

const LibraryVinesScene = dynamic(
  () => import("@/components/visuals/MorpheusThree").then((mod) => mod.LibraryVinesScene),
  { ssr: false, loading: () => <div className="fixed inset-0 soft-grid opacity-20" /> }
);

type PsychSection = "home" | "agenda";
type RoomMode = "day" | "list";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function PsychDashboard() {
  const {
    activePsych,
    reservations,
    rooms,
    psychologists,
    setView,
    setActivePsych,
    theme,
    loading,
  } = useApp();
  const [section, setSection] = useState<PsychSection>("home");
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedRoom, setSelectedRoom] = useState<number | null>(rooms[0]?.id ?? null);
  const [roomMode, setRoomMode] = useState<RoomMode>("day");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const [prefillData, setPrefillData] = useState<Partial<Reservation>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const p = activePsych ?? psychologists[0] ?? null;
  const isDark = theme === "dark";
  const psychColor = p ? themeHex(p, isDark) : "var(--accent-lavender)";
  const psychRgb = p ? themeRgb(p, isDark) : "143,174,155";
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const selectedRoomData = selectedRoom ? rooms.find((room) => room.id === selectedRoom) : rooms[0];
  const selectedRoomColor = selectedRoomData ? themeHex(selectedRoomData, isDark) : psychColor;
  const selectedRoomRgb = selectedRoomData ? themeRgb(selectedRoomData, isDark) : psychRgb;

  const myReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.psychId === p?.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [p?.id, reservations]
  );

  const upcoming = myReservations.filter((reservation) => reservation.date >= todayISO);
  const todayMine = myReservations.filter((reservation) => reservation.date === todayISO);

  const roomReservations = useMemo(
    () =>
      selectedRoomData
        ? reservations
            .filter((reservation) => reservation.roomId === selectedRoomData.id)
            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        : [],
    [reservations, selectedRoomData]
  );

  const selectedDayRoomRes = roomReservations.filter((reservation) => reservation.date === selectedDate);
  const selectedRoomDates = new Set(roomReservations.map((reservation) => reservation.date));
  const todayLabel = formatDateLong(todayISO);
  const selectedDateFormatted = formatDateLong(selectedDate);
  const monthStart = startOfMonth(calMonth);
  const startDay = getDay(monthStart);
  const daysInMonth = endOfMonth(calMonth).getDate();

  function openReservation(prefill: Partial<Reservation> = {}) {
    if (!p) return;
    setPrefillData({
      psychId: p.id,
      date: selectedDate,
      roomId: selectedRoomData?.id,
      ...prefill,
    });
    setShowNewModal(true);
  }

  function openRoom(roomId: number) {
    setSelectedRoom(roomId);
    setSelectedDate(todayISO);
    setCalMonth(new Date());
    setRoomMode("day");
    setSection("agenda");
  }

  if (!p) return null;

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
          <LibraryVinesScene className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full opacity-55" />
          <div className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border font-brand text-lg font-semibold sm:h-14 sm:w-14 sm:rounded-2xl sm:text-xl"
                style={{
                  background: `rgba(${psychRgb},${isDark ? 0.22 : 0.12})`,
                  borderColor: `rgba(${psychRgb},${isDark ? 0.42 : 0.28})`,
                  color: psychColor,
                }}
              >
                {p.initials}
              </div>
              <div>
                <p className="font-body text-xs font-extrabold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Morpheus
                </p>
                <h1 className="font-brand text-xl font-semibold sm:text-2xl">Olá, {p.shortName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <Button size="sm" variant="gradient" onClick={() => openReservation({ date: selectedDate })}>
                <Plus size={16} />
              </Button>
              <ThemeToggle />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-soft)]"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className={`hidden flex-wrap items-center gap-2 sm:flex ${mobileMenuOpen ? "!flex w-full mt-3" : ""}`}>
              <TopAction active={section === "home"} onClick={() => { setSection("home"); setMobileMenuOpen(false); }} icon={<Sparkles size={18} />}>
                Início
              </TopAction>
              <TopAction active={section === "agenda"} onClick={() => { setSection("agenda"); setMobileMenuOpen(false); }} icon={<CalendarRange size={18} />}>
                Agenda
              </TopAction>
              <Button size="sm" variant="ghost" onClick={() => setShowAvailModal(true)}>
                <Eye size={18} />
                <span className="hidden md:inline">Disponibilidade</span>
              </Button>
              <Button size="sm" variant="gradient" onClick={() => openReservation({ date: selectedDate })}>
                <Plus size={18} />
                <span className="hidden md:inline">Nova Reserva</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView("splash");
                  setActivePsych(null);
                }}
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Sair</span>
              </Button>
            </nav>
          </div>
        </header>

        {section === "home" ? (
          <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:gap-10 lg:px-8 lg:py-12">
            <section className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
                Próximas reservas
              </p>
              <h2 className="mt-4 font-brand text-3xl font-semibold md:text-4xl lg:text-5xl">
                Sua agenda sem ruído.
              </h2>
              <p className="mt-5 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] lg:text-lg lg:leading-9">
                Hoje é {todayLabel}. Suas reservas ficam em destaque, e a agenda completa
                mostra as salas livres para reservar em poucos segundos.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Metric value={String(todayMine.length)} label="suas reservas hoje" icon={<CalendarCheck2 size={22} />} />
                <Metric value={String(upcoming.length)} label="reservas futuras" icon={<Clock size={22} />} />
                <Metric value={String(rooms.length)} label="salas disponíveis" icon={<CalendarRange size={22} />} />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant="gradient" size="lg" onClick={() => setSection("agenda")}>
                  <CalendarDays size={22} />
                  Abrir agenda
                </Button>
                <Button variant="ghost" size="lg" onClick={() => openReservation({ date: todayISO })}>
                  <Plus size={22} />
                  Nova reserva
                </Button>
              </div>

              <div className="mt-8 grid gap-4">
                {upcoming.length === 0 ? (
                  <EmptyState text="Você ainda não possui reservas futuras." />
                ) : (
                  upcoming.slice(0, 6).map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      rooms={rooms}
                      psychologists={psychologists}
                      isDark={isDark}
                      compact
                      onClick={() => setDetailRes(reservation)}
                    />
                  ))
                )}
              </div>
            </section>

            <aside className="rounded-3xl premium-panel p-6 md:p-8 lg:p-10">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-lavender)]">
                    Salas da clínica
                  </p>
                  <h3 className="mt-2 font-brand text-2xl font-semibold lg:text-3xl">Escolha uma sala</h3>
                </div>
                <span className="font-body text-sm font-bold text-[var(--text-muted)]">{rooms.length} ativas</span>
              </div>

              <div className="grid gap-4">
                {rooms.map((room) => {
                  const roomColor = themeHex(room, isDark);
                  const roomRgb = themeRgb(room, isDark);
                  const todayRes = reservations
                    .filter((reservation) => reservation.roomId === room.id && reservation.date === todayISO)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const myTodayRes = todayRes.filter((reservation) => reservation.psychId === p.id);
                  const nextRoomRes = reservations
                    .filter((reservation) => reservation.roomId === room.id && reservation.date >= todayISO)
                    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0];

                  return (
                    <button
                      key={room.id}
                      onClick={() => openRoom(room.id)}
                      className="group rounded-2xl border p-5 text-left transition hover:-translate-y-1 md:rounded-3xl"
                      style={{
                        borderColor: `rgba(${roomRgb},${isDark ? 0.32 : 0.24})`,
                        background: `linear-gradient(135deg, rgba(${roomRgb},${isDark ? 0.12 : 0.07}), var(--glass-soft))`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border font-brand text-base font-semibold sm:h-12 sm:w-12 sm:rounded-2xl sm:text-lg" style={{ color: roomColor, borderColor: roomColor }}>
                            {String(room.id).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-brand text-xl font-semibold sm:text-2xl">{room.name}</p>
                            <p className="truncate font-body text-xs font-bold text-[var(--text-muted)] sm:text-sm">
                              {myTodayRes.length
                                ? `${myTodayRes.length} reserva sua hoje`
                                : nextRoomRes
                                  ? `Próxima: ${formatShortDate(nextRoomRes.date)} às ${nextRoomRes.startTime}`
                                  : "Sem reservas futuras"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border px-2 py-1 font-body text-xs font-extrabold sm:px-3 sm:py-1.5" style={{ color: todayRes.length ? roomColor : "var(--accent-mint)", borderColor: todayRes.length ? roomColor : "var(--accent-mint)" }}>
                          {todayRes.length ? `${todayRes.length} hoje` : "Livre"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </main>
        ) : (
          <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-12">
            <aside className="rounded-3xl premium-panel p-5 md:p-6 lg:w-[380px] lg:shrink-0">
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={() => setCalMonth(subMonths(calMonth, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-muted)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)] sm:h-12 sm:w-12 sm:rounded-2xl"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-brand text-lg font-semibold sm:text-xl">
                  {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCalMonth(addMonths(calMonth, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] text-[var(--text-muted)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)] sm:h-12 sm:w-12 sm:rounded-2xl"
                  aria-label="Próximo mês"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="py-2 text-center font-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {weekday}
                  </div>
                ))}
                {Array.from({ length: startDay }).map((_, index) => (
                  <div key={`empty-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const iso = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), day), "yyyy-MM-dd");
                  const isSelected = iso === selectedDate;
                  const isToday = iso === todayISO;
                  const hasReservation = selectedRoomDates.has(iso);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(iso)}
                      className="flex aspect-square min-h-[40px] items-center justify-center rounded-xl border font-brand text-base transition sm:min-h-[48px] sm:rounded-2xl sm:text-lg"
                      style={{
                        background: isSelected
                          ? `rgba(${selectedRoomRgb},${isDark ? 0.28 : 0.16})`
                          : hasReservation
                            ? `rgba(${selectedRoomRgb},${isDark ? 0.14 : 0.09})`
                            : "transparent",
                        borderColor: isSelected
                          ? `rgba(${selectedRoomRgb},${isDark ? 0.72 : 0.46})`
                          : isToday
                            ? `rgba(${psychRgb},${isDark ? 0.42 : 0.34})`
                            : "transparent",
                        color: isSelected || hasReservation ? selectedRoomColor : "var(--text-primary)",
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[var(--border-light)] pt-6">
                <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Sala
                </p>
                <div className="mt-3 grid gap-2">
                  {rooms.map((room) => {
                    const color = themeHex(room, isDark);
                    const active = room.id === selectedRoomData?.id;
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoom(room.id)}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition sm:rounded-2xl sm:px-4 sm:py-3"
                        style={{
                          borderColor: active ? color : "var(--border-light)",
                          background: active ? "var(--bg-elevated)" : "var(--glass-soft)",
                        }}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                        <span className="font-body text-sm font-extrabold text-[var(--text-soft)]">{room.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                size="md"
                fullWidth
                variant="gradient"
                className="mt-6"
                onClick={() => openReservation({ roomId: selectedRoomData?.id, date: selectedDate })}
              >
                <CalendarDays size={20} />
                Reservar nesta data
              </Button>
            </aside>

            <section className="min-w-0 flex-1 rounded-3xl premium-panel p-5 md:p-7 lg:p-8">
              <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border font-brand text-xl font-semibold sm:h-16 sm:w-16 sm:rounded-2xl sm:text-2xl"
                    style={{ color: selectedRoomColor, borderColor: selectedRoomColor }}
                  >
                    {selectedRoomData ? String(selectedRoomData.id).padStart(2, "0") : "--"}
                  </div>
                  <div>
                    <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {selectedDateFormatted}
                    </p>
                    <h2 className="font-brand text-2xl font-semibold sm:text-3xl lg:text-4xl" style={{ color: selectedRoomColor }}>
                      {selectedRoomData?.name || "Selecione uma sala"}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-surface)] p-1 sm:rounded-2xl">
                  <ModeButton active={roomMode === "day"} onClick={() => setRoomMode("day")} icon={<CalendarRange size={18} />} label="Dia" />
                  <ModeButton active={roomMode === "list"} onClick={() => setRoomMode("list")} icon={<LayoutList size={18} />} label="Próximas" />
                </div>
              </div>

              {roomMode === "day" ? (
                <DayTimeline
                  reservations={selectedDayRoomRes}
                  activePsych={p}
                  psychologists={psychologists}
                  isDark={isDark}
                  roomRgb={selectedRoomRgb}
                  onReservationClick={setDetailRes}
                  onBook={(slot) => openReservation({ roomId: selectedRoomData?.id, date: selectedDate, ...slot })}
                />
              ) : (
                <RoomReservationList
                  reservations={roomReservations.filter((reservation) => reservation.date >= todayISO)}
                  activePsych={p}
                  psychologists={psychologists}
                  isDark={isDark}
                  onReservationClick={setDetailRes}
                />
              )}
            </section>

            <button
              onClick={() => setSection("home")}
              className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-4 py-3 font-body text-sm font-extrabold text-[var(--text-primary)] shadow-2xl transition hover:-translate-y-1 hover:border-[var(--accent-lavender)] sm:bottom-6 sm:left-6 sm:gap-3 sm:rounded-3xl sm:px-5 sm:py-4"
            >
              <PanelLeftOpen size={20} />
              <span className="hidden sm:inline">Ver início</span>
            </button>
          </main>
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
      <AvailabilityModal open={showAvailModal} onClose={() => setShowAvailModal(false)} />
    </div>
  );
}

function TopAction({
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
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 font-body text-sm font-extrabold transition sm:rounded-2xl sm:px-4"
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

function Metric({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4 sm:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-primary)] text-[var(--accent-lavender)] sm:h-11 sm:w-11">
        {icon}
      </div>
      <p className="font-brand text-3xl font-semibold lg:text-4xl">{value}</p>
      <p className="mt-1 font-body text-sm font-bold text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function DayTimeline({
  reservations,
  activePsych,
  psychologists,
  isDark,
  roomRgb,
  onReservationClick,
  onBook,
}: {
  reservations: Reservation[];
  activePsych: Psychologist;
  psychologists: Psychologist[];
  isDark: boolean;
  roomRgb: string;
  onReservationClick: (reservation: Reservation) => void;
  onBook: (slot: { startTime: string; endTime: string }) => void;
}) {
  return (
    <div className="grid gap-3 md:gap-2">
      {HOURS.slice(0, -1).map((hour) => {
        const reservation = reservations.find((item) => hour >= item.startTime && hour < item.endTime);
        const isStart = reservation?.startTime === hour;
        if (reservation && !isStart) return null;

        if (reservation) {
          const psych = psychologists.find((item) => item.id === reservation.psychId);
          const isMine = reservation.psychId === activePsych.id;
          const color = psych ? themeHex(psych, isDark) : "var(--text-primary)";
          const rgb = psych ? themeRgb(psych, isDark) : roomRgb;

          return (
            <button
              key={hour}
              onClick={() => onReservationClick(reservation)}
              className="grid gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-1 md:grid-cols-[90px_1fr_auto] md:gap-4 md:p-5 md:rounded-3xl"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb},${isMine ? 0.22 : 0.1}), var(--glass-soft))`,
                borderColor: isMine ? color : `rgba(${rgb},${isDark ? 0.3 : 0.22})`,
              }}
            >
              <div>
                <p className="font-brand text-xl font-semibold md:text-2xl">{reservation.startTime}</p>
                <p className="font-body text-sm font-bold text-[var(--text-muted)]">até {reservation.endTime}</p>
              </div>
              <div className="min-w-0">
                <p className="font-brand text-xl font-semibold md:text-2xl" style={{ color }}>
                  {psych?.shortName || "Reservado"}
                </p>
                <p className="truncate font-body text-sm text-[var(--text-muted)] md:text-base">
                  {reservation.notes || (isMine ? "Sua reserva" : "Horário ocupado")}
                </p>
              </div>
              <span className="inline-flex items-center rounded-xl border px-3 py-2 font-body text-xs font-extrabold md:rounded-2xl" style={{ color, borderColor: color }}>
                {isMine ? "Sua reserva" : "Ocupado"}
              </span>
            </button>
          );
        }

        const startMinutes = timeToMinutes(hour);
        const endTime = minutesToTime(
          Math.min(startMinutes + 60, timeToMinutes(HOURS[HOURS.length - 1]))
        );
        return (
          <button
            key={hour}
            onClick={() => onBook({ startTime: hour, endTime })}
            className="grid gap-3 rounded-2xl border border-dashed border-[var(--border-light)] bg-[var(--glass-soft)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--accent-mint)] md:grid-cols-[90px_1fr_auto] md:gap-4 md:rounded-3xl"
          >
            <span className="font-brand text-lg font-semibold text-[var(--text-muted)] md:text-xl">{hour}</span>
            <span className="font-body text-sm font-bold text-[var(--accent-mint)] md:text-base">Livre para reservar</span>
            <Plus size={18} className="text-[var(--accent-mint)] md:hidden" />
          </button>
        );
      })}
    </div>
  );
}

function RoomReservationList({
  reservations,
  activePsych,
  psychologists,
  isDark,
  onReservationClick,
}: {
  reservations: Reservation[];
  activePsych: Psychologist;
  psychologists: Psychologist[];
  isDark: boolean;
  onReservationClick: (reservation: Reservation) => void;
}) {
  if (reservations.length === 0) {
    return <EmptyState text="Esta sala não possui reservas futuras." />;
  }

  const groups = reservations.reduce<Record<string, Reservation[]>>((acc, reservation) => {
    if (!acc[reservation.date]) acc[reservation.date] = [];
    acc[reservation.date].push(reservation);
    return acc;
  }, {});

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Object.entries(groups).map(([date, dayReservations]) => (
        <div key={date} className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-5 md:rounded-3xl">
          <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {formatDateLong(date)}
          </p>
          <div className="mt-4 grid gap-3">
            {dayReservations.map((reservation) => {
              const psych = psychologists.find((item) => item.id === reservation.psychId);
              const isMine = reservation.psychId === activePsych.id;
              const color = psych ? themeHex(psych, isDark) : "var(--text-primary)";
              const rgb = psych ? themeRgb(psych, isDark) : "143,174,155";

              return (
                <button
                  key={reservation.id}
                  onClick={() => onReservationClick(reservation)}
                  className="flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition hover:-translate-y-0.5 md:gap-4 md:rounded-2xl md:px-4 md:py-4"
                  style={{
                    background: `rgba(${rgb},${isMine ? 0.16 : 0.07})`,
                    borderColor: isMine ? color : `rgba(${rgb},${isDark ? 0.24 : 0.18})`,
                  }}
                >
                  <Clock size={18} style={{ color }} />
                  <span className="font-brand text-base font-semibold text-[var(--text-primary)] md:text-lg">
                    {reservation.startTime} - {reservation.endTime}
                  </span>
                  <span className="ml-auto truncate font-body text-sm font-extrabold" style={{ color }}>
                    {psych?.initials || "R"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReservationCard({
  reservation,
  rooms,
  psychologists,
  isDark,
  compact = false,
  onClick,
}: {
  reservation: Reservation;
  rooms: Room[];
  psychologists: Psychologist[];
  isDark: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const room = rooms.find((item) => item.id === reservation.roomId);
  const psych = psychologists.find((item) => item.id === reservation.psychId);
  if (!room) return null;

  const roomColor = themeHex(room, isDark);
  const roomRgb = themeRgb(room, isDark);
  const psychColor = psych ? themeHex(psych, isDark) : roomColor;

  return (
    <button
      onClick={onClick}
      className={`grid w-full gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-1 md:grid-cols-[85px_1fr_auto] md:gap-4 md:p-5 md:rounded-3xl ${
        compact ? "min-h-[90px]" : "min-h-[120px]"
      }`}
      style={{
        background: `linear-gradient(135deg, rgba(${roomRgb},${isDark ? 0.12 : 0.07}), var(--glass-soft))`,
        borderColor: `rgba(${roomRgb},${isDark ? 0.32 : 0.24})`,
      }}
    >
      <div>
        <p className="font-brand text-xl font-semibold md:text-2xl" style={{ color: roomColor }}>
          {reservation.startTime}
        </p>
        <p className="font-body text-sm font-bold text-[var(--text-muted)]">até {reservation.endTime}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-brand text-xl font-semibold text-[var(--text-primary)] md:text-2xl">{room.name}</p>
        <p className="truncate font-body text-sm text-[var(--text-muted)] md:text-base">
          {formatShortDate(reservation.date)}
          {reservation.notes ? ` · ${reservation.notes}` : ""}
        </p>
      </div>
      <span className="inline-flex items-center rounded-xl border px-3 py-2 font-body text-xs font-extrabold md:rounded-2xl" style={{ color: psychColor, borderColor: psychColor }}>
        {psych?.shortName || "Reservado"}
      </span>
    </button>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-medium)] p-8 text-center md:rounded-3xl">
      <p className="font-brand text-xl font-semibold text-[var(--text-primary)] md:text-2xl">{text}</p>
      <p className="mt-3 font-body text-sm text-[var(--text-muted)] md:text-base">
        Quando uma reserva for criada, ela aparecerá aqui.
      </p>
    </div>
  );
}

function formatDateLong(date: string) {
  return parseISO(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(date: string) {
  return parseISO(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
