(() => {
  const applyLanguage = () => {
    const language = window.CDL_I18N?.language || document.documentElement.lang || navigator.language || 'en';
    const current = String(language).toLowerCase().startsWith('fr') ? 'fr' : 'en';
    document.title = current === 'fr' ? 'Tarifs | CDB Projects' : 'Pricing | CDB Projects';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = current === 'fr'
      ? 'Découvrez les tarifs des services web et des forfaits CDB Projects.'
      : 'Explore CDB Projects web design, landing page, e-commerce, redesign, maintenance and package rates.';
    document.querySelectorAll('[data-pricing-language]').forEach((section) => {
      section.hidden = section.dataset.pricingLanguage !== current;
    });
  };
  applyLanguage();
  document.addEventListener('cdl:languagechange', applyLanguage);
})();
