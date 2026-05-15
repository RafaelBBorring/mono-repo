"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorOpen, UserRound } from "lucide-react";

const SLOT_HEIGHT = 54;
const times = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"];
const bodyHeight = (times.length - 1) * SLOT_HEIGHT;

const rooms = [
  { name: "Sala 1", color: "#9bb8a7" },
  { name: "Sala 2", color: "#8fb8d0" },
  { name: "Sala 3", color: "#d2a06f" },
  { name: "Sala 4", color: "#b7a2e8" },
];

const days = [
  { dow: "SEG", day: "11", date: "11 mai" },
  { dow: "TER", day: "12", date: "12 mai" },
  { dow: "QUA", day: "13", date: "13 mai" },
  { dow: "QUI", day: "14", date: "14 mai" },
  { dow: "SEX", day: "15", date: "15 mai", today: true },
  { dow: "SAB", day: "16", date: "16 mai" },
];

const reservations = [
  { day: 0, room: 0, start: 2, span: 2, doctor: "Dra. Helena", initials: "HE", color: "#9bb8a7" },
  { day: 0, room: 2, start: 6, span: 2, doctor: "Dr. Marcos", initials: "MA", color: "#d2a06f" },
  { day: 1, room: 1, start: 1, span: 3, doctor: "Dra. Livia", initials: "LI", color: "#8fb8d0" },
  { day: 2, room: 3, start: 4, span: 2, doctor: "Dr. Theo", initials: "TH", color: "#b7a2e8" },
  { day: 3, room: 0, start: 3, span: 2, doctor: "Dra. Ana", initials: "AN", color: "#9bb8a7" },
  { day: 3, room: 2, start: 7, span: 2, doctor: "Dra. Cora", initials: "CO", color: "#d2a06f" },
  { day: 4, room: 1, start: 2, span: 4, doctor: "Dr. Caio", initials: "CA", color: "#8fb8d0" },
  { day: 4, room: 3, start: 7, span: 2, doctor: "Dra. Maya", initials: "MY", color: "#b7a2e8" },
  { day: 5, room: 0, start: 5, span: 2, doctor: "Dra. Nina", initials: "NI", color: "#9bb8a7" },
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
}

export default function LandingAgendaPreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[#07150f] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-4 lg:p-5">
      <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 50% 0%, rgba(143,184,160,0.16), transparent 42%)" }} />

      <div className="relative mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 sm:flex-row sm:items-center sm:px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-[var(--accent-mint)]">
            <CalendarDays size={20} />
          </span>
          <div>
            <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/45">
              Agenda semanal
            </p>
            <h3 className="font-brand text-xl font-semibold text-white sm:text-2xl">
              Datas, salas e doutores no mesmo mapa
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70">
            <ChevronLeft size={18} />
          </button>
          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-body text-xs font-extrabold uppercase tracking-[0.18em] text-white/65">
            11-16 maio
          </span>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-2xl border border-white/10 bg-[#091611]">
        <div
          className="grid min-w-[1540px]"
          style={{ gridTemplateColumns: "82px repeat(6, minmax(230px, 1fr))" }}
        >
          <div className="sticky left-0 z-30 flex items-end border-b border-r border-white/10 bg-[#091611] p-3">
            <span className="font-body text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/45">
              Horario
            </span>
          </div>

          {days.map((day) => (
            <div key={day.date} className="border-b border-r border-white/10 bg-[#08130f] p-3 text-center">
              <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/55">{day.dow}</p>
              <div
                className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-2xl border font-brand text-2xl font-semibold text-white"
                style={{
                  borderColor: day.today ? "rgba(155,184,167,0.82)" : "transparent",
                  background: day.today ? "rgba(155,184,167,0.12)" : "transparent",
                }}
              >
                {day.day}
              </div>
              <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}>
                {rooms.map((room) => (
                  <span
                    key={`${day.date}-${room.name}`}
                    className="mx-auto h-2 w-2 rounded-full"
                    style={{ background: room.color, opacity: day.today ? 1 : 0.64 }}
                    title={room.name}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="sticky left-0 z-20 border-r border-white/10 bg-[#091611]" style={{ height: bodyHeight }}>
            {times.map((time, index) => (
              <span
                key={time}
                className={`absolute left-3 -translate-y-1/2 font-brand ${time.endsWith(":30") ? "text-xs text-white/35" : "text-sm text-white/80"}`}
                style={{ top: index * SLOT_HEIGHT }}
              >
                {time}
              </span>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div
              key={`body-${day.date}`}
              className="relative border-r border-white/10"
              style={{
                height: bodyHeight,
                background: day.today ? "rgba(155,184,167,0.06)" : "rgba(255,255,255,0.012)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 52px, rgba(255,255,255,0.09) 52px, rgba(255,255,255,0.09) 54px)",
                }}
              />
              <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(88px, 1fr))` }}>
                {rooms.map((room, roomIndex) => {
                  const rgb = hexToRgb(room.color);
                  const roomReservations = reservations.filter((reservation) => reservation.day === dayIndex && reservation.room === roomIndex);

                  return (
                    <div
                      key={`${day.date}-${room.name}`}
                      className="relative h-full border-l border-white/10"
                      style={{ background: `rgba(${rgb},0.026)` }}
                    >
                      <div className="absolute left-2 right-2 top-2 flex items-center gap-1 rounded-lg bg-black/10 px-2 py-1">
                        <DoorOpen size={12} className="text-white/45" />
                        <span className="truncate font-body text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/45">
                          {room.name}
                        </span>
                      </div>

                      {roomReservations.map((reservation) => {
                        const resRgb = hexToRgb(reservation.color);
                        return (
                          <div
                            key={`${reservation.doctor}-${reservation.start}`}
                            className="absolute left-2 right-2 overflow-hidden rounded-xl border p-2 text-left shadow-lg"
                            style={{
                              top: reservation.start * SLOT_HEIGHT + 8,
                              height: reservation.span * SLOT_HEIGHT - 12,
                              color: reservation.color,
                              background: `rgba(${resRgb},0.18)`,
                              borderColor: `rgba(${resRgb},0.62)`,
                              boxShadow: `0 14px 28px rgba(${resRgb},0.12)`,
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/20 font-brand text-xs font-bold">
                                {reservation.initials}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-brand text-sm font-bold leading-tight">{reservation.doctor}</p>
                                <p className="truncate font-body text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/55">
                                  {rooms[reservation.room].name}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 grid gap-3 md:grid-cols-3">
        {[
          { icon: Clock3, title: "Datas visiveis", text: "Semana completa com dia atual destacado." },
          { icon: DoorOpen, title: "Salas dinamicas", text: "Cada dia abre as salas cadastradas pela clinica." },
          { icon: UserRound, title: "Reservas por doutor", text: "Blocos mostram profissional, sala e horario." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <Icon size={18} className="text-[var(--accent-mint)]" />
              <p className="mt-3 font-brand text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-1 font-body text-sm leading-6 text-white/55">{item.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
