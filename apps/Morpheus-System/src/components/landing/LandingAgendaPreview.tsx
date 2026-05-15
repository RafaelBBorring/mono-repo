"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, DoorOpen, UserRound } from "lucide-react";

const SLOT_HEIGHT = 58;
const times = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"];
const bodyHeight = (times.length - 1) * SLOT_HEIGHT;

const rooms = [
  { name: "Sala 1", color: "#2f6f59" },
  { name: "Sala 2", color: "#4f7d95" },
  { name: "Sala 3", color: "#b1723f" },
  { name: "Sala 4", color: "#7460a8" },
];

const days = [
  { dow: "SEG", day: "11", date: "11 maio" },
  { dow: "TER", day: "12", date: "12 maio" },
  { dow: "QUA", day: "13", date: "13 maio" },
  { dow: "QUI", day: "14", date: "14 maio" },
  { dow: "SEX", day: "15", date: "15 maio", today: true },
  { dow: "SAB", day: "16", date: "16 maio" },
];

const reservations = [
  { day: 0, room: 0, start: 2, span: 2, doctor: "Dra. Helena", initials: "HE", time: "09:00", color: "#2f6f59" },
  { day: 0, room: 2, start: 6, span: 2, doctor: "Dr. Marcos", initials: "MA", time: "11:00", color: "#b1723f" },
  { day: 1, room: 1, start: 1, span: 3, doctor: "Dra. Livia", initials: "LI", time: "08:30", color: "#4f7d95" },
  { day: 2, room: 3, start: 4, span: 2, doctor: "Dr. Theo", initials: "TH", time: "10:00", color: "#7460a8" },
  { day: 3, room: 0, start: 3, span: 2, doctor: "Dra. Ana", initials: "AN", time: "09:30", color: "#2f6f59" },
  { day: 3, room: 2, start: 7, span: 2, doctor: "Dra. Cora", initials: "CO", time: "11:30", color: "#b1723f" },
  { day: 4, room: 1, start: 2, span: 4, doctor: "Dr. Caio", initials: "CA", time: "09:00", color: "#4f7d95" },
  { day: 4, room: 3, start: 7, span: 2, doctor: "Dra. Maya", initials: "MY", time: "11:30", color: "#7460a8" },
  { day: 5, room: 0, start: 5, span: 2, doctor: "Dra. Nina", initials: "NI", time: "10:30", color: "#2f6f59" },
];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
}

