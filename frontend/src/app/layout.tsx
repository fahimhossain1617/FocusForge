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
  themeColor: "#FFFFFF",
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

        {/* Critical Inline CSS for Launch Screen & Layout Transitions */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @property --logo {
                syntax: '<color>';
                inherits: true;
                initial-value: #061f52;
              }

              :root {
                --tile: #eaf0ff;
                --logo-ui: #2f5fd0;
                --line: #e6eaf3;
              }

              [data-theme="dark"],
              .dark {
                --tile: #ffffff;
                --logo-ui: #061f52;
                --line: #1a2547;
              }

              html.ff-launch,
              html.ff-launch body {
                background-color: #FFFFFF !important;
                overflow: hidden !important;
              }

              html.ff-launch #root,
              html.ff-launch #app-shell {
                visibility: hidden !important;
              }

              #ff-splash {
                display: none;
              }

              html.ff-launch #ff-splash {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100dvh;
                background-color: #FFFFFF;
                z-index: 999990;
                display: block !important;
                overflow: hidden;
                padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
              }

              #ff-splash-logo {
                display: none;
              }

              html.ff-launch #ff-splash-logo {
                --w: min(34vmin, 190px);
                position: fixed;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin: auto;
                width: var(--w);
                height: calc(var(--w) * 1.2115);
                z-index: 999999;
                transform-origin: 0 0;
                pointer-events: none;
                display: block !important;
              }

              #ff-splash-lg {
                width: 100%;
                height: 100%;
                transform-origin: 50% 50%;
                transform: scale(0.62);
              }

              #ff-splash-lg svg {
                width: 100%;
                height: 100%;
                overflow: visible;
                display: block;
              }

              /* Slot and Mark rules */
              .slot {
                --logo: #061f52;
                position: relative;
                display: block;
                flex: none;
                transition: --logo 0.9s ease;
              }

              .slot.settled {
                --logo: var(--logo-ui);
              }

              .slot .tile {
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: var(--tile);
                box-shadow: 0 1px 0 var(--line);
                transition: background-color 0.4s ease;
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

              /* During launch: real slot icon is hidden */
              html.ff-launch .slot .tile {
                opacity: 0;
              }

              html.ff-launch .slot .mk {
                visibility: hidden;
              }

              /* Outside launch: real slot icon is immediately visible */
              html:not(.ff-launch) .slot {
                --logo: var(--logo-ui);
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
            __html: `(function(){try{var t=localStorage.getItem('focusforge_theme');var isDark=true;if(t){if(t==='light'){isDark=false;}else if(t==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{var d=localStorage.getItem('focusforge_data');if(d){var s=JSON.parse(d);if(s&&s.theme&&s.theme.mode){if(s.theme.mode==='light'){isDark=false;}else if(s.theme.mode==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{isDark=true;}}else{isDark=true;}}var root=document.documentElement;if(isDark){root.dataset.theme='dark';root.classList.add('dark');root.classList.remove('light');root.style.colorScheme='dark';}else{root.dataset.theme='light';root.classList.remove('dark');root.classList.add('light');root.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />

        {/* Vanilla JS Launch Splash Controller (Runs in Head, zero React/Bundle dependency) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
  if (!document.documentElement.classList.contains('ff-launch')) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var E = 'cubic-bezier(.16,1,.3,1)';
  var M = 'cubic-bezier(.65,0,.2,1)';

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

  var frames = function(n) {
    return new Promise(function(resolve) {
      var i = 0;
      function f() {
        if (++i >= n) resolve();
        else requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    });
  };

  var animateHelper = function(el, keyframes, options) {
    if (!el || typeof el.animate !== 'function') return Promise.resolve();
    try {
      var anim = el.animate(keyframes, Object.assign({ fill: 'both', easing: E }, options));
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

  var cleanupAndFinish = function(targetSlot) {
    try {
      var splash = document.getElementById('ff-splash');
      if (splash) {
        splash.style.display = 'none';
      }
      var logo = document.getElementById('ff-splash-logo');
      if (logo) {
        logo.style.display = 'none';
      }
      document.documentElement.classList.remove('ff-launch');
      var appShell = document.getElementById('app-shell');
      if (appShell) {
        appShell.style.visibility = '';
        appShell.style.clipPath = '';
        appShell.style.zIndex = '';
        if (typeof appShell.getAnimations === 'function') {
          appShell.getAnimations().forEach(function(anim) { anim.cancel(); });
        }
      }
      var isDark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
      var metaTheme = document.getElementById('ff-theme-color');
      if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#0A0E1A' : '#F3F7FC');
      }
      window.__ffLaunchDone = true;
      window.dispatchEvent(new Event('ff:launch-done'));
    } catch(e) {}
  };

  var runLaunch = async function() {
    var splash = document.getElementById('ff-splash');
    var logo = document.getElementById('ff-splash-logo');
    var lg = document.getElementById('ff-splash-lg');
    var p4 = document.getElementById('ff-p4');
    var p5 = document.getElementById('ff-p5');
    var p6 = document.getElementById('ff-p6');

    if (!splash || !logo || !lg) {
      cleanupAndFinish(null);
      return;
    }

    var k = 0.62;
    lg.style.transform = 'scale(' + k + ')';

    if (reduce) {
      await Promise.race([readyPromise, wait(2300)]);
      var appShell = document.getElementById('app-shell');
      if (appShell) appShell.style.visibility = 'visible';
      document.querySelectorAll('.slot .mk').forEach(function(m) { m.style.visibility = 'visible'; });
      document.querySelectorAll('.slot .tile').forEach(function(t) { t.style.opacity = '1'; });
      document.querySelectorAll('.slot').forEach(function(s) { s.classList.add('settled'); });
      await Promise.all([
        animateHelper(splash, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 }),
        animateHelper(logo, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 })
      ]);
      cleanupAndFinish(null);
      return;
    }

    // Native splash icon handoff
    await wait(1100);

    lg.style.transform = '';
    animateHelper(lg, [{ transform: 'scale(' + k + ')' }, { transform: 'scale(1)' }], { duration: 850 });
    animateHelper(p4, [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(0deg)' }], { duration: 1000, delay: 250, easing: 'cubic-bezier(.34,1.2,.64,1)' });
    animateHelper(p6, [{ transform: 'scale(1)', opacity: 0.4 }, { transform: 'scale(1.9)', opacity: 0 }], { duration: 1100, delay: 450, fill: 'forwards' });
    animateHelper(p5, [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 600, delay: 700, easing: 'ease-in-out' });

    // Hold ~2.3s
    await wait(2300);

    // Wait for app ready signal (session/auth + data + layout), max +1.5s
    await Promise.race([readyPromise, wait(1500)]);

    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch(e) {}
    }
    await frames(2);

    var appShell = document.getElementById('app-shell');
    var target = await waitForTargetSlot(1000);

    if (!target) {
      // Clean fallback fade
      if (appShell) appShell.style.visibility = 'visible';
      document.querySelectorAll('.slot .mk').forEach(function(m) { m.style.visibility = 'visible'; });
      document.querySelectorAll('.slot .tile').forEach(function(t) { t.style.opacity = '1'; });
      document.querySelectorAll('.slot').forEach(function(s) { s.classList.add('settled'); });
      await Promise.all([
        animateHelper(splash, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }),
        animateHelper(logo, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
      ]);
      cleanupAndFinish(null);
      return;
    }

    // Flight to slot + circular reveal
    if (appShell) {
      appShell.style.zIndex = '999995';
    }

    var t = target.mark.getBoundingClientRect();
    var r = logo.getBoundingClientRect();
    var s = t.width / r.width;
    var dx = t.left - r.left;
    var dy = t.top - r.top;
    var cx = t.left + (t.width / 2);
    var cy = t.top + (t.height / 2);
    var D = 900;

    if (appShell) {
      appShell.style.visibility = 'visible';
      appShell.style.clipPath = 'circle(0px at ' + cx + 'px ' + cy + 'px)';
      animateHelper(appShell, [
        { clipPath: 'circle(0px at ' + cx + 'px ' + cy + 'px)' },
        { clipPath: 'circle(150vmax at ' + cx + 'px ' + cy + 'px)' }
      ], { duration: D + 150, easing: M, fill: 'forwards' });
    }

    await animateHelper(logo, [
      { transform: 'none' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' }
    ], { duration: D, easing: M, fill: 'forwards' });

    // Seamless swap: flying mark -> real header icon
    document.querySelectorAll('.slot .mk').forEach(function(m) {
      m.style.visibility = 'visible';
    });
    logo.style.display = 'none';

    document.querySelectorAll('.slot .tile').forEach(function(x) {
      animateHelper(x, [
        { opacity: 0, transform: 'scale(.86)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    });

    document.querySelectorAll('.slot').forEach(function(x) {
      x.classList.add('settled');
    });

    splash.style.display = 'none';

    // Wait for the tile morph to complete before full cleanup
    await wait(350);
    cleanupAndFinish(target.slot);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLaunch);
  } else {
    runLaunch();
  }

  // Safety fallback
  setTimeout(function() {
    if (document.documentElement.classList.contains('ff-launch')) {
      cleanupAndFinish(null);
    }
  }, 6500);
})();`,
          }}
        />

        <meta name="theme-color" id="ff-theme-color" content="#FFFFFF" />
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

        {/* Static Launch Splash Markup (Raw HTML so React does not track internal animation DOM mutations during hydration) */}
        <div
          id="ff-splash-container"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              <div id="ff-splash" aria-hidden="true"></div>
              <div id="ff-splash-logo" aria-hidden="true">
                <div id="ff-splash-lg">
                  <svg viewBox="360 320 520 630" style="width: 100%; height: 100%; overflow: visible; display: block">
                    <g style="fill: #061f52">
                      <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
                      <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
                    </g>
                    <circle id="ff-p6" cx="473" cy="745" r="100" fill="none" stroke="#061f52" stroke-width="6" style="opacity: 0; transform-origin: 473px 745px" />
                    <circle cx="473" cy="745" r="97" fill="#fff" stroke="#061f52" stroke-width="15" />
                    <g id="ff-p4" style="transform-origin: 473px 745px" stroke="#061f52" stroke-width="5">
                      <path d="M473 662v16M473 812v16M390 745h16M540 745h16" />
                    </g>
                    <circle id="ff-p5" cx="473" cy="745" r="45" fill="#061f52" style="transform-origin: 473px 745px" />
                    <circle cx="473" cy="745" r="14" fill="#fff" />
                  </svg>
                </div>
              </div>
              <svg width="0" height="0" style="position: absolute; pointer-events: none; opacity: 0">
                <defs>
                  <g id="ff-mark" style="fill: var(--logo, #061f52)">
                    <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
                    <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
                    <circle cx="473" cy="745" r="97" stroke-width="15" style="fill: var(--tile); stroke: var(--logo, #061f52)" />
                    <circle cx="473" cy="745" r="45" />
                    <circle cx="473" cy="745" r="14" style="fill: var(--tile)" />
                    <path d="M473 662v16M473 812v16M390 745h16M540 745h16" stroke-width="5" fill="none" style="stroke: var(--logo, #061f52)" />
                  </g>
                </defs>
              </svg>
            `,
          }}
        />

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

