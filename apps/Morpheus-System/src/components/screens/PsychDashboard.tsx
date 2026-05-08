"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { ROOMS, PSYCHOLOGISTS, MONTHS, WEEKDAYS, HOURS } from "@/lib/data";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import AvailabilityModal from "@/components/modals/AvailabilityModal";
import { useGsapFadeIn } from "@/lib/gsap";
import type { Reservation } from "@/types";
import { CalendarDays, LogOut, Clock, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, getDay, addMonths, subMonths, isToday, parseISO, isAfter, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PsychDashboard() {
  const { activePsych, reservations, setView, setActivePsych, theme } = useApp();
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const headerRef = useGsapFadeIn();

  if (!activePsych) return null;

  const p = activePsych;
  const isDark = theme === "dark";
  const myReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.psychId === p.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [reservations, p.id]
  );

  const upcoming = myReservations.filter((r) => r.date >= format(new Date(), "yyyy-MM-dd"));
  const todayISO = format(new Date(), "yyyy-MM-dd");

  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const startDay = getDay(monthStart);
  const daysInMonth = endOfMonth(calMonth).getDate();
  const bookedDates = new Set(myReservations.map((r) => r.date));

  const selectedDayRes = myReservations.filter((r) => r.date === selectedDate);

  const selectedDateFormatted = (() => {
    try {
      return parseISO(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return selectedDate;
    }
  })();

  function getRoomReservationsForDate(roomId: number, date: string) {
    return reservations
      .filter((r) => r.roomId === roomId && r.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const roomToShow = selectedRoom
    ? ROOMS.find((r) => r.id === selectedRoom)
    : null;

  const roomResForSelectedDate = selectedRoom
    ? getRoomReservationsForDate(selectedRoom, selectedDate)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header
        ref={headerRef}
        className="p-4 md:p-5 flex flex-wrap justify-between items-center gap-4 border-b border-[var(--border-subtle)] flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-body text-base font-bold flex-shrink-0"
            style={{
              background: `rgba(${p.rgb},${isDark ? 0.2 : 0.25})`,
              border: `1px solid rgba(${p.rgb},${isDark ? 0.36 : 0.44})`,
              color: p.hex,
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
              style={{ color: `rgba(${p.rgb},${isDark ? 0.5 : 0.6})` }}
            >
              {upcoming.length} consulta{upcoming.length !== 1 ? "s" : ""}{" "}
              agendada{upcoming.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            colorRgb={p.rgb}
            onClick={() => setShowAvailModal(true)}
          >
            <Eye size={16} />
            Ver Disponibilidade
          </Button>
          <Button
            size="sm"
            colorRgb={p.rgb}
            onClick={() => setShowNewModal(true)}
            className="!bg-gradient-to-r !to-[var(--accent-sky)] !text-white !border-0 !font-bold !shadow-lg"
            style={{
              backgroundImage: `linear-gradient(to right, ${p.hex}, var(--accent-sky))`,
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

      {/* Room Buttons */}
      <div className="p-4 md:p-5 border-b border-[var(--border-subtle)]">
        <p className="font-body text-sm text-[var(--text-muted)] tracking-wider uppercase mb-3">
          Salas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROOMS.map((room) => {
            const isSelected = selectedRoom === room.id;
            const todayResCount = getRoomReservationsForDate(room.id, todayISO).length;
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(isSelected ? null : room.id)}
                className="relative p-4 rounded-2xl text-left transition-all duration-300 cursor-pointer"
                style={{
                  border: `1px solid rgba(${room.rgb},${isSelected ? 0.5 : isDark ? 0.2 : 0.3})`,
                  background: `rgba(${room.rgb},${isSelected ? isDark ? 0.15 : 0.18 : isDark ? 0.06 : 0.1})`,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = `rgba(${room.rgb},${isDark ? 0.12 : 0.15})`;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = `rgba(${room.rgb},${isDark ? 0.06 : 0.1})`;
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: room.hex }}
                  />
                  <span
                    className="font-body text-lg font-semibold"
                    style={{ color: room.hex }}
                  >
                    {room.name}
                  </span>
                </div>
                <p className="font-body text-sm text-[var(--text-muted)]">
                  Hoje:{" "}
                  <span className="text-[var(--text-primary)] font-medium">
                    {todayResCount} reserva{todayResCount !== 1 ? "s" : ""}
                  </span>
                </p>
                {todayResCount === 0 && (
                  <p className="font-body text-xs text-[rgba(110,231,183,0.5)] mt-1">
                    ● Disponível
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Calendar */}
        <div className="lg:w-[380px] border-r border-[var(--border-subtle)] p-4 md:p-5 overflow-y-auto flex-shrink-0">
          {/* Month navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCalMonth(subMonths(calMonth, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors text-lg"
            >
              ‹
            </button>
            <span className="font-body text-base text-[var(--text-primary)] font-medium">
              {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
            </span>
            <button
              onClick={() => setCalMonth(addMonths(calMonth, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors text-lg"
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
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

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), day), "yyyy-MM-dd");
              const isSel = iso === selectedDate;
              const isT = iso === todayISO;
              const booked = bookedDates.has(iso);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(iso)}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer relative transition-all text-base font-body"
                  style={{
                    background: isSel ? `rgba(${p.rgb},${isDark ? 0.22 : 0.28})` : "transparent",
                    border: isSel
                      ? `1px solid rgba(${p.rgb},0.5)`
                      : isT
                      ? `1px solid rgba(${p.rgb},${isDark ? 0.24 : 0.34})`
                      : "1px solid transparent",
                    color: isSel ? p.hex : "var(--text-primary)",
                    fontWeight: isSel || isT ? 600 : 300,
                  }}
                >
                  {day}
                  {booked && (
                    <div
                      className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: p.hex,
                        boxShadow: `0 0 5px ${p.hex}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date details */}
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <p
              className="font-body text-sm mb-3 tracking-wider uppercase"
              style={{ color: `rgba(${p.rgb},${isDark ? 0.6 : 0.7})` }}
            >
              {selectedDateFormatted}
            </p>
            {selectedDayRes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-2xl text-[var(--text-muted)] opacity-30 mb-1">
                  ◌
                </p>
                <p className="font-body text-sm text-[var(--text-muted)]">
                  Nenhuma reserva neste dia
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDayRes.map((r) => {
                  const room = ROOMS.find((rm) => rm.id === r.roomId);
                  if (!room) return null;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setDetailRes(r)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02]"
                      style={{
                        background: `rgba(${room.rgb},${isDark ? 0.08 : 0.12})`,
                        border: `1px solid rgba(${room.rgb},${isDark ? 0.16 : 0.24})`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background: room.hex }}
                      />
                      <div className="min-w-0">
                        <p className="font-body text-base text-[var(--text-primary)] font-medium">
                          {room.name}
                        </p>
                        <p
                          className="font-body text-sm"
                          style={{ color: `rgba(${room.rgb},${isDark ? 0.66 : 0.75})` }}
                        >
                          <Clock size={12} className="inline mr-1" />
                          {r.startTime} – {r.endTime}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Room schedule or upcoming */}
        <div className="flex-1 p-4 md:p-5 overflow-y-auto">
          {roomToShow ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: roomToShow.hex }}
                />
                <h2
                  className="font-display text-2xl font-light"
                  style={{ color: roomToShow.hex }}
                >
                  {roomToShow.name}
                </h2>
                <span className="font-body text-sm text-[var(--text-muted)]">
                  — {selectedDateFormatted}
                </span>
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-1">
                {HOURS.map((hour) => {
                  const resHere = roomResForSelectedDate.find(
                    (r) => hour >= r.startTime && hour < r.endTime
                  );
                  const isStart = resHere?.startTime === hour;

                  if (resHere && !isStart) return null;

                  if (isStart && resHere) {
                    const psych = PSYCHOLOGISTS.find(
                      (ps) => ps.id === resHere.psychId
                    );
                    return (
                      <button
                        key={hour}
                        onClick={() => setDetailRes(resHere)}
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: `rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.12 : 0.15})`,
                          border: `1px solid rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.3 : 0.38})`,
                          boxShadow: `0 0 8px rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.15 : 0.2})`,
                        }}
                      >
                        <div className="w-16 flex-shrink-0">
                          <span className="font-body text-base text-[var(--text-primary)] font-medium">
                            {resHere.startTime}
                          </span>
                          <span className="font-body text-sm text-[var(--text-muted)]">
                            {" "}
                            – {resHere.endTime}
                          </span>
                        </div>
                        <div
                          className="w-px h-8 flex-shrink-0"
                          style={{
                            background: `rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.3 : 0.4})`,
                          }}
                        />
                        <div className="min-w-0">
                          <p
                            className="font-body text-base font-semibold"
                            style={{ color: psych?.hex || roomToShow.hex }}
                          >
                            {psych?.shortName || "Reservado"}
                          </p>
                          {resHere.notes && (
                            <p className="font-body text-sm text-[var(--text-muted)]">
                              {resHere.notes}
                            </p>
                          )}
                        </div>
                        <div className="ml-auto flex-shrink-0">
                          <span
                            className="px-3 py-1.5 rounded-full font-body text-sm flex-shrink-0"
                            style={{
                              background: `rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.15 : 0.2})`,
                              color: psych?.hex || roomToShow.hex,
                              border: `1px solid rgba(${psych?.rgb || roomToShow.rgb},${isDark ? 0.3 : 0.4})`,
                            }}
                          >
                            Reservado
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={hour}
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <div className="w-16 flex-shrink-0">
                        <span className="font-body text-base text-[var(--text-muted)]">
                          {hour}
                        </span>
                      </div>
                      <div className="w-px h-6 flex-shrink-0 bg-[var(--border-subtle)]" />
                      <span className="font-body text-sm text-[rgba(110,231,183,0.4)]">
                        ● Livre
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="font-body text-sm text-[var(--text-muted)] tracking-wider uppercase mb-5">
                Próximas Reservas
              </p>
              {upcoming.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl text-[var(--text-muted)] opacity-20 mb-3">
                    ◌
                  </p>
                  <p className="font-body text-base text-[var(--text-muted)]">
                    Sem consultas agendadas
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const groups: Record<string, Reservation[]> = {};
                    upcoming.forEach((r) => {
                      if (!groups[r.date]) groups[r.date] = [];
                      groups[r.date].push(r);
                    });

                    return Object.entries(groups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, resList]) => {
                        const isT = date === todayISO;
                        const df = parseISO(date + "T00:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        });

                        return (
                          <div key={date} className="mb-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                              <span
                                className="font-body text-sm whitespace-nowrap capitalize"
                                style={{
                                  color: isT ? p.hex : "var(--text-muted)",
                                  fontWeight: isT ? 600 : 400,
                                }}
                              >
                                {isT ? `Hoje · ${df}` : df}
                              </span>
                              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                            </div>
                            {resList.map((r) => {
                              const room = ROOMS.find(
                                (rm) => rm.id === r.roomId
                              );
                              if (!room) return null;
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => setDetailRes(r)}
                                  className="w-full flex items-center gap-3 p-4 rounded-xl mb-2 cursor-pointer transition-all hover:scale-[1.01] text-left"
                                  style={{
                                    background: `rgba(${room.rgb},${isDark ? 0.07 : 0.1})`,
                                    border: `1px solid rgba(${room.rgb},${isDark ? 0.12 : 0.18})`,
                                  }}
                                >
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: `rgba(${room.rgb},${isDark ? 0.14 : 0.2})`,
                                    }}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ background: room.hex }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-body text-lg text-[var(--text-primary)] font-medium">
                                      {room.name}
                                    </p>
                                    <p
                                      className="font-body text-sm"
                                      style={{
                                        color: `rgba(${room.rgb},${isDark ? 0.65 : 0.75})`,
                                      }}
                                    >
                                      {r.startTime} – {r.endTime}
                                      {r.notes ? ` · ${r.notes}` : ""}
                                    </p>
                                  </div>
                                  <span
                                    className="px-3 py-1.5 rounded-full font-body text-sm flex-shrink-0"
                                    style={{
                                      background: `rgba(${room.rgb},${isDark ? 0.1 : 0.15})`,
                                      border: `1px solid rgba(${room.rgb},${isDark ? 0.18 : 0.25})`,
                                      color: room.hex,
                                    }}
                                  >
                                    {r.startTime}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const headerRef = useGsapFadeIn();

  if (!activePsych) return null;

  const p = activePsych;
  const myReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.psychId === p.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [reservations, p.id]
  );

  const upcoming = myReservations.filter((r) => r.date >= format(new Date(), "yyyy-MM-dd"));
  const todayISO = format(new Date(), "yyyy-MM-dd");

  const monthStart = startOfMonth(calMonth);
  const monthEnd = endOfMonth(calMonth);
  const startDay = getDay(monthStart);
  const daysInMonth = endOfMonth(calMonth).getDate();
  const bookedDates = new Set(myReservations.map((r) => r.date));

  const selectedDayRes = myReservations.filter((r) => r.date === selectedDate);

  const selectedDateFormatted = (() => {
    try {
      return parseISO(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return selectedDate;
    }
  })();

  function getRoomReservationsForDate(roomId: number, date: string) {
    return reservations
      .filter((r) => r.roomId === roomId && r.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const roomToShow = selectedRoom
    ? ROOMS.find((r) => r.id === selectedRoom)
    : null;

  const roomResForSelectedDate = selectedRoom
    ? getRoomReservationsForDate(selectedRoom, selectedDate)
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header
        ref={headerRef}
        className="p-4 md:p-5 flex flex-wrap justify-between items-center gap-4 border-b border-white/[0.04] flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-body text-base font-bold flex-shrink-0"
            style={{
              background: `rgba(${p.rgb},0.2)`,
              border: `1px solid rgba(${p.rgb},0.36)`,
              color: p.hex,
            }}
          >
            {p.initials}
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl text-morpheus-text font-light">
              Olá, {p.shortName}
            </h1>
            <p
              className="font-body text-sm"
              style={{ color: `rgba(${p.rgb},0.5)` }}
            >
              {upcoming.length} consulta{upcoming.length !== 1 ? "s" : ""}{" "}
              agendada{upcoming.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            colorRgb={p.rgb}
            onClick={() => setShowAvailModal(true)}
          >
            <Eye size={16} />
            Ver Disponibilidade
          </Button>
          <Button
            size="sm"
            colorRgb={p.rgb}
            onClick={() => setShowNewModal(true)}
          >
            <CalendarDays size={16} />
            Nova Reserva
          </Button>
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

      {/* Room Buttons */}
      <div className="p-4 md:p-5 border-b border-white/[0.04]">
        <p className="font-body text-sm text-morpheus-muted tracking-wider uppercase mb-3">
          Salas
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROOMS.map((room) => {
            const isSelected = selectedRoom === room.id;
            const todayResCount = getRoomReservationsForDate(room.id, todayISO).length;
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(isSelected ? null : room.id)}
                className="relative p-4 rounded-2xl text-left transition-all duration-300 cursor-pointer"
                style={{
                  border: `1px solid rgba(${room.rgb},${isSelected ? 0.5 : 0.2})`,
                  background: `rgba(${room.rgb},${isSelected ? 0.15 : 0.06})`,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = `rgba(${room.rgb},0.12)`;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = `rgba(${room.rgb},0.06)`;
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ background: room.hex }}
                  />
                  <span
                    className="font-body text-lg font-semibold"
                    style={{ color: room.hex }}
                  >
                    {room.name}
                  </span>
                </div>
                <p className="font-body text-sm text-morpheus-muted">
                  Hoje:{" "}
                  <span className="text-morpheus-text font-medium">
                    {todayResCount} reserva{todayResCount !== 1 ? "s" : ""}
                  </span>
                </p>
                {todayResCount === 0 && (
                  <p className="font-body text-xs text-[rgba(110,231,183,0.5)] mt-1">
                    ● Disponível
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Calendar */}
        <div className="lg:w-[380px] border-r border-white/[0.04] p-4 md:p-5 overflow-y-auto flex-shrink-0">
          {/* Month navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setCalMonth(subMonths(calMonth, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[rgba(196,181,253,0.14)] bg-transparent text-[rgba(196,181,253,0.6)] cursor-pointer hover:bg-[rgba(196,181,253,0.1)] transition-colors text-lg"
            >
              ‹
            </button>
            <span className="font-body text-base text-morpheus-text font-medium">
              {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
            </span>
            <button
              onClick={() => setCalMonth(addMonths(calMonth, 1))}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[rgba(196,181,253,0.14)] bg-transparent text-[rgba(196,181,253,0.6)] cursor-pointer hover:bg-[rgba(196,181,253,0.1)] transition-colors text-lg"
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center font-body text-xs text-morpheus-muted py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = format(new Date(calMonth.getFullYear(), calMonth.getMonth(), day), "yyyy-MM-dd");
              const isSel = iso === selectedDate;
              const isT = iso === todayISO;
              const booked = bookedDates.has(iso);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(iso)}
                  className="aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer relative transition-all text-base font-body"
                  style={{
                    background: isSel ? `rgba(${p.rgb},0.22)` : "transparent",
                    border: isSel
                      ? `1px solid rgba(${p.rgb},0.5)`
                      : isT
                      ? `1px solid rgba(${p.rgb},0.24)`
                      : "1px solid transparent",
                    color: isSel ? p.hex : "#f0ede8",
                    fontWeight: isSel || isT ? 600 : 300,
                  }}
                >
                  {day}
                  {booked && (
                    <div
                      className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: p.hex,
                        boxShadow: `0 0 5px ${p.hex}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date details */}
          <div className="mt-5 pt-4 border-t border-white/[0.04]">
            <p
              className="font-body text-sm mb-3 tracking-wider uppercase"
              style={{ color: `rgba(${p.rgb},0.6)` }}
            >
              {selectedDateFormatted}
            </p>
            {selectedDayRes.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-2xl text-morpheus-muted opacity-30 mb-1">
                  ◌
                </p>
                <p className="font-body text-sm text-morpheus-muted">
                  Nenhuma reserva neste dia
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedDayRes.map((r) => {
                  const room = ROOMS.find((rm) => rm.id === r.roomId);
                  if (!room) return null;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setDetailRes(r)}
                      className="flex items-center gap-3 p-3 rounded-xl text-left cursor-pointer transition-all hover:scale-[1.02]"
                      style={{
                        background: `rgba(${room.rgb},0.08)`,
                        border: `1px solid rgba(${room.rgb},0.16)`,
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background: room.hex }}
                      />
                      <div className="min-w-0">
                        <p className="font-body text-base text-morpheus-text font-medium">
                          {room.name}
                        </p>
                        <p
                          className="font-body text-sm"
                          style={{ color: `rgba(${room.rgb},0.66)` }}
                        >
                          <Clock size={12} className="inline mr-1" />
                          {r.startTime} – {r.endTime}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Room schedule or upcoming */}
        <div className="flex-1 p-4 md:p-5 overflow-y-auto">
          {roomToShow ? (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ background: roomToShow.hex }}
                />
                <h2
                  className="font-display text-2xl font-light"
                  style={{ color: roomToShow.hex }}
                >
                  {roomToShow.name}
                </h2>
                <span className="font-body text-sm text-morpheus-muted">
                  — {selectedDateFormatted}
                </span>
              </div>

              {/* Timeline */}
              <div className="flex flex-col gap-1">
                {HOURS.map((hour) => {
                  const resHere = roomResForSelectedDate.find(
                    (r) => hour >= r.startTime && hour < r.endTime
                  );
                  const isStart = resHere?.startTime === hour;

                  if (resHere && !isStart) return null;

                  if (isStart && resHere) {
                    const psych = PSYCHOLOGISTS.find(
                      (ps) => ps.id === resHere.psychId
                    );
                    return (
                      <button
                        key={hour}
                        onClick={() => setDetailRes(resHere)}
                        className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{
                          background: `rgba(${psych?.rgb || roomToShow.rgb},0.12)`,
                          border: `1px solid rgba(${psych?.rgb || roomToShow.rgb},0.3)`,
                        }}
                      >
                        <div className="w-16 flex-shrink-0">
                          <span className="font-body text-base text-morpheus-text font-medium">
                            {resHere.startTime}
                          </span>
                          <span className="font-body text-sm text-morpheus-muted">
                            {" "}
                            – {resHere.endTime}
                          </span>
                        </div>
                        <div
                          className="w-px h-8 flex-shrink-0"
                          style={{
                            background: `rgba(${psych?.rgb || roomToShow.rgb},0.3)`,
                          }}
                        />
                        <div className="min-w-0">
                          <p
                            className="font-body text-base font-semibold"
                            style={{ color: psych?.hex || roomToShow.hex }}
                          >
                            {psych?.shortName || "Reservado"}
                          </p>
                          {resHere.notes && (
                            <p className="font-body text-sm text-morpheus-muted">
                              {resHere.notes}
                            </p>
                          )}
                        </div>
                        <div className="ml-auto flex-shrink-0">
                          <span
                            className="px-3 py-1 rounded-full font-body text-xs font-medium"
                            style={{
                              background: `rgba(${psych?.rgb || roomToShow.rgb},0.15)`,
                              color: psych?.hex || roomToShow.hex,
                              border: `1px solid rgba(${psych?.rgb || roomToShow.rgb},0.3)`,
                            }}
                          >
                            Reservado
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={hour}
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <div className="w-16 flex-shrink-0">
                        <span className="font-body text-base text-morpheus-muted">
                          {hour}
                        </span>
                      </div>
                      <div className="w-px h-6 flex-shrink-0 bg-white/[0.04]" />
                      <span className="font-body text-sm text-[rgba(110,231,183,0.4)]">
                        ● Livre
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="font-body text-sm text-morpheus-muted tracking-wider uppercase mb-5">
                Próximas Reservas
              </p>
              {upcoming.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl text-morpheus-muted opacity-20 mb-3">
                    ◌
                  </p>
                  <p className="font-body text-base text-morpheus-muted">
                    Sem consultas agendadas
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const groups: Record<string, Reservation[]> = {};
                    upcoming.forEach((r) => {
                      if (!groups[r.date]) groups[r.date] = [];
                      groups[r.date].push(r);
                    });

                    return Object.entries(groups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, resList]) => {
                        const isT = date === todayISO;
                        const df = parseISO(date + "T00:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        });

                        return (
                          <div key={date} className="mb-3">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-px flex-1 bg-white/[0.04]" />
                              <span
                                className="font-body text-sm whitespace-nowrap capitalize"
                                style={{
                                  color: isT ? p.hex : "rgba(240,237,232,0.32)",
                                  fontWeight: isT ? 600 : 400,
                                }}
                              >
                                {isT ? `Hoje · ${df}` : df}
                              </span>
                              <div className="h-px flex-1 bg-white/[0.04]" />
                            </div>
                            {resList.map((r) => {
                              const room = ROOMS.find(
                                (rm) => rm.id === r.roomId
                              );
                              if (!room) return null;
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => setDetailRes(r)}
                                  className="w-full flex items-center gap-3 p-4 rounded-xl mb-2 cursor-pointer transition-all hover:scale-[1.01] text-left"
                                  style={{
                                    background: `rgba(${room.rgb},0.07)`,
                                    border: `1px solid rgba(${room.rgb},0.12)`,
                                  }}
                                >
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background: `rgba(${room.rgb},0.14)`,
                                    }}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ background: room.hex }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-body text-lg text-morpheus-text font-medium">
                                      {room.name}
                                    </p>
                                    <p
                                      className="font-body text-sm"
                                      style={{
                                        color: `rgba(${room.rgb},0.65)`,
                                      }}
                                    >
                                      {r.startTime} – {r.endTime}
                                      {r.notes ? ` · ${r.notes}` : ""}
                                    </p>
                                  </div>
                                  <span
                                    className="px-3 py-1.5 rounded-full font-body text-sm flex-shrink-0"
                                    style={{
                                      background: `rgba(${room.rgb},0.1)`,
                                      border: `1px solid rgba(${room.rgb},0.18)`,
                                      color: room.hex,
                                    }}
                                  >
                                    {r.startTime}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
