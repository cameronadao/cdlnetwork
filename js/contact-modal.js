(() => {
  const bookingTypes = [
    { name: 'Discovery call — discuss your project', slug: 'appel-decouverte-parlons-de-votre-projet', namespace: 'appel-decouverte-parlons-de-votre-projet' },
    { name: 'Website design or redesign consultation', slug: 'consultation-creation-ou-refonte-de-site-web', namespace: 'consultation-creation-ou-refonte-de-site-web' },
    { name: 'Online store launch consultation', slug: 'consultation-lancement-de-boutique-en-ligne', namespace: 'consultation-lancement-de-boutique-en-ligne' },
    { name: 'Digital strategy and entrepreneurship consultation', slug: 'conseil-strategie-digitale-entrepreneuriat', namespace: 'conseil-strategie-digitale-entrepreneuriat' },
    { name: 'Website and digital presence audit', slug: 'audit-digital-site-web-presence-en-ligne', namespace: 'audit-digital-site-web-presence-en-ligne' },
    { name: 'Digital products and templates consultation', slug: 'consultation-produits-digitaux-templates', namespace: 'consultation-produits-digitaux-templates' },
    { name: 'Project follow-up', slug: 'suivi-de-projet-clients-cdl-network', namespace: 'suivi-de-projet-clients-cdl-network' },
    { name: 'Customer support appointment', slug: 'assistance-accompagnement-client', namespace: 'assistance-accompagnement-client' }
  ];

  const contactModal = document.querySelector('#contact-modal');
  if (contactModal) {
    const panel = contactModal.querySelector('.contact-modal-panel');
    const closeButtons = contactModal.querySelectorAll('[data-contact-modal-close]');
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let lastTrigger = null;

    function openContactModal(trigger) {
      lastTrigger = trigger;
      contactModal.hidden = false;
      document.body.classList.add('has-contact-modal');
      const firstField = contactModal.querySelector('#project-name');
      requestAnimationFrame(() => (firstField || panel).focus());
    }

    function closeContactModal() {
      if (contactModal.hidden) return;
      contactModal.hidden = true;
      document.body.classList.remove('has-contact-modal');
      lastTrigger?.focus();
    }

    document.querySelectorAll('[data-contact-modal-open]').forEach((trigger) => {
      trigger.addEventListener('click', () => openContactModal(trigger));
    });
    closeButtons.forEach((button) => button.addEventListener('click', closeContactModal));
    contactModal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeContactModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...contactModal.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  const forms = [...document.querySelectorAll('form.project-form')];
  if (!forms.length) return;

  const calScript = document.createElement('script');
  calScript.src = 'https://app.cal.com/embed/embed.js';
  calScript.async = true;
  calScript.dataset.cdlCalEmbed = 'true';
  (function (C, A, L) {
    const enqueue = (api, args) => api.q.push(args);
    const d = C.document;
    C.Cal = C.Cal || function () {
      const cal = C.Cal;
      const args = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(calScript);
        cal.loaded = true;
      }
      if (args[0] === L) {
        const api = function () { enqueue(api, arguments); };
        const namespace = args[1];
        api.q = api.q || [];
        if (typeof namespace === 'string') {
          cal.ns[namespace] = cal.ns[namespace] || api;
          enqueue(cal.ns[namespace], args);
          enqueue(cal, ['initNamespace', namespace]);
        } else enqueue(cal, args);
        return;
      }
      enqueue(cal, args);
    };
  })(window, 'https://app.cal.com/embed/embed.js', 'init');

  window.Cal.config = window.Cal.config || {};
  window.Cal.config.forwardQueryParams = true;
  bookingTypes.forEach(({ namespace }) => {
    window.Cal('init', namespace, { origin: 'https://app.cal.com' });
    window.Cal.ns[namespace]('ui', { hideEventTypeDetails: false, layout: 'month_view' });
  });

  const modal = document.createElement('div');
  modal.className = 'cal-booking-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <button class="cal-booking-backdrop" type="button" data-cal-booking-close aria-label="Close booking options"></button>
    <section class="cal-booking-panel" role="dialog" aria-modal="true" aria-labelledby="cal-booking-heading" tabindex="-1">
      <button class="cal-booking-close" type="button" data-cal-booking-close aria-label="Close booking options">×</button>
      <span class="section-tag">CDL NETWORK</span>
      <h2 id="cal-booking-heading">Book a video or phone appointment</h2>
      <p class="cal-booking-intro">Choose the kind of appointment you need, then select an available time.</p>
      <div class="cal-booking-options"></div>
    </section>`;
  document.body.appendChild(modal);

  const options = modal.querySelector('.cal-booking-options');
  bookingTypes.forEach(({ name, slug, namespace }) => {
    const link = document.createElement('a');
    link.className = 'cal-booking-option';
    link.href = `https://cal.com/cdlnetwork/${slug}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.calLink = `cdlnetwork/${slug}`;
    link.dataset.calNamespace = namespace;
    link.dataset.calConfig = JSON.stringify({ layout: 'month_view', useSlotsViewOnSmallScreen: 'true' });
    link.innerHTML = `<span>${name}</span><span aria-hidden="true">↗</span>`;
    options.appendChild(link);
  });

  let bookingTrigger = null;
  const openBookingModal = (trigger) => {
    bookingTrigger = trigger;
    modal.hidden = false;
    document.body.classList.add('has-contact-modal');
    requestAnimationFrame(() => modal.querySelector('.cal-booking-close').focus());
  };
  const closeBookingModal = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('has-contact-modal');
    bookingTrigger?.focus();
  };

  modal.querySelectorAll('[data-cal-booking-close]').forEach((button) => button.addEventListener('click', closeBookingModal));
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBookingModal();
    }
  });
  options.addEventListener('click', (event) => {
    if (event.target.closest('[data-cal-link]')) window.setTimeout(closeBookingModal, 100);
  });

  forms.forEach((form) => {
    const submit = form.querySelector('.project-submit[type="submit"]');
    if (!submit || form.querySelector('[data-cal-booking-open]')) return;
    const actions = document.createElement('div');
    actions.className = 'project-form-actions';
    const book = document.createElement('button');
    book.type = 'button';
    book.className = 'project-booking-trigger';
    book.dataset.calBookingOpen = 'true';
    book.setAttribute('aria-haspopup', 'dialog');
    book.innerHTML = '<span>Book a video or phone appointment</span><span aria-hidden="true">↗</span>';
    submit.parentNode.insertBefore(actions, submit);
    actions.append(submit, book);
    book.addEventListener('click', () => openBookingModal(book));
  });
})();