export default function LandingAgendaPreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-[#d9ded4] bg-[#fbfaf5] p-3 shadow-2xl shadow-[#16352b]/10 sm:rounded-[1.75rem] sm:p-4 lg:p-5">
      <div
        className="absolute inset-0 opacity-80"
        style={{ background: "linear-gradient(135deg, rgba(47,111,89,0.08), transparent 34%, rgba(177,114,63,0.08))" }}
      />

      <div className="relative mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-[#dbe2d7] bg-white/82 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d2ddd4] bg-[#eef4ed] text-[#235f4b]">
            <CalendarDays size={20} />
          </span>
          <div>
            <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#6b7d73]">
              Agenda semanal
            </p>
            <h3 className="font-brand text-xl font-semibold text-[#102b23] sm:text-2xl">
              Datas, salas e doutores no mesmo mapa
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6ded3] bg-white text-[#31584b]" aria-label="Semana anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="rounded-xl border border-[#d6ded3] bg-white px-3 py-2 font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[#31584b]">
            11-16 maio
          </span>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6ded3] bg-white text-[#31584b]" aria-label="Proxima semana">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative overflow-x-auto rounded-2xl border border-[#d6ded3] bg-white shadow-inner">
        <div
          className="grid min-w-[1720px]"
          style={{ gridTemplateColumns: "84px repeat(6, minmax(270px, 1fr))" }}
        >
          <div className="sticky left-0 z-30 flex items-end border-b border-r border-[#d6ded3] bg-[#f4f6f0] p-3">
            <span className="font-body text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6b7d73]">
              Horario
            </span>
          </div>

          {days.map((day) => (
            <div key={day.date} className="border-b border-r border-[#d6ded3] bg-[#fafbf7] p-3 text-center">
              <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#6b7d73]">{day.dow}</p>
              <div
                className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-2xl border font-brand text-2xl font-semibold"
                style={{
                  borderColor: day.today ? "rgba(47,111,89,0.72)" : "transparent",
                  background: day.today ? "rgba(47,111,89,0.09)" : "transparent",
                  color: day.today ? "#174a3a" : "#102b23",
                }}
              >
                {day.day}
              </div>
              <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(0, 1fr))` }}>
                {rooms.map((room) => (
                  <span
                    key={`${day.date}-${room.name}`}
                    className="mx-auto h-2 w-2 rounded-full"
                    style={{ background: room.color, opacity: day.today ? 1 : 0.58 }}
                    title={room.name}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="sticky left-0 z-20 border-r border-[#d6ded3] bg-[#f4f6f0]" style={{ height: bodyHeight }}>
            {times.map((time, index) => (
              <span
                key={time}
                className={`absolute left-3 -translate-y-1/2 font-brand ${time.endsWith(":30") ? "text-xs text-[#8a978f]" : "text-sm text-[#20382f]"}`}
                style={{ top: index * SLOT_HEIGHT }}
              >
                {time}
              </span>
            ))}
          </div>

          {days.map((day, dayIndex) => (
            <div
              key={`body-${day.date}`}
              className="relative border-r border-[#d6ded3]"
              style={{
                height: bodyHeight,
                background: day.today ? "rgba(47,111,89,0.045)" : "rgba(255,255,255,0.86)",
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 56px, rgba(22,53,43,0.12) 56px, rgba(22,53,43,0.12) 58px)",
                }}
              />
              <div className="relative grid h-full" style={{ gridTemplateColumns: `repeat(${rooms.length}, minmax(66px, 1fr))` }}>
                {rooms.map((room, roomIndex) => {
                  const rgb = hexToRgb(room.color);
                  const roomReservations = reservations.filter((reservation) => reservation.day === dayIndex && reservation.room === roomIndex);

                  return (
                    <div
                      key={`${day.date}-${room.name}`}
                      className="relative h-full border-l border-[#dde4d9]"
                      style={{ background: `rgba(${rgb},0.035)` }}
                    >
                      <div className="absolute left-2 right-2 top-2 flex h-7 items-center justify-center gap-1 rounded-lg bg-white/70 px-1 ring-1 ring-[#dbe2d7]">
                        <DoorOpen size={12} className="shrink-0 text-[#6b7d73]" />
                        <span className="truncate font-body text-[10px] font-extrabold uppercase tracking-[0.04em] text-[#52665b]">
                          {room.name}
                        </span>
                      </div>

                      {roomReservations.map((reservation) => {
                        const resRgb = hexToRgb(reservation.color);
                        return (
                          <div
                            key={`${reservation.doctor}-${reservation.start}`}
                            className="absolute left-2 right-2 z-10 overflow-hidden rounded-xl border p-2 text-left shadow-lg"
                            style={{
                              top: reservation.start * SLOT_HEIGHT + 10,
                              height: reservation.span * SLOT_HEIGHT - 14,
                              color: "#102b23",
                              background: `linear-gradient(180deg, rgba(${resRgb},0.17), rgba(255,255,255,0.92))`,
                              borderColor: `rgba(${resRgb},0.58)`,
                              boxShadow: `0 18px 32px rgba(${resRgb},0.16)`,
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-brand text-xs font-bold text-white"
                                style={{ background: reservation.color }}
                              >
                                {reservation.initials}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-brand text-[13px] font-bold leading-tight">{reservation.doctor}</p>
                                <p className="truncate font-body text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#62766b]">
                                  {reservation.time} - {rooms[reservation.room].name}
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
          { icon: Clock3, title: "Datas visiveis", text: "Semana completa com a data atual destacada." },
          { icon: DoorOpen, title: "Salas dinamicas", text: "Cada dia abre as salas cadastradas pela clinica." },
          { icon: UserRound, title: "Reservas por doutor", text: "Blocos mostram profissional, sala e horario." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-[#d9ded4] bg-white/80 p-4 shadow-sm">
              <Icon size={18} className="text-[#2f6f59]" />
              <p className="mt-3 font-brand text-lg font-semibold text-[#102b23]">{item.title}</p>
              <p className="mt-1 font-body text-sm leading-6 text-[#63736b]">{item.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
