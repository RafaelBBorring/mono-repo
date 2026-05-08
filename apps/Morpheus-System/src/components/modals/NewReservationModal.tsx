"use client";

import { ROOMS, PSYCHOLOGISTS, HOURS } from "@/lib/data";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Reservation, Room, Psychologist } from "@/types";
import { AlertTriangle } from "lucide-react";

interface NewReservationModalProps {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<Reservation>;
}

export default function NewReservationModal({
  open,
  onClose,
  prefill = {},
}: NewReservationModalProps) {
  const { addReservation, activePsych, view, theme } = useApp();
  const [psychId, setPsychId] = useState<number | null>(
    prefill.psychId ?? activePsych?.id ?? null
  );
  const [roomId, setRoomId] = useState<number | null>(prefill.roomId ?? null);
  const [date, setDate] = useState(prefill.date ?? "");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isPsych = view === "psych";
  const availableRooms = isPsych ? ROOMS : ROOMS;
  const isDark = theme === "dark";

  const handleSubmit = () => {
    setError("");

    if (!psychId) {
      setError("Selecione o(a) psicólogo(a).");
      return;
    }
    if (!roomId) {
      setError("Selecione uma sala.");
      return;
    }
    if (!date) {
      setError("Informe a data.");
      return;
    }
    if (startTime >= endTime) {
      setError("Início deve ser anterior ao término.");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      const ok = addReservation({
        roomId,
        psychId,
        date,
        startTime,
        endTime,
        notes,
      });
      setSaving(false);
      if (ok) onClose();
    }, 400);
  };

  const inputClass =
    "w-full bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg px-3 py-3 text-[var(--text-primary)] font-body text-base outline-none focus:border-[var(--accent-lavender)] transition-colors";
  const labelClass =
    "block text-sm text-[var(--text-muted)] tracking-wider uppercase mb-1 font-body";

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="font-display text-2xl text-[var(--text-primary)] font-light mb-6 pr-8">
        Nova Reserva
      </h2>

      {!isPsych && (
        <div className="mb-5">
          <span className={labelClass}>Psicólogo(a)</span>
          <div className="grid grid-cols-2 gap-2">
            {PSYCHOLOGISTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPsychId(p.id)}
                className="flex items-center gap-2 p-3 rounded-lg transition-all cursor-pointer"
                style={{
                  border: `1px solid rgba(${p.rgb},${psychId === p.id ? 0.44 : isDark ? 0.14 : 0.2})`,
                  background: `rgba(${p.rgb},${psychId === p.id ? isDark ? 0.18 : 0.22 : isDark ? 0.05 : 0.08})`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: `rgba(${p.rgb},${isDark ? 0.2 : 0.25})`,
                    color: p.hex,
                  }}
                >
                  {p.initials}
                </div>
                <span
                  className="font-body text-sm truncate"
                  style={{ color: psychId === p.id ? p.hex : "var(--text-primary)" }}
                >
                  {p.shortName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <span className={labelClass}>Sala</span>
        <div className="grid grid-cols-4 gap-2">
          {availableRooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              className="p-3 rounded-lg text-center transition-all cursor-pointer"
              style={{
                border: `1px solid rgba(${r.rgb},${roomId === r.id ? 0.44 : isDark ? 0.14 : 0.2})`,
                background: `rgba(${r.rgb},${roomId === r.id ? isDark ? 0.18 : 0.22 : isDark ? 0.05 : 0.08})`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ background: r.hex }}
              />
              <span
                className="font-body text-xs"
                style={{ color: roomId === r.id ? r.hex : "var(--text-muted)" }}
              >
                {r.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2">
          <label className={labelClass}>Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Início</label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          >
            {HOURS.map((h) => (
              <option key={h} value={h} className="bg-[var(--bg-primary)]">
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Término</label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          >
            {HOURS.map((h) => (
              <option key={h} value={h} className="bg-[var(--bg-primary)]">
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Observação</label>
          <input
            type="text"
            placeholder="Opcional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[rgba(253,164,175,0.08)] border border-[rgba(253,164,175,0.24)] flex items-center gap-2 text-[#fda4af] font-body text-sm">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="flex-[2]"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Confirmar Reserva"}
        </Button>
      </div>
    </Modal>
  );
}
