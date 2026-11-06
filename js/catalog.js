(function () {
  const root = document.querySelector('[data-catalog]');
  if (!root) return;

  const grid = root.querySelector('[data-catalog-grid]');
  const status = root.querySelector('[data-catalog-status]');
  const audienceSelect = root.querySelector('#audience-filter');
  const subcategorySelect = root.querySelector('#subcategory-filter');
  const typeSelect = root.querySelector('#product-type-filter');
  const clearButton = root.querySelector('[data-clear-filters]');
  const freeOnly = root.dataset.freeOnly === 'true';
  const expectedGroup = new URLSearchParams(location.search).get('group') || '';

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
    'AFFILIATE MARKETING', 'AUDIOBOOKS', 'BLOGGING', 'BONUS COLLECTIONS',
    'BUSINESS & MONEY', 'COLORING BOOKS & PAGES', 'COMPUTER & TECHNOLOGY',
    'COOKING & RECIPES', 'CRAFTS & HOBBIES', 'EMAIL MARKETING', 'ENTERTAINMENT',
    'FASHION & BEAUTY', 'FREELANCE', 'HEALTH & FITNESS E-BOOKS',
    'HEALTH & FITNESS VIDEOS', 'HOLIDAYS', 'HOME & GARDEN', 'INTERNET',
    'INTERNET MARKETING E-BOOKS', 'INTERNET MARKETING VIDEO', 'LANGUAGE LEARNING',
    'LOVE & RELATIONSHIPS', 'MARKETING', 'MONEY & FINANCE', 'NEW AGE',
    'PARENTING & FAMILY', 'PETS & ANIMALS', 'PLR & PRINT ON DEMAND',
    'REFERENCE & LEARNING', 'SELF-HELP & PERSONAL DEVELOPMENT E-BOOKS',
    'SELF-HELP & PERSONAL DEVELOPMENT VIDEOS', 'SOCIAL MEDIA E-BOOKS',
    'SOCIAL MEDIA VIDEOS', 'SPORTS & OUTDOORS', 'TRAFFIC & SEO', 'TRAVEL',
    'WRITING & PUBLISHING'
  ];

  const slug = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const asValues = (value) => Array.isArray(value) ? value : (value ? [value] : []);

  function fillSelect(select, values, firstLabel) {
    if (!select) return;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>` + values.map((item) => {
      const value = typeof item === 'string' ? item : item[0];
      const label = typeof item === 'string' ? item : item[1];
      return `<option value="${escapeHtml(slug(value))}">${escapeHtml(label)}</option>`;
    }).join('');
  }

  fillSelect(audienceSelect, audiences, 'All audiences');
  fillSelect(subcategorySelect, subcategories, 'All subcategories');

  function matches(product) {
    const audienceValue = (product.audiences || product.audience || product.marketSegments || []);
    const audienceMatch = !audienceSelect?.value || asValues(audienceValue).some((value) => slug(value) === audienceSelect.value);
    const subcategoryMatch = !subcategorySelect?.value || slug(product.subcategory) === subcategorySelect.value;
    const typeMatch = !typeSelect?.value || slug(product.productType || product.type) === typeSelect.value;
    const groupMatch = !expectedGroup || slug(product.productGroup || product.group) === slug(expectedGroup);
    const freeMatch = !freeOnly || product.isFree === true;
    return audienceMatch && subcategoryMatch && typeMatch && groupMatch && freeMatch;
  }

  function card(product) {
    const title = escapeHtml(product.title || 'Untitled product');
    const cover = product.cover
      ? `<img class="catalog-card-cover" src="${escapeHtml(product.cover)}" alt="Cover of ${title}" loading="lazy">`
      : '<div class="catalog-card-placeholder" aria-hidden="true">CDL</div>';
    const description = product.description ? `<p>${escapeHtml(product.description)}</p>` : '';
    const category = product.subcategory || product.productGroup || '';
    const price = product.isFree === true ? 'Free' : (product.price ? escapeHtml(product.price) : '');
    return `<article class="catalog-card">${cover}<div class="catalog-card-body">${category ? `<p class="catalog-card-category">${escapeHtml(category)}</p>` : ''}<h2>${title}</h2>${description}<div class="catalog-card-footer">${price ? `<span>${price}</span>` : '<span></span>'}<a href="/product.html?id=${encodeURIComponent(product.id)}">View product <span aria-hidden="true">↗</span></a></div></div></article>`;
  }

  function render(products) {
    const matchesNow = products.filter((product) => product && product.status === 'published' && matches(product));
    grid.innerHTML = matchesNow.map(card).join('');
    if (matchesNow.length) {
      status.textContent = `${matchesNow.length} product${matchesNow.length === 1 ? '' : 's'} found.`;
    } else {
      status.textContent = freeOnly
        ? 'No free products are available yet. Check back soon.'
        : 'No products match these filters yet. Published products will appear here.';
    }
  }

  async function init() {
    try {
      const response = await fetch('/data/products.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Product data returned ${response.status}`);
      const products = await response.json();
      if (!Array.isArray(products)) throw new Error('Product data must be a JSON array');

      const types = [...new Set(products.map((product) => product.productType || product.type).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b)));
      fillSelect(typeSelect, types, types.length ? 'All product types' : 'Product type list pending');

      const params = new URLSearchParams(location.search);
      if (audienceSelect && params.has('audience')) audienceSelect.value = slug(params.get('audience'));
      if (subcategorySelect && params.has('subcategory')) subcategorySelect.value = slug(params.get('subcategory'));
      if (typeSelect && params.has('type')) typeSelect.value = slug(params.get('type'));

      [audienceSelect, subcategorySelect, typeSelect].forEach((select) => select?.addEventListener('change', () => render(products)));
      clearButton?.addEventListener('click', () => {
        [audienceSelect, subcategorySelect, typeSelect].forEach((select) => { if (select) select.value = ''; });
        render(products);
      });
      render(products);
    } catch (error) {
      console.error('Unable to load the product catalogue:', error);
      status.textContent = 'The product catalogue could not be loaded. Please try again later.';
      grid.innerHTML = '';
    }
  }

  init();
})();
