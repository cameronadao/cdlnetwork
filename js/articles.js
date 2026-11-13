(() => {
  const grid = document.querySelector('#articles-grid');
  const state = document.querySelector('#articles-state');
  const filterNav = document.querySelector('#article-audience-filters');
  const filterHeading = document.querySelector('#articles-audiences-heading');
  const filterEyebrow = document.querySelector('#article-filter-eyebrow');
  if (!grid || !state || !filterNav) return;

  const audienceFilters = [
    { id: 'business-builder', en: 'For Business Builder', fr: 'Pour les entrepreneurs' },
    { id: 'digital-creators', en: 'For Digital Creators', fr: 'Pour les créateurs numériques' },
    { id: 'family-niches-market', en: 'For Family & Niche Markets', fr: 'Pour les familles et les marchés de niche' },
    { id: 'lifestyle-hobbyist', en: 'For Lifestyle & Hobbyist', fr: 'Pour les loisirs et le mode de vie' },
    { id: 'personal-growth-coach', en: 'For Personal Growth Coach', fr: 'Pour les coachs en développement personnel' },
    { id: 'specialists', en: 'For Specialists', fr: 'Pour les spécialistes' }
  ];
  const localized = (value, language) => typeof value === 'string' ? value : (value?.[language] || value?.en || value?.fr || '');
  const slug = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let allArticles = [];
  let selectedAudience = '';

  function setState(title, message, isError = false) {
    state.hidden = false;
    state.classList.toggle('is-error', isError);
    state.querySelector('h3').textContent = title;
    state.querySelector('p').textContent = message;
    grid.replaceChildren();
  }

  function safeArticleUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function renderFilters(language) {
    filterHeading.textContent = language === 'fr' ? 'Parcourir les articles par public' : 'Browse articles by audience';
    filterEyebrow.textContent = language === 'fr' ? 'FILTRES DES ARTICLES' : 'ARTICLE FILTERS';
    filterNav.setAttribute('aria-label', language === 'fr' ? 'Filtrer les articles par public' : 'Filter articles by audience');
    filterNav.replaceChildren();
    const options = [{ id: '', en: 'All articles', fr: 'Tous les articles' }, ...audienceFilters];
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = language === 'fr' ? option.fr : option.en;
      button.classList.toggle('is-active', selectedAudience === option.id);
      button.setAttribute('aria-pressed', String(selectedAudience === option.id));
      button.addEventListener('click', () => {
        selectedAudience = option.id;
        renderFilters(window.CDL_I18N?.language || 'en');
        renderArticles();
      });
      filterNav.append(button);
    });
  }

  function articleMatchesAudience(article) {
    if (!selectedAudience) return true;
    const values = Array.isArray(article.audiences) ? article.audiences : (article.audience ? [article.audience] : []);
    return values.some((value) => slug(value) === selectedAudience);
  }

  function renderArticles() {
    const language = window.CDL_I18N?.language || 'en';
    const published = allArticles
      .filter((article) => article?.status === 'published' && localized(article.title, language))
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
    const visible = published.filter(articleMatchesAudience);

    if (!published.length) {
      setState(language === 'fr' ? 'Aucun article publié pour le moment' : 'No articles published yet', language === 'fr' ? 'Les nouveaux articles de CDL Network apparaîtront ici. Revenez bientôt.' : 'New articles from CDL Network will appear here. Check back soon.');
      return;
    }
    if (!visible.length) {
      setState(language === 'fr' ? 'Aucun article dans cette catégorie pour le moment' : 'No articles in this audience yet', language === 'fr' ? 'Choisissez un autre filtre pour parcourir les articles disponibles.' : 'Choose another filter to browse the available articles.');
      return;
    }

    state.hidden = true;
    grid.replaceChildren();
    visible.forEach((article) => {
      const title = localized(article.title, language);
      const summary = localized(article.summary, language);
      const category = localized(article.category, language);
      const url = safeArticleUrl(article.url);
      const date = article.publishedAt ? new Date(`${article.publishedAt}T12:00:00`) : null;
      const dateText = date && !Number.isNaN(date.valueOf())
        ? new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { dateStyle: 'medium' }).format(date)
        : '';
      const card = document.createElement('article');
      card.className = 'article-card';
      const content = document.createElement(url ? 'a' : 'div');
      content.className = 'article-card-link';
      if (url) {
        content.href = url;
        if (new URL(url).origin !== window.location.origin) {
          content.target = '_blank';
          content.rel = 'noopener noreferrer';
        }
      }
      if (article.image) {
        const imageWrap = document.createElement('div');
        imageWrap.className = 'article-card-image';
        const image = document.createElement('img');
        image.src = article.image;
        image.alt = title;
        image.loading = 'lazy';
        imageWrap.append(image);
        content.append(imageWrap);
      }
      const body = document.createElement('div');
      body.className = 'article-card-body';
      const meta = document.createElement('div');
      meta.className = 'article-card-meta';
      if (category) {
        const label = document.createElement('span');
        label.textContent = category;
        meta.append(label);
      }
      if (dateText) {
        const time = document.createElement('time');
        time.dateTime = article.publishedAt;
        time.textContent = dateText;
        meta.append(time);
      }
      body.append(meta);
      const heading = document.createElement('h3');
      heading.textContent = title;
      body.append(heading);
      if (summary) {
        const excerpt = document.createElement('p');
        excerpt.className = 'article-card-summary';
        excerpt.textContent = summary;
        body.append(excerpt);
      }
      if (url) {
        const read = document.createElement('span');
        read.className = 'article-card-read';
        read.textContent = language === 'fr' ? 'Lire l’article' : 'Read article';
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        read.append(arrow);
        body.append(read);
      }
      content.append(body);
      card.append(content);
      grid.append(card);
    });
  }

  fetch('/data/articles.json', { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`Articles returned ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('Article data must be an array');
      allArticles = data;
      renderFilters(window.CDL_I18N?.language || 'en');
      renderArticles();
      document.addEventListener('cdl:languagechange', () => {
        renderFilters(window.CDL_I18N?.language || 'en');
        renderArticles();
      });
    })
    .catch((error) => {
      console.error('Unable to load articles:', error);
      setState('Articles could not be loaded', 'Please try again later.', true);
    });
})();
