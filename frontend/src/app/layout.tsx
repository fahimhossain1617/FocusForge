import type { Metadata, Viewport } from "next";
import "../utils/clientDevFixes";
import { GeistSans } from "geist/font/sans";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import "./theme-transition.css";
import "./auth.css";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";
import { AdminAuthProvider } from "../context/AdminAuthContext";
import TelemetryInitializer from "../components/telemetry/TelemetryInitializer";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";
import PWAUpdater from "../components/pwa/PWAUpdater";
import MobilePwaZoomLock from "../components/pwa/MobilePwaZoomLock";
import PreHydrationScripts from "../components/PreHydrationScripts";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090c19" },
    { media: "(prefers-color-scheme: light)", color: "#F3F7FC" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://focentia.app"),
  title: {
    default: "Focentia",
    template: "%s | Focentia",
  },
  description:
    "Capture thoughts, organize tasks, plan your day, focus deeply, and track where your time goes.",
  manifest: "/manifest.json",
  applicationName: "Focentia",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Focentia",
    description:
      "Capture thoughts, organize tasks, plan your day, focus deeply, and master your time.",
    url: "https://focentia.app",
    siteName: "Focentia",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Focentia",
    description:
      "Capture thoughts, organize tasks, plan your day, and focus deeply.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Focentia",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <PreHydrationScripts />
      <body
        suppressHydrationWarning
        className={`${GeistSans.className} ${notoSansBengali.variable} h-screen h-dvh max-h-screen max-h-dvh overflow-hidden antialiased bg-background text-foreground relative selection:bg-accent-hover selection:text-white`}
      >
        <div 
          className="top-ambient-glow pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.28)_0%,rgba(8,9,12,0)_75%)] z-0 dark:block hidden" 
          aria-hidden="true" 
        />

        {/* Global SVG Symbol Definition for Header Icon (Strictly Hidden from Paint Engine) */}
        <svg style={{ display: "none" }} aria-hidden="true">
          <defs>
            <g id="ff-mark" style={{ fill: "var(--logo, #061f52)" }}>
              <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
              <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
              <circle cx="473" cy="745" r="97" strokeWidth="15" style={{ fill: "#ffffff", stroke: "var(--logo, #061f52)" }} />
              <circle cx="473" cy="745" r="45" />
              <circle cx="473" cy="745" r="14" style={{ fill: "#ffffff" }} />
              <path d="M473 662v16M473 812v16M390 745h16M540 745h16" strokeWidth="5" fill="none" style={{ stroke: "var(--logo, #061f52)" }} />
            </g>
          </defs>
        </svg>

        {/* Inline Boot Layer matching Android Splash (Clean white tile + dark navy logo mark) */}
        <div
          id="ff-boot-root"
          aria-hidden="true"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<div id="ff-boot-layer"><div id="ff-boot-badge"><svg class="mk" viewBox="360 320 520 630" aria-hidden="true"><use href="#ff-mark" /></svg></div></div>`,
          }}
        />

        <AppProvider>
          <AuthProvider>
            <AdminAuthProvider>
              <TelemetryInitializer />
              <ServiceWorkerRegister />
              <PWAUpdater />
              <MobilePwaZoomLock />
              <div id="app-shell" suppressHydrationWarning className="relative z-10 h-screen h-dvh max-h-screen max-h-dvh overflow-hidden w-full">
                {children}
              </div>
            </AdminAuthProvider>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}

