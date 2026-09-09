/* Maestro runScript global — https://maestro.mobile.dev/advanced/javascript */
/* eslint-disable no-undef */
// National RU 10 digits only. Do not prefix +7: Android `input text` treats
// `+` as space, and LoginField already shows the country dial chip.
const suffix = String(Date.now()).slice(-7);
output.phone = `999${suffix}`;
