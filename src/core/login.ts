import * as fs from 'fs';
import { LoginCredentials, AppState, LiwanagOptions, ApiCallback, LogConfig } from '../types';
import { Logger } from '../utils/logger';
import { CookieManager } from '../utils/cookies';
import { HttpClient } from '../utils/http';
import {
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
} from '../utils/antiDetection';
import { Api } from './api';

export async function login(
  credentials: LoginCredentials | { appState: AppState },
  options: LiwanagOptions,
  callback: ApiCallback
): Promise<void> {
  const logConfig = options.logConfig as Partial<LogConfig> | undefined;
  const logger = new Logger(logConfig);
  
  logger.printBanner('0.1.0');
  logger.info(logger.getMessage('loginStart'));

  try {
    let appState: AppState;

    if ('appState' in credentials) {
      logger.system(logger.getMessage('readingAppstate'));
      appState = credentials.appState;
    } else {
      logger.info('Logging in with credentials...');
      appState = await loginWithCredentials(credentials, logger);
    }

    if (!appState.cookies || appState.cookies.length === 0) {
      throw new Error('Invalid appstate: no cookies found');
    }

    const userId = extractUserId(appState);
    if (!userId) {
      throw new Error('Could not extract user ID from appstate');
    }

    const cookieManager = new CookieManager(logger);
    const fingerprintManager = new FingerprintManager(logger, options.fingerprint);
    const requestObfuscator = new RequestObfuscator(logger, options.requestObfuscator);
    const patternDiffuser = new PatternDiffuser(logger, options.patternDiffuser);
    const rateLimiter = new SmartRateLimiter(logger, options.rateLimiter);

    const httpClient = new HttpClient(
      cookieManager,
      fingerprintManager,
      requestObfuscator,
      patternDiffuser,
      logger
    );

    const api = new Api(
      userId,
      appState,
      options,
      logger,
      cookieManager,
      httpClient,
      fingerprintManager,
      requestObfuscator,
      patternDiffuser,
      rateLimiter
    );

    if (options.autoRefresh?.enabled) {
      api.autoRefreshCookies(options.autoRefresh);
    }

    logger.success(logger.getMessage('loginSuccess'), {
      'User ID': userId,
      'Session': logger.getMessage('sessionActive')
    });

    callback(null, api);
  } catch (error) {
    logger.error(logger.getMessage('loginFailed'), {
      error: (error as Error).message
    });
    callback(error as Error, null as any);
  }
}

async function loginWithCredentials(
  credentials: LoginCredentials,
  logger: Logger
): Promise<AppState> {
  logger.warning('Credential login requires additional implementation');
  logger.info('Please use appState login for now');
  
  throw new Error(
    'Credential login is not fully implemented. ' +
    'Please use appState login by providing cookies from a browser session.'
  );
}

function extractUserId(appState: AppState): string | null {
  if (appState.userId) {
    return appState.userId;
  }

  const cUserCookie = appState.cookies.find(c => c.name === 'c_user');
  if (cUserCookie) {
    return cUserCookie.value;
  }

  return null;
}

export async function loginFromAppState(
  appStatePath: string,
  options: LiwanagOptions = {},
  callback: ApiCallback
): Promise<void> {
  const logConfig = options.logConfig as Partial<LogConfig> | undefined;
  const logger = new Logger(logConfig);

  try {
    if (!fs.existsSync(appStatePath)) {
      throw new Error(`Appstate file not found: ${appStatePath}`);
    }

    const data = await fs.promises.readFile(appStatePath, 'utf-8');
    const appState = JSON.parse(data) as AppState;

    return login({ appState }, options, callback);
  } catch (error) {
    logger.error('Failed to load appstate', { path: appStatePath });
    callback(error as Error, null as any);
  }
}
