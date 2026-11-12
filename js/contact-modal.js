(() => {
  const modal = document.querySelector('#contact-modal');
  if (!modal) return;

  const panel = modal.querySelector('.contact-modal-panel');
  const closeButtons = modal.querySelectorAll('[data-contact-modal-close]');
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastTrigger = null;

  function openModal(trigger) {
    lastTrigger = trigger;
    modal.hidden = false;
    document.body.classList.add('has-contact-modal');
    const firstField = modal.querySelector('#project-name');
    requestAnimationFrame(() => (firstField || panel).focus());
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('has-contact-modal');
    lastTrigger?.focus();
  }

  document.querySelectorAll('[data-contact-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => openModal(trigger));
  });
  closeButtons.forEach((button) => button.addEventListener('click', closeModal));

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll(focusableSelector)].filter((element) => element.offsetParent !== null);
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
})();
