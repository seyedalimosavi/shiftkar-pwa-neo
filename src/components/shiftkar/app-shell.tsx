"use client";
/**
 * App shell — splash → (onboarding guard) → tab views + bottom navigation.
 * Registers the service worker (ALWAYS — Chrome/Edge require an active SW
 * before offering the install prompt), initializes the PWA install engine
 * and applies the persisted theme on mount. Tab transitions are pure CSS
 * (transform/opacity) — no framer-motion on the hot path.
 */
import { useEffect, useRef, useState } from "react";
import { useShiftKar, applyThemeToDom } from "@/lib/store";
import { APP } from "@/lib/models";
import { initInstallPrompt, maybeAutoPromptInstall } from "@/lib/install";
import { CalendarIcon, SystemsIcon, RosterIcon, SettingsIcon, SparkIcon } from "./icons";
import { CalendarView } from "./calendar-view";
import { SystemsView } from "./systems-view";
import { RosterView } from "./roster-view";
import { SettingsView } from "./settings-view";
import { DaySheet } from "./day-sheet";
import { MonthPicker } from "./month-picker";
import { NotesSheet } from "./notes-sheet";
import { InstallSheet } from "./install-sheet";
import { Onboarding } from "./onboarding";
import { Tour } from "./tour";

const TABS = [
  { id: "calendar", fa: "تقویم", icon: CalendarIcon },
  { id: "systems", fa: "سامان‌ها", icon: SystemsIcon },
  { id: "roster", fa: "لوحه", icon: RosterIcon },
  { id: "settings", fa: "تنظیمات", icon: SettingsIcon },
] as const;

export function AppShell() {
  const hydrated = useShiftKar((s) => s.hydrated);
  const onboardingDone = useShiftKar((s) => s.onboardingDone);
  const tab = useShiftKar((s) => s.tab);
  const set = useShiftKar((s) => s.set);
  const theme = useShiftKar((s) => s.theme);
  const themeMode = useShiftKar((s) => s.themeMode);
  const [splash, setSplash] = useState(true);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [monthPicker, setMonthPicker] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [notesVersion, setNotesVersion] = useState(0);
  const installTried = useRef(false);

  /* theme on any change */
  useEffect(() => {
    applyThemeToDom(theme, themeMode);
  }, [theme, themeMode]);

  /* system theme follower in "system" mode */
  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyThemeToDom(theme, themeMode);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme, themeMode]);

  /* splash */
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1000);
    return () => clearTimeout(t);
  }, []);

  /* service worker — registered in EVERY environment (dev included):
     Chrome/Edge only become installable once a SW controls the page */
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`)
        .catch(() => {});
    }
    initInstallPrompt();
  }, []);

  /* one-time auto install prompt (never while the tour runs) */
  useEffect(() => {
    if (!onboardingDone || installTried.current) return;
    installTried.current = true;
    maybeAutoPromptInstall(
      () => setInstallOpen(true),
      () => !useShiftKar.getState().tourDone,
    );
  }, [onboardingDone]);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <SplashArt />
      </div>
    );
  }

  const showOnboarding = !onboardingDone;

  return (
    <>
      <div className="aurora-bg" aria-hidden />

      {splash && <SplashScreen key="splash" />}

      {showOnboarding ? (
        <Onboarding onDone={() => set({ onboardingDone: true })} />
      ) : (
        <main className="relative z-10 mx-auto h-full w-full max-w-md overflow-hidden">
          <div key={tab} className="sk-tab-in h-full">
            {tab === "calendar" && (
              <CalendarView
                onOpenDay={(k) => setDayKey(k)}
                onOpenNotes={() => setNotesOpen(true)}
                onOpenMonthPicker={() => setMonthPicker(true)}
              />
            )}
            {tab === "systems" && <SystemsView />}
            {tab === "roster" && <RosterView />}
            {tab === "settings" && <SettingsView onOpenInstall={() => setInstallOpen(true)} />}
          </div>

          {/* bottom navigation */}
          <nav
            className="fixed bottom-0 inset-x-0 z-40 pb-safe pt-2 px-4"
            data-tour="bottom-nav"
            aria-label="ناوبری اصلی"
          >
            <div className="mx-auto max-w-md glass-strong rounded-[26px] grid grid-cols-4 p-1.5 gap-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => useShiftKar.getState().set({ tab: t.id })}
                    className={`relative h-14 rounded-[20px] flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                      active ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-faint)]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-[var(--sk-primary)]/22 to-[var(--sk-primary)]/8 border border-[var(--sk-primary)]/25 shadow-[0_6px_18px_-8px_var(--sk-glow-a),inset_0_1px_0_var(--sk-specular)] sk-nav-pill" />
                    )}
                    <t.icon size={20} className="relative" />
                    <span className="relative text-[10.5px] font-bold">{t.fa}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* sheets */}
          <DaySheet
            dateKey={dayKey}
            onClose={() => setDayKey(null)}
            onNoteSaved={() => setNotesVersion((v) => v + 1)}
          />
          <MonthPicker open={monthPicker} onClose={() => setMonthPicker(false)} />
          <NotesSheet
            key={notesVersion}
            open={notesOpen}
            onClose={() => setNotesOpen(false)}
            onOpenDay={(k) => setDayKey(k)}
          />
          <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
          <Tour />
        </main>
      )}
    </>
  );
}

function SplashArt() {
  return (
    <div className="text-center">
      <div className="mx-auto size-20 rounded-[28px] bg-gradient-to-br from-[var(--sk-primary)] to-[var(--sk-primary-strong)] grid place-items-center text-white shadow-[0_20px_50px_-14px_var(--sk-glow-a)]">
        <SparkIcon size={36} />
      </div>
      <div className="mt-4 text-[18px] font-black text-gradient">{APP.name}</div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center overflow-hidden sk-splash">
      <div className="aurora-bg" aria-hidden />
      <div className="relative sk-splash-in">
        <SplashArt />
      </div>
    </div>
  );
}
