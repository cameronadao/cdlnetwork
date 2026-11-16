(() => {
  const applyLanguage = () => {
    const language = window.CDL_I18N?.language || document.documentElement.lang || navigator.language || 'en';
    const current = String(language).toLowerCase().startsWith('fr') ? 'fr' : 'en';
    document.title = current === 'fr' ? 'Tarifs | CDL Network' : 'Pricing | CDL Network';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = current === 'fr'
      ? 'Découvrez les tarifs des services web et des forfaits CDL Network.'
      : 'Explore CDL Network web design, landing page, e-commerce, redesign, maintenance and package rates.';
    document.querySelectorAll('[data-pricing-language]').forEach((section) => {
      section.hidden = section.dataset.pricingLanguage !== current;
    });
  };
  applyLanguage();
  document.addEventListener('cdl:languagechange', applyLanguage);
})();
