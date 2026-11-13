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

  function render() {
    if (!currentArticle) return;
    const language = window.CDL_I18N?.language || 'en';
    const t = (value) => text(value, language);
    title.textContent = t(currentArticle.title);
    summary.textContent = t(currentArticle.summary);
    category.textContent = t(currentArticle.category);
    document.title = `${t(currentArticle.title)} | CDL Network`;
    if (currentArticle.publishedAt) {
      date.dateTime = currentArticle.publishedAt;
      date.textContent = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'long' }).format(new Date(`${currentArticle.publishedAt}T12:00:00`));
    }
    content.replaceChildren();
    toc.replaceChildren(Object.assign(document.createElement('p'), { textContent: t({ fr: 'Dans cet article', en: 'In this article' }) }));
    currentArticle.sections.forEach((section, index) => {
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
        const link = document.createElement('a'); link.href = currentArticle.productUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `${t(section.button)} ↗`;
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
    if (productLink) productLink.textContent = currentArticle.id === 'adapter-strategie-marketing-ere-ia'
      ? t({ fr: 'Découvrir THE AI MARKETING EDGE ↗', en: 'Explore THE AI MARKETING EDGE ↗' })
      : t({ fr: 'Découvrir les planificateurs ↗', en: 'Explore the planners ↗' });
    const categoryLink = article.querySelector('.article-detail-end a:last-child');
    if (categoryLink) {
      const isAiArticle = currentArticle.id === 'adapter-strategie-marketing-ere-ia';
      categoryLink.href = isAiArticle ? '/shop.html?group=learning-guides' : '/shop.html?group=planning-tracking';
      categoryLink.textContent = isAiArticle
        ? t({ fr: 'Explorer Learning & Guides ↗', en: 'Explore Learning & Guides ↗' })
        : t({ fr: 'Explorer Planning & Tracking ↗', en: 'Explore Planning & Tracking ↗' });
    }
  }

  fetch('/data/articles.json', { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`Articles returned ${response.status}`); return response.json(); })
    .then((articles) => {
      currentArticle = articles.find((item) => item.id === article.dataset.articleId && item.status === 'published');
      if (!currentArticle) throw new Error('Article not found');
      render();
      document.addEventListener('cdl:languagechange', render);
    })
    .catch((error) => { console.error('Unable to load article:', error); title.textContent = 'Article unavailable'; content.textContent = 'Please return to the articles page and try again.'; });
})();
