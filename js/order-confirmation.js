(() => {
  const message = document.querySelector('[data-order-message]');
  const downloads = document.querySelector('[data-order-downloads]');
  const email = document.querySelector('[data-order-email]');
  const t = (value) => window.CDL_I18N?.t(value) || value;
  const sessionId = new URLSearchParams(window.location.search).get('session_id');

  function setMessage(value) {
    if (message) message.textContent = t(value);
  }

  if (!sessionId) {
    setMessage('We could not verify this order. Check your email for the download link.');
    return;
  }

  fetch(`/api/order-download?session_id=${encodeURIComponent(sessionId)}`, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The download is not ready yet.');
      return result;
    })
    .then((result) => {
      setMessage('Your payment has been confirmed. Your secure downloads are ready:');
      (result.links || []).forEach((link) => {
        const anchor = document.createElement('a');
        anchor.className = 'order-download-link';
        anchor.href = link.url;
        const label = document.createElement('span');
        label.textContent = t('Download');
        const filename = document.createElement('span');
        filename.textContent = ` · ${link.name}`;
        anchor.append(label, filename);
        anchor.setAttribute('rel', 'nofollow');
        downloads.append(anchor);
      });
      if (email && result.email) email.textContent = `${t('A download link was also sent to')} ${result.email}.`;
    })
    .catch((error) => {
      console.error('Order confirmation could not load downloads:', error);
      setMessage('Your payment may still be processing. Check your email for the download link, or contact us if it does not arrive.');
    });
})();
