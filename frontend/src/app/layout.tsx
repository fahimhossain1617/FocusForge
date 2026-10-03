import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import "./theme-transition.css";
import "./auth.css";
import { AppProvider } from "../context/AppContext";
import { AuthProvider } from "../context/AuthContext";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";

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
        {/* Anti-Flicker Inline Dark Baseline & Pre-CSS Style - Placed BEFORE any CSS/JS */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background: #090c19 !important;
                background-color: #090c19 !important;
                color-scheme: dark;
                margin: 0;
                padding: 0;
              }
            `,
          }}
        />

        {/* Launch Animation Gating & Session Storage Check (Runs Synchronously in Head) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var navEntries = (window.performance && typeof performance.getEntriesByType === 'function')
      ? performance.getEntriesByType('navigation')
      : [];
    var navType = navEntries.length > 0 ? navEntries[0].type : '';
    if (!navType && window.performance && window.performance.navigation) {
      if (window.performance.navigation.type === 1) navType = 'reload';
      else if (window.performance.navigation.type === 2) navType = 'back_forward';
      else if (window.performance.navigation.type === 0) navType = 'navigate';
    }

    var isReload = (navType === 'reload');
    var isBackForward = (navType === 'back_forward');

    var sessionPlayed = false;
    try {
      sessionPlayed = !!sessionStorage.getItem('ff_launch');
    } catch(e) {}

    var shouldPlay = (!isReload && !isBackForward && !sessionPlayed);

    if (shouldPlay) {
      document.documentElement.classList.add('ff-launch');
      try {
        sessionStorage.setItem('ff_launch', '1');
      } catch(e) {}
    }
  } catch(e) {}
})();`,
          }}
        />

        {/* Critical Inline CSS for Seamless Android Splash Continuation & Shared-Element Transition */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @property --logo {
                syntax: '<color>';
                inherits: true;
                initial-value: #061f52;
              }

              :root {
                --tile: #ffffff;
                --logo-ui: #061f52;
                --line: #1a2547;
              }

              #ff-boot-layer {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100dvh;
                background-color: #090c19;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                overflow: hidden;
                padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
              }

              #ff-boot-badge {
                width: 88px;
                height: 88px;
                background: #ffffff;
                border-radius: 20px;
                position: relative;
                flex: none;
                transform-origin: 0 0;
                will-change: transform, opacity;
              }

              #ff-boot-badge svg {
                position: absolute;
                left: 50%;
                top: 50%;
                height: 62%;
                width: auto;
                aspect-ratio: 520 / 630;
                transform: translate(-50%, -50%);
                display: block;
                overflow: visible;
              }

              /* Hide slot mark and tile during active launch flight */
              html.ff-launch .slot .tile {
                opacity: 0;
              }
              html.ff-launch .slot .mk {
                visibility: hidden;
              }

              /* Header brand title fades in beside logo at the end */
              html.ff-launch [data-ff-brand-title] {
                opacity: 0;
                transform: translateX(-6px);
                transition: opacity 300ms ease-out, transform 300ms ease-out;
              }
              html.ff-brand-visible [data-ff-brand-title] {
                opacity: 1;
                transform: translateX(0);
              }

              /* Start app shell with slight offset and opacity during launch */
              html.ff-launch #app-shell {
                opacity: 0;
                transform: translateY(10px);
                will-change: opacity, transform;
              }

              /* Outside launch, hide boot layer if still present */
              html:not(.ff-launch) #ff-boot-layer {
                display: none !important;
              }

              /* Slot and Tile rules for in-app header */
              .slot {
                --logo: #061f52;
                position: relative;
                display: block;
                flex: none;
              }

              .slot .tile {
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: #ffffff;
                transition: opacity 0.2s ease;
              }

              .slot .mk {
                position: absolute;
                left: 50%;
                top: 50%;
                height: 62%;
                width: auto;
                aspect-ratio: 520 / 630;
                transform: translate(-50%, -50%);
                display: block;
                overflow: visible;
              }

              html:not(.ff-launch) .slot .tile {
                opacity: 1;
              }
              html:not(.ff-launch) .slot .mk {
                visibility: visible;
              }
            `,
          }}
        />

        {/* Theme Pre-Hydration Init Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('focusforge_theme');var isDark=true;if(t){if(t==='light'){isDark=false;}else if(t==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{var d=localStorage.getItem('focusforge_data');if(d){var s=JSON.parse(d);if(s&&s.theme&&s.theme.mode){if(s.theme.mode==='light'){isDark=false;}else if(s.theme.mode==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{isDark=true;}}else{isDark=true;}}var root=document.documentElement;var themeHex=isDark?'#090c19':'#F3F7FC';if(isDark){root.dataset.theme='dark';root.classList.add('dark');root.classList.remove('light');root.style.colorScheme='dark';}else{root.dataset.theme='light';root.classList.remove('dark');root.classList.add('light');root.style.colorScheme='light';}var metaTheme=document.getElementById('ff-theme-color');if(metaTheme){metaTheme.setAttribute('content',themeHex);}}catch(e){}})();`,
          }}
        />

        {/* Vanilla JS Launch Splash Controller (Runs in Head, zero React/Bundle dependency) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
  if (!document.documentElement.classList.contains('ff-launch')) {
    var boot = document.getElementById('ff-boot-layer');
    if (boot) boot.remove();
    return;
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var readyResolver;
  var readyPromise = new Promise(function(resolve) {
    readyResolver = resolve;
  });
  window.__ffReady = function() {
    if (readyResolver) {
      readyResolver();
      readyResolver = null;
    }
  };

  var wait = function(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  };

  var animateHelper = function(el, keyframes, options) {
    if (!el || typeof el.animate !== 'function') return Promise.resolve();
    try {
      var anim = el.animate(keyframes, Object.assign({ fill: 'both' }, options));
      return anim.finished.catch(function() {});
    } catch(e) {
      return Promise.resolve();
    }
  };

  var findTargetSlot = function() {
    var slots = Array.from(document.querySelectorAll('[data-ff-launch-slot]'));
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (slot.offsetParent !== null) {
        var mark = slot.querySelector('[data-ff-launch-mark]') || slot.querySelector('.mk') || slot;
        var r = mark.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { slot: slot, mark: mark, rect: r };
        }
      }
    }
    return null;
  };

  var waitForTargetSlot = function(maxWaitMs) {
    return new Promise(function(resolve) {
      var target = findTargetSlot();
      if (target) return resolve(target);
      var start = Date.now();
      var check = function() {
        var found = findTargetSlot();
        if (found) return resolve(found);
        if (Date.now() - start > maxWaitMs) return resolve(null);
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  var cleanupAndFinish = function() {
    try {
      var boot = document.getElementById('ff-boot-layer');
      if (boot) {
        boot.remove();
      }
      document.documentElement.classList.remove('ff-launch');
      document.documentElement.classList.add('ff-brand-visible');
      var appShell = document.getElementById('app-shell');
      if (appShell) {
        appShell.style.opacity = '';
        appShell.style.transform = '';
      }
      document.querySelectorAll('.slot .mk').forEach(function(m) { m.style.visibility = 'visible'; });
      document.querySelectorAll('.slot .tile').forEach(function(t) { t.style.opacity = '1'; });
      window.__ffLaunchDone = true;
      window.dispatchEvent(new Event('ff:launch-done'));
    } catch(e) {}
  };

  var runLaunch = async function() {
    var bootLayer = document.getElementById('ff-boot-layer');
    var bootBadge = document.getElementById('ff-boot-badge');

    if (!bootLayer || !bootBadge) {
      cleanupAndFinish();
      return;
    }

    // Wait for React ready signal (first paint) with safety timeout 2.5s
    await Promise.race([readyPromise, wait(2500)]);

    var appShell = document.getElementById('app-shell');

    // Respect prefers-reduced-motion: simple clean fade
    if (reduce) {
      if (appShell) {
        appShell.style.opacity = '1';
        appShell.style.transform = 'none';
      }
      await animateHelper(bootLayer, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
      cleanupAndFinish();
      return;
    }

    // Locate header/sidebar slot
    var target = await waitForTargetSlot(300);

    if (!target) {
      if (appShell) {
        animateHelper(appShell, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300 });
      }
      await animateHelper(bootLayer, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
      cleanupAndFinish();
      return;
    }

    // Shared-element fly calculation
    var t = target.mark.getBoundingClientRect();
    var r = bootBadge.getBoundingClientRect();
    var s = t.width / r.width;
    var dx = t.left - r.left;
    var dy = t.top - r.top;
    var D = 650;
    var E = 'cubic-bezier(.2, .8, .2, 1)';

    // 1. Animate the same badge to header logo position
    var badgeAnim = animateHelper(bootBadge, [
      { transform: 'none', borderRadius: '20px' },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')', borderRadius: (8 / s) + 'px' }
    ], { duration: D, easing: E, fill: 'forwards' });

    // 2. Concurrently fade boot layer background to transparent so skeleton shows
    bootLayer.style.background = 'transparent';
    bootBadge.style.zIndex = '999999';

    // 3. Fade and slide in dark skeleton / real dashboard (opacity + 10px translateY, ~300ms)
    if (appShell) {
      animateHelper(appShell, [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0px)' }
      ], { duration: 300, delay: 100, easing: 'ease-out', fill: 'forwards' });
    }

    // 4. Header "FocusForge" text fades in beside logo at the end
    setTimeout(function() {
      document.documentElement.classList.add('ff-brand-visible');
    }, 480);

    await badgeAnim;

    // 5. Seamless swap to real header icon and remove boot layer from DOM
    document.querySelectorAll('.slot .mk').forEach(function(m) {
      m.style.visibility = 'visible';
    });
    document.querySelectorAll('.slot .tile').forEach(function(t) {
      t.style.opacity = '1';
    });

    cleanupAndFinish();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLaunch);
  } else {
    runLaunch();
  }

  // Safety fallback
  setTimeout(function() {
    if (document.getElementById('ff-boot-layer')) {
      cleanupAndFinish();
    }
  }, 3500);
})();`,
          }}
        />

        <meta name="theme-color" id="ff-theme-color" content="#090c19" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FocusForge" />
      </head>
      <body
        suppressHydrationWarning
        className={`${GeistSans.className} ${notoSansBengali.variable} min-h-screen antialiased bg-background text-foreground relative selection:bg-accent-hover selection:text-white`}
      >
        <div 
          className="top-ambient-glow pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.28)_0%,rgba(8,9,12,0)_75%)] z-0 dark:block hidden" 
          aria-hidden="true" 
        />

        {/* Inline Boot Layer matching Android Splash (Plain HTML + CSS, zero framework dependency) */}
        <div id="ff-boot-layer" aria-hidden="true">
          <div id="ff-boot-badge">
            <svg viewBox="360 320 520 630">
              <g style={{ fill: "#061f52" }}>
                <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
                <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
              </g>
              <circle cx="473" cy="745" r="97" fill="#fff" stroke="#061f52" strokeWidth="15" />
              <circle cx="473" cy="745" r="45" fill="#061f52" />
              <circle cx="473" cy="745" r="14" fill="#fff" />
              <g stroke="#061f52" strokeWidth="5">
                <path d="M473 662v16M473 812v16M390 745h16M540 745h16" />
              </g>
            </svg>
          </div>
        </div>

        {/* Global SVG Symbol Definition for Header Icon */}
        <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none", opacity: 0 }} aria-hidden="true">
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

        <AppProvider>
          <AuthProvider>
            <ServiceWorkerRegister />
            <div id="app-shell" className="relative z-10 min-h-screen">
              {children}
            </div>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}

