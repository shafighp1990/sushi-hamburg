// Runs before page content is painted. Static HTML has the default language;
// keep it out of view until React has rendered the saved visitor preference.
// This script is self-contained because it also runs before module downloads.
export const languageBootstrap = `(() => {
  const root = document.documentElement;
  const valid = value => /^(de|en|uk|fa)$/.test(value || '');
  let language;
  try { language = localStorage.getItem('sushi-lang'); } catch {}
  if (!valid(language)) {
    try {
      language = document.cookie.split(';').map(value => value.trim())
        .find(value => value.startsWith('sushi-lang='))?.slice(11);
    } catch {}
  }
  if (!valid(language)) language = valid(root.lang) ? root.lang : 'de';
  root.dataset.languagePreference = language;
  if (root.lang !== language) {
    root.dataset.languagePending = language;
    document.title = 'Sushi HH';
  }
  root.lang = language;
  root.dir = language === 'fa' ? 'rtl' : 'ltr';
})();`;
