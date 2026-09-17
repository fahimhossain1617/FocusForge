import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#08090C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "FocusForge",
  description:
    "A personal external brain. Capture thoughts, organize tasks, plan your day, focus deeply, and track where your time goes.",
  manifest: "/manifest.json",
  applicationName: "FocusForge",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FocusForge",
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
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FocusForge" />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${notoSansBengali.variable} font-[family-name:var(--font-plus-jakarta)] min-h-screen antialiased bg-[#08090C] text-[#F8FAFC] relative selection:bg-[#2563EB] selection:text-[#FFFFFF]`}
      >
        <div 
          className="pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.28)_0%,rgba(8,9,12,0)_75%)] z-0" 
          aria-hidden="true" 
        />
        <AppProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            <div className="relative z-10 min-h-screen">
              {children}
            </div>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
