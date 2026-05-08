import type { Room, Psychologist, Reservation } from "@/types";
import { format, addDays } from "date-fns";

export const ROOMS: Room[] = [
  { id: 1, name: "Sala 01", hex: "#c4b5fd", rgb: "196,181,253", lightHex: "#6d28d9", lightRgb: "109,40,217" },
  { id: 2, name: "Sala 02", hex: "#7dd3fc", rgb: "125,211,252", lightHex: "#0369a1", lightRgb: "3,105,161" },
  { id: 3, name: "Sala 03", hex: "#fda4af", rgb: "253,164,175", lightHex: "#be123c", lightRgb: "190,18,60" },
  { id: 4, name: "Sala 04", hex: "#6ee7b7", rgb: "110,231,183", lightHex: "#047857", lightRgb: "4,120,87" },
];

export const PSYCHOLOGISTS: Psychologist[] = [
  {
    id: 1,
    name: "Dra. Cátia Alves",
    shortName: "Cátia Alves",
    initials: "CA",
    hex: "#c4b5fd",
    rgb: "196,181,253",
    lightHex: "#6d28d9",
    lightRgb: "109,40,217",
  },
  {
    id: 2,
    name: "Dr. Marcelo Dias",
    shortName: "Marcelo Dias",
    initials: "MD",
    hex: "#7dd3fc",
    rgb: "125,211,252",
    lightHex: "#0369a1",
    lightRgb: "3,105,161",
  },
  {
    id: 3,
    name: "Dra. Fernanda Cruz",
    shortName: "Fernanda Cruz",
    initials: "FC",
    hex: "#fda4af",
    rgb: "253,164,175",
    lightHex: "#be123c",
    lightRgb: "190,18,60",
  },
  {
    id: 4,
    name: "Dra. Juliana Matos",
    shortName: "Juliana Matos",
    initials: "JM",
    hex: "#6ee7b7",
    rgb: "110,231,183",
    lightHex: "#047857",
    lightRgb: "4,120,87",
  },
];

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

export const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

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

export const ADMIN_PIN = "1234";

const today = new Date();

function makeReservations(): Reservation[] {
  const d = (n: number) => format(addDays(today, n), "yyyy-MM-dd");
  return [
    {
      id: "r1",
      roomId: 1,
      psychId: 1,
      date: d(0),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r2",
      roomId: 2,
      psychId: 2,
      date: d(0),
      startTime: "10:00",
      endTime: "11:30",
      notes: "Avaliação inicial",
    },
    {
      id: "r3",
      roomId: 3,
      psychId: 3,
      date: d(0),
      startTime: "14:00",
      endTime: "15:00",
      notes: "",
    },
    {
      id: "r4",
      roomId: 4,
      psychId: 4,
      date: d(0),
      startTime: "16:00",
      endTime: "17:00",
      notes: "",
    },
    {
      id: "r5",
      roomId: 1,
      psychId: 2,
      date: d(1),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r6",
      roomId: 2,
      psychId: 4,
      date: d(1),
      startTime: "11:00",
      endTime: "12:00",
      notes: "Grupo terapêutico",
    },
    {
      id: "r7",
      roomId: 3,
      psychId: 1,
      date: d(1),
      startTime: "14:00",
      endTime: "15:30",
      notes: "",
    },
    {
      id: "r8",
      roomId: 1,
      psychId: 3,
      date: d(2),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r9",
      roomId: 4,
      psychId: 2,
      date: d(2),
      startTime: "13:00",
      endTime: "14:00",
      notes: "",
    },
    {
      id: "r10",
      roomId: 2,
      psychId: 1,
      date: d(3),
      startTime: "10:00",
      endTime: "11:00",
      notes: "",
    },
    {
      id: "r11",
      roomId: 3,
      psychId: 4,
      date: d(3),
      startTime: "15:00",
      endTime: "16:30",
      notes: "",
    },
    {
      id: "r12",
      roomId: 1,
      psychId: 2,
      date: d(5),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r13",
      roomId: 4,
      psychId: 3,
      date: d(5),
      startTime: "14:00",
      endTime: "15:00",
      notes: "",
    },
    {
      id: "r14",
      roomId: 2,
      psychId: 1,
      date: d(7),
      startTime: "09:00",
      endTime: "10:30",
      notes: "",
    },
    {
      id: "r15",
      roomId: 3,
      psychId: 2,
      date: d(7),
      startTime: "13:00",
      endTime: "14:00",
      notes: "",
    },
    {
      id: "r16",
      roomId: 1,
      psychId: 4,
      date: d(8),
      startTime: "10:00",
      endTime: "11:00",
      notes: "Avaliação",
    },
    {
      id: "r17",
      roomId: 2,
      psychId: 3,
      date: d(10),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r18",
      roomId: 4,
      psychId: 1,
      date: d(14),
      startTime: "14:00",
      endTime: "15:00",
      notes: "",
    },
    {
      id: "r19",
      roomId: 1,
      psychId: 3,
      date: d(14),
      startTime: "09:00",
      endTime: "10:00",
      notes: "",
    },
    {
      id: "r20",
      roomId: 3,
      psychId: 2,
      date: d(21),
      startTime: "11:00",
      endTime: "12:00",
      notes: "",
    },
  ];
}

export const INITIAL_RESERVATIONS = makeReservations();

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
  );
}
