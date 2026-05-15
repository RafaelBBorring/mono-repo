"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Clock, MapPin, User as UserIcon } from "lucide-react";
import { HOURS } from "@/lib/data";
import { useApp } from "@/context/AppContext";
import { themeHex, themeRgb } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Reservation } from "@/types";

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
  const { addReservation, activePsych, view, theme, rooms, psychologists } = useApp();
  const [psychId, setPsychId] = useState<number | null>(
    prefill.psychId ?? activePsych?.id ?? null
  );
  const [roomId, setRoomId] = useState<number | null>(prefill.roomId ?? null);
  const [date, setDate] = useState(prefill.date ?? "");
  const [startTime, setStartTime] = useState(prefill.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(prefill.endTime ?? "10:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isPsych = view === "psych";
  const isDark = theme === "dark";

  useEffect(() => {
    if (!open) return;
    setPsychId(prefill.psychId ?? activePsych?.id ?? null);
    setRoomId(prefill.roomId ?? null);
    setDate(prefill.date ?? "");
    setStartTime(prefill.startTime ?? "09:00");
    setEndTime(prefill.endTime ?? "10:00");
    setNotes(prefill.notes ?? "");
    setError("");
  }, [
    activePsych?.id,
    open,
    prefill.date,
    prefill.endTime,
    prefill.notes,
    prefill.psychId,
    prefill.roomId,
    prefill.startTime,
  ]);

  function handleSubmit() {
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
    addReservation({
      roomId,
      psychId,
      date,
      startTime,
      endTime,
      notes,
    }).then((ok) => {
      setSaving(false);
      if (ok) onClose();
    });
  }

  const inputClass =
    "w-full rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-primary)] px-5 py-4 font-body text-base text-[var(--text-primary)] outline-none transition";
  const labelClass =
    "mb-3 flex items-center gap-2 font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]";

  return (
    <Modal open={open} onClose={onClose} title="Nova reserva" wide>
      {!isPsych && (
        <section className="mb-8">
          <span className={labelClass}>
            <UserIcon size={18} />
            Psicólogo(a)
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            {psychologists.map((psych) => {
              const color = themeHex(psych, isDark);
              const rgb = themeRgb(psych, isDark);
              const active = psychId === psych.id;

              return (
                <button
                  key={psych.id}
                  onClick={() => setPsychId(psych.id)}
                  className="flex min-h-[86px] items-center gap-4 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5"
                  style={{
                    borderColor: active ? color : `rgba(${rgb},${isDark ? 0.24 : 0.18})`,
                    background: `rgba(${rgb},${active ? (isDark ? 0.18 : 0.11) : isDark ? 0.08 : 0.05})`,
                  }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-brand font-semibold" style={{ color, borderColor: color }}>
                    {psych.initials}
                  </span>
                  <span className="min-w-0 truncate font-body text-base font-extrabold text-[var(--text-primary)]">
                    {psych.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="mb-8">
        <span className={labelClass}>
          <MapPin size={18} />
          Sala
        </span>
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => {
            const color = themeHex(room, isDark);
            const rgb = themeRgb(room, isDark);
            const active = roomId === room.id;

            return (
              <button
                key={room.id}
                onClick={() => setRoomId(room.id)}
                className="flex min-h-[86px] items-center gap-4 rounded-3xl border p-4 text-left transition hover:-translate-y-0.5"
                style={{
                  borderColor: active ? color : `rgba(${rgb},${isDark ? 0.24 : 0.18})`,
                  background: `rgba(${rgb},${active ? (isDark ? 0.18 : 0.11) : isDark ? 0.08 : 0.05})`,
                }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-brand font-semibold" style={{ color, borderColor: color }}>
                  {String(room.id).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate font-body text-base font-extrabold text-[var(--text-primary)]">
                  {room.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>
            <Calendar size={18} />
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(error && !date)}
          />
        </div>
        <div>
          <label className={labelClass}>
            <Clock size={18} />
            Horário de início
          </label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(error && startTime >= endTime)}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour} className="bg-[var(--bg-primary)]">
                {hour}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>
            <Clock size={18} />
            Horário de término
          </label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(error && startTime >= endTime)}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour} className="bg-[var(--bg-primary)]">
                {hour}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Observação opcional</label>
          <input
            type="text"
            placeholder="Adicione uma nota sobre esta reserva..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </div>
      </section>

      {error && (
        <div
          className="mt-6 flex items-start gap-4 rounded-3xl border border-[var(--state-error)] bg-[rgba(201,106,91,0.1)] p-5 font-body text-base font-bold text-[var(--state-error)]"
          role="alert"
        >
          <AlertTriangle size={22} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="gradient" size="lg" className="flex-[2]" onClick={handleSubmit} disabled={saving}>
          {saving ? "Salvando..." : "Confirmar reserva"}
        </Button>
      </div>
    </Modal>
  );
}
