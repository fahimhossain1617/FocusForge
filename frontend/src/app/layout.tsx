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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://focentia.app"),
  title: {
    default: "Focentia — Personal External Brain & Deep Productivity",
    template: "%s | Focentia",
  },
  description:
    "A personal external brain. Capture thoughts, organize tasks, plan your day, focus deeply, and track where your time goes.",
  manifest: "/manifest.json",
  applicationName: "Focentia",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Focentia — Personal External Brain & Deep Productivity",
    description:
      "Capture thoughts, organize tasks, plan your day, focus deeply, and master your time.",
    url: "https://focentia.app",
    siteName: "Focentia",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Focentia — Personal External Brain",
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

    var isSplashParam = window.location.search.indexOf('splash=1') !== -1;
    var sessionPlayed = false;
    try {
      sessionPlayed = !!sessionStorage.getItem('ff_launch');
    } catch(e) {}

    var shouldPlay = isSplashParam || (!isReload && !isBackForward && !sessionPlayed);

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

              html:not(.ff-launch) #ff-boot-layer {
                display: none !important;
              }

              #ff-boot-badge {
                width: 124px;
                height: 124px;
                max-width: 34vw;
                max-height: 34vw;
                aspect-ratio: 1 / 1;
                background: #ffffff;
                border-radius: 50%;
                position: relative;
                flex: none;
                transform-origin: center center;
                will-change: transform, border-radius, opacity, box-shadow;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }

              #ff-boot-badge .mk {
                position: absolute;
                left: 50%;
                top: 50%;
                height: 74%;
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
              }
              html.ff-brand-visible [data-ff-brand-title] {
                opacity: 1;
                transform: translateX(0);
                transition: opacity 250ms ease-out, transform 250ms ease-out;
              }
              html:not(.ff-launch):not(.ff-brand-visible) [data-ff-brand-title] {
                opacity: 1;
                transform: none;
              }

              /* Start app shell with slight offset and opacity during launch */
              html.ff-launch #app-shell {
                opacity: 0;
                transform: translateY(10px);
                will-change: opacity, transform;
              }

              /* Slot and Tile rules for in-app header */
              .slot {
                --logo: #061f52;
                position: relative;
                display: block;
                flex: none;
                border-radius: 50%;
              }

              .slot .tile {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: #ffffff;
                transition: opacity 0.2s ease;
              }

              .slot .mk {
                position: absolute;
                left: 50%;
                top: 50%;
                height: 74%;
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
  var isLaunching = document.documentElement.classList.contains('ff-launch');
  if (!isLaunching) {
    return;
  }

  // Guard against double invocation
  if (window.__ffLaunchRunning) return;
  window.__ffLaunchRunning = true;
  window.__ffIsLaunching = true;

  // Ensure ff-launch class is maintained if React hydration attempts to overwrite class
  var classObserver;
  try {
    classObserver = new MutationObserver(function() {
      if (window.__ffIsLaunching && !document.documentElement.classList.contains('ff-launch')) {
        document.documentElement.classList.add('ff-launch');
      }
    });
    classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch(e) {}

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isSlowDebug = window.location.search.indexOf('ffdebug=1') !== -1;
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

  var findTargetSlot = function() {
    var isMobile = window.innerWidth < 768;
    var slots = Array.from(document.querySelectorAll('[data-ff-launch-slot]'));
    var preferredName = isMobile ? 'mobile' : 'sidebar';

    var candidateSlots = slots.sort(function(a, b) {
      var aName = a.getAttribute('data-ff-launch-slot') || '';
      var bName = b.getAttribute('data-ff-launch-slot') || '';
      var aPref = aName.indexOf(preferredName) !== -1 ? 0 : 1;
      var bPref = bName.indexOf(preferredName) !== -1 ? 0 : 1;
      return aPref - bPref;
    });

    for (var i = 0; i < candidateSlots.length; i++) {
      var slot = candidateSlots[i];
      var style = window.getComputedStyle(slot);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        continue;
      }

      var parent = slot.parentElement;
      var parentHidden = false;
      while (parent && parent !== document.body) {
        var pStyle = window.getComputedStyle(parent);
        if (pStyle.display === 'none' || pStyle.visibility === 'hidden') {
          parentHidden = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (parentHidden) continue;

      var r = slot.getBoundingClientRect();
      var vw = window.innerWidth || document.documentElement.clientWidth;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      if (r.width > 0 && r.height > 0 && r.left >= -5 && r.top >= -5 && r.right <= vw + 10 && r.top < vh * 0.5) {
        var mark = slot.querySelector('[data-ff-launch-mark]') || slot.querySelector('.mk') || slot;
        var markRect = mark.getBoundingClientRect();
        var finalRect = (markRect.width > 0 && markRect.height > 0) ? markRect : r;
        console.log('[FF Target Selected]', slot.getAttribute('data-ff-launch-slot'), finalRect);
        return {
          slot: slot,
          mark: mark,
          rect: finalRect,
          name: slot.getAttribute('data-ff-launch-slot')
        };
      }
    }
    return null;
  };

  var measureSlotNeutralized = function() {
    var appShell = document.getElementById('app-shell');
    var prevTransform = appShell ? appShell.style.transform : '';
    if (appShell) {
      appShell.style.transform = 'none';
    }
    var target = findTargetSlot();
    if (appShell) {
      appShell.style.transform = prevTransform;
    }
    return target;
  };

  var waitForTargetSlot = function(maxWaitMs) {
    return new Promise(function(resolve) {
      var target = measureSlotNeutralized();
      if (target) return resolve(target);
      var start = Date.now();
      var check = function() {
        var found = measureSlotNeutralized();
        if (found) return resolve(found);
        if (Date.now() - start > maxWaitMs) return resolve(null);
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  var cleanupAndFinish = function() {
    try {
      window.__ffIsLaunching = false;
      if (classObserver) {
        classObserver.disconnect();
      }
      var boot = document.getElementById('ff-boot-layer');
      if (boot) {
        boot.remove();
      }
      document.documentElement.classList.remove('ff-launch');
      document.documentElement.classList.add('ff-brand-visible');
      var appShell = document.getElementById('app-shell');
      if (appShell) {
        if (typeof appShell.getAnimations === 'function') {
          appShell.getAnimations().forEach(function(anim) {
            anim.cancel();
          });
        }
        appShell.style.opacity = '';
        appShell.style.transform = '';
        appShell.style.willChange = 'auto';
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

    var appShell = document.getElementById('app-shell');

    // Reduced motion fallback
    if (reduce) {
      if (appShell) {
        appShell.style.opacity = '1';
        appShell.style.transform = 'none';
      }
      try {
        var rmAnim = bootLayer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'both' });
        await rmAnim.finished;
      } catch(e) {}
      cleanupAndFinish();
      return;
    }

    // Measure target slot with fast resolution
    var target = await waitForTargetSlot(300);

    if (!target) {
      if (appShell) {
        try {
          appShell.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, fill: 'forwards' });
        } catch(e) {}
      }
      try {
        var fallbackFade = bootLayer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' });
        await fallbackFade.finished;
      } catch(e) {}
      cleanupAndFinish();
      return;
    }

    // Center-to-center motion calculation
    var r = bootBadge.getBoundingClientRect();
    var badgeCenterX = r.left + r.width / 2;
    var badgeCenterY = r.top + r.height / 2;
    var slotCenterX = target.rect.left + target.rect.width / 2;
    var slotCenterY = target.rect.top + target.rect.height / 2;
    var scale = target.rect.width / r.width;
    var dx = slotCenterX - badgeCenterX;
    var dy = slotCenterY - badgeCenterY;

    // Fast, ultra-smooth, eye-soothing flight (~340ms)
    var flightDuration = isSlowDebug ? 2500 : 340;
    var targetRadius = Math.max(6, Math.round((parseInt(window.getComputedStyle(target.slot).borderRadius) || 8) / Math.max(scale, 0.1)));

    // Subtle micro-hold (60ms) so user registers the splash badge steadily
    await wait(isSlowDebug ? 300 : 60);

    // Transition boot layer background to transparent so app shell beneath emerges seamlessly
    bootLayer.style.background = 'transparent';
    bootBadge.style.zIndex = '999999';

    // Badge flight animation: translation + scale + border-radius matching
    var flightAnim;
    try {
      flightAnim = bootBadge.animate([
        { 
          transform: 'translate(0px, 0px) scale(1)',
          borderRadius: '50%',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)'
        },
        { 
          transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')',
          borderRadius: '50%',
          boxShadow: '0 0px 0px rgba(0, 0, 0, 0)'
        }
      ], {
        duration: flightDuration,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards'
      });
    } catch(e) {
      cleanupAndFinish();
      return;
    }

    // Smoothly fade in app shell during flight
    if (appShell) {
      try {
        appShell.animate([
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'translateY(0px)' }
        ], {
          duration: flightDuration,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards'
        });
      } catch(e) {}
    }

    // Await arrival
    try {
      await flightAnim.finished;
    } catch(e) {}

    // At landing: in the exact same frame, switch to real navbar logo and remove boot layer
    cleanupAndFinish();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLaunch);
  } else {
    runLaunch();
  }

  // Safety fallback
  var safetyTimeoutMs = isSlowDebug ? 8000 : 1500;
  setTimeout(function() {
    if (document.getElementById('ff-boot-layer')) {
      cleanupAndFinish();
    }
  }, safetyTimeoutMs);
})();`,
          }}
        />

        <meta name="theme-color" id="ff-theme-color" content="#090c19" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Focentia" />
      </head>
      <body
        suppressHydrationWarning
        className={`${GeistSans.className} ${notoSansBengali.variable} h-screen h-dvh max-h-screen max-h-dvh overflow-hidden antialiased bg-background text-foreground relative selection:bg-accent-hover selection:text-white`}
      >
        <div 
          className="top-ambient-glow pointer-events-none fixed top-0 left-0 right-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.28)_0%,rgba(8,9,12,0)_75%)] z-0 dark:block hidden" 
          aria-hidden="true" 
        />

        {/* Global SVG Symbol Definition for Header Icon (Placed before Boot Layer for zero-latency paint) */}
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
            <ServiceWorkerRegister />
            <div id="app-shell" suppressHydrationWarning className="relative z-10 h-screen h-dvh max-h-screen max-h-dvh overflow-hidden w-full">
              {children}
            </div>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}

