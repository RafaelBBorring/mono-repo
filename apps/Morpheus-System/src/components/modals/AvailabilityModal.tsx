"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import { ROOMS, PSYCHOLOGISTS } from "@/lib/data";

interface AvailabilityModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AvailabilityModal({
  open,
  onClose,
}: AvailabilityModalProps) {
  const { reservations } = useApp();
  const [avDate, setAvDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const MIN = 8;
  const MAX = 20;
  const TOTAL = (MAX - MIN) * 60;

  function timeToPercent(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return ((h - MIN) * 60 + m) / TOTAL * 100;
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
      <h2 className="font-display text-2xl text-morpheus-text font-light mb-1">
        Disponibilidade das Salas
      </h2>
      <p className="font-body text-sm text-morpheus-muted capitalize mb-4">
        {dateFormatted}
      </p>

      <input
        type="date"
        value={avDate}
        onChange={(e) => setAvDate(e.target.value)}
        className="w-full bg-white/[0.06] border border-[rgba(196,181,253,0.17)] rounded-lg px-3 py-3 text-morpheus-text font-body text-base outline-none mb-6"
      />

      <div className="pl-16 mb-1">
        <div className="flex justify-between">
          {[8, 10, 12, 14, 16, 18, 20].map((h) => (
            <span key={h} className="font-body text-xs text-morpheus-muted">
              {h}h
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {ROOMS.map((room) => {
          const roomRes = dayRes.filter((r) => r.roomId === room.id);

          return (
            <div key={room.id} className="flex items-center gap-3">
              <div className="w-14 flex-shrink-0 flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: room.hex }}
                />
                <span className="font-body text-xs text-morpheus-muted">
                  {room.name}
                </span>
              </div>
              <div
                className="flex-1 h-10 rounded-lg relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {roomRes.length === 0 ? (
                  <div className="absolute inset-0 flex items-center pl-3">
                    <span className="font-body text-xs text-[rgba(110,231,183,0.42)]">
                      ● Livre
                    </span>
                  </div>
                ) : (
                  roomRes.map((r) => {
                    const psych = PSYCHOLOGISTS.find(
                      (p) => p.id === r.psychId
                    );
                    if (!psych) return null;
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
                          background: `rgba(${psych.rgb},0.24)`,
                          border: `1px solid rgba(${psych.rgb},0.44)`,
                        }}
                      >
                        <span
                          className="font-body text-xs font-bold whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ color: psych.hex }}
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

      <div className="mt-6 pt-4 border-t border-white/[0.04]">
        <p className="font-body text-xs text-morpheus-muted tracking-wider uppercase mb-2">
          Profissionais
        </p>
        <div className="flex flex-wrap gap-2">
          {PSYCHOLOGISTS.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: `rgba(${p.rgb},0.09)`,
                border: `1px solid rgba(${p.rgb},0.17)`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: p.hex }}
              />
              <span
                className="font-body text-xs"
                style={{ color: `rgba(${p.rgb},0.78)` }}
              >
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
