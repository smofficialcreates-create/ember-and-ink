/**
 * Consent Mode v2 + cookie banner.
 *
 * Runs before any Google tag. Sets all storage to `denied` first, then
 * loads GA4 only after the visitor explicitly accepts. If no GA
 * measurement ID is present in the page's meta tag, this script is a
 * no-op — the banner never renders.
 *
 * The script is delivered as a static file from `public/scripts/` so it
 * cannot be processed or renamed by Astro's asset pipeline. That keeps
 * the CSP declaration in `public/_headers` stable across rebuilds.
 */
(() => {
  const STORAGE_KEY = 'ember-consent-v1';
  const meta = document.querySelector('meta[name="ga-measurement-id"]');
  const GA_ID = meta?.content?.trim();
  const isRealGaId = Boolean(
    GA_ID && /^G-[A-Z0-9]+$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX',
  );

  let banner = null;
  let gaLoaded = false;

  // Initialize the gtag command queue. This must exist before any
  // Google script loads, otherwise consent signals are dropped.
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  // Lock down all storage until the visitor makes a choice.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });

  function readConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function writeConsent(choice) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice, ts: Date.now() }),
      );
    } catch {
      /* localStorage may be blocked in private mode — that's fine */
    }
  }

  function loadGa() {
    if (!isRealGaId || gaLoaded) return;
    gaLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function grant() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    loadGa();
  }

  function deny() {
    gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    document.documentElement.classList.remove('consent-open');
  }

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    document.documentElement.classList.add('consent-open');
  }

  function init() {
    banner = document.querySelector('[data-consent-banner]');
    if (!banner) return;

    const stored = readConsent();
    if (stored?.choice === 'all') {
      grant();
      hideBanner();
    } else if (stored?.choice === 'essential') {
      deny();
      hideBanner();
    } else {
      showBanner();
    }

    banner
      .querySelector('[data-consent-accept]')
      ?.addEventListener('click', () => {
        writeConsent('all');
        grant();
        hideBanner();
      });

    banner
      .querySelector('[data-consent-reject]')
      ?.addEventListener('click', () => {
        writeConsent('essential');
        deny();
        hideBanner();
      });

    document.querySelectorAll('[data-consent-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        showBanner();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  // Astro's client-side router fires this on each navigation.
  document.addEventListener('astro:page-load', init);
})();