/**
 * Form honeypot protection.
 *
 * Any form carrying `data-protected-form` will have a hidden `_gotcha`
 * (or `company`) field checked before submission. If a bot fills it, we
 * silently redirect to /thank-you/ so the bot thinks it succeeded.
 *
 * This is defense-in-depth only — the actual form endpoint (Formspree,
 * Buttondown, etc.) must also implement its own spam filtering.
 */
(() => {
  function protect(form) {
    if (form.dataset.protected === 'true') return;
    form.dataset.protected = 'true';

    form.addEventListener('submit', (event) => {
      const honeypot = form.querySelector(
        'input[name="_gotcha"], input[name="company"]',
      );
      if (honeypot && honeypot.value.trim() !== '') {
        event.preventDefault();
        window.location.href = '/thank-you/';
      }
    });
  }

  function init() {
    document.querySelectorAll('form[data-protected-form]').forEach(protect);
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('astro:page-load', init);
})();