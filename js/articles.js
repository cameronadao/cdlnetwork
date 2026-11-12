(() => {
  const grid = document.querySelector('#articles-grid');
  const state = document.querySelector('#articles-state');
  if (!grid || !state) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const localized = (value, language) => typeof value === 'string' ? value : (value?.[language] || value?.en || value?.fr || '');
  const translate = (value) => window.CDL_I18N?.t(value) || value;

  function showState(title, message, isError = false) {
    state.hidden = false;
    state.classList.toggle('is-error', isError);
    state.querySelector('h3').textContent = translate(title);
    state.querySelector('p').textContent = translate(message);
    grid.replaceChildren();
  }

  function safeArticleUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function render(articles) {
    const language = window.CDL_I18N?.language || 'en';
    const published = articles
      .filter((article) => article?.status === 'published' && localized(article.title, language))
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));

    if (!published.length) {
      showState('No articles published yet', 'New articles from CDL Network will appear here. Check back soon.');
      return;
    }

    state.hidden = true;
    grid.replaceChildren();
    published.forEach((article) => {
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
        read.textContent = translate('Read article');
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
      render(data);
      document.addEventListener('cdl:languagechange', () => render(data));
    })
    .catch((error) => {
      console.error('Unable to load articles:', error);
      showState('Articles could not be loaded', 'Please try again later.', true);
    });
})();
