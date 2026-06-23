const useTranslation = function() {
  return {
    t: function(key) { return key; },
    i18n: { language: 'ru', changeLanguage: function() { return Promise.resolve(); } },
    ready: true,
  };
};
const initReactI18next = {
  type: '3rdParty',
  init: function() {},
};
const Trans = function(props) { return props.children || null; };
module.exports = { useTranslation, initReactI18next, Trans };
