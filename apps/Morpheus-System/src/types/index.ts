export interface Room {
  id: number;
  name: string;
  hex: string;
  rgb: string;
  lightHex: string;
  lightRgb: string;
}

export interface Psychologist {
  id: number;
  name: string;
  shortName: string;
  initials: string;
  hex: string;
  rgb: string;
  lightHex: string;
  lightRgb: string;
}

export interface Reservation {
  id: string;
  roomId: number;
  psychId: number;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export type AppView = "splash" | "admin" | "psych";

export interface AppState {
  view: AppView;
  activePsych: Psychologist | null;
}
