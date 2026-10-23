"use client";
/**
 * Onboarding — 6 steps, structure aligned with the ORIGINAL ShiftKar flow:
 *   ۱. تقویم هوشمند شیفت   (VERBATIM the source's first slide)
 *   ۲. شیفت شما            (group picker + icon legend — steps 2+3 merged)
 *   ۳. شخصی‌سازی نمایش     (حالت نمایش: پیش‌فرض «سیستم» + حالت نمایش جدول)
 *   ۴. رنگ دلخواه          (default آبی)
 *   ۵. نصب برنامه          (the install slide — like the source, late in the flow)
 *   ۶. همه‌چیز آماده است!   (summary + install option again — unchanged)
 * Chrome (١) is GONE (user request). Progress: «گام N از ۶» text sits at the
 * TOP; an elegant dot line sits at the BOTTOM (source .onboarding-dots style).
 * Pure CSS transitions (.sk-onb-in on keyed remount) — no framer-motion.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { useShiftKar, applyThemeToDom, haptic } from "@/lib/store";
import { GROUPS, THEMES, type Group, type ThemeId, type ThemeMode } from "@/lib/models";
import type { ViewType } from "@/lib/store";
import { calculateShift } from "@/lib/shift-engine";
import { makeDateKey, todayJalaali, toPersianDigits } from "@/lib/onboarding-utils";
import { promptInstall, getInstallState } from "@/lib/install";
import {
  SunIcon,
  MoonIcon,
  RestIcon,
  CalendarIcon,
  GroupIcon,
  PaletteIcon,
  DownloadIcon,
  MonitorIcon,
  TableIcon,
  GridIcon,
  CheckIcon,
  ChevronLeft,
  SparkIcon,
} from "./icons";

const KIND_CHIP: Record<string, { bg: string; icon: React.ReactNode; fa: string }> = {
  DAY: { bg: "bg-[var(--sk-day-soft)] text-[var(--sk-day-ink)]", icon: <SunIcon size={15} />, fa: "روزکار" },
  NIGHT: { bg: "bg-[var(--sk-night-soft)] text-[var(--sk-night-ink)]", icon: <MoonIcon size={15} />, fa: "شبکار" },
  REST: { bg: "bg-[var(--sk-rest-soft)] text-[var(--sk-rest-ink)]", icon: <RestIcon size={15} />, fa: "استراحت" },
};

/* external install state (same pattern as install-sheet) */
function subscribeInstall(cb: () => void) {
  const events = ["shiftkar-neo:install-state", "appinstalled"] as const;
  for (const e of events) window.addEventListener(e, cb);
  return () => {
    for (const e of events) window.removeEventListener(e, cb);
  };
}
const readInstalled = () => getInstallState().installed;
const readServerFalse = () => false;

/** Install CTA used on the install slide (like the source) and the LAST page. */
function InstallCta({ compact }: { compact?: boolean }) {
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const installed = useSyncExternalStore(subscribeInstall, readInstalled, readServerFalse);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => setBusy(false), 8000);
    return () => window.clearTimeout(id);
  }, [busy]);

  if (installed) {
    return (
      <div className={`rounded-2xl bg-[var(--sk-rest-soft)] border-2 border-[var(--sk-rest)]/30 flex items-center justify-center gap-2 text-[var(--sk-rest-ink)] font-bold ${compact ? "h-10 text-[12.5px] px-4" : "h-13 text-[14px]"}`}>
        <CheckIcon size={compact ? 15 : 17} />
        برنامه روی دستگاه شما نصب است
      </div>
    );
  }

  const run = async () => {
    haptic(hapticOn);
    setBusy(true);
    setHint(null);
    try {
      const res = await promptInstall();
      if (res === "installed") setHint(null);
      else if (res === "dismissed") setHint("از منوی مرورگر (⋮) گزینهٔ «نصب برنامه» را انتخاب کنید");
      else setHint("نصب خودکار الان در دسترس نیست؛ بعداً از منوی مرورگر یا تنظیمات انجامش دهید");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        className={`w-full rounded-2xl bg-[var(--sk-primary)] text-white font-black flex items-center justify-center gap-2 shadow-[0_14px_34px_-10px_var(--sk-glow-a)] active:scale-[0.98] transition-transform disabled:opacity-60 ${
          compact ? "h-10 text-[12.5px] px-4" : "h-13 text-[15px]"
        }`}
      >
        <DownloadIcon size={compact ? 15 : 17} />
        {busy ? "در حال آماده‌سازی…" : "نصب برنامه"}
      </button>
      {hint && <p className="text-[11px] text-[var(--sk-text-muted)] text-center mt-2 leading-5">{hint}</p>}
    </div>
  );
}

