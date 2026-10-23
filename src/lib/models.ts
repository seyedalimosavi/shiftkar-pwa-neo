/**
 * ShiftKar Neo — shared domain constants and Persian labels.
 * Kept loyal to the original ShiftKar naming and palette.
 */
import type { ShiftCode } from "./shift-engine";

export type Group = "A" | "B" | "C" | "D";
export const GROUPS: Group[] = ["A", "B", "C", "D"];
export const GROUP_FILTERS = ["ALL", "A", "B", "C", "D"] as const;
export type GroupFilter = (typeof GROUP_FILTERS)[number];

export const GROUP_FA: Record<Group, string> = {
  A: "گروه A",
  B: "گروه B",
  C: "گروه C",
  D: "گروه D",
};

export type ShiftKind = "DAY" | "NIGHT" | "REST";

export const SHIFT_KIND: Record<ShiftKind, { fa: string; short: string; icon: string }> = {
  DAY: { fa: "روزکار", short: "روز", icon: "sun" },
  NIGHT: { fa: "شبکار", short: "شب", icon: "moon" },
  REST: { fa: "استراحت", short: "استراحت", icon: "rest" },
};

/** Human label per cycle code (M1…R4) — «روزکار دوم» style, like the original. */
export const CODE_FA: Record<ShiftCode, string> = {
  M1: "روزکار اول",
  M2: "روزکار دوم",
  N1: "شبکار اول",
  N2: "شبکار دوم",
  R1: "استراحت اول",
  R2: "استراحت دوم",
  R3: "استراحت سوم",
  R4: "استراحت چهارم",
};

export function codeToKind(code: ShiftCode): ShiftKind {
  if (code.startsWith("M")) return "DAY";
  if (code.startsWith("N")) return "NIGHT";
  return "REST";
}

/* ---- Themes — the same six palettes and names as the original ---- */
export const THEMES = [
  { id: "blue", fa: "آبی", hex: "#3d6bf5" },
  { id: "emerald", fa: "زمردی", hex: "#0f9d72" },
  { id: "purple", fa: "بنفش", hex: "#8b5cf6" },
  { id: "orange", fa: "نارنجی", hex: "#f46b16" },
  { id: "rose", fa: "رز", hex: "#f43f5e" },
  { id: "teal", fa: "فیروزه‌ای", hex: "#0ea5a0" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_MODES = [
  { id: "light", fa: "روشن" },
  { id: "dark", fa: "تیره" },
  { id: "system", fa: "هماهنگ با سیستم" },
] as const;
export type ThemeMode = (typeof THEME_MODES)[number]["id"];

/* ---- Calendar systems ---- */
export const CALENDAR_SYSTEMS = [
  { id: "jalali", fa: "هجری شمسی" },
  { id: "hijri", fa: "هجری قمری" },
  { id: "gregorian", fa: "میلادی" },
] as const;
export type CalendarSystem = (typeof CALENDAR_SYSTEMS)[number]["id"];

export const APP = {
  name: "شیفت‌کار نئو",
  nameEn: "ShiftKar Neo",
  version: "2.0.0",
  tagline: "تقویم هوشمند شیفت کاری",
} as const;
