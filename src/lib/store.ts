"use client";
/**
 * ShiftKar Neo — global client state (Zustand + localStorage persistence).
 * Same persisted settings as the original, reimagined for React.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GroupFilter, ThemeId, ThemeMode, CalendarSystem } from "./models";
import { todayJalaali } from "./jalali";

export type ViewType = "grid" | "table";
export type TabId = "calendar" | "systems" | "roster" | "settings";

interface ShiftKarState {
  /* persisted settings */
  theme: ThemeId;
  themeMode: ThemeMode;
  myGroup: GroupFilter;
  filterGroup: GroupFilter;
  viewType: ViewType;
  calendarSystem: CalendarSystem;
  showEvents: boolean;
  onboardingDone: boolean;
  tourDone: boolean;
  hapticOn: boolean;
  viewYear: number;
  viewMonth: number;

  /* transient ui */
  tab: TabId;
  selectedDateKey: string | null;
  notesOpen: boolean;
  hydrated: boolean;

  set: (patch: Partial<Omit<ShiftKarState, "set" | "reset">>) => void;
  reset: () => void;
}

const today = todayJalaali();

const DEFAULTS = {
  theme: "blue" as ThemeId,
  themeMode: "system" as ThemeMode,
  myGroup: "A" as GroupFilter,
  filterGroup: "A" as GroupFilter,
  viewType: "grid" as ViewType,
  calendarSystem: "jalali" as CalendarSystem,
  showEvents: true,
  onboardingDone: false,
  tourDone: false,
  hapticOn: true,
  viewYear: today.jy,
  viewMonth: today.jm,
};

/* Older builds used different theme ids — map them onto the loyal palette. */
const THEME_MIGRATION: Record<string, ThemeId> = {
  nebula: "purple",
  ocean: "teal",
  emerald: "emerald",
  sunset: "orange",
  rose: "rose",
  gold: "orange",
};

export const useShiftKar = create<ShiftKarState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      tab: "calendar",
      selectedDateKey: null,
      notesOpen: false,
      hydrated: false,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "shiftkar-neo.settings.v1",
      version: 3,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (typeof p.theme === "string" && THEME_MIGRATION[p.theme]) {
          p.theme = THEME_MIGRATION[p.theme];
        }
        /* «همه» no longer exists in Settings/Onboarding (calendar view only):
           an old myGroup=ALL would leave Settings without a valid selection —
           fold it onto the default group ONCE during hydration. */
        if (p.myGroup === "ALL") p.myGroup = "A";
        return p as unknown as ShiftKarState;
      },
      partialize: (s) => ({
        theme: s.theme,
        themeMode: s.themeMode,
        myGroup: s.myGroup,
        filterGroup: s.filterGroup,
        viewType: s.viewType,
        calendarSystem: s.calendarSystem,
        showEvents: s.showEvents,
        onboardingDone: s.onboardingDone,
        tourDone: s.tourDone,
        hapticOn: s.hapticOn,
        viewYear: s.viewYear,
        viewMonth: s.viewMonth,
      }),
      onRehydrateStorage: () => (state) => {
        state?.set({ hydrated: true });
      },
    },
  ),
);

/** Theme application helper — called on every relevant state change. */
export function applyThemeToDom(theme: ThemeId, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  /* Inline style (NOT a CSS rule): LightningCSS downlevels color-scheme
     and silently DROPS the `html:not(.dark) { color-scheme: light }`
     variant. Setting it here always matches the EFFECTIVE theme, so
     native form controls/scrollbars follow the UI even when the user
     forces light on a dark system (or vice-versa). */
  root.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0a0d1a" : "#f4f2fb");
}

export function haptic(enabled: boolean, ms = 8) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
