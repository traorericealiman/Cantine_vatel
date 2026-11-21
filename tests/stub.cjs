// Les tests tournent sous Node : on remplace le module natif expo-localization par un faux.
const Module = require('module');
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'expo-localization') return { getLocales: () => [{ languageCode: 'fr' }] };
  return load.call(this, request, ...rest);
};
