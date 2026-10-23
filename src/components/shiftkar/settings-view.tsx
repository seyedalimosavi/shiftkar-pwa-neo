"use client";
/**
 * Settings — full parity with the original ShiftKar settings page, with the
 * original's signature 2px outlined option cards (sk-outline): segmented
 * group, outlined theme-mode cards, swatch theme grid, visual view-picker
 * previews, real PWA install, help accordion, about, contacts, restart.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GROUPS, THEMES, APP, type Group } from "@/lib/models";
import type { ViewType } from "@/lib/store";
import { useShiftKar, haptic } from "@/lib/store";
import { getInstallState } from "@/lib/install";
import { toPersianDigits } from "@/lib/jalali";
import {
  GroupIcon,
  PaletteIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  GridIcon,
  TableIcon,
  DownloadIcon,
  HelpIcon,
  InfoIcon,
  RefreshIcon,
  WhatsappIcon,
  TelegramIcon,
  EitaaIcon,
  PhoneIcon,
  ExternalIcon,
  CheckIcon,
  SparkIcon,
  ChevronDownIcon,
} from "./icons";

/* Official contact channels — same as the original app. */
const CONTACTS = [
  { id: "whatsapp-pv", fa: "پیام خصوصی واتساپ", icon: <WhatsappIcon size={18} />, href: "https://wa.me/989163548578" },
  { id: "phone", fa: "تماس تلفنی", icon: <PhoneIcon size={18} />, href: "tel:09163548578" },
  { id: "whatsapp-group", fa: "گروه واتساپ", icon: <WhatsappIcon size={18} />, href: "https://chat.whatsapp.com/5HolMMoVnojCdh8GjhSZo2" },
  { id: "eitaa", fa: "گروه ایتا", icon: <EitaaIcon size={18} />, href: "https://eitaa.com/joinchat/929104214C56d88e3e24" },
  { id: "telegram", fa: "تلگرام", icon: <TelegramIcon size={18} />, href: "https://t.me/h_mosavi_s" },
];

const HELP_ITEMS = [
  {
    title: "محاسبه شیفت",
    body: "چرخهٔ شیفت دقیقاً ۸ روز است: دو روز کاری (M1، M2)، دو روز شب‌کاری (N1، N2) و سپس چهار روز استراحت (R1 تا R4). تاریخ پایه: ۱۴۰۵/۰۵/۰۴. افست گروه‌ها: A=7، B=1، C=5، D=3. شاخص هر روز با فرمول floorMod(تعداد روز از تاریخ پایه + افست گروه، ۸) به‌دست می‌آید؛ به این ترتیب تاریخ‌های قبل از تاریخ پایه هم درست محاسبه می‌شوند.",
  },
  {
    title: "گروه‌های شیفت",
    body: "چهار گروه A تا D وجود دارد. گروه شخصی خود را از بخش «شیفت شما» انتخاب کنید؛ تقویم به‌طور پیش‌فرض بر اساس آن نمایش داده می‌شود. با فیلتر «همه» روی تقویم، وضعیت هر چهار گروه در یک نگاه دیده می‌شود.",
  },
  {
    title: "انواع شیفت",
    body: "سه وضعیت نمایشی وجود دارد:\n• روزکار — شیفت روزانه\n• شبکار — شیفت شبانه\n• استراحت — روزهای استراحت\nهر وضعیت با رنگ و نشان اختصاصی در تقویم نمایش داده می‌شود.",
  },
  {
    title: "تقویم",
    body: "تقویم بر اساس تاریخ هجری شمسی است و هفته از شنبه آغاز می‌شود. با دکمه‌های کنار عنوان ماه، کشیدن انگشت بین ماه‌ها یا اسکرول افقی جابه‌جا شوید؛ روی عنوان ماه بزنید تا ماه و سال را انتخاب کنید. دو حالت نمایش تقویم (شبکه‌ای) و جدولی با یک دکمهٔ ثابت کنار عنوان ماه عوض می‌شود؛ نمای جدولی دکمه‌ای برای تمام‌صفحه شدن دارد.",
  },
  {
    title: "یادداشت‌ها",
    body: "برای هر روز یک یادداشت ذخیره می‌شود. روزهای دارای یادداشت با یک نقطهٔ کوچک در تقویم مشخص می‌شوند. با آیکون یادداشت در بالای تقویم، همهٔ یادداشت‌ها را مرور، ویرایش یا حذف کنید.",
  },
  {
    title: "تم‌ها",
    body: "شش تم رنگی در دسترس است: آبی، زمردی، بنفش، نارنجی، رز و فیروزه‌ای. تم انتخابی ذخیره می‌شود و بلافاصله در کل برنامه اعمال می‌گردد.",
  },
  {
    title: "تعطیلات",
    body: "تعطیلات و مناسبت‌های رسمی ایران برای هر سالی محاسبه می‌شود: تعطیلات ثابت شمسی (نوروز، روز جمهوری اسلامی، رحلت امام خمینی، قیام ۱۵ خرداد، پیروزی انقلاب اسلامی و ملی شدن صنعت نفت) و تعطیلات قمری (عید فطر، قربان، غدیر، تاسوعا و عاشورا، اربعین و …) بر پایهٔ تقویم رسمی ایران، به‌همراه صدها مناسبت دیگر. روزهای تعطیل با رنگ قرمز مشخص می‌شوند و نام مناسبت‌ها در جزئیات هر روز نمایش داده می‌شود.",
  },
];

