import type { Room, Psychologist, Reservation } from "@/types";
import type { SupabaseRoom, SupabasePsychologist, SupabaseReservation } from "@/types";

export const COLOR_PALETTES = [
  {
    hex: "#8fae9b",
    rgb: "143,174,155",
    lightHex: "#3f6b5b",
    lightRgb: "63,107,91",
  },
  {
    hex: "#a9d6e5",
    rgb: "169,214,229",
    lightHex: "#4f8fa5",
    lightRgb: "79,143,165",
  },
  {
    hex: "#c98268",
    rgb: "201,130,104",
    lightHex: "#9b5e4a",
    lightRgb: "155,94,74",
  },
  {
    hex: "#6baa75",
    rgb: "107,170,117",
    lightHex: "#3f6b5b",
    lightRgb: "63,107,91",
  },
  {
    hex: "#d8a24a",
    rgb: "216,162,74",
    lightHex: "#946817",
    lightRgb: "148,104,23",
  },
  {
    hex: "#ece8dd",
    rgb: "236,232,221",
    lightHex: "#66736e",
    lightRgb: "102,115,110",
  },
] as const;

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const HOURS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

export function mapRoom(row: SupabaseRoom): Room {
  return {
    id: row.id,
    name: row.name,
    hex: row.hex,
    rgb: row.rgb,
    lightHex: row.light_hex,
    lightRgb: row.light_rgb,
  };
}

export function mapPsychologist(row: SupabasePsychologist): Psychologist {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    initials: row.initials,
    email: row.email ?? undefined,
    hex: row.hex,
    rgb: row.rgb,
    lightHex: row.light_hex,
    lightRgb: row.light_rgb,
  };
}

export function mapReservation(row: SupabaseReservation): Reservation {
  return {
    id: row.id,
    roomId: row.room_id,
    psychId: row.psych_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes ?? "",
  };
}

export function toReservationRow(data: Omit<Reservation, "id">): Omit<SupabaseReservation, "id" | "created_at"> {
  return {
    room_id: data.roomId,
    psych_id: data.psychId,
    date: data.date,
    start_time: data.startTime,
    end_time: data.endTime,
    notes: data.notes,
  };
}
