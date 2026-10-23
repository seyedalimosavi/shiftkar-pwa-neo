"use client";
/**
 * ShiftKar Neo — unified icon set.
 * VERBATIM port of the original ShiftKar `js/components/icons.js` PATHS
 * (stroke-based, currentColor, 24px grid, strokeWidth 1.8, round caps/joins)
 * so every icon across the app matches the source app exactly — same
 * metaphors, same weight, same optics. Extras used only by Neo (Spark logo,
 * Monitor for display-mode) follow the same recipe.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
export type { P };

function base({ size = 20, ...p }: P, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

/* ---------- shift kinds (original glyphs) ---------- */

export const SunIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ));

export const MoonIcon = (p: P) =>
  base(p, <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);

export const RestIcon = (p: P) =>
  base(p, (
    <>
      <path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
      <path d="M3 18h18" />
      <path d="M6 11V8a2 2 0 0 1 2-2h2" />
    </>
  ));

/* ---------- navigation / chrome (original glyphs) ---------- */

export const CalendarIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ));

export const TableIcon = (p: P) =>
  base(p, (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ));

export const GridIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ));

export const NotesIcon = (p: P) =>
  base(p, (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </>
  ));

export const SystemsIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ));

export const RosterIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4-4L6 21" />
    </>
  ));

export const SettingsIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ));

export const ChevronRight = (p: P) => base(p, <path d="m9 6 6 6-6 6" />);
export const ChevronLeft = (p: P) => base(p, <path d="m15 6-6 6 6 6" />);
export const ChevronUpIcon = (p: P) => base(p, <path d="m18 15-6-6-6 6" />);
export const ChevronDown = (p: P) => base(p, <path d="m6 9 6 6 6-6" />);
export const ChevronDownIcon = ChevronDown;

/* ---------- actions (original glyphs) ---------- */

export const ExternalIcon = (p: P) =>
  base(p, (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ));

export const DownloadIcon = (p: P) =>
  base(p, (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ));

export const SearchIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ));

export const ZoomInIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </>
  ));

export const CloseIcon = (p: P) => base(p, <path d="M18 6 6 18M6 6l12 12" />);
export const CheckIcon = (p: P) => base(p, <path d="M20 6 9 17l-5-5" />);

export const SparkIcon = (p: P) =>
  base(p, <path d="M12 2.8 14 9l6.2 2L14 13l-2 6.2L10 13l-6.2-2L10 9l2-6.2Z" />);

export const PaletteIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="13.5" cy="6.5" r=".6" />
      <circle cx="17.5" cy="10.5" r=".6" />
      <circle cx="8.5" cy="7.5" r=".6" />
      <circle cx="6.5" cy="12.5" r=".6" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </>
  ));

export const GroupIcon = (p: P) =>
  base(p, (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ));

export const InfoIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ));

export const TrashIcon = (p: P) =>
  base(p, (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </>
  ));

export const PhoneIcon = (p: P) =>
  base(p, <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />);

export const HelpIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ));

export const RefreshIcon = (p: P) =>
  base(p, (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ));

export const ExpandIcon = (p: P) =>
  base(p, (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
    </>
  ));

export const CollapseIcon = (p: P) =>
  base(p, (
    <>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </>
  ));

export const MonitorIcon = (p: P) =>
  base(p, (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2.2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ));

/* Official-holiday flag (original `holiday` glyph) */
export const HolidayIcon = (p: P) =>
  base(p, (
    <>
      <path d="M4 22V3" />
      <path d="M4 3h14l-2.4 3L18 9H4" />
    </>
  ));

/* ---------- systems (original glyphs) ---------- */

export const FileIcon = (p: P) =>
  base(p, (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </>
  ));

export const BriefcaseIcon = (p: P) =>
  base(p, (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ));

export const ClipboardIcon = (p: P) =>
  base(p, (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ));

export const PlaneIcon = (p: P) =>
  base(p, <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />);

export const FoodIcon = (p: P) =>
  base(p, (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </>
  ));

export const ChartIcon = (p: P) =>
  base(p, (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 6-6" />
    </>
  ));

export const GlobeIcon = (p: P) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ));

/* ---------- contacts (original glyphs) ---------- */

export const WhatsappIcon = (p: P) =>
  base(p, (
    <>
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z" />
      <path d="M9 10.3c0-.5.3-.8.7-1l.5-.3c.3-.1.6 0 .8.2l.7.8c.2.2.1.5-.1.7l-.2.2c.4.8 1.1 1.5 1.9 1.9l.2-.2c.2-.2.5-.3.7-.1l.8.7c.2.2.3.5.2.8l-.3.5c-.2.4-.6.7-1 .7-2.6 0-4.9-2.3-4.9-5.2Z" />
    </>
  ));

export const TelegramIcon = (p: P) =>
  base(p, (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ));

export const EitaaIcon = (p: P) =>
  base(p, (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ));