function Section({ icon, title, desc, children }: {
  icon: React.ReactNode; title: string; desc?: string; children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-3xl p-4">
      <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--sk-primary)]">
        {icon}
        {title}
      </h2>
      {desc && <p className="text-[11.5px] text-[var(--sk-text-muted)] mt-1 mb-3 leading-5">{desc}</p>}
      <div className={desc ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

/* ---- mini visual previews (original view-picker) ---- */
function GridPreview() {
  const rows = [
    ["REST", "REST", "DAY", "DAY", "NIGHT", "NIGHT", "REST"],
    ["REST", "DAY", "DAY", "NIGHT", "NIGHT", "REST", "REST"],
    ["DAY", "DAY", "NIGHT", "NIGHT", "REST", "REST", "HOL"],
  ];
  const cls = (c: string) =>
    c === "DAY" ? "bg-[var(--sk-day)]/70" : c === "NIGHT" ? "bg-[var(--sk-night)]/70" : c === "HOL" ? "bg-[var(--sk-holiday)]/70" : "bg-[var(--sk-rest)]/45";
  return (
    <span className="vp-preview" aria-hidden>
      <span className="vp-head" />
      {rows.map((r, i) => (
        <span key={i} className="flex gap-[2px]">
          {r.map((c, j) => (
            <span key={j} className={`h-2 flex-1 rounded-[2px] ${cls(c)}`} />
          ))}
        </span>
      ))}
    </span>
  );
}

function TablePreview() {
  const rows = [
    ["bg-[var(--sk-rest)]/45", "bg-[var(--sk-holiday)]/60"],
    ["bg-[var(--sk-night)]/70", ""],
    ["bg-[var(--sk-day)]/70", "bg-[var(--sk-holiday)]/60"],
    ["bg-[var(--sk-day)]/70", ""],
  ];
  return (
    <span className="vp-preview" aria-hidden>
      <span className="vp-head" />
      {rows.map((r, i) => (
        <span key={i} className="flex items-center gap-[3px]">
          <span className="w-2 h-2 rounded-[2px] bg-[var(--sk-text-faint)]/40" />
          <span className="flex-1 h-1.5 rounded-full bg-[var(--sk-text-faint)]/35" />
          <span className={`w-2 h-2 rounded-full ${r[0]}`} />
          <span className={`flex-1 h-1.5 rounded-full ${r[1] || "bg-[var(--sk-text-faint)]/25"}`} />
        </span>
      ))}
    </span>
  );
}

export function SettingsView({ onOpenInstall }: { onOpenInstall: () => void }) {
  const theme = useShiftKar((s) => s.theme);
  const themeMode = useShiftKar((s) => s.themeMode);
  const myGroup = useShiftKar((s) => s.myGroup);
  const viewType = useShiftKar((s) => s.viewType);
  const hapticOn = useShiftKar((s) => s.hapticOn);
  const set = useShiftKar((s) => s.set);

  /* ---- install state ---- */
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const sync = () => setInstalled(getInstallState().installed);
    sync();
    window.addEventListener("shiftkar-neo:install-state", sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener("shiftkar-neo:install-state", sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  const restartOnboarding = () => {
    haptic(hapticOn);
    toast("راهنما دوباره نمایش داده می‌شود؛ تنظیمات شما حفظ می‌شود", {
      action: {
        label: "تأیید",
        onClick: () => set({ onboardingDone: false, tourDone: true }),
      },
      duration: 6000,
    });
  };

  const startTour = () => {
    haptic(hapticOn);
    set({ tourDone: false, tab: "calendar" });
    toast("تور راهنما در صفحهٔ تقویم اجرا می‌شود");
  };

  return (
    <div className="h-full overflow-y-auto sk-scroll overscroll-contain flex flex-col gap-3 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* header */}
      <header className="text-center pt-1 pb-1">
        <h1 className="text-[22px] font-black">تنظیمات</h1>
        <p className="text-[12px] text-[var(--sk-text-muted)] mt-1">شخصی‌سازی برنامه</p>
      </header>

      {/* ============ 1. شیفت شما (segmented) — only the four REAL groups;
          «همه» lives ONLY in the calendar view (user request) ============ */}
      <Section
        icon={<GroupIcon size={16} />}
        title="شیفت شما"
        desc="گروه کاری خود را انتخاب کنید؛ تقویم و لوحه بر همین اساس رنگ می‌شود."
      >
        <div className="sk-seg" role="group" aria-label="شیفت شما">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => {
                haptic(hapticOn);
                set({ myGroup: g as Group, filterGroup: g as Group });
                toast(`شیفت شما: گروه ${g}`);
              }}
              className={`sk-seg-item ${myGroup === g ? "is-active" : ""}`}
              aria-pressed={myGroup === g}
            >
              {g}
            </button>
          ))}
        </div>
      </Section>

      {/* ============ 2. حالت نمایش (outlined mode cards, original) ============ */}
      <Section
        icon={<PaletteIcon size={16} />}
        title="حالت نمایش"
        desc="روشن، تیره یا پیروی از تم سیستم؛ تغییر به‌صورت زنده اعمال می‌شود."
      >
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="حالت نمایش">
          {([
            { id: "light", fa: "روشن", icon: <SunIcon size={20} /> },
            { id: "dark", fa: "تیره", icon: <MoonIcon size={20} /> },
            { id: "system", fa: "هماهنگ با سیستم", icon: <MonitorIcon size={20} /> },
          ] as const).map((m) => (
            <button
              key={m.id}
              onClick={() => { haptic(hapticOn); set({ themeMode: m.id }); }}
              className={`relative rounded-2xl py-3 px-1 flex flex-col items-center gap-1.5 sk-outline ${themeMode === m.id ? "is-active" : ""}`}
              aria-pressed={themeMode === m.id}
            >
              <span className={themeMode === m.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}>
                {m.icon}
              </span>
              <span className={`text-[10.5px] font-bold leading-3.5 ${themeMode === m.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}`}>
                {m.fa}
              </span>
              {themeMode === m.id && (
                <span className="sk-check-badge"><CheckIcon size={11} /></span>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ============ 3. رنگ اصلی (swatch cards, original) ============ */}
      <Section icon={<PaletteIcon size={16} />} title="رنگ اصلی" desc="رنگ اصلی برنامه را انتخاب کنید.">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="انتخاب تم">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { haptic(hapticOn); set({ theme: t.id }); }}
              className={`rounded-2xl py-3 flex flex-col items-center gap-2 sk-outline ${theme === t.id ? "is-active" : ""}`}
              aria-pressed={theme === t.id}
              aria-label={`تم ${t.fa}`}
            >
              <span className="sk-swatch" style={{ background: t.hex }} />
              <span className={`text-[11.5px] font-bold ${theme === t.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}`}>
                {t.fa}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ============ 4. نمای تقویم (visual previews, original view-picker) ============ */}
      <Section icon={<GridIcon size={16} />} title="نمای تقویم" desc="حالت نمایش تقویم (شبکه‌ای) یا جدولی را انتخاب کنید.">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نمای تقویم">
          {([
            { id: "grid", fa: "تقویم", preview: <GridPreview /> },
            { id: "table", fa: "جدولی", preview: <TablePreview /> },
          ] as { id: ViewType; fa: string; preview: React.ReactNode }[]).map((v) => (
            <button
              key={v.id}
              onClick={() => { haptic(hapticOn); set({ viewType: v.id }); }}
              className={`relative rounded-2xl p-3 flex flex-col items-center gap-2.5 sk-outline ${viewType === v.id ? "is-active" : ""}`}
              role="radio"
              aria-checked={viewType === v.id}
            >
              {viewType === v.id && (
                <span className="sk-check-badge"><CheckIcon size={11} /></span>
              )}
              {v.preview}
              <span className={`text-[12.5px] font-bold ${viewType === v.id ? "text-[var(--sk-primary)]" : "text-[var(--sk-text-muted)]"}`}>
                {v.fa}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ============ 5. نصب برنامه (real PWA install) ============ */}
      <Section
        icon={<DownloadIcon size={16} />}
        title="نصب برنامه"
        desc="شیفت‌کار نئو را روی دستگاه خود نصب کنید تا سریع‌تر باز شود و بدون اینترنت هم کار کند."
      >
        <button
          onClick={() => { haptic(hapticOn); onOpenInstall(); }}
          className={`h-11 px-5 rounded-2xl text-[13.5px] font-bold flex items-center gap-2 transition-all active:scale-[0.98] ${
            installed
              ? "bg-[var(--sk-rest-soft)] text-[var(--sk-rest-ink)] border-2 border-[var(--sk-rest)]/30"
              : "bg-[var(--sk-primary)] text-white shadow-[0_10px_26px_-10px_var(--sk-glow-a)]"
          }`}
        >
          {installed ? <CheckIcon size={16} /> : <DownloadIcon size={16} />}
          {installed ? "نصب شده" : "نصب برنامه"}
        </button>
      </Section>

      {/* ============ 6. راهنما ============ */}
      <Section icon={<HelpIcon size={16} />} title="راهنما">
        <div className="flex flex-col">
          {HELP_ITEMS.map((h) => (
            <details key={h.title} className="group border-t border-[var(--sk-border-soft)] first:border-t-0">
              <summary className="py-3 text-[13px] font-bold cursor-pointer flex items-center justify-between gap-2 hover:text-[var(--sk-primary)] transition-colors list-none [&::-webkit-details-marker]:hidden">
                {h.title}
                <ChevronDownIcon size={15} className="text-[var(--sk-text-faint)] transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <p className="pb-3 text-[12px] leading-6 text-[var(--sk-text-muted)] whitespace-pre-line">{h.body}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ============ 7. درباره ما ============ */}
      <Section icon={<InfoIcon size={16} />} title="درباره ما">
        <div className="flex items-center gap-3 mb-3">
          <span className="size-14 rounded-2xl bg-gradient-to-br from-[var(--sk-primary)] to-[var(--sk-primary-strong)] grid place-items-center text-white shrink-0">
            <SparkIcon size={26} />
          </span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-black">{APP.name}</div>
            <div className="text-[11.5px] text-[var(--sk-text-muted)]">{APP.nameEn} — نسخهٔ {toPersianDigits(APP.version)}</div>
            <div className="text-[11px] text-[var(--sk-text-faint)]">{APP.tagline}</div>
          </div>
        </div>
        <div className="text-[12px] leading-6 text-[var(--sk-text-muted)] flex flex-col gap-2">
          <p>این نرم‌افزار برای سهولت در برنامه‌ریزی وقت کارکنان شیفت ۱۲ ساعته شاغل در شرکت پتروشیمی بندر امام خمینی (ره) می‌باشد.</p>
          <p>با تشکر و سپاس از تمامی همکاران و دوستانی که با پیشنهادات مفید خود ما را در پیشرفت برنامه یاری نموده‌اند.</p>
          <p>لطفاً انتقادات و پیشنهادات خود را از قسمت «راه‌های ارتباط با ما» در میان بگذارید.</p>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--sk-border-soft)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--sk-text-faint)]">تهیه شده توسط</span>
          <span className="text-[12px] font-bold">سید حسین موسوی سعیدی — واحد SBR</span>
        </div>
      </Section>

      {/* ============ 8. راه‌های ارتباط با ما ============ */}
      <Section
        icon={<EitaaIcon size={16} />}
        title="راه‌های ارتباط با ما"
        desc="لطفاً انتقادات و پیشنهادات خود را از طریق کانال‌های ارتباطی زیر با ما در میان بگذارید."
      >
        <div className="flex flex-col gap-1" role="list">
          {CONTACTS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              role="listitem"
              aria-label={c.fa}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--sk-primary-soft)]/50 transition-colors"
            >
              <span className="size-9 rounded-xl bg-[var(--sk-primary-soft)] text-[var(--sk-primary)] grid place-items-center shrink-0">
                {c.icon}
              </span>
              <span className="flex-1 text-[13px] font-semibold">{c.fa}</span>
              <ExternalIcon size={15} />
            </a>
          ))}
        </div>
      </Section>

      {/* ============ 9. راهنمای شروع ============ */}
      <Section
        icon={<RefreshIcon size={16} />}
        title="راهنمای شروع"
        desc="تور راهنمای برنامه را دوباره ببینید یا تنظیمات اولیهٔ نرم‌افزار را از نو شروع کنید."
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={startTour}
            className="h-11 px-4 rounded-2xl glass text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[var(--sk-primary-soft)]/50 transition-colors"
          >
            <InfoIcon size={15} />
            تور راهنمای برنامه
          </button>
          <button
            onClick={restartOnboarding}
            className="h-11 px-4 rounded-2xl border-2 border-[var(--sk-holiday)]/30 text-[var(--sk-holiday)] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[var(--sk-holiday-soft)] transition-colors"
          >
            راه‌اندازی مجدد تنظیمات اولیهٔ نرم‌افزار
          </button>
        </div>
      </Section>
    </div>
  );
}
