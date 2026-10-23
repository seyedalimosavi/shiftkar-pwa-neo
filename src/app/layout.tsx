import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

/* GitHub Pages project sites serve the app under /<repo>/ (set by the deploy
 * workflow); the published space and user-site repos use "". */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "شیفت‌کار نئو | ShiftKar Neo",
  description:
    "تقویم هوشمند شیفت کاری — محاسبه خودکار شیفت‌های روز، شب و استراحت برای چهار گروه، همراه با تقویم شمسی و قمری، تعطیلات رسمی و یادداشت‌های شخصی",
  applicationName: "شیفت‌کار نئو",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    title: "شیفت‌کار نئو",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: `${BASE_PATH}/assets/icon-192.png`,
    apple: `${BASE_PATH}/assets/apple-touch-icon.png`,
  },
  other: {
    /* Chromium Force-Dark (Chrome/Edge/Brave/Vivaldi/Opera/Mi Browser) و
       حالت تاریک سامسونگ اینترنت: «این صفحه تم تاریک بومی دارد، تیره‌اش نکن».
       همان snippet رسمی مستندات Chrome for Developers / Samsung Internet. */
    "color-scheme": "dark light",
    /* Dark Reader (افزونه): خودش را روی این سایت خاموش کند — official lock. */
    "darkreader-lock": "true",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d1a" },
    { media: "(prefers-color-scheme: light)", color: "#f4f2fb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-theme="blue" className="dark" suppressHydrationWarning>
      <body className="antialiased h-dvh overflow-hidden">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
