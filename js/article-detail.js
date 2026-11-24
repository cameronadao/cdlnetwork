(() => {
  const article = document.querySelector('[data-article-id]');
  if (!article) return;
  const title = article.querySelector('[data-article-title]');
  const summary = article.querySelector('[data-article-summary]');
  const category = article.querySelector('[data-article-category]');
  const date = article.querySelector('[data-article-date]');
  const content = article.querySelector('[data-article-content]');
  const toc = article.querySelector('[data-article-toc]');
  let currentArticle;
  const text = (value, language) => typeof value === 'string' ? value : (value?.[language] || value?.en || value?.fr || '');
  const slug = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const safeArticleUrl = (value) => {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  function setMeta(selector, attribute, key, value) {
    let element = document.head.querySelector(`${selector}[${attribute}="${key}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, key);
      document.head.append(element);
    }
    element.content = value;
  }

  function updateArticleMetadata(language) {
    const canonicalUrl = new URL(window.location.pathname, window.location.origin).href;
    const headline = text(currentArticle.title, language);
    const seoTitle = text(currentArticle.seoTitle, language) || `${headline} | CDB Projects`;
    const description = text(currentArticle.metaDescription, language) || text(currentArticle.summary, language);
    const image = new URL(currentArticle.image || '/assets/images/logo-black.png', window.location.origin).href;
    const canonical = document.head.querySelector('link[rel="canonical"]') || document.head.appendChild(document.createElement('link'));
    canonical.rel = 'canonical';
    canonical.href = canonicalUrl;
    setMeta('meta', 'name', 'description', description);
    setMeta('meta', 'property', 'og:title', seoTitle);
    setMeta('meta', 'property', 'og:description', description);
    setMeta('meta', 'property', 'og:url', canonicalUrl);
    setMeta('meta', 'property', 'og:image', image);
    setMeta('meta', 'name', 'twitter:title', seoTitle);
    setMeta('meta', 'name', 'twitter:description', description);
    setMeta('meta', 'name', 'twitter:image', image);
    let structuredData = document.getElementById('article-structured-data');
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.id = 'article-structured-data';
      structuredData.type = 'application/ld+json';
      document.head.append(structuredData);
    }
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline,
      description,
      image: [image],
      datePublished: currentArticle.publishedAt,
      inLanguage: language,
      mainEntityOfPage: canonicalUrl,
      author: { '@type': 'Organization', name: 'CDB Projects', url: 'https://cdbprojects.com/' },
      publisher: { '@type': 'Organization', name: 'CDB Projects', url: 'https://cdbprojects.com/' }
    });
  }

  let linkedProduct = null;

  function productIdFromUrl(rawUrl) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const explicitId = url.searchParams.get('id');
      if (explicitId) return explicitId;
      const listingId = url.pathname.match(/\/listing\/(\d+)(?:\/|$)/)?.[1];
      if (listingId) return `etsy-${listingId}`;
      const payhipKey = url.searchParams.get('product_key') || url.pathname.match(/\/b\/([A-Za-z0-9]+)(?:\/|$)/)?.[1];
      if (payhipKey) return `payhip-${payhipKey}`;
    } catch (error) {
      console.error('Unable to read the linked product URL:', error);
    }
    return '';
  }

  async function loadLinkedProduct() {
    const productUrl = text(currentArticle?.productUrl, window.CDL_I18N?.language || 'en');
    const id = productIdFromUrl(productUrl);
    if (!id) return null;
    try {
      const catalogResponse = await fetch('/data/products.json', { headers: { Accept: 'application/json' } });
      if (catalogResponse.ok) {
        const catalog = await catalogResponse.json();
        const product = Array.isArray(catalog) ? catalog.find((item) => item?.id === id && item.status === 'published') : null;
        if (product) return product;
      }
    } catch (error) {
      console.error('Unable to load product covers from the catalogue:', error);
    }
    let endpoint = '';
    if (/^etsy-\d+$/.test(id)) endpoint = `/api/etsy-products?listing_id=${encodeURIComponent(id.slice(5))}`;
    else if (/^payhip-[a-z0-9]{4,32}$/i.test(id)) endpoint = `/api/payhip-products?product_key=${encodeURIComponent(id.slice(7))}`;
    if (!endpoint) return null;
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const payload = await response.json();
      return Array.isArray(payload.products) ? payload.products.find((item) => item?.id === id) || null : null;
    } catch (error) {
      console.error('Unable to load the linked product cover:', error);
      return null;
    }
  }

  function renderLinkedProductCover(language) {
    const image = article.querySelector('.article-detail-aside > img');
    if (!image || !linkedProduct) return;
    const cover = linkedProduct.covers?.[language] || linkedProduct.cover;
    if (!cover) return;
    const productTitle = linkedProduct.translations?.[language]?.title || linkedProduct.title || '';
    image.src = cover;
    image.alt = language === 'fr' ? `Couverture du produit : ${productTitle}` : `Product cover: ${productTitle}`;
    image.dataset.productId = linkedProduct.id;
  }

  function render() {
    if (!currentArticle) return;
    const language = window.CDL_I18N?.language || 'en';
    const t = (value) => text(value, language);
    title.textContent = t(currentArticle.title);
    summary.textContent = t(currentArticle.summary);
    category.textContent = t(currentArticle.category);
    document.title = text(currentArticle.seoTitle, language) || `${t(currentArticle.title)} | CDB Projects`;
    updateArticleMetadata(language);
    renderLinkedProductCover(language);
    if (currentArticle.publishedAt) {
      date.dateTime = currentArticle.publishedAt;
      date.textContent = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'long' }).format(new Date(`${currentArticle.publishedAt}T12:00:00`));
    }
    content.replaceChildren();
    toc.replaceChildren(Object.assign(document.createElement('p'), { textContent: t({ fr: 'Dans cet article', en: 'In this article' }) }));
    currentArticle.sections.forEach((section, index) => {
      if (section.type === 'relatedProducts') {
        const box = document.createElement('section'); box.className = 'article-detail-related';
        const heading = document.createElement('h2'); heading.textContent = t(section.title); box.append(heading);
        const list = document.createElement('ul');
        (section.items || []).forEach((item) => {
          const li = document.createElement('li'); const link = document.createElement('a');
          link.href = safeArticleUrl(item.url); link.textContent = t(item.title);
          li.append(link); list.append(li);
        });
        box.append(list); content.append(box); return;
      }
      if (section.type === 'sources') {
        const box = document.createElement('aside'); box.className = 'article-detail-sources';
        const heading = document.createElement('h2'); heading.textContent = t(section.title); box.append(heading);
        const list = document.createElement('ul');
        (section.items || []).forEach((source) => {
          const item = document.createElement('li'); const link = document.createElement('a');
          link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = t(source.label);
          item.append(link); list.append(item);
        });
        box.append(list); content.append(box); return;
      }
      if (section.type === 'cta') {
        const box = document.createElement('aside'); box.className = 'article-detail-cta';
        const p = document.createElement('p'); p.textContent = t(section.text);
        const link = document.createElement('a'); link.href = t(currentArticle.productUrl); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `${t(section.button)} ↗`;
        box.append(p, link); content.append(box); return;
      }
      if (section.type === 'list') {
        const list = document.createElement('ol');
        (section.items?.[language] || section.items?.en || []).forEach((item) => { const li = document.createElement('li'); li.textContent = item; list.append(li); });
        content.append(list); return;
      }
      const tag = ({ lead: 'p', p: 'p', h2: 'h2', h3: 'h3' })[section.type] || 'p';
      const element = document.createElement(tag); element.textContent = t(section.text);
      if (section.type === 'lead') element.className = 'article-detail-lead';
      if (section.type === 'h2') {
        const id = slug(t(section.text)); element.id = id;
        const link = document.createElement('a'); link.href = `#${id}`; link.textContent = t(section.text); link.addEventListener('click', (event) => { event.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); });
        toc.append(link);
      }
      content.append(element);
    });
    const backLabels = article.querySelectorAll('.article-detail-back span,.article-detail-end a:first-child span');
    backLabels.forEach((item) => { item.textContent = t({ fr: 'Tous les articles', en: 'All articles' }); });
    const productLink = article.querySelector('.article-detail-product-link');
    const isAiArticle = ['adapter-strategie-marketing-ere-ia', 'choisir-premier-chantier-ia-marketing'].includes(currentArticle.id);
    const isDiscographyArticle = currentArticle.id === 'analyser-discographie-nourrir-creativite';
    const isFamilyHostingArticle = currentArticle.id === 'organiser-grand-repas-famille-sans-epuisement';
    const isChefMethodArticle = currentArticle.id === 'arreter-dependre-recettes-cuisiner-methode';
    const isFacelessMarketingArticle = currentArticle.id === 'faceless-instagram-proof-before-passive-income';
    const isTravelBudgetArticle = currentArticle.id === 'travel-budget-separate-commitments-estimates';
    const isPlrCatalogArticle = currentArticle.id === 'sell-plr-products-personalization-proof';
    const isBeautyInstagramArticle = currentArticle.id === 'instagram-beaute-identite-visuelle-reconnaissable';
    const isBeautyPriceListArticle = currentArticle.id === 'carte-tarifs-beaute-reference-unique';
    const isBeautyWelcomePackArticle = currentArticle.id === 'livret-accueil-client-institut-beaute';
    const isBeautyBrandIdentityArticle = currentArticle.id === 'beauty-brand-identity-consistent-touchpoints';
    if (productLink) {
      productLink.href = t(currentArticle.productUrl);
      productLink.textContent = isAiArticle
        ? t({ fr: 'Découvrir THE AI MARKETING EDGE ↗', en: 'Explore THE AI MARKETING EDGE ↗' })
        : isDiscographyArticle
          ? t({ fr: 'Découvrir MICHAEL JACKSON / Songs, Context, Truth ↗', en: 'Explore MICHAEL JACKSON / Songs, Context, Truth ↗' })
          : isFamilyHostingArticle
            ? t({ fr: 'Découvrir La Méthode Thanksgiving ↗', en: 'Explore The Thanksgiving Method ↗' })
            : isChefMethodArticle
              ? t({ fr: 'Découvrir La Méthode du Chef ↗', en: 'Explore The Chef’s Method ↗' })
              : isFacelessMarketingArticle
                ? t({ fr: 'Découvrir Marketing sans visage ↗', en: 'Explore Faceless Marketing ↗' })
                : isTravelBudgetArticle
                  ? t({ fr: 'Découvrir l’Organisateur de Voyage Pro ↗', en: 'Explore Vacation Planner Pro ↗' })
                  : isPlrCatalogArticle
                    ? t({ fr: 'Découvrir CDL Master Library ↗', en: 'Explore CDL Master Library ↗' })
                    : isBeautyPriceListArticle
                      ? t({ fr: 'Découvrir le Beauty Price List Bundle ↗', en: 'Explore the Beauty Price List Bundle ↗' })
        : isBeautyWelcomePackArticle
          ? t({ fr: 'Découvrir le Beauty Client Welcome Pack ↗', en: 'Explore the Beauty Client Welcome Pack ↗' })
        : isBeautyBrandIdentityArticle
          ? t({ fr: 'Découvrir le Beauty Visual Identity Kit ↗', en: 'Explore the Beauty Visual Identity Kit ↗' })
                      : isBeautyInstagramArticle
                      ? t({ fr: 'Découvrir le Beauty Instagram Kit ↗', en: 'Explore the Beauty Instagram Kit ↗' })
                      : t({ fr: 'Découvrir les planificateurs ↗', en: 'Explore the planners ↗' });
    }
    const categoryLink = article.querySelector('.article-detail-end a:last-child');
    if (categoryLink) {
      categoryLink.href = (isBeautyInstagramArticle || isBeautyPriceListArticle || isBeautyWelcomePackArticle || isBeautyBrandIdentityArticle) ? '/shop.html?audience=specialists' : isPlrCatalogArticle ? '/shop.html?audience=business-builder' : isTravelBudgetArticle ? '/shop.html?audience=lifestyle-hobbyist' : isFacelessMarketingArticle ? '/shop.html?audience=business-builder' : isAiArticle ? '/shop.html?group=learning-guides' : (isDiscographyArticle || isFamilyHostingArticle || isChefMethodArticle) ? '/shop.html?group=strategy-frameworks' : '/shop.html?group=planning-tracking';
      categoryLink.textContent = isAiArticle
        ? t({ fr: 'Explorer Learning & Guides ↗', en: 'Explore Learning & Guides ↗' })
        : (isDiscographyArticle || isFamilyHostingArticle || isChefMethodArticle)
          ? t({ fr: 'Explorer Strategy & Frameworks ↗', en: 'Explore Strategy & Frameworks ↗' })
          : isFacelessMarketingArticle
            ? t({ fr: 'Explorer les ressources pour les entrepreneurs ↗', en: 'Explore resources for business builders ↗' })
            : isTravelBudgetArticle
              ? t({ fr: 'Explorer les ressources de voyage ↗', en: 'Explore travel resources ↗' })
              : isPlrCatalogArticle
                ? t({ fr: 'Explorer les ressources pour les entrepreneurs ↗', en: 'Explore resources for business builders ↗' })
                : isBeautyPriceListArticle
          ? t({ fr: 'Explorer les ressources beauté ↗', en: 'Explore beauty resources ↗' })
        : (isBeautyWelcomePackArticle || isBeautyBrandIdentityArticle)
          ? t({ fr: 'Explorer les ressources beauté ↗', en: 'Explore beauty resources ↗' })
          : t({ fr: 'Explorer Planning & Tracking ↗', en: 'Explore Planning & Tracking ↗' });
    }
  }

  fetch('/data/articles.json', { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`Articles returned ${response.status}`); return response.json(); })
    .then((articles) => {
      currentArticle = articles.find((item) => item.id === article.dataset.articleId && item.status === 'published');
      if (!currentArticle) throw new Error('Article not found');
      render();
      loadLinkedProduct().then((product) => {
        linkedProduct = product;
        renderLinkedProductCover(window.CDL_I18N?.language || 'en');
      });
      document.addEventListener('cdl:languagechange', render);
    })
    .catch((error) => { console.error('Unable to load article:', error); title.textContent = 'Article unavailable'; content.textContent = 'Please return to the articles page and try again.'; });
})();
