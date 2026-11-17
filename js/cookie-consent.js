/* CDL Network consent manager. Non-essential services are not requested before consent. */
(() => {
  'use strict';

  const COOKIE_NAME = 'eu-consent';
  const CONSENT_VERSION = 1;
  const SIX_MONTHS_SECONDS = 60 * 60 * 24 * 183;
  const SCRIPT_IDS = {
    google: 'cdl-google-tag-manager',
    clarity: 'cdl-microsoft-clarity',
    meta: 'cdl-meta-pixel'
  };
  const COPY = {
    en: {
      bannerTitle: 'Your privacy matters',
      bannerText: 'We use optional analytics to understand how the site is used and marketing tools to measure our campaigns. They stay off unless you enable them. The site remains usable if you reject them, and you can change your choice at any time.',
      accept: 'Accept all', reject: 'Reject all', settings: 'Customize',
      settingsTitle: 'Cookie settings', settingsIntro: 'Choose which optional tools CDL Network may use. Essential storage keeps your choice and selected language; it cannot be switched off.',
      essential: 'Essential', essentialText: 'Stores your consent choice and language preference. No advertising or analytics.',
      analytics: 'Audience measurement', analyticsText: 'Google Tag Manager / Google Analytics and Microsoft Clarity help us understand site use and improve the experience. Loaded only if enabled.',
      marketing: 'Marketing', marketingText: 'Meta Pixel measures the performance of our marketing campaigns. Loaded only if enabled.',
      save: 'Save my choices', close: 'Close', manage: 'Cookie settings',
      privacy: 'See our privacy policy', changed: 'Your cookie choices have been saved.',
      providers: 'Providers: Google, Microsoft and Meta. See details in the privacy policy.'
    },
    fr: {
      bannerTitle: 'Votre vie privée compte',
      bannerText: 'Nous utilisons des outils facultatifs de mesure d’audience et de marketing. Ils restent désactivés tant que vous ne les autorisez pas. Le site reste utilisable si vous les refusez, et vous pouvez modifier votre choix à tout moment.',
      accept: 'Tout accepter', reject: 'Tout refuser', settings: 'Personnaliser',
      settingsTitle: 'Paramètres des cookies', settingsIntro: 'Choisissez les outils facultatifs que CDL Network peut utiliser. Le stockage essentiel mémorise votre choix et votre langue ; il ne peut pas être désactivé.',
      essential: 'Essentiels', essentialText: 'Mémorise votre choix de consentement et votre préférence de langue. Aucun outil publicitaire ou de mesure d’audience.',
      analytics: 'Mesure d’audience', analyticsText: 'Google Tag Manager / Google Analytics et Microsoft Clarity nous aident à comprendre l’utilisation du site et à améliorer l’expérience. Ils ne sont chargés que si vous les autorisez.',
      marketing: 'Marketing', marketingText: 'Meta Pixel mesure les résultats de nos campagnes marketing. Il n’est chargé que si vous l’autorisez.',
      save: 'Enregistrer mes choix', close: 'Fermer', manage: 'Paramètres des cookies',
      privacy: 'Voir notre politique de confidentialité', changed: 'Vos choix de cookies ont été enregistrés.',
      providers: 'Prestataires : Google, Microsoft et Meta. Consultez les détails dans la politique de confidentialité.'
    }
  };

  const language = () => {
    const selected = window.CDL_I18N?.language || document.documentElement.lang || navigator.language || 'en';
    return String(selected).toLowerCase().startsWith('fr') ? 'fr' : 'en';
  };
  const words = (key) => COPY[language()][key] || COPY.en[key] || key;
  const readConsent = () => {
    const entry = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_NAME}=`));
    if (!entry) return null;
    try {
      const consent = JSON.parse(decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)));
      if (consent.version !== CONSENT_VERSION || typeof consent.changedAt !== 'string') return null;
      if (Date.now() - Date.parse(consent.changedAt) >= SIX_MONTHS_SECONDS * 1000) return null;
      return {
        necessary: true,
        analytics: consent.analytics === true,
        marketing: consent.marketing === true,
        changedAt: consent.changedAt,
        version: CONSENT_VERSION
      };
    } catch {
      return null;
    }
  };
  const currentConsent = () => readConsent() || { necessary: true, analytics: false, marketing: false };

  function saveConsent(analytics, marketing) {
    const consent = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(analytics),
      marketing: Boolean(marketing),
      changedAt: new Date().toISOString()
    };
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; Max-Age=${SIX_MONTHS_SECONDS}; Path=/; SameSite=Lax${secure}`;
    return consent;
  }

  function loadGoogleTagManager() {
    if (document.getElementById(SCRIPT_IDS.google)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'denied',
      security_storage: 'granted'
    });
    window.gtag('js', new Date());
    const script = document.createElement('script');
    script.id = SCRIPT_IDS.google;
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WCBT847Z';
    document.head.append(script);
  }

  const USER_DATA_COPY = {
    en: 'Optional: I agree that CDL Network may send my email to Google, normalized and hashed for measurement of this inquiry. This is not required to submit the form and applies only when I have also enabled analytics cookies.',
    fr: 'Facultatif : j’accepte que CDL Network transmette mon adresse e-mail à Google, normalisée et hachée, pour mesurer cette demande. Ce choix n’est pas nécessaire à l’envoi du formulaire et ne s’applique que si j’ai également autorisé les cookies de mesure d’audience.'
  };

  let userDataChoiceId = 0;

  function addUserDataChoices() {
    document.querySelectorAll('form[name="project-inquiry"]').forEach((form) => {
      if (form.querySelector('[data-cdl-user-data-consent]')) return;
      const email = form.querySelector('input[type="email"][name="email"]');
      if (!email) return;
      const group = document.createElement('div');
      group.className = 'form-consent cdl-user-data-consent';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.cdlUserDataConsent = 'true';
      const copy = document.createElement('span');
      copy.className = 'cdl-user-data-consent-copy';
      copy.textContent = USER_DATA_COPY[language()];
      const id = `cdl-user-data-consent-${++userDataChoiceId}`;
      checkbox.id = id;
      label.htmlFor = id;
      label.append(checkbox, document.createTextNode(' '), copy);
      group.append(label);
      email.closest('.form-group')?.after(group);
    });
  }

  function enableOptionalLeadMeasurement() {
    addUserDataChoices();
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.name !== 'project-inquiry') return;
      const choice = form.querySelector('[data-cdl-user-data-consent]');
      const consent = readConsent();
      const email = form.querySelector('input[type="email"][name="email"]')?.value.trim().toLowerCase();
      if (!choice?.checked || !consent?.analytics || !email || form.dataset.cdlUserDataSent === 'true') return;

      event.preventDefault();
      form.dataset.cdlUserDataSent = 'true';
      let resumed = false;
      const resume = () => {
        if (resumed) return;
        resumed = true;
        form.dataset.cdlUserDataSent = 'complete';
        window.dataLayer.push({ user_data: null });
        window.gtag?.('consent', 'update', { ad_user_data: 'denied' });
        form.requestSubmit(event.submitter || undefined);
      };
      window.gtag?.('consent', 'update', { ad_user_data: 'granted' });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'cdl_project_inquiry_user_data',
        user_data: { email: email },
        eventCallback: resume,
        eventTimeout: 1200
      });
      window.setTimeout(resume, 1500);
    }, true);
  }

  function loadClarity() {
    if (document.getElementById(SCRIPT_IDS.clarity)) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.id = SCRIPT_IDS.clarity; t.src = `https://www.clarity.ms/tag/${i}`;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', 'zdjcj7uygv');
  }

  function loadMetaPixel() {
    if (document.getElementById(SCRIPT_IDS.meta)) return;
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.id = SCRIPT_IDS.meta; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', '844275225047988');
    window.fbq('track', 'PageView');
  }

  function activate(consent) {
    if (consent.analytics) {
      loadGoogleTagManager();
      loadClarity();
    }
    if (consent.marketing) loadMetaPixel();
  }

  function removeFirstPartyTrackingCookies() {
    const names = document.cookie.split(';').map((value) => value.trim().split('=')[0]);
    names.filter((name) => /^(_ga($|_)|_gid$|_gat|_clck$|_clsk$|_fbp$|_fbc$)/i.test(name)).forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${location.hostname}; SameSite=Lax`;
    });
  }

  function mount() {
    if (document.getElementById('cdl-cookie-banner')) return;
    const shell = document.createElement('div');
    shell.innerHTML = `
      <section class="cdl-cookie-banner" id="cdl-cookie-banner" role="region" aria-labelledby="cdl-cookie-title" hidden>
        <div class="cdl-cookie-banner-copy">
          <h2 id="cdl-cookie-title" data-copy="bannerTitle"></h2>
          <p data-copy="bannerText"></p>
          <p class="cdl-cookie-providers" data-copy="providers"></p>
          <a href="/privacy-policy.html" data-copy="privacy"></a>
        </div>
        <div class="cdl-cookie-actions">
          <button type="button" data-consent-action="reject" class="cdl-cookie-button"></button>
          <button type="button" data-consent-action="accept" class="cdl-cookie-button"></button>
          <button type="button" data-consent-action="open" class="cdl-cookie-button"></button>
        </div>
      </section>
      <button type="button" class="cdl-cookie-manage" id="cdl-cookie-manage" aria-label="Cookie settings" hidden>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10c-5.5 0-8-4.5-8-10Zm-4.5 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm4-8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>
        <span data-copy="manage"></span>
      </button>
      <div class="cdl-cookie-overlay" id="cdl-cookie-overlay" hidden>
        <section class="cdl-cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="cdl-cookie-dialog-title" tabindex="-1">
          <button type="button" class="cdl-cookie-close" data-consent-action="close" aria-label="Close">×</button>
          <p class="cdl-cookie-eyebrow">CDL NETWORK · PRIVACY</p>
          <h2 id="cdl-cookie-dialog-title" data-copy="settingsTitle"></h2>
          <p class="cdl-cookie-intro" data-copy="settingsIntro"></p>
          <div class="cdl-cookie-options">
            <div class="cdl-cookie-option"><div><h3 id="cdl-cookie-essential-label" data-copy="essential"></h3><p data-copy="essentialText"></p></div><label class="cdl-cookie-switch"><input type="checkbox" checked disabled aria-labelledby="cdl-cookie-essential-label"><span></span></label></div>
            <div class="cdl-cookie-option"><div><h3 id="cdl-cookie-analytics-label" data-copy="analytics"></h3><p data-copy="analyticsText"></p></div><label class="cdl-cookie-switch"><input type="checkbox" id="cdl-consent-analytics" aria-labelledby="cdl-cookie-analytics-label"><span></span></label></div>
            <div class="cdl-cookie-option"><div><h3 id="cdl-cookie-marketing-label" data-copy="marketing"></h3><p data-copy="marketingText"></p></div><label class="cdl-cookie-switch"><input type="checkbox" id="cdl-consent-marketing" aria-labelledby="cdl-cookie-marketing-label"><span></span></label></div>
          </div>
          <div class="cdl-cookie-dialog-actions">
            <button type="button" data-consent-action="reject" class="cdl-cookie-button"></button>
            <button type="button" data-consent-action="accept" class="cdl-cookie-button"></button>
            <button type="button" data-consent-action="save" class="cdl-cookie-button cdl-cookie-save"></button>
          </div>
        </section>
      </div>`;
    while (shell.firstElementChild) document.body.append(shell.firstElementChild);
  }

  let settingsTrigger = null;

  function applyCopy() {
    document.querySelectorAll('[data-cookie-language]').forEach((element) => { element.hidden = element.dataset.cookieLanguage !== language(); });
    document.querySelectorAll('.cdl-user-data-consent-copy').forEach((element) => { element.textContent = USER_DATA_COPY[language()]; });
    document.querySelectorAll('[data-copy]').forEach((element) => { element.textContent = words(element.dataset.copy); });
    const manage = document.getElementById('cdl-cookie-manage');
    if (manage) manage.setAttribute('aria-label', words('manage'));
    const close = document.querySelector('.cdl-cookie-close');
    if (close) close.setAttribute('aria-label', words('close'));
    const consent = currentConsent();
    const analytics = document.getElementById('cdl-consent-analytics');
    const marketing = document.getElementById('cdl-consent-marketing');
    if (analytics) analytics.checked = consent.analytics;
    if (marketing) marketing.checked = consent.marketing;
  }

  function showSettings() {
    const overlay = document.getElementById('cdl-cookie-overlay');
    const dialog = overlay?.querySelector('.cdl-cookie-dialog');
    if (!overlay || !dialog) return;
    settingsTrigger = document.activeElement;
    applyCopy();
    overlay.hidden = false;
    document.body.classList.add('cdl-cookie-lock');
    dialog.querySelector('#cdl-consent-analytics')?.focus();
    dialog.onkeydown = (event) => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    overlay.addEventListener('click', (event) => { if (event.target === overlay) closeSettings(); }, { once: true });
  }

  function closeSettings() {
    const overlay = document.getElementById('cdl-cookie-overlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('cdl-cookie-lock');
    if (settingsTrigger && document.contains(settingsTrigger) && !settingsTrigger.hidden) settingsTrigger.focus();
    else {
      const manage = document.getElementById('cdl-cookie-manage');
      if (manage && !manage.hidden) manage.focus();
      else document.querySelector('#cdl-cookie-banner [data-consent-action="open"]')?.focus();
    }
  }

  function saveAndApply(analytics, marketing) {
    const old = readConsent();
    const next = saveConsent(analytics, marketing);
    const manager = document.getElementById('cdl-cookie-manage');
    const banner = document.getElementById('cdl-cookie-banner');
    const overlay = document.getElementById('cdl-cookie-overlay');
    if (banner) banner.hidden = true;
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('cdl-cookie-lock');
    if (manager) { manager.hidden = false; manager.focus(); }
    document.dispatchEvent(new CustomEvent('cdl:consentchange', { detail: { ...next } }));

    const withdrawing = old && ((old.analytics && !next.analytics) || (old.marketing && !next.marketing));
    if (withdrawing) {
      removeFirstPartyTrackingCookies();
      location.reload();
      return;
    }
    activate(next);
  }

  function setAll(accepted) {
    saveAndApply(Boolean(accepted), Boolean(accepted));
  }

  function init() {
    if (!document.body) return;
    mount();
    applyCopy();
    const stored = readConsent();
    const banner = document.getElementById('cdl-cookie-banner');
    const manager = document.getElementById('cdl-cookie-manage');
    if (stored) {
      activate(stored);
      manager.hidden = false;
    } else {
      banner.hidden = false;
      manager.hidden = true;
    }

    document.addEventListener('cdl:languagechange', applyCopy);
    enableOptionalLeadMeasurement();
    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-consent-action]')?.dataset.consentAction;
      if (!action) return;
      if (action === 'accept') setAll(true);
      if (action === 'reject') setAll(false);
      if (action === 'open') showSettings();
      if (action === 'close') closeSettings();
      if (action === 'save') {
        saveAndApply(Boolean(document.getElementById('cdl-consent-analytics')?.checked), Boolean(document.getElementById('cdl-consent-marketing')?.checked));
      }
    });
    manager.addEventListener('click', showSettings);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !document.getElementById('cdl-cookie-overlay').hidden) closeSettings();
    });
  }

  window.CDLConsent = Object.freeze({ open: showSettings, getChoice: currentConsent });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
