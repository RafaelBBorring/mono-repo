"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  ROOMS,
  PSYCHOLOGISTS,
  HOURS,
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

const SLOT_HEIGHT = 42;
const BODY_HEIGHT = (HOURS.length - 1) * SLOT_HEIGHT;
const ROOM_LANE_MIN_WIDTH = 58;

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
  const height = Math.max(((end - start) / 30) * SLOT_HEIGHT - 8, 34);

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
        <AdminManagedSchedule
          weekDays={weekDays}
          reservations={reservations}
          isDark={isDark}
          onBook={(prefill) => {
            setPrefillData(prefill);
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

function AdminManagedSchedule({
  weekDays,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  weekDays: WeekDay[];
  reservations: Reservation[];
  isDark: boolean;
  onBook: (prefill: Partial<Reservation>) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const dayMinWidth = Math.max(ROOMS.length * ROOM_LANE_MIN_WIDTH, 244);

  return (
    <div className="flex-1 px-4 md:px-5 pb-6 overflow-auto">
      <div
        className="grid min-w-[1180px]"
        style={{
          gridTemplateColumns: `124px 72px repeat(7, minmax(${dayMinWidth}px, 1fr))`,
          gridTemplateRows: "104px auto",
        }}
      >
        <RoomScheduleLegend isDark={isDark} />

        <div className="sticky left-[124px] z-30 flex items-end justify-center border-b border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 pb-5">
          <span className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase">
            Horario
          </span>
        </div>

        <WeekHeader weekDays={weekDays} />

        <TimeRuler />

        {weekDays.map((dd) => (
          <DayRoomColumn
            key={dd.iso}
            day={dd}
            reservations={reservations.filter((r) => r.date === dd.iso)}
            isDark={isDark}
            onBook={onBook}
            onDetail={onDetail}
          />
        ))}
      </div>
    </div>
  );
}

function RoomScheduleLegend({ isDark }: { isDark: boolean }) {
  return (
    <aside
      className="sticky left-0 z-40 row-span-2 border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]"
      style={{
        boxShadow: "10px 0 22px rgba(0,0,0,0.12)",
      }}
    >
      <div className="h-[104px] flex items-end px-3 pb-5 border-b border-[var(--border-subtle)]">
        <span className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase">
          Salas
        </span>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {ROOMS.map((room) => {
          const color = themeHex(room, isDark);
          return (
            <div key={room.id} className="flex items-center gap-2 px-3 h-[88px]">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <span className="font-body text-sm font-bold" style={{ color }}>
                {room.name}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function TimeRuler() {
  return (
    <div
      className="sticky left-[124px] z-30 relative border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]"
      style={{ height: BODY_HEIGHT }}
    >
      {HOURS.map((hour, index) => {
        const isHalfHour = hour.endsWith(":30");
        return (
          <div
            key={hour}
            className="absolute left-0 right-0 -translate-y-1/2 px-2 text-right font-body"
            style={{ top: index * SLOT_HEIGHT }}
          >
            <span
              className={isHalfHour ? "text-[10px] text-[var(--text-muted)] opacity-50" : "text-xs text-[var(--text-soft)]"}
            >
              {hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DayRoomColumn({
  day,
  reservations,
  isDark,
  onBook,
  onDetail,
}: {
  day: WeekDay;
  reservations: Reservation[];
  isDark: boolean;
  onBook: (prefill: Partial<Reservation>) => void;
  onDetail: (reservation: Reservation) => void;
}) {
  const background = day.isToday
    ? isDark
      ? "rgba(196,181,253,0.035)"
      : "rgba(109,40,217,0.045)"
    : isDark
      ? "transparent"
      : "rgba(255,255,255,0.36)";

  return (
    <div
      className="relative border-r border-[var(--border-subtle)]"
      style={{
        height: BODY_HEIGHT,
        background,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 41px, var(--border-subtle) 41px, var(--border-subtle) 42px)",
        }}
      />
      <div
        className="relative grid h-full"
        style={{
          gridTemplateColumns: `repeat(${ROOMS.length}, minmax(${ROOM_LANE_MIN_WIDTH}px, 1fr))`,
        }}
      >
        {ROOMS.map((room) => {
          const roomReservations = reservations
            .filter((reservation) => reservation.roomId === room.id)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const roomRgb = themeRgb(room, isDark);

          return (
            <div
              key={`${day.iso}-${room.id}`}
              className="relative h-full border-l border-[var(--border-subtle)] cursor-pointer group transition-colors"
              style={{
                background: `rgba(${roomRgb},${isDark ? 0.012 : 0.018})`,
              }}
              onClick={(event) => {
                const slot = getNearestSlotTime(event.clientY, event.currentTarget);
                onBook({
                  roomId: room.id,
                  date: day.iso,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                });
              }}
            >
              <div
                className="absolute inset-x-1 top-1 h-5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  border: `1px dashed rgba(${roomRgb},${isDark ? 0.22 : 0.26})`,
                }}
              />
              {roomReservations.map((reservation) => (
                <ManagedReservationMarker
                  key={reservation.id}
                  reservation={reservation}
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
        <div
          key={dd.iso}
          className="p-2 text-center border-b border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]"
        >
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
          <div
            className="mt-2 grid gap-1 px-1"
            style={{
              gridTemplateColumns: `repeat(${ROOMS.length}, minmax(0, 1fr))`,
            }}
          >
            {ROOMS.map((room) => (
              <span
                key={`${dd.iso}-${room.id}`}
                className="mx-auto block h-1.5 w-1.5 rounded-full"
                style={{
                  background: themeHex(room, true),
                  opacity: dd.isToday ? 0.95 : 0.42,
                }}
              />
            ))}
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

function ManagedReservationMarker({
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
  const { top, height } = getReservationPosition(reservation);

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="absolute left-1 right-1 rounded-lg p-1.5 text-left overflow-hidden transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[var(--accent-lavender)]"
      style={{
        top,
        height,
        color: psychColor,
        background: `rgba(${psychRgb},${isDark ? 0.22 : 0.13})`,
        border: `1px solid rgba(${psychRgb},${isDark ? 0.48 : 0.26})`,
        boxShadow: `0 8px 20px rgba(${psychRgb},${isDark ? 0.1 : 0.08})`,
      }}
      title={`${psych.name} - ${reservation.startTime} as ${reservation.endTime}`}
    >
      <span className="block font-body text-[11px] font-bold leading-tight truncate">
        {psych.initials}
      </span>
      <span className="block font-body text-[10px] leading-tight text-[var(--text-soft)] truncate">
        {reservation.startTime}
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
