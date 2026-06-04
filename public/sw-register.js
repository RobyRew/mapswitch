// Registers the service worker (PWA install + Web Share Target on Android).
// External file on purpose: the CSP allows same-origin scripts via `script-src
// 'self'`, so this needs no inline hash. No-ops where SW is unsupported.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      /* registration is best-effort — the app works fine without it */
    });
  });
}
