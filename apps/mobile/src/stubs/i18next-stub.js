const i18n = {
  use: function() { return i18n; },
  init: function() { return Promise.resolve(i18n); },
  isInitialized: true,
  t: function(key) { return key; },
  language: 'ru',
  changeLanguage: function() { return Promise.resolve(); },
  on: function() {},
  off: function() {},
};
module.exports = i18n;
module.exports.default = i18n;
