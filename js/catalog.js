(function () {
  const root = document.querySelector('[data-catalog]');
  if (!root) return;

  const grid = root.querySelector('[data-catalog-grid]');
  const status = root.querySelector('[data-catalog-status]');
  const audienceSelect = root.querySelector('#audience-filter');
  const subcategorySelect = root.querySelector('#subcategory-filter');
  const typeSelect = root.querySelector('#product-type-filter');
  const languageSelect = root.querySelector('#language-filter');
  const sortSelect = root.querySelector('#catalog-sort');
  const clearButton = root.querySelector('[data-clear-filters]');
  const freeOnly = root.dataset.freeOnly === 'true';
  const expectedGroup = new URLSearchParams(location.search).get('group') || '';
  let catalogProducts = null;
  let productTypeFamilies = [];

  const audiences = [
    ['business-builder', 'Business Builder'],
    ['family-niches-market', 'Family & Niches Market'],
    ['lifestyle-hobbyist', 'Lifestyle & Hobbyist'],
    ['digital-creators', 'Digital Creators'],
    ['specialists', 'Specialists'],
    ['love-relationships', 'LOVE & RELATIONSHIPS'],
    ['personal-growth-coach', 'Personal Growth Coach'],
    ['daily-grace-room-spirituality', 'DAILY GRACE ROOM (SPIRITUALITY)']
  ];

  const subcategories = [
    'AFFILIATE MARKETING', 'AUDIOBOOKS', 'BLOGGING', 'BUSINESS & MONEY',
    'CANVA PLANNERS', 'COMPUTER & TECHNOLOGY', 'COOKING & RECIPES',
    'CRAFTS & HOBBIES', 'EMAIL MARKETING', 'ENTERTAINMENT', 'FAMILY & PARENTING',
    'FASHION & BEAUTY', 'FREELANCE', 'HEALTH & FITNESS', 'HOLIDAYS',
    'HOME & GARDEN', 'INTERNET MARKETING', 'KIDS COLLECTION', 'LANGUAGE LEARNING',
    'LOVE & RELATIONSHIPS', 'MARKETING', 'MONEY & FINANCE', 'MUSIC', 'NEW AGE',
    'PET & ANIMALS', 'PLR & PRINT ON DEMAND', 'REFERENCE & LEARNING',
    'SELF IMPROVEMENT & PERSONAL DEVELOPMENT', 'SOCIAL MEDIA', 'SPIRITUALITY',
    'SPORTS & OUTDOORS', 'TRAFFIC & SEO', 'TRAVEL', 'WRITING & PUBLISHING'
  ];
  const productLanguages = [['en', 'English'], ['fr', 'French']];

  const slug = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const t = (value, replacements) => window.CDL_I18N ? window.CDL_I18N.t(value, replacements) : value;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const asValues = (value) => Array.isArray(value) ? value : (value ? [value] : []);
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

  function fillSelect(select, values, firstLabel) {
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>` + values.map((item) => {
      const value = typeof item === 'string' ? item : item[0];
      const label = typeof item === 'string' ? item : item[1];
      return `<option value="${escapeHtml(slug(value))}">${escapeHtml(label)}</option>`;
    }).join('');
  }

  function fillProductTypeSelect() {
    if (!typeSelect) return;
    const groups = productTypeFamilies.map((family) => {
      const options = family.types.map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(t(type.name))}</option>`).join('');
      return `<optgroup label="${escapeHtml(t(family.name))}">${options}</optgroup>`;
    }).join('');
    typeSelect.innerHTML = `<option value="">${escapeHtml(t('All product types'))}</option>${groups}`;
  }

  fillSelect(audienceSelect, audiences, 'All audiences');
  fillSelect(subcategorySelect, subcategories, 'All subcategories');
  fillSelect(languageSelect, productLanguages, 'All languages');

  function matches(product) {
    const audienceValue = (product.audiences || product.audience || product.marketSegments || []);
    const audienceMatch = !audienceSelect?.value || asValues(audienceValue).some((value) => slug(value) === audienceSelect.value);
    const subcategoryMatch = !subcategorySelect?.value || slug(product.subcategory) === subcategorySelect.value;
    const typeMatch = !typeSelect?.value || product.productType === typeSelect.value;
    const languageMatch = !languageSelect?.value || asValues(product.language).some((language) => slug(language) === languageSelect.value);
    const groupMatch = !expectedGroup || slug(product.productGroup || product.group) === slug(expectedGroup);
    const freeMatch = !freeOnly || product.isFree === true;
    return audienceMatch && subcategoryMatch && typeMatch && languageMatch && groupMatch && freeMatch;
  }

  function card(product) {
    const locale = window.CDL_I18N?.language || 'en';
    const translation = product.translations?.[locale] || {};
    const title = escapeHtml(t(translation.title || product.title || 'Untitled product'));
    const coverPath = product.covers?.[window.CDL_I18N?.language] || product.cover;
    const cover = coverPath
      ? `<img class="catalog-card-cover" src="${escapeHtml(coverPath)}" alt="${escapeHtml(t('Cover of {title}', { title: product.title || 'Untitled product' }))}" loading="lazy">`
      : '<div class="catalog-card-placeholder" aria-hidden="true">CDL</div>';
    const cardDescription = translation.shortDescription || translation.description || product.shortDescription || product.description;
    const description = cardDescription ? `<p>${escapeHtml(t(cardDescription))}</p>` : '';
    const category = t(product.subcategory || product.productGroup || '');
    const paidPrice = product.isFree !== true && product.price !== undefined && Number(product.price) > 0;
    const promoActive = paidPrice && window.CDL_PROMOTION_PRICING?.isActive();
    const regularPrice = product.price !== undefined ? formatPrice(product.price, product.currency) : '';
    const price = product.isFree === true
      ? `<span class=\"catalog-card-price\">${escapeHtml(t('Free'))}</span>`
      : promoActive
        ? `<span class=\"catalog-card-price is-on-sale\"><del class=\"price-original\">${regularPrice}</del><strong class=\"price-sale\">${formatPrice(window.CDL_PROMOTION_PRICING.discountedAmount(product.price), product.currency)}</strong><span class=\"price-discount-badge\">-50%</span></span>`
        : regularPrice ? `<span class=\"catalog-card-price\">${regularPrice}</span>` : '';
    return `<article class="catalog-card">${cover}<div class="catalog-card-body">${category ? `<p class="catalog-card-category">${escapeHtml(category)}</p>` : ''}<h2>${title}</h2>${description}<div class="catalog-card-footer">${price || '<span></span>'}<a href="/product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(t('View product'))} <span aria-hidden="true">↗</span></a></div></div></article>`;
  }

  function render(products) {
    const matchesNow = products.filter((product) => product && product.status === 'published' && matches(product));
    const priceOf = (product) => {
      const price = Number(product.price);
      return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY;
    };
    const dateOf = (product) => {
      const timestamp = Date.parse(product.publishedAt || product.createdAt || '');
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    switch (sortSelect?.value) {
      case 'price-asc':
        matchesNow.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'price-desc':
        matchesNow.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case 'title-asc':
        matchesNow.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
        break;
      case 'title-desc':
        matchesNow.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
        break;
      case 'newest':
        matchesNow.sort((a, b) => dateOf(b) - dateOf(a));
        break;
      case 'oldest':
        matchesNow.sort((a, b) => dateOf(a) - dateOf(b));
        break;
    }
    grid.innerHTML = matchesNow.map(card).join('');
    if (matchesNow.length) {
      const countMessage = freeOnly
        ? (matchesNow.length === 1 ? '{count} free product found.' : '{count} free products found.')
        : (matchesNow.length === 1 ? '{count} product found.' : '{count} products found.');
      status.textContent = t(countMessage, { count: matchesNow.length });
    } else {
      status.textContent = t(freeOnly
        ? 'No free products are available yet. Check back soon.'
        : 'No products match these filters yet. Published products will appear here.');
    }
  }

  document.addEventListener('cdl:languagechange', () => {
    const selectedType = typeSelect?.value || '';
    fillProductTypeSelect();
    if (typeSelect) typeSelect.value = selectedType;
    if (catalogProducts) render(catalogProducts);
  });

  async function init() {
    try {
      const [productsResponse, productTypesResponse] = await Promise.all([
        fetch('/data/products.json', { headers: { Accept: 'application/json' } }),
        fetch('/data/product-types.json', { headers: { Accept: 'application/json' } })
      ]);
      if (!productsResponse.ok) throw new Error(`Product data returned ${productsResponse.status}`);
      if (!productTypesResponse.ok) throw new Error(`Product type data returned ${productTypesResponse.status}`);
      const [products, families] = await Promise.all([productsResponse.json(), productTypesResponse.json()]);
      if (!Array.isArray(products)) throw new Error('Product data must be a JSON array');
      if (!Array.isArray(families)) throw new Error('Product type data must be a JSON array');
      catalogProducts = products;
      productTypeFamilies = families;

      fillProductTypeSelect();

      const params = new URLSearchParams(location.search);
      if (audienceSelect && params.has('audience')) audienceSelect.value = slug(params.get('audience'));
      if (subcategorySelect && params.has('subcategory')) subcategorySelect.value = slug(params.get('subcategory'));
      if (typeSelect && params.has('type')) typeSelect.value = slug(params.get('type'));
      if (languageSelect && params.has('language')) languageSelect.value = slug(params.get('language'));

      [audienceSelect, subcategorySelect, typeSelect, languageSelect, sortSelect].forEach((select) => select?.addEventListener('change', () => render(products)));
      clearButton?.addEventListener('click', () => {
        [audienceSelect, subcategorySelect, typeSelect, languageSelect].forEach((select) => { if (select) select.value = ''; });
        if (sortSelect) sortSelect.value = 'price-asc';
        render(products);
      });
      render(products);
    } catch (error) {
      console.error('Unable to load the product catalogue:', error);
      status.textContent = t('The product catalogue could not be loaded. Please try again later.');
      grid.innerHTML = '';
    }
  }

  init();
})();
