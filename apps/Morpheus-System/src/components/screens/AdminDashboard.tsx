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
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  addDays,
  isToday as dateFnsIsToday,
} from "date-fns";

export default function AdminDashboard() {
  const { reservations, setView, theme } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);
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
      </div>

      <div className="flex-1 px-4 md:px-5 pb-6 overflow-x-auto">
        <div className="grid gap-px min-w-[860px]" style={{ gridTemplateColumns: "124px repeat(7, minmax(120px, 1fr))" }}>
          <div className="p-2 flex items-end">
            <span className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase">
              Salas
            </span>
          </div>
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

          {ROOMS.map((room) => {
            const roomColor = themeHex(room, isDark);
            const roomRgb = themeRgb(room, isDark);

            return (
              <Fragment key={room.id}>
                <div
                  className="sticky left-0 z-10 flex items-center gap-2 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]"
                  style={{
                    boxShadow: "8px 0 18px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ background: roomColor }}
                  />
                  <span
                    className="font-body text-sm font-bold"
                    style={{ color: roomColor }}
                  >
                    {room.name}
                  </span>
                </div>

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
                      onClick={() => {
                        setPrefillData({
                          roomId: room.id,
                          date: dd.iso,
                        });
                        setShowNewModal(true);
                      }}
                    >
                      {dayRes.length === 0 && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-mint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      {dayRes.map((r) => {
                        const psych = PSYCHOLOGISTS.find(
                          (p) => p.id === r.psychId
                        );
                        if (!psych) return null;
                        const psychColor = themeHex(psych, isDark);
                        const psychRgb = themeRgb(psych, isDark);

                        return (
                          <button
                            key={r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailRes(r);
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
                              {r.startTime}
                            </span>
                            <span className="min-w-0">
                              <span
                                className="block font-body text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ color: psychColor }}
                              >
                                {psych.shortName}
                              </span>
                              <span className="block font-body text-[11px] text-[var(--text-soft)]">
                                {r.startTime} - {r.endTime}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
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
