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
