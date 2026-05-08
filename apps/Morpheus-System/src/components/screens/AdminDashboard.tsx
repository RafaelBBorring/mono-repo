"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import {
  ROOMS,
  PSYCHOLOGISTS,
  MONTHS,
  WEEKDAYS,
} from "@/lib/data";
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
  Clock,
  Shield,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
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

  const todayISO = format(new Date(), "yyyy-MM-dd");

  const weekDays = useMemo(() => {
    const ref = new Date();
    const base = addWeeks(subWeeks(ref, 0), weekOffset);
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

  const weekLabel = `${weekDays[0].num} – ${weekDays[6].num} ${
    MONTHS[new Date(weekDays[6].iso).getMonth()]
  }`;

  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
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
          <span className="px-3 py-1.5 rounded-full bg-[rgba(196,181,253,0.1)] border border-[rgba(196,181,253,0.2)] font-body text-sm text-[#c4b5fd] tracking-wider flex items-center gap-1.5">
            <Shield size={14} />
            ADMIN
          </span>
          <Button
            size="sm"
            onClick={() => {
              setPrefillData({});
              setShowNewModal(true);
            }}
            className="!bg-gradient-to-r !from-[var(--accent-lavender)] !to-[var(--accent-sky)] !text-white !border-0 !font-bold !shadow-lg !shadow-[var(--accent-lavender)]/20"
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

      {/* Week navigation */}
      <div className="p-4 md:p-5 flex items-center gap-3 flex-shrink-0 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-body text-base text-[var(--text-primary)] min-w-[180px] text-center font-medium">
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-light)] bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
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

      {/* Grid */}
      <div className="flex-1 px-4 md:px-5 pb-6 overflow-x-auto">
        <div className="grid gap-px min-w-[750px]" style={{ gridTemplateColumns: "90px repeat(7, minmax(100px, 1fr))" }}>
          {/* Header row */}
          <div />
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
                  background: dd.isToday ? "rgba(196,181,253,0.15)" : "none",
                  color: dd.isToday ? "var(--accent-lavender)" : "var(--text-primary)",
                  fontWeight: dd.isToday ? 600 : 300,
                }}
              >
                {dd.num}
              </div>
            </div>
          ))}

          {/* Room rows */}
          {ROOMS.map((room) => (
            <>
              {/* Room label */}
              <div
                key={`label-${room.id}`}
                className="flex items-start gap-2 p-2 border-t border-[var(--border-subtle)]"
              >
                <div
                  className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                  style={{
                    background: isDark ? room.hex : room.hex,
                    opacity: isDark ? 1 : 0.7,
                  }}
                />
                <span className="font-body text-sm text-[var(--text-muted)] font-medium">
                  {room.name}
                </span>
              </div>

              {/* Day cells */}
              {weekDays.map((dd) => {
                const dayRes = reservations
                  .filter(
                    (r) => r.roomId === room.id && r.date === dd.iso
                  )
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={`${room.id}-${dd.iso}`}
                    className="border-t border-l border-[var(--border-subtle)] p-2 min-h-[90px] cursor-pointer transition-colors relative group"
                    style={{
                      background: dd.isToday
                        ? `rgba(${room.rgb},${isDark ? 0.025 : 0.08})`
                        : isDark ? "transparent" : "rgba(0,0,0,0.02)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `rgba(${room.rgb},${isDark ? 0.07 : 0.15})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = dd.isToday
                        ? `rgba(${room.rgb},${isDark ? 0.025 : 0.08})`
                        : isDark ? "transparent" : "rgba(0,0,0,0.02)";
                    }}
                    onClick={() => {
                      setPrefillData({
                        roomId: room.id,
                        date: dd.iso,
                      });
                      setShowNewModal(true);
                    }}
                  >
                    {/* Quick book indicator */}
                    {dayRes.length === 0 && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--accent-mint)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    {dayRes.map((r) => {
                      const psych = PSYCHOLOGISTS.find(
                        (p) => p.id === r.psychId
                      );
                      if (!psych) return null;
                      return (
                        <button
                          key={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailRes(r);
                          }}
                          className="w-full mb-1 px-2 py-1.5 rounded-md cursor-pointer text-left transition-all"
                          style={{
                            background: `rgba(${psych.rgb},${isDark ? 0.17 : 0.22})`,
                            border: `1px solid rgba(${psych.rgb},${isDark ? 0.32 : 0.38})`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `rgba(${psych.rgb},${isDark ? 0.3 : 0.35})`;
                            e.currentTarget.style.boxShadow = `0 0 8px rgba(${psych.rgb},0.3)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `rgba(${psych.rgb},${isDark ? 0.17 : 0.22})`;
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <p
                            className="font-body text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                            style={{ color: psych.hex }}
                          >
                            {psych.shortName}
                          </p>
                          <p
                            className="font-body text-[10px]"
                            style={{
                              color: `rgba(${psych.rgb},${isDark ? 0.62 : 0.7})`,
                            }}
                          >
                            {r.startTime}–{r.endTime}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          ))}
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
