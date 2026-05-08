"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { ROOMS, PSYCHOLOGISTS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";

interface AvailabilityModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AvailabilityModal({
  open,
  onClose,
}: AvailabilityModalProps) {
  const { reservations, theme } = useApp();
  const [avDate, setAvDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const isDark = theme === "dark";
  const MIN = 8;
  const MAX = 20;
  const TOTAL = (MAX - MIN) * 60;

  function timeToPercent(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return (((h - MIN) * 60 + m) / TOTAL) * 100;
  }

  const dayRes = reservations.filter((r) => r.date === avDate);
  const dateFormatted = new Date(avDate + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal open={open} onClose={onClose} wide>
      <h2 className="font-display text-2xl text-[var(--text-primary)] font-light mb-1">
        Disponibilidade das Salas
      </h2>
      <p className="font-body text-sm text-[var(--text-muted)] capitalize mb-4">
        {dateFormatted}
      </p>

      <input
        type="date"
        value={avDate}
        onChange={(e) => setAvDate(e.target.value)}
        className="w-full bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg px-3 py-3 text-[var(--text-primary)] font-body text-base outline-none mb-6"
      />

      <div className="pl-16 mb-1">
        <div className="flex justify-between">
          {[8, 10, 12, 14, 16, 18, 20].map((h) => (
            <span key={h} className="font-body text-xs text-[var(--text-muted)]">
              {h}h
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {ROOMS.map((room) => {
          const roomColor = themeHex(room, isDark);
          const roomRgb = themeRgb(room, isDark);
          const roomRes = dayRes.filter((r) => r.roomId === room.id);

          return (
            <div key={room.id} className="flex items-center gap-3">
              <div className="w-14 flex-shrink-0 flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: roomColor }}
                />
                <span className="font-body text-xs text-[var(--text-muted)]">
                  {room.name}
                </span>
              </div>
              <div
                className="flex-1 h-10 rounded-lg relative overflow-hidden"
                style={{
                  background: `rgba(${roomRgb},${isDark ? 0.04 : 0.035})`,
                  border: `1px solid rgba(${roomRgb},${isDark ? 0.09 : 0.13})`,
                }}
              >
                {roomRes.length === 0 ? (
                  <div className="absolute inset-0 flex items-center pl-3">
                    <span className="font-body text-xs text-[var(--accent-mint)] opacity-75">
                      Livre
                    </span>
                  </div>
                ) : (
                  roomRes.map((r) => {
                    const psych = PSYCHOLOGISTS.find(
                      (p) => p.id === r.psychId
                    );
                    if (!psych) return null;
                    const psychColor = themeHex(psych, isDark);
                    const psychRgb = themeRgb(psych, isDark);
                    const left = timeToPercent(r.startTime);
                    const width = Math.max(
                      timeToPercent(r.endTime) - left,
                      0
                    );
                    return (
                      <div
                        key={r.id}
                        className="absolute top-1 bottom-1 rounded flex items-center px-2 overflow-hidden"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          minWidth: "4px",
                          background: `rgba(${psychRgb},${isDark ? 0.24 : 0.12})`,
                          border: `1px solid rgba(${psychRgb},${isDark ? 0.44 : 0.3})`,
                        }}
                      >
                        <span
                          className="font-body text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ color: psychColor }}
                        >
                          {psych.shortName}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <p className="font-body text-xs text-[var(--text-muted)] tracking-wider uppercase mb-2">
          Profissionais
        </p>
        <div className="flex flex-wrap gap-2">
          {PSYCHOLOGISTS.map((p) => {
            const color = themeHex(p, isDark);
            const rgb = themeRgb(p, isDark);

            return (
              <div
                key={p.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: `rgba(${rgb},${isDark ? 0.09 : 0.06})`,
                  border: `1px solid rgba(${rgb},${isDark ? 0.17 : 0.16})`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span
                  className="font-body text-xs"
                  style={{ color }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
