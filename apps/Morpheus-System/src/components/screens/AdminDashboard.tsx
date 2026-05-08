"use client";

import { Fragment, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  ROOMS,
  PSYCHOLOGISTS,
  MONTHS,
  WEEKDAYS,
} from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import NewReservationModal from "@/components/modals/NewReservationModal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import { useGsapFadeIn } from "@/lib/gsap";
import type { Reservation } from "@/types";
import {
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  CalendarRange,
  LayoutGrid,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  addDays,
  isToday as dateFnsIsToday,
} from "date-fns";

type AdminScheduleView = "grid" | "map";

export default function AdminDashboard() {
  const { reservations, setView, theme } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleView, setScheduleView] = useState<AdminScheduleView>("grid");
  const [showNewModal, setShowNewModal] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<Reservation>>({});
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const headerRef = useGsapFadeIn();

  const isDark = theme === "dark";

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
    MONTHS[new Date(weekDays[6].iso + "T00:00:00").getMonth()]
  }`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header
        ref={headerRef}
        className="p-4 md:p-5 flex flex-wrap justify-between items-center gap-4 border-b border-[var(--border-subtle)] flex-shrink-0"
      >
        <div>
          <h1 className="font-display text-xl md:text-2xl text-[var(--text-primary)] font-light tracking-wider">
            MORPHEUS
          </h1>
          <p className="font-body text-sm text-[var(--text-muted)] tracking-wider mt-0.5">
            Painel Administrativo
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="px-3 py-1.5 rounded-full bg-[rgba(196,181,253,0.1)] border border-[rgba(196,181,253,0.2)] font-body text-sm text-[var(--accent-lavender)] tracking-wider flex items-center gap-1.5">
            <Shield size={14} />
            ADMIN
          </span>
          <Button
            size="sm"
            onClick={() => {
              setPrefillData({});
              setShowNewModal(true);
            }}
            className="!text-white !border-0 !font-bold !shadow-lg !shadow-[var(--accent-lavender)]/20"
            style={{
              background: isDark
                ? "linear-gradient(to right, var(--accent-lavender), var(--accent-sky))"
                : "linear-gradient(to right, #241f1b, #3f342c)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark
                ? "linear-gradient(to right, var(--accent-lavender), var(--accent-sky))"
                : "linear-gradient(to right, #15110f, #2d251f)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark
                ? "linear-gradient(to right, var(--accent-lavender), var(--accent-sky))"
                : "linear-gradient(to right, #241f1b, #3f342c)";
            }}
          >
            <Plus size={16} />
            Nova Reserva
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("splash")}
          >
            <LogOut size={16} />
            Sair
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-5 flex items-center gap-3 flex-shrink-0 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-body text-base text-[var(--text-primary)] min-w-[180px] text-center font-medium">
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
          aria-label="Próxima semana"
        >
          <ChevronRight size={18} />
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer font-body text-sm px-2 hover:text-[var(--text-primary)] transition-colors"
          >
            Hoje
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-xl border border-[var(--border-light)] p-1 bg-[var(--bg-surface)]">
          <ViewButton
            active={scheduleView === "grid"}
            onClick={() => setScheduleView("grid")}
            icon={<LayoutGrid size={15} />}
            label="Grade"
          />
          <ViewButton
            active={scheduleView === "map"}
            onClick={() => setScheduleView("map")}
            icon={<CalendarRange size={15} />}
            label="Mapa"
          />
        </div>
      </div>

      {scheduleView === "grid" ? (
        <AdminRoomGrid
          weekDays={weekDays}
          reservations={reservations}
          isDark={isDark}
          onBook={(roomId, date) => {
            setPrefillData({ roomId, date });
            setShowNewModal(true);
          }}
          onDetail={setDetailRes}
        />
      ) : (
        <AdminRoomMap
          weekDays={weekDays}
          reservations={reservations}
          isDark={isDark}
          onBook={(roomId, date) => {
            setPrefillData({ roomId, date });
            setShowNewModal(true);
          }}
          onDetail={setDetailRes}
        />
      )}

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

function AdminRoomGrid({
  weekDays,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  weekDays: WeekDay[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (roomId: number, date: string) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  return (
    <div className="flex-1 px-4 md:px-5 pb-6 overflow-x-auto">
      <div className="grid gap-px min-w-[860px]" style={{ gridTemplateColumns: "124px repeat(7, minmax(120px, 1fr))" }}>
        <div className="p-2 flex items-end">
          <span className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase">
            Salas
          </span>
        </div>
        <WeekHeader weekDays={weekDays} />

        {ROOMS.map((room) => {
          const roomColor = themeHex(room, isDark);
          const roomRgb = themeRgb(room, isDark);

          return (
            <Fragment key={room.id}>
              <RoomLabel roomName={room.name} color={roomColor} />

              {weekDays.map((dd) => {
                const dayRes = reservations
                  .filter((r) => r.roomId === room.id && r.date === dd.iso)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={`${room.id}-${dd.iso}`}
                    className="border-t border-l border-[var(--border-subtle)] p-2 min-h-[112px] cursor-pointer transition-colors relative group"
                    style={{
                      background: dd.isToday
                        ? `rgba(${roomRgb},${isDark ? 0.035 : 0.06})`
                        : isDark ? "transparent" : "rgba(255,255,255,0.42)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(${roomRgb},${isDark ? 0.07 : 0.1})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dd.isToday
                        ? `rgba(${roomRgb},${isDark ? 0.035 : 0.06})`
                        : isDark ? "transparent" : "rgba(255,255,255,0.42)";
                    }}
                    onClick={() => onBook(room.id, dd.iso)}
                  >
                    {dayRes.length === 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-mint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    {dayRes.map((r) => (
                      <AdminReservationBlock
                        key={r.id}
                        reservation={r}
                        isDark={isDark}
                        onClick={() => onDetail(r)}
                      />
                    ))}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function AdminRoomMap({
  weekDays,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  weekDays: WeekDay[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (roomId: number, date: string) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  return (
    <div className="flex-1 px-4 md:px-5 pb-6 overflow-x-auto">
      <div className="min-w-[1040px]">
        <div className="grid" style={{ gridTemplateColumns: "132px repeat(7, minmax(126px, 1fr))" }}>
          <div className="px-2 pb-3 flex items-end">
            <span className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase">
              Salas
            </span>
          </div>
          <WeekHeader weekDays={weekDays} />

          <div className="sticky left-0 z-20 bg-[var(--bg-primary)] border-r border-[var(--border-subtle)]">
            {ROOMS.map((room) => {
              const roomColor = themeHex(room, isDark);
              return (
                <div
                  key={room.id}
                  className="h-[92px] flex items-center gap-2 px-2 border-t border-[var(--border-subtle)]"
                >
                  <div className="w-4 h-4 rounded-full" style={{ background: roomColor }} />
                  <span className="font-body text-sm font-semibold text-[var(--text-muted)]">
                    {room.name}
                  </span>
                </div>
              );
            })}
          </div>

          {weekDays.map((dd) => (
            <div
              key={dd.iso}
              className="border-l border-[var(--border-subtle)]"
            >
              {ROOMS.map((room) => {
                const roomRgb = themeRgb(room, isDark);
                const dayRes = reservations
                  .filter((r) => r.roomId === room.id && r.date === dd.iso)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={`${dd.iso}-${room.id}`}
                    className="h-[92px] border-t border-[var(--border-subtle)] p-2 cursor-pointer transition-colors group"
                    style={{
                      background: dd.isToday
                        ? `rgba(${roomRgb},${isDark ? 0.035 : 0.055})`
                        : isDark ? "transparent" : "rgba(255,255,255,0.34)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(${roomRgb},${isDark ? 0.07 : 0.1})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dd.isToday
                        ? `rgba(${roomRgb},${isDark ? 0.035 : 0.055})`
                        : isDark ? "transparent" : "rgba(255,255,255,0.34)";
                    }}
                    onClick={() => onBook(room.id, dd.iso)}
                  >
                    {dayRes.length === 0 ? (
                      <div className="h-full rounded-lg border border-dashed border-transparent group-hover:border-[var(--border-light)]" />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {dayRes.slice(0, 2).map((r) => (
                          <AdminReservationPill
                            key={r.id}
                            reservation={r}
                            isDark={isDark}
                            onClick={() => onDetail(r)}
                          />
                        ))}
                        {dayRes.length > 2 && (
                          <span className="font-body text-[11px] text-[var(--text-muted)] px-1">
                            +{dayRes.length - 2} reserva{dayRes.length - 2 !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekHeader({ weekDays }: { weekDays: WeekDay[] }) {
  return (
    <>
      {weekDays.map((dd) => (
        <div key={dd.iso} className="p-2 text-center">
          <p
            className="font-body text-xs tracking-wider"
            style={{
              color: dd.isToday ? "var(--accent-lavender)" : "var(--text-muted)",
            }}
          >
            {dd.name}
          </p>
          <div
            className="inline-flex items-center justify-center w-9 h-9 mt-1 rounded-lg font-body text-lg"
            style={{
              background: dd.isToday ? "rgba(196,181,253,0.12)" : "none",
              color: dd.isToday ? "var(--accent-lavender)" : "var(--text-primary)",
              fontWeight: dd.isToday ? 600 : 300,
            }}
          >
            {dd.num}
          </div>
        </div>
      ))}
    </>
  );
}

function RoomLabel({ roomName, color }: { roomName: string; color: string }) {
  return (
    <div
      className="sticky left-0 z-10 flex items-center gap-2 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]"
      style={{
        boxShadow: "8px 0 18px rgba(0,0,0,0.08)",
      }}
    >
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span
        className="font-body text-sm font-bold"
        style={{ color }}
      >
        {roomName}
      </span>
    </div>
  );
}

function AdminReservationBlock({
  reservation,
  isDark,
  onClick,
}: {
  reservation: Reservation;
  isDark: boolean;
  onClick: () => void;
}) {
  const psych = PSYCHOLOGISTS.find((p) => p.id === reservation.psychId);
  if (!psych) return null;
  const psychColor = themeHex(psych, isDark);
  const psychRgb = themeRgb(psych, isDark);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full mb-1.5 p-2 rounded-lg cursor-pointer text-left transition-all grid grid-cols-[48px_1fr] gap-2 items-center"
      style={{
        background: `rgba(${psychRgb},${isDark ? 0.17 : 0.09})`,
        border: `1px solid rgba(${psychRgb},${isDark ? 0.32 : 0.2})`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `rgba(${psychRgb},${isDark ? 0.3 : 0.16})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `rgba(${psychRgb},${isDark ? 0.17 : 0.09})`;
      }}
    >
      <span
        className="h-10 rounded-lg flex items-center justify-center font-body text-xs font-bold"
        style={{
          color: psychColor,
          background: `rgba(${psychRgb},${isDark ? 0.16 : 0.08})`,
        }}
      >
        {reservation.startTime}
      </span>
      <span className="min-w-0">
        <span
          className="block font-body text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ color: psychColor }}
        >
          {psych.shortName}
        </span>
        <span className="block font-body text-[11px] text-[var(--text-soft)]">
          {reservation.startTime} - {reservation.endTime}
        </span>
      </span>
    </button>
  );
}

function AdminReservationPill({
  reservation,
  isDark,
  onClick,
}: {
  reservation: Reservation;
  isDark: boolean;
  onClick: () => void;
}) {
  const psych = PSYCHOLOGISTS.find((p) => p.id === reservation.psychId);
  if (!psych) return null;
  const psychColor = themeHex(psych, isDark);
  const psychRgb = themeRgb(psych, isDark);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full rounded-lg px-2 py-1.5 text-left transition-all"
      style={{
        color: psychColor,
        background: `rgba(${psychRgb},${isDark ? 0.18 : 0.1})`,
        border: `1px solid rgba(${psychRgb},${isDark ? 0.34 : 0.2})`,
      }}
    >
      <span className="block font-body text-xs font-bold truncate">
        {psych.shortName}
      </span>
      <span className="block font-body text-[10px] text-[var(--text-soft)]">
        {reservation.startTime} - {reservation.endTime}
      </span>
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
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
