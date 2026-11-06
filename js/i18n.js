(() => {
  const languageStorageKey = 'cdl-network-language';
  const originalText = new WeakMap();
  const translatedText = new WeakMap();
  const originalAttributes = new WeakMap();
  const translatedAttributes = new WeakMap();
  const translatableAttributes = ['alt', 'aria-description', 'aria-label', 'content', 'placeholder', 'title'];
  let translations = { en: {}, fr: {} };
  let language = document.documentElement.lang === 'fr' ? 'fr' : 'en';

  try {
    const savedLanguage = localStorage.getItem(languageStorageKey);
    if (savedLanguage === 'fr' || savedLanguage === 'en') language = savedLanguage;
  } catch (error) {
    // The language switch still works for this page if storage is unavailable.
  }

  const normalize = (value) => String(value).replace(/\s+/g, ' ').trim();
  const translatedValue = (value) => {
    const source = normalize(value);
    return translations[language]?.[source] ?? value;
  };

  function translateTextNode(node) {
    if (!node?.parentElement || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(node.parentElement.tagName)) return;
    const current = node.nodeValue;
    if (!originalText.has(node) || (translatedText.has(node) && current !== translatedText.get(node))) {
      originalText.set(node, current);
    }
    const source = originalText.get(node);
    const trimmed = source.trim();
    if (!trimmed) return;
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    const next = `${leading}${translatedValue(trimmed)}${trailing}`;
    if (node.nodeValue !== next) node.nodeValue = next;
    translatedText.set(node, next);
  }

  function translateAttribute(element, attribute) {
    if (!element.hasAttribute(attribute)) return;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map();
      originalAttributes.set(element, saved);
    }
    let applied = translatedAttributes.get(element);
    if (!applied) {
      applied = new Map();
      translatedAttributes.set(element, applied);
    }
    const current = element.getAttribute(attribute);
    if (!saved.has(attribute) || (applied.has(attribute) && current !== applied.get(attribute))) {
      saved.set(attribute, current);
    }
    const source = saved.get(attribute);
    const next = translatedValue(source);
    if (current !== next) element.setAttribute(attribute, next);
    applied.set(attribute, next);
  }

  function translateElement(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      translateTextNode(element);
      return;
    }
    if (element.nodeType !== Node.ELEMENT_NODE) return;
    translatableAttributes.forEach((attribute) => translateAttribute(element, attribute));
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateTextNode(walker.currentNode);
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    const openGraphLocale = document.querySelector('meta[property="og:locale"]');
    if (openGraphLocale) openGraphLocale.setAttribute('content', language === 'fr' ? 'fr_FR' : 'en_US');
    translateElement(document.documentElement);
    updateLanguageControls();
    document.dispatchEvent(new CustomEvent('cdl:languagechange', { detail: { language } }));
  }

  function setLanguage(nextLanguage) {
    if (nextLanguage !== 'en' && nextLanguage !== 'fr') return;
    language = nextLanguage;
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch (error) {
      // Keep the selected language for the current page.
    }
    applyLanguage();
  }

  function updateLanguageControls() {
    document.querySelectorAll('.language-switch').forEach((group) => {
      group.setAttribute('aria-label', translatedValue('Choose language'));
      group.querySelectorAll('[data-language]').forEach((button) => {
        const active = button.dataset.language === language;
        button.setAttribute('aria-pressed', String(active));
        button.classList.toggle('is-active', active);
      });
    });
  }

  function mountLanguageControls() {
    const makeSwitch = (standalone = false) => {
      const group = document.createElement('div');
      group.className = standalone ? 'language-switch language-switch--standalone' : 'language-switch';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', translatedValue('Choose language'));
      group.innerHTML = '<button type="button" data-language="en" aria-label="English" aria-pressed="false"><span aria-hidden="true">🇬🇧</span><span>EN</span></button><button type="button" data-language="fr" aria-label="Français" aria-pressed="false"><span aria-hidden="true">🇫🇷</span><span>FR</span></button>';
      group.addEventListener('click', (event) => {
        const button = event.target.closest('[data-language]');
        if (button) setLanguage(button.dataset.language);
      });
      return group;
    };

    const navs = document.querySelectorAll('.nav-menu');
    navs.forEach((nav) => {
      if (nav.querySelector('.language-switch')) return;
      const group = makeSwitch();
      const callToAction = nav.querySelector('.nav-cta');
      if (callToAction) nav.insertBefore(group, callToAction);
      else nav.appendChild(group);
    });
    if (!navs.length && !document.querySelector('.language-switch')) {
      document.body.appendChild(makeSwitch(true));
    }
    updateLanguageControls();
  }

  window.CDL_I18N = {
    get language() { return language; },
    t(value, replacements = {}) {
      let result = translatedValue(value);
      Object.entries(replacements).forEach(([key, replacement]) => {
        result = result.replaceAll(`{${key}}`, String(replacement));
      });
      return result;
    },
    setLanguage
  };

  mountLanguageControls();

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'characterData') translateTextNode(record.target);
      if (record.type === 'attributes') translateAttribute(record.target, record.attributeName);
      record.addedNodes?.forEach((node) => translateElement(node));
    });
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: translatableAttributes,
    characterData: true,
    childList: true,
    subtree: true
  });

  fetch('/data/translations.json', { headers: { Accept: 'application/json' } })
    .then((response) => {
      if (!response.ok) throw new Error(`Translation data returned ${response.status}`);
      return response.json();
    })
    .then((data) => {
      translations = data;
      applyLanguage();
    })
    .catch((error) => console.error('Unable to load site translations:', error));
})();
