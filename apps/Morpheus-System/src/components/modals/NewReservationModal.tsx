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
  const { addReservation, activePsych, view } = useApp();
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
    "w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-3 text-morpheus-text font-body text-base outline-none focus:border-[rgba(196,181,253,0.4)] transition-colors";
  const labelClass =
    "block text-sm text-morpheus-muted tracking-wider uppercase mb-1 font-body";

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="font-display text-2xl text-morpheus-text font-light mb-6 pr-8">
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
                  border: `1px solid rgba(${p.rgb},${psychId === p.id ? 0.44 : 0.14})`,
                  background: `rgba(${p.rgb},${psychId === p.id ? 0.18 : 0.05})`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: `rgba(${p.rgb},0.2)`,
                    color: p.hex,
                  }}
                >
                  {p.initials}
                </div>
                <span
                  className="font-body text-sm truncate"
                  style={{ color: psychId === p.id ? p.hex : "#f0ede8" }}
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
                border: `1px solid rgba(${r.rgb},${roomId === r.id ? 0.44 : 0.14})`,
                background: `rgba(${r.rgb},${roomId === r.id ? 0.18 : 0.05})`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ background: r.hex }}
              />
              <span
                className="font-body text-xs"
                style={{ color: roomId === r.id ? r.hex : "rgba(240,237,232,0.5)" }}
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
              <option key={h} value={h} className="bg-[#0c0921]">
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
              <option key={h} value={h} className="bg-[#0c0921]">
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
