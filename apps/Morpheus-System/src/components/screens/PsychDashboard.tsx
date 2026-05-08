"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { ROOMS, PSYCHOLOGISTS, MONTHS, WEEKDAYS, HOURS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import AvailabilityModal from "@/components/modals/AvailabilityModal";
import { useGsapFadeIn } from "@/lib/gsap";
import type { Reservation } from "@/types";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  LayoutList,
  LogOut,
  PanelLeftOpen,
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

type RoomMode = "day" | "list";

export default function PsychDashboard() {
  const { activePsych, reservations, setView, setActivePsych, theme } = useApp();
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [roomMode, setRoomMode] = useState<RoomMode>("day");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const headerRef = useGsapFadeIn();

  const p = activePsych ?? PSYCHOLOGISTS[0];
  const isDark = theme === "dark";
  const psychColor = themeHex(p, isDark);
  const psychRgb = themeRgb(p, isDark);
  const todayISO = format(new Date(), "yyyy-MM-dd");

  const myReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.psychId === p.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [reservations, p.id]
  );

  const upcoming = myReservations.filter((r) => r.date >= todayISO);
  const todayMine = myReservations.filter((r) => r.date === todayISO);
  const selectedRoomData = selectedRoom
    ? ROOMS.find((r) => r.id === selectedRoom)
    : null;
  const selectedRoomColor = selectedRoomData ? themeHex(selectedRoomData, isDark) : psychColor;
  const selectedRoomRgb = selectedRoomData ? themeRgb(selectedRoomData, isDark) : psychRgb;

  const roomReservations = useMemo(
    () =>
      selectedRoom
        ? reservations
            .filter((r) => r.roomId === selectedRoom)
            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
        : [],
    [reservations, selectedRoom]
  );

  const selectedDayRoomRes = roomReservations.filter((r) => r.date === selectedDate);
  const selectedRoomDates = new Set(roomReservations.map((r) => r.date));
  const selectedDateFormatted = formatDateLong(selectedDate);
  const todayLabel = formatDateLong(todayISO);

  const monthStart = startOfMonth(calMonth);
  const startDay = getDay(monthStart);
  const daysInMonth = endOfMonth(calMonth).getDate();

  function getRoomReservationsForDate(roomId: number, date: string) {
    return reservations
      .filter((r) => r.roomId === roomId && r.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function openRoom(roomId: number) {
    setSelectedRoom(roomId);
    setRoomMode("day");
    setSelectedDate(todayISO);
    setCalMonth(new Date());
  }

  function reserveInContext(roomId?: number, date?: string) {
    if (roomId) setSelectedRoom(roomId);
    if (date) setSelectedDate(date);
    setShowNewModal(true);
  }

  if (!activePsych) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header
        ref={headerRef}
        className="p-4 md:p-5 flex flex-wrap justify-between items-center gap-4 border-b border-[var(--border-subtle)] flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-body text-base font-bold flex-shrink-0"
            style={{
              background: `rgba(${psychRgb},${isDark ? 0.2 : 0.09})`,
              border: `1px solid rgba(${psychRgb},${isDark ? 0.36 : 0.22})`,
              color: psychColor,
            }}
          >
            {p.initials}
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl text-[var(--text-primary)] font-light">
              Olá, {p.shortName}
            </h1>
            <p
              className="font-body text-sm"
              style={{ color: `rgba(${psychRgb},${isDark ? 0.58 : 0.82})` }}
            >
              {upcoming.length} consulta{upcoming.length !== 1 ? "s" : ""} agendada{upcoming.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            colorRgb={psychRgb}
            onClick={() => setShowAvailModal(true)}
          >
            <Eye size={16} />
            Disponibilidade
          </Button>
          <Button
            size="sm"
            colorRgb={psychRgb}
            onClick={() => reserveInContext(selectedRoom ?? undefined, selectedDate)}
            className="!text-white !border-0 !font-bold !shadow-lg"
            style={{
              backgroundImage: isDark
                ? `linear-gradient(to right, ${psychColor}, var(--accent-sky))`
                : "linear-gradient(to right, #241f1b, #3f342c)",
            }}
          >
            <CalendarDays size={16} />
            Nova Reserva
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
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {!selectedRoomData ? (
          <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
            <section className="mb-7">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <p className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase mb-1">
                    Salas
                  </p>
                  <h2 className="font-display text-2xl md:text-3xl font-light">
                    Escolha a sala para ver a agenda
                  </h2>
                </div>
                <span className="hidden sm:inline font-body text-sm text-[var(--text-muted)] capitalize">
                  {todayLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {ROOMS.map((room) => {
                  const roomColor = themeHex(room, isDark);
                  const roomRgb = themeRgb(room, isDark);
                  const todayRes = getRoomReservationsForDate(room.id, todayISO);
                  const myTodayRes = todayRes.filter((r) => r.psychId === p.id);
                  const nextRoomRes = reservations
                    .filter((r) => r.roomId === room.id && r.date >= todayISO)
                    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0];

                  return (
                    <button
                      key={room.id}
                      onClick={() => openRoom(room.id)}
                      className="relative p-4 rounded-2xl text-left transition-all duration-300 cursor-pointer min-h-[148px]"
                      style={{
                        border: `1px solid rgba(${roomRgb},${isDark ? 0.22 : 0.18})`,
                        background: `linear-gradient(180deg, rgba(${roomRgb},${isDark ? 0.09 : 0.06}), rgba(${roomRgb},${isDark ? 0.035 : 0.025}))`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.borderColor = `rgba(${roomRgb},${isDark ? 0.44 : 0.34})`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.borderColor = `rgba(${roomRgb},${isDark ? 0.22 : 0.18})`;
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-body font-bold"
                          style={{
                            color: roomColor,
                            background: `rgba(${roomRgb},${isDark ? 0.14 : 0.08})`,
                          }}
                        >
                          {String(room.id).padStart(2, "0")}
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-xs"
                          style={{
                            color: todayRes.length ? roomColor : "var(--accent-mint)",
                            background: `rgba(${todayRes.length ? roomRgb : "110,231,183"},${isDark ? 0.1 : 0.08})`,
                            border: `1px solid rgba(${todayRes.length ? roomRgb : "110,231,183"},${isDark ? 0.18 : 0.16})`,
                          }}
                        >
                          {todayRes.length ? `${todayRes.length} hoje` : "Livre hoje"}
                        </span>
                      </div>
                      <h3 className="font-body text-xl font-semibold text-[var(--text-primary)] mb-1">
                        {room.name}
                      </h3>
                      <p className="font-body text-sm text-[var(--text-muted)]">
                        {myTodayRes.length
                          ? `${myTodayRes.length} reserva sua hoje`
                          : nextRoomRes
                            ? `Próxima: ${formatShortDate(nextRoomRes.date)} às ${nextRoomRes.startTime}`
                            : "Sem reservas futuras"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase mb-1">
                      Agenda de hoje
                    </p>
                    <h2 className="font-display text-2xl font-light capitalize">
                      {todayLabel}
                    </h2>
                  </div>
                  <Button size="sm" colorRgb={psychRgb} onClick={() => reserveInContext(undefined, todayISO)}>
                    <CalendarDays size={16} />
                    Agendar
                  </Button>
                </div>

                {todayMine.length === 0 ? (
                  <EmptyState text="Nenhuma reserva sua para hoje." />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {todayMine.map((r) => (
                      <ReservationCard
                        key={r.id}
                        reservation={r}
                        isDark={isDark}
                        onClick={() => setDetailRes(r)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 md:p-5">
                <p className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase mb-4">
                  Próximas reservas
                </p>
                {upcoming.length === 0 ? (
                  <EmptyState text="Sem consultas agendadas." compact />
                ) : (
                  <div className="flex flex-col gap-2">
                    {upcoming.slice(0, 5).map((r) => (
                      <ReservationCard
                        key={r.id}
                        reservation={r}
                        isDark={isDark}
                        compact
                        onClick={() => setDetailRes(r)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-86px)]">
            <aside className="lg:w-[390px] border-r border-[var(--border-subtle)] p-4 md:p-5 overflow-y-auto flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setCalMonth(subMonths(calMonth, 1))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-body text-base text-[var(--text-primary)] font-medium">
                  {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                </span>
                <button
                  onClick={() => setCalMonth(addMonths(calMonth, 1))}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
                  aria-label="Próximo mês"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w) => (
                  <div
                    key={w}
                    className="text-center font-body text-xs text-[var(--text-muted)] py-1"
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const iso = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), day), "yyyy-MM-dd");
                  const isSelected = iso === selectedDate;
                  const isToday = iso === todayISO;
                  const hasReservation = selectedRoomDates.has(iso);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(iso)}
                      className="aspect-square flex items-center justify-center rounded-lg cursor-pointer relative transition-all text-base font-body"
                      style={{
                        background: isSelected
                          ? `rgba(${selectedRoomRgb},${isDark ? 0.28 : 0.16})`
                          : hasReservation
                            ? `rgba(${selectedRoomRgb},${isDark ? 0.18 : 0.1})`
                            : "transparent",
                        border: isSelected
                          ? `1px solid rgba(${selectedRoomRgb},${isDark ? 0.64 : 0.44})`
                          : hasReservation
                            ? `1px solid rgba(${selectedRoomRgb},${isDark ? 0.3 : 0.22})`
                            : isToday
                              ? `1px solid rgba(${psychRgb},${isDark ? 0.28 : 0.3})`
                              : "1px solid transparent",
                        color: isSelected || hasReservation ? selectedRoomColor : "var(--text-primary)",
                        fontWeight: isSelected || isToday || hasReservation ? 700 : 300,
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
                <p className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase mb-2">
                  Data selecionada
                </p>
                <p className="font-body text-base text-[var(--text-primary)] capitalize mb-4">
                  {selectedDateFormatted}
                </p>
                <Button
                  size="sm"
                  colorRgb={selectedRoomRgb}
                  className="w-full"
                  onClick={() => reserveInContext(selectedRoomData.id, selectedDate)}
                >
                  <CalendarDays size={16} />
                  Reservar nesta data
                </Button>
              </div>
            </aside>

            <section className="flex-1 p-4 md:p-6 overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-body font-bold"
                      style={{
                        color: selectedRoomColor,
                        background: `rgba(${selectedRoomRgb},${isDark ? 0.14 : 0.08})`,
                        border: `1px solid rgba(${selectedRoomRgb},${isDark ? 0.24 : 0.16})`,
                      }}
                    >
                      {String(selectedRoomData.id).padStart(2, "0")}
                    </div>
                    <div>
                      <h2
                        className="font-display text-3xl font-light"
                        style={{ color: selectedRoomColor }}
                      >
                        {selectedRoomData.name}
                      </h2>
                      <p className="font-body text-sm text-[var(--text-muted)] capitalize">
                        {selectedDateFormatted}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] p-1 bg-[var(--bg-surface)]">
                  <ModeButton
                    active={roomMode === "day"}
                    onClick={() => setRoomMode("day")}
                    icon={<CalendarRange size={15} />}
                    label="Dia"
                  />
                  <ModeButton
                    active={roomMode === "list"}
                    onClick={() => setRoomMode("list")}
                    icon={<LayoutList size={15} />}
                    label="Próximas"
                  />
                </div>
              </div>

              {roomMode === "day" ? (
                <DayTimeline
                  reservations={selectedDayRoomRes}
                  isDark={isDark}
                  roomRgb={selectedRoomRgb}
                  onReservationClick={setDetailRes}
                />
              ) : (
                <RoomReservationList
                  reservations={roomReservations.filter((r) => r.date >= todayISO)}
                  isDark={isDark}
                  onReservationClick={setDetailRes}
                />
              )}
            </section>

            <button
              onClick={() => setSelectedRoom(null)}
              className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-body text-sm font-bold shadow-2xl transition-all hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lavender)]"
              style={{
                color: isDark ? "var(--text-primary)" : "#ffffff",
                background: isDark
                  ? "rgba(18,14,35,0.96)"
                  : "linear-gradient(135deg, #241f1b, #3f342c)",
                border: isDark
                  ? "1px solid var(--border-medium)"
                  : "1px solid rgba(36,31,27,0.2)",
              }}
            >
              <PanelLeftOpen size={18} />
              Ver salas
            </button>
          </div>
        )}
      </main>

      <NewReservationModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        prefill={{
          psychId: p.id,
          date: selectedDate,
          roomId: selectedRoom ?? undefined,
        }}
      />
      <ReservationDetailModal
        open={!!detailRes}
        onClose={() => setDetailRes(null)}
        reservation={detailRes}
      />
      <AvailabilityModal
        open={showAvailModal}
        onClose={() => setShowAvailModal(false)}
      />
    </div>
  );
}

function DayTimeline({
  reservations,
  isDark,
  roomRgb,
  onReservationClick,
}: {
  reservations: Reservation[];
  isDark: boolean;
  roomRgb: string;
  onReservationClick: (reservation: Reservation) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 md:p-5">
      <div className="flex flex-col gap-1">
        {HOURS.map((hour) => {
          const resHere = reservations.find(
            (r) => hour >= r.startTime && hour < r.endTime
          );
          const isStart = resHere?.startTime === hour;

          if (resHere && !isStart) return null;

          if (isStart && resHere) {
            const psych = PSYCHOLOGISTS.find((ps) => ps.id === resHere.psychId);
            const color = psych ? themeHex(psych, isDark) : "var(--text-primary)";
            const rgb = psych ? themeRgb(psych, isDark) : roomRgb;

            return (
              <button
                key={hour}
                onClick={() => onReservationClick(resHere)}
                className="grid grid-cols-[72px_1fr] gap-3 p-3 md:p-4 rounded-xl cursor-pointer transition-all text-left"
                style={{
                  background: `rgba(${rgb},${isDark ? 0.13 : 0.08})`,
                  border: `1px solid rgba(${rgb},${isDark ? 0.3 : 0.22})`,
                }}
              >
                <div>
                  <p className="font-body text-base text-[var(--text-primary)] font-semibold">
                    {resHere.startTime}
                  </p>
                  <p className="font-body text-xs text-[var(--text-muted)]">
                    {resHere.endTime}
                  </p>
                </div>
                <div className="min-w-0 border-l pl-3" style={{ borderColor: `rgba(${rgb},${isDark ? 0.32 : 0.2})` }}>
                  <p className="font-body text-base font-semibold" style={{ color }}>
                    {psych?.shortName || "Reservado"}
                  </p>
                  <p className="font-body text-sm text-[var(--text-muted)] truncate">
                    {resHere.notes || "Horário reservado"}
                  </p>
                </div>
              </button>
            );
          }

          return (
            <div
              key={hour}
              className="grid grid-cols-[72px_1fr] gap-3 px-3 py-2.5 rounded-lg"
            >
              <span className="font-body text-sm text-[var(--text-muted)]">
                {hour}
              </span>
              <div className="border-b border-dotted border-[var(--border-medium)] translate-y-[-6px]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomReservationList({
  reservations,
  isDark,
  onReservationClick,
}: {
  reservations: Reservation[];
  isDark: boolean;
  onReservationClick: (reservation: Reservation) => void;
}) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
        <EmptyState text="Esta sala não possui reservas futuras." />
      </div>
    );
  }

  const groups = reservations.reduce<Record<string, Reservation[]>>((acc, reservation) => {
    if (!acc[reservation.date]) acc[reservation.date] = [];
    acc[reservation.date].push(reservation);
    return acc;
  }, {});

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {Object.entries(groups).map(([date, dayReservations]) => (
        <div
          key={date}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] flex items-center justify-center font-body text-lg font-bold">
              {parseISO(date + "T00:00:00").getDate()}
            </div>
            <div>
              <p className="font-body text-base text-[var(--text-primary)] capitalize">
                {formatDateLong(date)}
              </p>
              <p className="font-body text-xs text-[var(--text-muted)]">
                {dayReservations.length} reserva{dayReservations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {dayReservations.map((r) => {
              const psych = PSYCHOLOGISTS.find((ps) => ps.id === r.psychId);
              const color = psych ? themeHex(psych, isDark) : "var(--text-primary)";
              const rgb = psych ? themeRgb(psych, isDark) : "196,181,253";

              return (
                <button
                  key={r.id}
                  onClick={() => onReservationClick(r)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                  style={{
                    background: `rgba(${rgb},${isDark ? 0.09 : 0.055})`,
                    border: `1px solid rgba(${rgb},${isDark ? 0.18 : 0.14})`,
                  }}
                >
                  <Clock size={15} style={{ color }} />
                  <span className="font-body text-sm text-[var(--text-primary)]">
                    {r.startTime} - {r.endTime}
                  </span>
                  <span className="ml-auto font-body text-sm truncate" style={{ color }}>
                    {psych?.shortName || "Reservado"}
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
  isDark,
  compact = false,
  onClick,
}: {
  reservation: Reservation;
  isDark: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const room = ROOMS.find((rm) => rm.id === reservation.roomId);
  if (!room) return null;

  const color = themeHex(room, isDark);
  const rgb = themeRgb(room, isDark);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all hover:translate-y-[-1px]"
      style={{
        background: `rgba(${rgb},${isDark ? 0.08 : 0.055})`,
        border: `1px solid rgba(${rgb},${isDark ? 0.16 : 0.14})`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
        style={{
          background: `rgba(${rgb},${isDark ? 0.14 : 0.08})`,
          color,
        }}
      >
        <span className="font-body text-sm font-bold leading-none">
          {reservation.startTime}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-body text-base text-[var(--text-primary)] font-semibold">
          {room.name}
        </p>
        <p className="font-body text-sm text-[var(--text-muted)] truncate">
          {!compact ? `${reservation.startTime} - ${reservation.endTime}` : formatShortDate(reservation.date)}
          {reservation.notes ? ` · ${reservation.notes}` : ""}
        </p>
      </div>
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
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-body text-sm transition-colors"
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

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? "py-5" : "py-9"}`}>
      <p className="font-body text-sm text-[var(--text-muted)]">
        {text}
      </p>
    </div>
  );
}

function formatDateLong(date: string) {
  return parseISO(date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(date: string) {
  return parseISO(date + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
