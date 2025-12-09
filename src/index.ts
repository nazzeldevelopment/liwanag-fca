import { login, loginFromAppState } from './core/login';
import { Api } from './core/api';
import { Logger } from './utils/logger';
import { CookieManager } from './utils/cookies';
import {
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
} from './utils/antiDetection';

export * from './types';

export {
  login,
  loginFromAppState,
  Api,
  Logger,
  CookieManager,
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
};

export default {
  login,
  loginFromAppState,
  Api,
  Logger,
  CookieManager,
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
};
