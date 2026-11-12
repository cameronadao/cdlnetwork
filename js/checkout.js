(() => {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-stripe-checkout]');
    if (!button || button.disabled) return;

    const status = button.parentElement.querySelector('[data-checkout-status]');
    const originalText = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = window.CDL_I18N?.t('Opening secure checkout…') || 'Opening secure checkout…';
    if (status) status.textContent = '';

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ productId: button.dataset.productId, locale: window.CDL_I18N?.language || 'en' })
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Checkout could not be opened.');
      window.location.assign(result.url);
    } catch (error) {
      console.error('Checkout could not be opened:', error);
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = originalText;
      if (status) status.textContent = window.CDL_I18N?.t('Checkout could not be started. Please try again.') || 'Checkout could not be started. Please try again.';
    }
  });
})();
