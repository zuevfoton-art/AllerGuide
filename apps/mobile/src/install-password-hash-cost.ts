import { Platform } from 'react-native';
import {
  PASSWORD_HASH_ITERATIONS_INTERPRETED,
  setPasswordHashIterations,
} from '@allerguide/core';

/**
 * Native builds run on Hermes, a bytecode interpreter without a JIT: the
 * default PBKDF2 cost blocks the JS thread for ~40s on register/login. Expo
 * web keeps the JIT default. Applied via `install-runtime`, which both JS
 * entries import.
 */
if (Platform.OS !== 'web') {
  setPasswordHashIterations(PASSWORD_HASH_ITERATIONS_INTERPRETED);
}
