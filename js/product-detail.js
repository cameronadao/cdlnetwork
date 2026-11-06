(function () {
  const target = document.getElementById('product-detail-content');
  if (!target) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const t = (value, replacements) => window.CDL_I18N ? window.CDL_I18N.t(value, replacements) : value;
  const formatPrice = (amount, currency) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || !currency) return escapeHtml(amount);
    try {
      const locale = window.CDL_I18N?.language === 'fr' ? 'fr-FR' : 'en-US';
      return escapeHtml(new Intl.NumberFormat(locale, { style: 'currency', currency }).format(numericAmount));
    } catch {
      return escapeHtml(amount);
    }
  };

  const showState = (title, message) => {
    target.innerHTML = `<div class="product-detail-state" role="status"><p class="eyebrow">${escapeHtml(t('CDL Network · Digital store'))}</p><h1>${escapeHtml(t(title))}</h1><p>${escapeHtml(t(message))}</p></div>`;
    document.title = `${t(title)} | CDL Network`;
  };

  async function loadProduct() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) {
      showState('Product not found', 'This product link is missing an identifier. Return to the digital products collection and choose a product.');
      return;
    }

    let products;
    try {
      const response = await fetch('/data/products.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Product data returned ${response.status}`);
      products = await response.json();
      if (!Array.isArray(products)) throw new Error('Product data must be a JSON array');
    } catch (error) {
      console.error('Unable to load product data:', error);
      showState('Product information unavailable', 'We could not load the product catalogue. Please try again later.');
      return;
    }

    const product = products.find((item) => item && item.id === id);
    if (!product) {
      showState('Product not found', 'We could not find a product with this identifier.');
      return;
    }
    if (product.status !== 'published') {
      showState('Product not published', 'This product is not currently available to the public.');
      return;
    }

    const rawTitle = product.title || 'Untitled product';
    const title = escapeHtml(t(rawTitle));
    const description = escapeHtml(t(product.description || 'Product information will be added soon.'));
    const cover = product.cover ? `<img class="product-detail-cover" src="${escapeHtml(product.cover)}" alt="${escapeHtml(t('Cover of {title}', { title: rawTitle }))}">` : '';
    const fields = [
      ['Category', product.category], ['Format', Array.isArray(product.formats) ? product.formats.join(', ') : product.format],
      ['Author', product.author], ['Price', product.price !== undefined ? formatPrice(product.price, product.currency) : '']
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');
    let purchaseButton = '';
    if (product.purchaseUrl) {
      try {
        const purchaseUrl = new URL(product.purchaseUrl);
        const isPayhip = purchaseUrl.protocol === 'https:' && ['payhip.com', 'www.payhip.com'].includes(purchaseUrl.hostname);
        const productCode = purchaseUrl.pathname.match(/^\/b\/([A-Za-z0-9]+)\/?$/)?.[1];
        const directCheckoutCode = purchaseUrl.pathname === '/buy' ? purchaseUrl.searchParams.get('link') : null;
        if (isPayhip && (productCode || directCheckoutCode)) {
          const checkoutUrl = productCode
            ? `${purchaseUrl.origin}/buy?link=${encodeURIComponent(productCode)}`
            : purchaseUrl.href;
          purchaseButton = `<a class="product-detail-buy" href="${escapeHtml(checkoutUrl)}">${escapeHtml(t('Buy now'))}${product.price !== undefined ? ` · ${formatPrice(product.price, product.currency)}` : ''}</a>`;
        }
      } catch (error) {
        console.error('Invalid product purchase URL:', error);
      }
    }

    const localizedMetadata = fields.length ? `<dl class="product-detail-meta">${fields.map(([label, value]) => `<div><dt>${escapeHtml(t(label))}</dt><dd>${escapeHtml(t(value))}</dd></div>`).join('')}</dl>` : '';
    target.innerHTML = `<article class="product-detail-layout">${cover}<div class="product-detail-copy"><p class="eyebrow">${escapeHtml(t('CDL Network · Digital store'))}</p><h1>${title}</h1><p>${description}</p>${localizedMetadata}${purchaseButton}</div></article>`;
    document.title = `${t(rawTitle)} | CDL Network`;
  }

  document.addEventListener('cdl:languagechange', loadProduct);
  loadProduct();
})();
