import { clsx, type ClassValue } from "clsx";
import type { Psychologist, Room } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function themeHex(item: Room | Psychologist, isDark: boolean): string {
  return isDark ? item.hex : item.lightHex;
}

export function themeRgb(item: Room | Psychologist, isDark: boolean): string {
  return isDark ? item.rgb : item.lightRgb;
}

export function getRoomHex(roomId: number): string {
  const map: Record<number, string> = {
    1: "#c4b5fd",
    2: "#7dd3fc",
    3: "#fda4af",
    4: "#6ee7b7",
  };
  return map[roomId] || "#c4b5fd";
}

export function getRoomRgb(roomId: number): string {
  const map: Record<number, string> = {
    1: "196,181,253",
    2: "125,211,252",
    3: "253,164,175",
    4: "110,231,183",
  };
  return map[roomId] || "196,181,253";
}
