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
  var LAUNCH_AWAY_MINUTES = 20;
  window.LAUNCH_AWAY_MINUTES = LAUNCH_AWAY_MINUTES;
  try {
    var navEntries = (window.performance && typeof performance.getEntriesByType === 'function')
      ? performance.getEntriesByType('navigation')
      : [];
    var navType = navEntries.length > 0 ? navEntries[0].type : '';
    if (!navType && window.performance && window.performance.navigation) {
      if (window.performance.navigation.type === 1) navType = 'reload';
      else if (window.performance.navigation.type === 2) navType = 'back_forward';
    }
    var isReload = (navType === 'reload');
    var isBackForward = (navType === 'back_forward');

    var sessionPlayed = false;
    try { sessionPlayed = !!sessionStorage.getItem('ff_launch'); } catch(e) {}

    var lastActive = 0;
    try { lastActive = parseInt(localStorage.getItem('ff_last_active') || '0', 10); } catch(e) {}

    var now = Date.now();
    var isAwayExpired = (lastActive > 0) && ((now - lastActive) > (LAUNCH_AWAY_MINUTES * 60 * 1000));

    var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator && window.navigator.standalone);
    if (isStandalone && window.history && window.history.length <= 1 && !isReload && !isBackForward) {
      sessionPlayed = false;
    }

    var shouldPlay = (!isReload && !isBackForward) && (!sessionPlayed || isAwayExpired);

    if (shouldPlay) {
      document.documentElement.classList.add('ff-launch');
      try {
        sessionStorage.setItem('ff_launch', '1');
        localStorage.setItem('ff_last_active', String(now));
      } catch(e) {}
    }

    var recordActive = function() {
      try { localStorage.setItem('ff_last_active', String(Date.now())); } catch(e) {}
    };
    window.addEventListener('visibilitychange', recordActive);
    window.addEventListener('pagehide', recordActive);
    window.addEventListener('beforeunload', recordActive);
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
                initial-value: #061F52;
              }
              :root { --logo-ui: #2F5FD0; }
              [data-theme="dark"] { --logo-ui: #9DB8FF; }

              #ff-splash {
                display: none;
              }

              html.ff-launch,
              html.ff-launch body {
                background-color: #FFFFFF !important;
                overflow: hidden !important;
              }

              html.ff-launch #app-shell {
                visibility: hidden !important;
              }

              html.ff-launch #ff-splash {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                background-color: #FFFFFF;
                display: grid !important;
                place-items: center;
                overflow: hidden;
                padding-top: env(safe-area-inset-top, 0px);
                padding-bottom: env(safe-area-inset-bottom, 0px);
                padding-left: env(safe-area-inset-left, 0px);
                padding-right: env(safe-area-inset-right, 0px);
                width: 100vw;
                height: 100dvh;
                margin: 0;
                box-sizing: border-box;
              }

              html.ff-launch #ff-splash-logo {
                position: fixed;
                left: 50%;
                top: 50%;
                width: min(40vmin, 220px);
                aspect-ratio: 520 / 630;
                transform: translate(-50%, -56%);
                z-index: 2147483647;
                transform-origin: 0 0;
                pointer-events: none;
              }

              html.ff-launch #ff-splash-word {
                position: fixed;
                left: 0;
                right: 0;
                top: calc(50% + min(24vmin, 130px));
                text-align: center;
                z-index: 2147483647;
                font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-weight: 600;
                letter-spacing: 0.32em;
                font-size: clamp(12px, 2.6vmin, 15px);
                color: #061F52;
                opacity: 0;
                padding-left: 0.32em;
                user-select: none;
                pointer-events: none;
              }

              html.ff-launch [data-ff-launch-slot] [data-ff-launch-mark],
              html.ff-launch [data-ff-launch-slot] img {
                opacity: 0 !important;
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
      var anim = el.animate(keyframes, Object.assign({ fill: 'both', easing: 'cubic-bezier(.16,1,.3,1)' }, options));
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
        var mark = slot.querySelector('[data-ff-launch-mark]') || slot;
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
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
      document.documentElement.classList.remove('ff-launch');
      var appShell = document.getElementById('app-shell');
      if (appShell) {
        appShell.style.visibility = '';
        appShell.style.clipPath = '';
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
    var word = document.getElementById('ff-splash-word');
    var p1 = document.getElementById('ff-p1');
    var p2 = document.getElementById('ff-p2');
    var p3 = document.getElementById('ff-p3');
    var p3Ring = document.getElementById('ff-p3-ring');
    var p4 = document.getElementById('ff-p4');
    var p5 = document.getElementById('ff-p5');

    if (!splash || !logo || !word) {
      cleanupAndFinish(null);
      return;
    }

    if (reduce) {
      await Promise.race([readyPromise, wait(1500)]);
      var appShell = document.getElementById('app-shell');
      if (appShell) appShell.style.visibility = 'visible';
      cleanupAndFinish(null);
      return;
    }

    await wait(200);

    // Assembly Part 1: Top hook descends
    animateHelper(p1, [
      { transform: 'translateY(-90px)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 900 });

    // Assembly Part 2: Diagonal blade enters
    animateHelper(p2, [
      { transform: 'translate(70px, 90px)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 900, delay: 140 });

    // Assembly Part 3: Target ring scales with overshoot
    animateHelper(p3, [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1.12)', opacity: 1, offset: 0.65 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: 900, delay: 520, easing: 'cubic-bezier(.34,1.3,.64,1)' });

    // Assembly Part 4: Crosshair ticks rotate and lock-on
    animateHelper(p4, [
      { transform: 'rotate(-120deg) scale(1.35)', opacity: 0 },
      { transform: 'rotate(0) scale(1)', opacity: 1 }
    ], { duration: 1000, delay: 800 });

    // Assembly Part 5: Center dot gentle pulse
    animateHelper(p5, [
      { transform: 'scale(1)' },
      { transform: 'scale(1.18)' },
      { transform: 'scale(1)' }
    ], { duration: 500, delay: 1500, easing: 'ease-in-out' });

    // Assembly Part 6: Wordmark fades in
    animateHelper(word, [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 700, delay: 1300 });

    // Hold assembled logo
    await wait(2300);

    // Wait for app ready signal (session/auth + data + layout)
    await Promise.race([readyPromise, wait(1500)]);

    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch(e) {}
    }
    await new Promise(function(r) { requestAnimationFrame(function() { requestAnimationFrame(r); }); });

    var target = await waitForTargetSlot(1000);
    var appShell = document.getElementById('app-shell');

    if (!target) {
      if (appShell) {
        appShell.style.visibility = 'visible';
        await animateHelper(splash, [{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
      }
      cleanupAndFinish(null);
      return;
    }

    var tRect = target.rect;
    var lRect = logo.getBoundingClientRect();
    var s = tRect.width / lRect.width;
    var dx = tRect.left - lRect.left;
    var dy = tRect.top - lRect.top;

    logo.style.left = lRect.left + 'px';
    logo.style.top = lRect.top + 'px';
    logo.style.transform = 'none';

    var isDark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
    var themeLogoColor = isDark ? '#9DB8FF' : '#2F5FD0';

    var slotCenterX = tRect.left + (tRect.width / 2);
    var slotCenterY = tRect.top + (tRect.height / 2);

    // Circular Reveal: Reveal app shell via expanding circle from slot center
    if (appShell) {
      appShell.style.visibility = 'visible';
      appShell.animate([
        { clipPath: 'circle(0px at ' + slotCenterX + 'px ' + slotCenterY + 'px)' },
        { clipPath: 'circle(150vmax at ' + slotCenterX + 'px ' + slotCenterY + 'px)' }
      ], {
        duration: 900,
        easing: 'cubic-bezier(.65,0,.2,1)',
        fill: 'forwards'
      });
    }

    // Wordmark fades out early in flight
    animateHelper(word, [{ opacity: 1 }, { opacity: 0 }], { duration: 360, fill: 'forwards' });

    // Smooth color change: navy #061F52 -> theme logo color (#2F5FD0 / #9DB8FF)
    var navy = '#061F52';
    [p1, p2, p5].forEach(function(el) {
      if (el) animateHelper(el, [{ fill: navy }, { fill: themeLogoColor }], { duration: 900, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' });
    });
    [p3Ring, p4].forEach(function(el) {
      if (el) animateHelper(el, [{ stroke: navy }, { stroke: themeLogoColor }], { duration: 900, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' });
    });

    // Flight to exact target slot position
    await animateHelper(logo, [
      { transform: 'none' },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')' }
    ], {
      duration: 900,
      easing: 'cubic-bezier(.65,0,.2,1)',
      fill: 'forwards'
    });

    // Landing Morph: Reveal and scale real rounded-square tile seamlessly
    if (target.slot) {
      var slotChildren = target.slot.querySelectorAll('*');
      slotChildren.forEach(function(el) { el.style.opacity = ''; });
      target.slot.animate([
        { transform: 'scale(0.86)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ], {
        duration: 600,
        easing: 'ease-out',
        fill: 'forwards'
      });
    }

    logo.style.display = 'none';
    word.style.display = 'none';
    cleanupAndFinish(target.slot);

    // Stagger dashboard cards entrance (translateY 16px -> 0, 90ms apart)
    var cards = document.querySelectorAll('main .app-card, main [data-dashboard-card], main .rounded-2xl, main .rounded-xl');
    cards.forEach(function(card, i) {
      animateHelper(card, [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'none' }
      ], {
        duration: 700,
        delay: i * 90,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'both'
      });
    });
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
  }, 5500);
})();`,
          }}
        />

        <meta name="theme-color" id="ff-theme-color" content="#FFFFFF" />
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

        {/* Static Launch Splash Markup (Sibling of #app-shell directly under <body>) */}
        <div id="ff-splash" aria-hidden="true">
          <div id="ff-splash-logo">
            <svg viewBox="360 320 520 630" style={{ width: "100%", height: "100%", overflow: "visible" }}>
              <g fill="#061F52">
                <path id="ff-p1" d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
                <path id="ff-p2" d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
              </g>
              <g id="ff-p3" style={{ transformOrigin: "473px 745px" }}>
                <circle cx="473" cy="745" r="112" fill="#fff" />
                <circle id="ff-p3-ring" cx="473" cy="745" r="97" fill="#fff" stroke="#061F52" strokeWidth="15" />
                <g id="ff-p4" style={{ transformOrigin: "473px 745px" }} stroke="#061F52" strokeWidth="5">
                  <path d="M473 662v16M473 812v16M390 745h16M540 745h16" />
                </g>
                <circle id="ff-p5" cx="473" cy="745" r="45" fill="#061F52" style={{ transformOrigin: "473px 745px" }} />
                <circle cx="473" cy="745" r="14" fill="#fff" />
              </g>
            </svg>
          </div>
          <div id="ff-splash-word">FOCUS FORGE</div>
        </div>

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

