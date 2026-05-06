"use client";

import { useApp } from "@/context/AppContext";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { ROOMS, PSYCHOLOGISTS } from "@/lib/data";
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
  const { removeReservation, activePsych, view } = useApp();

  if (!reservation) return null;

  const room = ROOMS.find((r) => r.id === reservation.roomId);
  const psych = PSYCHOLOGISTS.find((p) => p.id === reservation.psychId);
  if (!room || !psych) return null;

  const dateFormatted = new Date(reservation.date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const canDelete = view === "admin" || activePsych?.id === reservation.psychId;

  return (
    <Modal open={open} onClose={onClose} colorRgb={room.rgb}>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: room.hex }}
          />
          <h2 className="font-display text-2xl text-morpheus-text font-light">
            {room.name}
          </h2>
        </div>
        <p className="font-body text-sm text-morpheus-muted capitalize">
          {dateFormatted}
        </p>
      </div>

      <div
        className="p-4 rounded-xl mb-6"
        style={{
          background: `rgba(${psych.rgb},0.09)`,
          border: `1px solid rgba(${psych.rgb},0.2)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-body text-sm font-bold flex-shrink-0"
            style={{
              background: `rgba(${psych.rgb},0.22)`,
              color: psych.hex,
            }}
          >
            {psych.initials}
          </div>
          <div className="min-w-0">
            <p className="font-body text-lg text-morpheus-text font-medium">
              {psych.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock size={13} style={{ color: `rgba(${psych.rgb},0.66)` }} />
              <span
                className="font-body text-sm"
                style={{ color: `rgba(${psych.rgb},0.66)` }}
              >
                {reservation.startTime} – {reservation.endTime}
              </span>
            </div>
            {reservation.notes && (
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: `rgba(${psych.rgb},0.12)` }}>
                <FileText size={13} className="text-morpheus-muted mt-0.5" />
                <span className="font-body text-sm text-morpheus-muted">
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
