/**
 * Runtime patches that must be applied before any screen can hash a password.
 *
 * There are two JS entries: Gradle pins `entryFile` to `index.js` for native
 * release builds, while Expo CLI (dev, web, EAS) resolves `package.json` `main`
 * to `entry.js`. Both import this module, so neither engine can miss a patch.
 */
import './install-crypto-get-random-values';
import './install-password-hash-cost';
