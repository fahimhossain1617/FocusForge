"use client";

import { useServerInsertedHTML } from "next/navigation";
import "../utils/clientDevFixes";

/**
 * PreHydrationScripts
 *
 * Injects critical pre-hydration head scripts and baseline styles via Next.js
 * `useServerInsertedHTML`. This ensures scripts run before initial paint to prevent
 * theme flickering and handle launch gating, while completely preventing React 19's
 * "Encountered a script tag while rendering React component" warning and client/server
 * hydration mismatches.
 */
export default function PreHydrationScripts() {
  useServerInsertedHTML(() => {
    return (
      <>
        {/* Theme Pre-Hydration Init Script (Runs First Before Paint) */}
        <script
          id="ff-theme-prehydration"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('focusforge_theme');var isDark=true;if(t){if(t==='light'){isDark=false;}else if(t==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{var d=localStorage.getItem('focusforge_data');if(d){var s=JSON.parse(d);if(s&&s.theme&&s.theme.mode){if(s.theme.mode==='light'){isDark=false;}else if(s.theme.mode==='system'){isDark=window.matchMedia('(prefers-color-scheme: dark)').matches;}else{isDark=true;}}else{isDark=true;}}else{isDark=true;}}var root=document.documentElement;var themeHex=isDark?'#090c19':'#F3F7FC';if(isDark){root.dataset.theme='dark';root.classList.add('dark');root.classList.remove('light');root.style.colorScheme='dark';}else{root.dataset.theme='light';root.classList.remove('dark');root.classList.add('light');root.style.colorScheme='light';}var metaTheme=document.getElementById('ff-theme-color');if(metaTheme){metaTheme.setAttribute('content',themeHex);}}catch(e){}})();`,
          }}
        />

        {/* Anti-Flicker Inline Dynamic Baseline Style */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
              }
              html.light, html.light body, html[data-theme="light"], html[data-theme="light"] body {
                background: #F3F7FC !important;
                background-color: #F3F7FC !important;
                color-scheme: light;
              }
              html.dark, html.dark body, html:not(.light), html:not(.light) body {
                background: #090c19 !important;
                background-color: #090c19 !important;
                color-scheme: dark;
              }
              html.light #ff-boot-layer, html[data-theme="light"] #ff-boot-layer {
                background-color: #F3F7FC !important;
              }
              html.dark #ff-boot-layer, html:not(.light) #ff-boot-layer {
                background-color: #090c19 !important;
              }
            `,
          }}
        />

        {/* Orientation Lock Meta for Mobile Browsers & PWAs */}
        <meta name="screen-orientation" content="portrait" />
        <meta name="x5-orientation" content="portrait" />

        {/* Launch Animation Gating & Session Storage Check (Runs Synchronously in Head) */}
        <script
          id="ff-launch-gate"
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
                rotate: 0deg !important;
                will-change: transform, border-radius, opacity, box-shadow;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
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
                transform: translate(-50%, -50%) rotate(0deg) !important;
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
              @keyframes forceShellVisible {
                to { opacity: 1 !important; transform: none !important; }
              }
              @keyframes forceBootLayerHide {
                to { opacity: 0 !important; pointer-events: none !important; display: none !important; }
              }
              html.ff-launch #app-shell {
                opacity: 0;
                transform: translateY(10px);
                will-change: opacity, transform;
                animation: forceShellVisible 0.1s ease 0.9s forwards;
              }
              #ff-boot-layer {
                animation: forceBootLayerHide 0.15s ease 1s forwards;
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

        {/* Vanilla JS Launch Splash Controller (Runs in Head, zero React/Bundle dependency) */}
        <script
          id="ff-launch-controller"
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
        classObserver = null;
      }
      document.documentElement.classList.remove('ff-launch');
      document.documentElement.classList.add('ff-brand-visible');

      var bootLayer = document.getElementById('ff-boot-layer');
      if (bootLayer) {
        bootLayer.style.display = 'none';
        if (bootLayer.parentNode) {
          bootLayer.parentNode.removeChild(bootLayer);
        }
      }

      var appShell = document.getElementById('app-shell');
      if (appShell) {
        appShell.style.opacity = '1';
        appShell.style.transform = 'none';
      }
    } catch(e) {}
  };

  var runLaunch = async function() {
    if (reduce) {
      cleanupAndFinish();
      return;
    }

    var bootLayer = document.getElementById('ff-boot-layer');
    var bootBadge = document.getElementById('ff-boot-badge');
    var appShell = document.getElementById('app-shell');

    if (!bootLayer || !bootBadge) {
      cleanupAndFinish();
      return;
    }

    // Phase 1: Wait for app readiness or fallback timeout
    var readyTimeout = isSlowDebug ? 3000 : 400;
    await Promise.race([readyPromise, wait(readyTimeout)]);

    // Phase 2: Resolve target navbar slot
    var target = await waitForTargetSlot(isSlowDebug ? 2000 : 250);
    if (!target) {
      cleanupAndFinish();
      return;
    }

    // Phase 3: Geometry & Coordinate Mapping
    var badgeRect = bootBadge.getBoundingClientRect();
    var targetRect = target.rect;

    var badgeCenterX = badgeRect.left + (badgeRect.width / 2);
    var badgeCenterY = badgeRect.top + (badgeRect.height / 2);
    var targetCenterX = targetRect.left + (targetRect.width / 2);
    var targetCenterY = targetRect.top + (targetRect.height / 2);

    var dx = targetCenterX - badgeCenterX;
    var dy = targetCenterY - badgeCenterY;
    var scale = targetRect.width / badgeRect.width;

    var flightDuration = isSlowDebug ? 3000 : 440;

    // Fade out boot backdrop layer
    try {
      bootLayer.animate([
        { backgroundColor: window.getComputedStyle(bootLayer).backgroundColor },
        { backgroundColor: 'rgba(0, 0, 0, 0)' }
      ], {
        duration: flightDuration * 0.75,
        easing: 'ease-out',
        fill: 'forwards'
      });
    } catch(e) {}

    // Badge flight animation
    var flightAnim;
    try {
      flightAnim = bootBadge.animate([
        { 
          transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
          borderRadius: '50%',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.25)'
        },
        { 
          transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ') rotate(0deg)',
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

    // Await arrival with max safety timeout
    try {
      await Promise.race([flightAnim.finished, wait(flightDuration + 100)]);
    } catch(e) {}

    // At landing: in the exact same frame, switch to real navbar logo and remove boot layer
    cleanupAndFinish();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runLaunch);
  } else {
    runLaunch();
  }

  // Safety fallback guarantees app shell is visible within 750ms under any network/offline circumstance
  var safetyTimeoutMs = isSlowDebug ? 8000 : 750;
  setTimeout(function() {
    cleanupAndFinish();
  }, safetyTimeoutMs);
  window.addEventListener('load', function() {
    setTimeout(cleanupAndFinish, 250);
  });
})();`,
          }}
        />

        <meta name="theme-color" id="ff-theme-color" content="#090c19" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Focentia" />
      </>
    );
  });

  return null;
}
