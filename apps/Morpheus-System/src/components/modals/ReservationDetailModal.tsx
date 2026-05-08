"use client";

import { useApp } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ROOMS, PSYCHOLOGISTS } from "@/lib/data";
import { themeHex, themeRgb } from "@/lib/utils";
import type { Reservation } from "@/types";
import { Clock, FileText, Trash2 } from "lucide-react";

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
  const { removeReservation, activePsych, view, theme } = useApp();

  if (!reservation) return null;

  const room = ROOMS.find((r) => r.id === reservation.roomId);
  const psych = PSYCHOLOGISTS.find((p) => p.id === reservation.psychId);
  if (!room || !psych) return null;

  const isDark = theme === "dark";
  const roomColor = themeHex(room, isDark);
  const roomRgb = themeRgb(room, isDark);
  const psychColor = themeHex(psych, isDark);
  const psychRgb = themeRgb(psych, isDark);

  const dateFormatted = new Date(reservation.date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const canDelete = view === "admin" || activePsych?.id === reservation.psychId;

  return (
    <Modal open={open} onClose={onClose} colorRgb={roomRgb}>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: roomColor }}
          />
          <h2 className="font-display text-2xl text-[var(--text-primary)] font-light">
            {room.name}
          </h2>
        </div>
        <p className="font-body text-sm text-[var(--text-muted)] capitalize">
          {dateFormatted}
        </p>
      </div>

      <div
        className="p-4 rounded-xl mb-6"
        style={{
          background: `rgba(${psychRgb},${isDark ? 0.09 : 0.07})`,
          border: `1px solid rgba(${psychRgb},${isDark ? 0.2 : 0.18})`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-body text-sm font-bold flex-shrink-0"
            style={{
              background: `rgba(${psychRgb},${isDark ? 0.22 : 0.1})`,
              color: psychColor,
            }}
          >
            {psych.initials}
          </div>
          <div className="min-w-0">
            <p className="font-body text-lg text-[var(--text-primary)] font-medium">
              {psych.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={13} style={{ color: `rgba(${psychRgb},${isDark ? 0.66 : 0.8})` }} />
              <span
                className="font-body text-sm"
                style={{ color: `rgba(${psychRgb},${isDark ? 0.66 : 0.8})` }}
              >
                {reservation.startTime} - {reservation.endTime}
              </span>
            </div>
            {reservation.notes && (
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: `rgba(${psychRgb},0.12)` }}>
                <FileText size={13} className="text-[var(--text-muted)] mt-0.5" />
                <span className="font-body text-sm text-[var(--text-muted)]">
                  {reservation.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Fechar
        </Button>
        {canDelete && (
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              removeReservation(reservation.id);
              onClose();
            }}
          >
            <Trash2 size={16} />
            Excluir Reserva
          </Button>
        )}
      </div>
    </Modal>
  );
}
