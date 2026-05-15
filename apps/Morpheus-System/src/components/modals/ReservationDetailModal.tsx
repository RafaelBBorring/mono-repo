"use client";

import { Clock, FileText, MapPin, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { themeHex, themeRgb } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Reservation } from "@/types";

interface ReservationDetailModalProps {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
}

export default function ReservationDetailModal({
  open,
  onClose,
  reservation,
}: ReservationDetailModalProps) {
  const { removeReservation, activePsych, view, theme, rooms, psychologists } = useApp();

  if (!reservation) return null;

  const room = rooms.find((item) => item.id === reservation.roomId);
  const psych = psychologists.find((item) => item.id === reservation.psychId);
  if (!room || !psych) return null;

  const isDark = theme === "dark";
  const roomColor = themeHex(room, isDark);
  const roomRgb = themeRgb(room, isDark);
  const psychColor = themeHex(psych, isDark);
  const psychRgb = themeRgb(psych, isDark);
  const canDelete = view === "admin" || activePsych?.id === reservation.psychId;

  const dateFormatted = new Date(`${reservation.date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Modal open={open} onClose={onClose} colorRgb={roomRgb} title="Detalhes da reserva">
      <div className="grid gap-5">
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `rgba(${roomRgb},${isDark ? 0.1 : 0.07})`,
            borderColor: `rgba(${roomRgb},${isDark ? 0.34 : 0.24})`,
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ color: roomColor, borderColor: roomColor }}>
              <MapPin size={27} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-brand text-3xl font-semibold" style={{ color: roomColor }}>
                {room.name}
              </span>
              <span className="mt-1 block truncate font-body text-base text-[var(--text-muted)] capitalize">
                {dateFormatted}
              </span>
            </span>
          </div>
        </section>

        <section
          className="rounded-3xl border p-5"
          style={{
            background: `rgba(${psychRgb},${isDark ? 0.1 : 0.07})`,
            borderColor: `rgba(${psychRgb},${isDark ? 0.34 : 0.24})`,
          }}
        >
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border font-brand text-xl font-semibold" style={{ color: psychColor, borderColor: psychColor }}>
              {psych.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-brand text-2xl font-semibold text-[var(--text-primary)]">
                {psych.name}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-2" style={{ color: psychColor, borderColor: `rgba(${psychRgb},0.36)` }}>
                <Clock size={19} />
                <span className="font-body text-base font-extrabold">
                  {reservation.startTime} - {reservation.endTime}
                </span>
              </div>

              {reservation.notes && (
                <div className="mt-5 flex items-start gap-3 border-t border-[var(--border-light)] pt-5">
                  <FileText size={20} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                  <div>
                    <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Observação
                    </p>
                    <p className="mt-1 font-body text-base text-[var(--text-primary)]">
                      {reservation.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost" size="lg" className="flex-1" onClick={onClose}>
          Fechar
        </Button>
        {canDelete && (
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            onClick={() => {
              removeReservation(reservation.id);
              onClose();
            }}
          >
            <Trash2 size={20} />
            Excluir reserva
          </Button>
        )}
      </div>
    </Modal>
  );
}
