import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import "./theme-transition.css";
import "./auth.css";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";
import LaunchSplash from "../components/splash/LaunchSplash";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://focusforge.app"),
  title: {
    default: "FocusForge — Personal External Brain & Deep Productivity",
    template: "%s | FocusForge",
  },
  description:
    "A personal external brain. Capture thoughts, organize tasks, plan your day, focus deeply, and track where your time goes.",
  manifest: "/manifest.json",
  applicationName: "FocusForge",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "FocusForge — Personal External Brain & Deep Productivity",
    description:
      "Capture thoughts, organize tasks, plan your day, focus deeply, and master your time.",
    url: "https://focusforge.app",
    siteName: "FocusForge",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FocusForge — Personal External Brain",
    description:
      "A personal external brain. Capture thoughts, organize tasks, plan your day, and focus deeply.",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var isStandalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||(window.navigator&&window.navigator.standalone);var nav=window.performance&&performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];var isNav=!nav||nav.type==='navigate';if(isStandalone&&isNav&&window.history&&window.history.length<=1){try{sessionStorage.removeItem('ff_launch');}catch(e){}}var already=false;try{already=!!sessionStorage.getItem('ff_launch');}catch(e){}if(isNav&&!already){document.documentElement.classList.add('ff-launch-active');try{sessionStorage.setItem('ff_launch','1');}catch(e){}}setTimeout(function(){try{document.documentElement.classList.remove('ff-launch-active');}catch(e){}},5000);}catch(e){}})();`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @property --logo{syntax:'<color>';inherits:true;initial-value:#061f52}
              :root{--logo-ui:#2f5fd0}
              [data-theme="dark"]{--logo-ui:#9db8ff}
              html.ff-launch-active,
              html.ff-launch-active body {
                background-color: #FFFFFF !important;
                overflow: hidden !important;
              }
              html.ff-launch-active:not(.ff-launch-mounted) body::before {
                content: '';
                position: fixed;
                inset: 0;
                background-color: #FFFFFF;
                z-index: 99990;
                pointer-events: all;
              }
              html.ff-launch-active [data-ff-logo-slot] {
                visibility: hidden !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('focusforge_theme');var isDark=true;if(t){if(t==='light'){isDark=false;}else if(t==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{var d=localStorage.getItem('focusforge_data');if(d){var s=JSON.parse(d);if(s&&s.theme&&s.theme.mode){if(s.theme.mode==='light'){isDark=false;}else if(s.theme.mode==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{isDark=true;}}else{isDark=true;}}var root=document.documentElement;if(isDark){root.dataset.theme='dark';root.classList.add('dark');root.classList.remove('light');root.style.colorScheme='dark';}else{root.dataset.theme='light';root.classList.remove('dark');root.classList.add('light');root.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FocusForge" />
      </head>
      <body
        className={`${GeistSans.className} ${notoSansBengali.variable} min-h-screen antialiased bg-background text-foreground relative selection:bg-accent-hover selection:text-white`}
      >
        <div 
          className="top-ambient-glow pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.28)_0%,rgba(8,9,12,0)_75%)] z-0 dark:block hidden" 
          aria-hidden="true" 
        />
        <AppProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            <div id="app-shell" className="relative z-10 min-h-screen">
              {children}
            </div>
            <LaunchSplash />
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
