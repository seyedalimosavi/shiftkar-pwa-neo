"use client";
/** Systems view — corporate portals as a responsive frosted-card grid.
 *  Icon chips are UNIFORM (primary-soft surface + primary glyph, 42px
 *  rounded square) exactly like the original `.system-icon` — one visual
 *  language instead of a rainbow. Stagger entrance is pure CSS. */
import {
  FileIcon,
  BriefcaseIcon,
  ClipboardIcon,
  PlaneIcon,
  FoodIcon,
  ChartIcon,
  GlobeIcon,
  DownloadIcon,
  ExternalIcon,
  type P,
} from "./icons";

interface System {
  icon: (p: P) => React.ReactNode;
  fa: string;
  desc: string;
  href: string;
}

const SYSTEMS: System[] = [
  { icon: FileIcon, fa: "خلاصه پرونده", desc: "مشاهده خلاصه پرونده", href: "https://portal.nioc.ir" },
  { icon: BriefcaseIcon, fa: "پرتال شرکت", desc: "پرتال پتروشیمی بندر امام", href: "https://bipc.ir/fa/" },
  { icon: ClipboardIcon, fa: "درخواست پرواز", desc: "سامانه درخواست پرواز", href: "https://travelrequest.bipc.ir/Guest/LoginPage.aspx" },
  { icon: PlaneIcon, fa: "برنامه پروازها", desc: "مشاهده برنامه پروازها", href: "https://www.posc.ir/fa/publicservices/mosaferat" },
  { icon: FoodIcon, fa: "رزرو غذا", desc: "سامانه رزرو غذا", href: "https://pooneh.bipc.ir/" },
  { icon: ChartIcon, fa: "سهام", desc: "سامانه سهام", href: "https://sahamfasl.bipc.ir/" },
  { icon: GlobeIcon, fa: "شیفت‌کار تحت وب", desc: "نسخه تحت وب نرم‌افزار", href: "https://alimosavi-code.github.io" },
  { icon: DownloadIcon, fa: "شیفت‌کار موبایل", desc: "دانلود نسخه موبایل", href: "https://alimosavi-code.github.io/download" },
];

export function SystemsView() {
  return (
    <div className="h-full overflow-y-auto sk-scroll overscroll-contain px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <div className="mb-4">
        <h1 className="text-[22px] font-black">سامانه‌ها</h1>
        <p className="text-[13px] text-[var(--sk-text-muted)] mt-1">
          دسترسی سریع به پرتال‌ها و سامانه‌های پرکاربرد کاری
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {SYSTEMS.map((s, i) => (
          <a
            key={s.fa}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="sk-rise glass rounded-3xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <div className="flex items-start justify-between">
              <span className="size-11 rounded-[14px] grid place-items-center bg-[var(--sk-primary-soft)] text-[var(--sk-primary)] shadow-[inset_0_1px_0_var(--sk-specular)]">
                <s.icon size={21} />
              </span>
              <ExternalIcon size={15} className="text-[var(--sk-text-faint)]" />
            </div>
            <div>
              <div className="text-[14px] font-bold">{s.fa}</div>
              <div className="text-[11.5px] text-[var(--sk-text-muted)] mt-0.5 leading-5">{s.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