const TOTAL = 6;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { set, hapticOn } = useShiftKar();
  const [step, setStep] = useState(0);

  const [group, setGroup] = useState<Group>(() => (useShiftKar.getState().myGroup === "ALL" ? "A" : useShiftKar.getState().myGroup as Group));
  const [theme, setTheme] = useState<ThemeId>(() => useShiftKar.getState().theme);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => useShiftKar.getState().themeMode);
  const [viewType, setViewType] = useState<ViewType>(() => useShiftKar.getState().viewType);

  const finish = () => {
    haptic(hapticOn, 20);
    set({ onboardingDone: true, myGroup: group, filterGroup: group, theme, themeMode, viewType });
    applyThemeToDom(theme, themeMode);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden">
      {/* aurora bg (reuse global) */}
      <div className="aurora-bg" aria-hidden />

      <div className="relative flex-1 flex flex-col">
        {/* step counter — TOP (user: «گام‌ها رو ببر بالا») */}
        <div className="flex items-center justify-center pt-8">
          <span className="text-[12px] font-bold text-[var(--sk-text-muted)] bg-[var(--sk-primary-soft)] text-[var(--sk-primary)] px-3.5 py-1.5 rounded-full">
            گام {toPersianDigits(step + 1)} از {toPersianDigits(TOTAL)}
          </span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-7">
          {/* keyed remount replays the .sk-onb-in entrance on every step */}
          <div key={step} className="sk-onb-in">
            {step === 0 && (
              <Slide>
                <div className="mx-auto size-20 rounded-[28px] bg-gradient-to-br from-[var(--sk-primary)] to-[var(--sk-primary-strong)] grid place-items-center text-white shadow-[0_20px_50px_-14px_var(--sk-glow-a)] mb-6">
                  <CalendarIcon size={38} />
                </div>
                <h2 className="text-[26px] font-black text-center leading-snug">تقویم هوشمند شیفت</h2>
                <p className="text-[14px] text-[var(--sk-text-muted)] text-center mt-3 leading-7">
                  شیفت‌کار بر اساس تاریخ پایه و گروه شما، شیفت روز، شب و استراحت را
                  برای هر روز به‌صورت خودکار محاسبه می‌کند — بدون نیاز به محاسبه دستی.
                </p>
              </Slide>
            )}

            {step === 1 && (
              <Slide>
                <div className="mx-auto mb-6 size-16 rounded-[22px] bg-[var(--sk-primary-soft)] grid place-items-center text-[var(--sk-primary)]">
                  <GroupIcon size={30} />
                </div>
                <h2 className="text-[24px] font-black text-center">شیفت شما کدام است؟</h2>
                <p className="text-[14px] text-[var(--sk-text-muted)] text-center mt-2 mb-5">
                  تقویم بر اساس گروه شما شخصی‌سازی می‌شود
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {GROUPS.map((g) => {
                    const active = group === g;
                    const preview = calculateShift(makeDateKey(todayJalaali().jy, todayJalaali().jm, todayJalaali().jd), g);
                    return (
                      <button
                        key={g}
                        onClick={() => { haptic(hapticOn, 12); setGroup(g); }}
                        className={`rounded-2xl py-3 flex flex-col items-center gap-1 transition-all ${
                          active
                            ? "bg-[var(--sk-primary)] text-white shadow-[0_10px_26px_-10px_var(--sk-glow-a)] scale-105"
                            : "glass"
                        }`}
                        aria-pressed={active}
                      >
                        <span className="text-[16px] font-black">{g}</span>
                        <span className={`text-[10px] ${active ? "text-white/80" : "text-[var(--sk-text-faint)]"}`}>
                          امروز: {KIND_CHIP[preview.type].icon}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* icon legend — first-time users must know what each icon means */}
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {(["DAY", "NIGHT", "REST"] as const).map((k) => {
                    const chip = KIND_CHIP[k];
                    return (
                      <div key={k} className={`rounded-2xl py-2.5 flex flex-col items-center gap-1.5 ${chip.bg}`}>
                        {chip.icon}
                        <span className="text-[11px] font-bold">{chip.fa}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-center text-[11px] text-[var(--sk-text-faint)] mt-3 leading-5">
                  همین نشان‌ها را در کل تقویم می‌بینید: خورشید یعنی روزکار،
                  ماه یعنی شبکار و نشان استراحت یعنی روز آزاد شما.
                </p>
              </Slide>
            )}

            {step === 2 && (
              <Slide>
                <div className="mx-auto mb-5 size-16 rounded-[22px] bg-[var(--sk-primary-soft)] grid place-items-center text-[var(--sk-primary)]">
                  <MonitorIcon size={30} />
                </div>
                <h2 className="text-[22px] font-black text-center">شخصی‌سازی نمایش</h2>
                <p className="text-[13px] text-[var(--sk-text-muted)] text-center mt-2 mb-5">
                  این تنظیمات بعداً در «تنظیمات» هم در دسترس است
                </p>

                {/* حالت نمایش — پیش‌فرض: سیستم */}
                <div className="text-[12.5px] font-bold mb-2">حالت نمایش</div>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="حالت نمایش">
                  {([
                    { id: "system", fa: "سیستم", icon: <MonitorIcon size={19} /> },
                    { id: "dark", fa: "تیره", icon: <MoonIcon size={19} /> },
                    { id: "light", fa: "روشن", icon: <SunIcon size={19} /> },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        haptic(hapticOn, 12);
                        setThemeMode(m.id);
                        applyThemeToDom(theme, m.id);
                      }}
                      className={`relative rounded-2xl py-2.5 flex flex-col items-center gap-1.5 sk-outline ${themeMode === m.id ? "is-active" : ""}`}
                      aria-pressed={themeMode === m.id}
                    >
                      <span className={themeMode === m.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}>{m.icon}</span>
                      <span className={`text-[10.5px] font-bold ${themeMode === m.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}`}>{m.fa}</span>
                      {themeMode === m.id && <span className="sk-check-badge"><CheckIcon size={11} /></span>}
                    </button>
                  ))}
                </div>

                {/* حالت نمایش جدول */}
                <div className="text-[12.5px] font-bold mt-5 mb-2">حالت نمایش جدول</div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="حالت نمایش جدول">
                  {([
                    { id: "table", fa: "جدولی", icon: <TableIcon size={19} /> },
                    { id: "grid", fa: "تقویم", icon: <GridIcon size={19} /> },
                  ] as const).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { haptic(hapticOn, 12); setViewType(v.id); }}
                      className={`relative rounded-2xl py-2.5 flex items-center justify-center gap-2 sk-outline ${viewType === v.id ? "is-active" : ""}`}
                      aria-pressed={viewType === v.id}
                    >
                      <span className={viewType === v.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}>{v.icon}</span>
                      <span className={`text-[11.5px] font-bold ${viewType === v.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}`}>{v.fa}</span>
                      {viewType === v.id && <span className="sk-check-badge"><CheckIcon size={11} /></span>}
                    </button>
                  ))}
                </div>
              </Slide>
            )}

            {step === 3 && (
              <Slide>
                <div className="mx-auto mb-6 size-16 rounded-[22px] bg-[var(--sk-primary-soft)] grid place-items-center text-[var(--sk-primary)]">
                  <PaletteIcon size={30} />
                </div>
                <h2 className="text-[24px] font-black text-center">رنگ دلخواه را انتخاب کنید</h2>
                <p className="text-[14px] text-[var(--sk-text-muted)] text-center mt-2 mb-5">
                  بعداً از تنظیمات هم قابل تغییر است — همراه با حالت تیره
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {THEMES.map((t) => {
                    const active = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          haptic(hapticOn, 12);
                          setTheme(t.id);
                          applyThemeToDom(t.id, themeMode);
                        }}
                        className={`aspect-square rounded-2xl grid place-items-center transition-all ${
                          active ? "scale-110 ring-2 ring-offset-2 ring-offset-transparent" : "opacity-75"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${t.hex}, ${t.hex}88)`,
                          outline: active ? `2px solid ${t.hex}` : "none",
                        }}
                        aria-label={t.fa}
                        aria-pressed={active}
                      />
                    );
                  })}
                </div>
                <div className="text-center text-[12px] text-[var(--sk-text-faint)] mt-3">
                  {THEMES.find((t) => t.id === theme)?.fa}
                </div>
              </Slide>
            )}

            {step === 4 && (
              <Slide>
                <div className="mx-auto size-20 rounded-[28px] bg-gradient-to-br from-[var(--sk-primary)] to-[var(--sk-primary-strong)] grid place-items-center text-white shadow-[0_20px_50px_-14px_var(--sk-glow-a)] mb-6">
                  <DownloadIcon size={38} />
                </div>
                <h2 className="text-[26px] font-black text-center leading-snug">نصب برنامه</h2>
                <p className="text-[14px] text-[var(--sk-text-muted)] text-center mt-3 leading-7">
                  شیفت‌کار نئو را مانند یک برنامهٔ واقعی روی دستگاه خود نصب کنید؛
                  سریع‌تر باز می‌شود و حتی بدون اینترنت هم کار می‌کند.
                </p>
                <div className="mt-6">
                  <InstallCta />
                </div>
                <p className="text-center text-[11px] text-[var(--sk-text-faint)] mt-3">
                  دسترسی سریع‌تر و کار آفلاین — بدون نیاز به اینترنت
                </p>
              </Slide>
            )}

            {step === 5 && (
              <Slide>
                <div className="mx-auto size-16 rounded-[22px] bg-gradient-to-br from-[var(--sk-primary)] to-[var(--sk-primary-strong)] grid place-items-center text-white shadow-[0_16px_40px_-14px_var(--sk-glow-a)] mb-5">
                  <SparkIcon size={30} />
                </div>
                <h2 className="text-[24px] font-black text-center">همه‌چیز آماده است!</h2>
                {/* summary of the choices made in this flow */}
                <div className="mt-5 glass rounded-2xl px-4 py-3 flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--sk-text-muted)]">شیفت شما</span>
                  <span className="font-black">گروه {group}</span>
                </div>
                <div className="mt-2 glass rounded-2xl px-4 py-3 flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--sk-text-muted)]">حالت نمایش</span>
                  <span className="font-black">
                    {themeMode === "system" ? "هماهنگ با سیستم" : themeMode === "dark" ? "تیره" : "روشن"} • {viewType === "grid" ? "تقویم" : "جدولی"}
                  </span>
                </div>
                <div className="mt-5">
                  {/* install option on the LAST page, like the source onboarding */}
                  <InstallCta compact />
                </div>
              </Slide>
            )}
          </div>
        </div>

        {/* nav */}
        <div className="px-7 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => { haptic(hapticOn); setStep((s) => s - 1); }}
              className="h-13 py-3.5 px-5 rounded-2xl glass text-[14px] font-bold"
            >
              قبلی
            </button>
          )}
          <button
            onClick={() => {
              if (step < TOTAL - 1) {
                haptic(hapticOn);
                setStep((s) => s + 1);
              } else finish();
            }}
            className="flex-1 h-13 py-3.5 rounded-2xl bg-[var(--sk-primary)] text-white text-[15px] font-black flex items-center justify-center gap-2 shadow-[0_14px_34px_-10px_var(--sk-glow-a)] active:scale-[0.97] transition-transform"
          >
            {step < TOTAL - 1 ? "بعدی" : "شروع کنید"}
            <ChevronLeft size={17} />
          </button>
        </div>

        {/* progress dots — BOTTOM, source .onboarding-dots style (user:
            «خط پیش‌فرض رو به شکل شیک بیار پایین صفحه») */}
        <div className="flex items-center justify-center gap-2 pt-5 pb-7" role="tablist" aria-label="مراحل راهنما">
          {Array.from({ length: TOTAL }, (_, i) => i).map((i) => (
            <button
              key={i}
              onClick={() => { haptic(hapticOn, 8); setStep(i); }}
              aria-label={`مرحله ${toPersianDigits(i + 1)}`}
              aria-current={i === step ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-7 bg-[var(--sk-primary)] shadow-[0_2px_8px_-2px_var(--sk-glow-a)]"
                  : i < step
                    ? "w-2.5 bg-[var(--sk-primary)]/45"
                    : "w-2.5 bg-[var(--sk-border)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Slide({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
