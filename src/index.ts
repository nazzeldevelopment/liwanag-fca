import { 
  login, 
  loginFromAppState, 
  loginWithTwoFactor, 
  loginWithCheckpointHandler,
  LoginOptionsWithCheckpoint
} from './core/login';
import { Api } from './core/api';
import { CommandHandler } from './core/commandHandler';
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
  loginWithTwoFactor,
  loginWithCheckpointHandler,
  LoginOptionsWithCheckpoint,
  Api,
  CommandHandler,
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
  loginWithTwoFactor,
  loginWithCheckpointHandler,
  Api,
  CommandHandler,
  Logger,
  CookieManager,
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
};
