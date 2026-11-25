(function () {
  const root = document.querySelector('[data-catalog]');
  if (!root) return;

  const grid = root.querySelector('[data-catalog-grid]');
  const status = root.querySelector('[data-catalog-status]');
  const pagination = root.querySelector('[data-catalog-pagination]');
  const audienceSelect = root.querySelector('#audience-filter');
  const subcategorySelect = root.querySelector('#subcategory-filter');
  const typeSelect = root.querySelector('#product-type-filter');
  const languageSelect = root.querySelector('#language-filter');
  const sortSelect = root.querySelector('#catalog-sort');
  const clearButton = root.querySelector('[data-clear-filters]');
  const freeOnly = root.dataset.freeOnly === 'true';
  const expectedGroup = new URLSearchParams(location.search).get('group') || '';
  const expectedProductIds = (root.dataset.productIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  let catalogProducts = null;
  let productTypeFamilies = [];
  const pageSize = 15;
  let currentPage = 1;

  const audiences = [
    ['business-builder', 'Business Builder'],
    ['family-niches-market', 'Family & Niches Market'],
    ['lifestyle-hobbyist', 'Lifestyle & Hobbyist'],
    ['digital-creators', 'Digital Creators'],
    ['specialists', 'Specialists'],
    ['love-relationships', 'Love & Relationships'],
    ['personal-growth', 'Personal Growth'],
    ['spirituality', 'Spirituality']
  ];

  const subcategoriesByAudience = {
    'business-builder': ['AFFILIATE MARKETING', 'BUSINESS & MONEY', 'FREELANCE', 'MARKETING', 'INTERNET MARKETING', 'ECOMMERCE'],
    'family-niches-market': ['ENTERTAINMENT', 'HOLIDAYS', 'PARENTING', 'PETS & ANIMALS'],
    'lifestyle-hobbyist': ['COOKING & RECIPES', 'MUSIC', 'DIET & COOKING', 'LIFESTYLE & TRAVEL', 'HOBBIES & FREE TIME', 'SPORTS & OUTDOORS', 'FASHION & BEAUTY'],
    'digital-creators': ['BLOGGING', 'SOCIAL MEDIA & NETWORKING', 'WRITING & PUBLISHING', 'SEO'],
    'specialists': ['PLR & PRINT ON DEMAND', 'INTERNET', 'LANGUAGE LEARNING', 'AUDIOBOOKS', 'TECHNOLOGY & LEARNING', 'CANVA PLANNERS'],
    'personal-growth': ['SELF IMPROVEMENT', 'HEALTH & FITNESS'],
    'love-relationships': [],
    'spirituality': []
  };
  const subcategories = [...new Set(Object.values(subcategoriesByAudience).flat())];
  const productLanguages = [['en', 'English'], ['fr', 'French']];
  const fashionBeautyProductIds = new Set([
    'etsy-4624836019', 'etsy-4624733718', 'etsy-4623813287', 'etsy-4623387359', 'etsy-4623375699',
    'beauty-business-templates-bundle-150', 'beauty-feed-method-30-day-workbook',
    'beauty-business-studio-complete-template-collection', 'beauty-academy-workbook-template-bundle',
    'beauty-instagram-kit-160-templates-fr-en'
  ]);

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

  async function syncEtsyPrices(products) {
    const listingIds = [...new Set(products.map((product) => product?.etsyListingId).filter(Boolean))];
    if (!listingIds.length) return products;
    try {
      const query = listingIds.map((id) => `id=${encodeURIComponent(id)}`).join('&');
      const response = await fetch(`/api/etsy-prices?${query}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) return products;
      const { prices = {} } = await response.json();
      return products.map((product) => {
        const latest = prices[String(product?.etsyListingId)];
        return latest && Number.isFinite(Number(latest.amount)) && latest.currency
          ? { ...product, price: Number(latest.amount), currency: latest.currency }
          : product;
      });
    } catch {
      return products;
    }
  }

  function fillSelect(select, values, firstLabel) {
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHtml(t(firstLabel))}</option>` + values.map((item) => {
      const value = typeof item === 'string' ? item : item[0];
      const label = t(typeof item === 'string' ? item : item[1]);
      return `<option value="${escapeHtml(slug(value))}">${escapeHtml(label)}</option>`;
    }).join('');
  }

  function fillProductTypeSelect() {
    if (!typeSelect) return;
    const groups = productTypeFamilies.map((family) => {
      const allFormats = `<option value="${escapeHtml(family.id)}">${escapeHtml(t(family.name))} — ${escapeHtml(t('All product types'))}</option>`;
      const options = family.types.map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(t(type.name))}</option>`).join('');
      return `<optgroup label="${escapeHtml(t(family.name))}">${allFormats}${options}</optgroup>`;
    }).join('');
    typeSelect.innerHTML = `<option value="">${escapeHtml(t('All product types'))}</option>${groups}`;
  }

  fillSelect(audienceSelect, audiences, 'All audiences');
  const fillSubcategorySelect = (audienceId = '', selectedValue = '') => {
    if (!subcategorySelect) return;
    const groups = audienceId
      ? audiences.filter(([id]) => id === audienceId)
      : audiences;
    const options = groups.map(([id, label]) => {
      const values = subcategoriesByAudience[id] || [];
      if (!values.length) return '';
      const items = values.map((value) =>
        `<option value="${escapeHtml(slug(value))}">${escapeHtml(t(value))}</option>`
      ).join('');
      return `<optgroup label="${escapeHtml(t(label))}">${items}</optgroup>`;
    }).join('');
    subcategorySelect.innerHTML = `<option value="">${escapeHtml(t('All subcategories'))}</option>${options}`;
    if (selectedValue && [...subcategorySelect.options].some((option) => option.value === selectedValue)) {
      subcategorySelect.value = selectedValue;
    }
  };
  fillSubcategorySelect();
  fillSelect(languageSelect, productLanguages, 'All languages');

  function matches(product) {
    const audienceValue = (product.audiences || product.audience || product.marketSegments || []);
    const audienceMatch = !audienceSelect?.value || asValues(audienceValue).some((value) => slug(value) === audienceSelect.value);
    const subcategoryMatch = !subcategorySelect?.value || slug(product.subcategory) === subcategorySelect.value;
    const selectedType = typeSelect?.value || '';
    const selectedFamily = productTypeFamilies.find((family) => family.id === selectedType);
    const typeMatch = !selectedType || (selectedFamily
      ? selectedFamily.types.some((type) => type.id === product.productType || asValues(product.productTypes).includes(type.id))
      : product.productType === selectedType || asValues(product.productTypes).includes(selectedType));
    const languageMatch = !languageSelect?.value || asValues(product.language).some((language) => slug(language) === languageSelect.value);
    const groups = asValues(product.productGroups || product.productGroup || product.group);
    const groupMatch = !expectedGroup || groups.some((group) => slug(group) === slug(expectedGroup));
    const freeMatch = !freeOnly || product.isFree === true;
    const productIdMatch = !expectedProductIds.length || expectedProductIds.includes(product.id);
    return audienceMatch && subcategoryMatch && typeMatch && languageMatch && groupMatch && freeMatch && productIdMatch;
  }

  function card(product) {
    const locale = window.CDL_I18N?.language || 'en';
    const translation = product.translations?.[locale] || {};
    const title = escapeHtml(t(translation.title || product.title || 'Untitled product'));
    const coverPath = product.covers?.[window.CDL_I18N?.language] || product.cover;
    const cover = coverPath
      ? `<img class="catalog-card-cover" src="${escapeHtml(coverPath)}" alt="${escapeHtml(t('Cover of {title}', { title: product.title || 'Untitled product' }))}" loading="lazy">`
      : '<div class="catalog-card-placeholder" aria-hidden="true">CDB</div>';
    const cardDescription = translation.shortDescription || translation.description || product.shortDescription || product.description;
    const description = cardDescription ? `<p>${escapeHtml(t(cardDescription))}</p>` : '';
    const displayAudience = Array.isArray(product.audience) ? product.audience[0] : product.audience;
    const category = t(translation.subcategory || product.subcategory || displayAudience || product.productGroup || '');
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
    if (!sortSelect && expectedProductIds.length) {
      const order = new Map(expectedProductIds.map((id, index) => [id, index]));
      matchesNow.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
    }
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
    const pageCount = Math.ceil(matchesNow.length / pageSize);
    currentPage = Math.max(1, Math.min(currentPage, pageCount || 1));
    const pageItems = matchesNow.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    grid.innerHTML = pageItems.map(card).join('');
    if (pagination) {
      pagination.hidden = pageCount <= 1;
      pagination.replaceChildren();
      if (pageCount > 1) {
        const language = window.CDL_I18N?.language || 'en';
        const previous = document.createElement('button');
        previous.type = 'button'; previous.textContent = language === 'fr' ? 'Précédent' : 'Previous';
        previous.disabled = currentPage === 1;
        previous.addEventListener('click', () => { currentPage -= 1; render(products); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        const indicator = document.createElement('span');
        indicator.textContent = language === 'fr' ? `Page ${currentPage} sur ${pageCount}` : `Page ${currentPage} of ${pageCount}`;
        const next = document.createElement('button');
        next.type = 'button'; next.textContent = language === 'fr' ? 'Suivant' : 'Next';
        next.disabled = currentPage === pageCount;
        next.addEventListener('click', () => { currentPage += 1; render(products); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        pagination.append(previous, indicator, next);
      }
    }
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
      const [productsResponse, productTypesResponse, etsyResponse, payhipResponse] = await Promise.all([
        fetch('/data/products.json', { headers: { Accept: 'application/json' } }),
        fetch('/data/product-types.json', { headers: { Accept: 'application/json' } }),
        fetch('/api/etsy-products', { headers: { Accept: 'application/json' } }).catch(() => null),
        fetch('/api/payhip-products', { headers: { Accept: 'application/json' } }).catch(() => null)
      ]);
      if (!productsResponse.ok) throw new Error(`Product data returned ${productsResponse.status}`);
      if (!productTypesResponse.ok) throw new Error(`Product type data returned ${productTypesResponse.status}`);
      const [sourceProducts, families, etsyPayload, payhipPayload] = await Promise.all([
        productsResponse.json(),
        productTypesResponse.json(),
        etsyResponse?.ok ? etsyResponse.json().catch(() => ({})) : Promise.resolve({}),
        payhipResponse?.ok ? payhipResponse.json().catch(() => ({})) : Promise.resolve({})
      ]);
      if (!Array.isArray(sourceProducts)) throw new Error('Product data must be a JSON array');
      if (!Array.isArray(families)) throw new Error('Product type data must be a JSON array');
      const knownListingIds = new Set(sourceProducts.map((product) => String(product?.etsyListingId || '')).filter(Boolean));
      const importedProducts = (Array.isArray(etsyPayload.products) ? etsyPayload.products : [])
        .filter((product) => !knownListingIds.has(String(product?.etsyListingId || '')));
      const payhipKeyFromUrl = (value) => {
        const url = String(value || '');
        return url.match(/\/b\/([a-z0-9]{4,32})(?:[/?#]|$)/i)?.[1]
          || url.match(/[?&]link=([a-z0-9]{4,32})(?:&|$)/i)?.[1]
          || '';
      };
      const knownPayhipKeys = new Set(sourceProducts.map((product) => String(product?.payhipProductKey || payhipKeyFromUrl(product?.purchaseUrl))).filter(Boolean));
      const importedPayhip = (Array.isArray(payhipPayload.products) ? payhipPayload.products : [])
        .filter((product) => !knownPayhipKeys.has(String(product?.payhipProductKey || '')));
      const uniqueProducts = (items) => {
        const seenIdentities = new Set();
        const seenLocalizedTitles = new Set();
        return items.filter((product) => {
          const listingId = String(product?.etsyListingId || product?.id?.match(/^etsy-(\d+)$/)?.[1] || '');
          const payhipKey = String(product?.payhipProductKey || payhipKeyFromUrl(product?.purchaseUrl) || '');
          const externalIdentity = listingId ? `etsy:${listingId}`
            : payhipKey ? `payhip:${payhipKey}`
              : product?.purchaseUrl ? `url:${String(product.purchaseUrl).trim().replace(/\?.*$/, '').replace(/#.*$/, '').replace(/\/$/, '').toLowerCase()}`
                : '';
          const title = String(product?.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const languages = (Array.isArray(product?.language) ? product.language : [product?.language])
            .filter(Boolean).map((language) => String(language).toLowerCase().slice(0, 2));
          const titleKeys = title ? (languages.length ? languages : ['unknown']).map((language) => `title:${language}:${title}`) : [];
          if ((externalIdentity && seenIdentities.has(externalIdentity)) || titleKeys.some((key) => seenLocalizedTitles.has(key))) return false;
          if (externalIdentity) seenIdentities.add(externalIdentity);
          titleKeys.forEach((key) => seenLocalizedTitles.add(key));
          return true;
        });
      };
      const normalizedProducts = uniqueProducts([...sourceProducts, ...importedProducts, ...importedPayhip]).map((product) => {
        const listingId = String(product?.etsyListingId || '');
        if (!fashionBeautyProductIds.has(String(product?.id || '')) && !fashionBeautyProductIds.has(`etsy-${listingId}`)) return product;
        const translations = { ...(product.translations || {}) };
        for (const language of ['en', 'fr']) {
          translations[language] = { ...(translations[language] || {}), subcategory: language === 'fr' ? 'MODE ET BEAUTÉ' : 'FASHION & BEAUTY' };
        }
        return { ...product, audience: 'Lifestyle & Hobbyist', subcategory: 'FASHION & BEAUTY', translations };
      });
      const products = await syncEtsyPrices(normalizedProducts.map((product) => {
        if (product.id === 'the-bible-explained-a-complete-guide-to-the-66-books') {
          return { ...product, audience: ['Personal Growth', 'Spirituality'], subcategory: null };
        }
        return product;
      }));
      catalogProducts = products;
      productTypeFamilies = families;

      fillProductTypeSelect();

      const params = new URLSearchParams(location.search);
      if (audienceSelect && params.has('audience')) audienceSelect.value = slug(params.get('audience'));
      if (subcategorySelect && params.has('subcategory')) fillSubcategorySelect(audienceSelect?.value || '', slug(params.get('subcategory')));
      if (typeSelect && params.has('type')) typeSelect.value = slug(params.get('type'));
      if (languageSelect && params.has('language')) languageSelect.value = slug(params.get('language'));

      audienceSelect?.addEventListener('change', () => {
        currentPage = 1;
        fillSubcategorySelect(audienceSelect.value);
        render(products);
      });
      [subcategorySelect, typeSelect, languageSelect, sortSelect].forEach((select) => select?.addEventListener('change', () => { currentPage = 1; render(products); }));
      clearButton?.addEventListener('click', () => {
        currentPage = 1;
        [audienceSelect, typeSelect, languageSelect].forEach((select) => { if (select) select.value = ''; });
        fillSubcategorySelect();
        if (sortSelect) sortSelect.value = 'newest';
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
