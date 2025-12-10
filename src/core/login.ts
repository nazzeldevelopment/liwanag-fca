import * as fs from 'fs';
import * as cheerio from 'cheerio';
import { LoginCredentials, AppState, LiwanagOptions, ApiCallback, LogConfig, TwoFactorAuthOptions, CheckpointData, CheckpointHandler, Cookie } from '../types';
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
import axios, { AxiosInstance } from 'axios';

const FB_LOGIN_URL = 'https://www.facebook.com/login.php';
const FB_CHECKPOINT_URL = 'https://www.facebook.com/checkpoint/';
const FB_2FA_URL = 'https://www.facebook.com/checkpoint/?next';
const MOBILE_LOGIN_URL = 'https://m.facebook.com/login.php';

export interface LoginOptionsWithCheckpoint extends LiwanagOptions {
  checkpointHandler?: CheckpointHandler;
  twoFactorCode?: string;
}

export async function login(
  credentials: LoginCredentials | { appState: AppState },
  options: LoginOptionsWithCheckpoint,
  callback: ApiCallback
): Promise<void> {
  const logConfig = options.logConfig as Partial<LogConfig> | undefined;
  const logger = new Logger(logConfig);
  
  logger.printBanner('0.5.0');
  logger.info(logger.getMessage('loginStart'));

  try {
    let appState: AppState;

    if ('appState' in credentials) {
      logger.system(logger.getMessage('readingAppstate'));
      appState = credentials.appState;
    } else {
      logger.info('Logging in with credentials...');
      appState = await loginWithCredentials(credentials, options, logger);
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
  options: LoginOptionsWithCheckpoint,
  logger: Logger
): Promise<AppState> {
  logger.info('Initiating credential-based login...');
  
  const client = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    },
    maxRedirects: 5,
    withCredentials: true,
    validateStatus: (status) => status < 500
  });

  const collectedCookies: Cookie[] = [];

  try {
    logger.debug('Fetching login page...');
    const loginPageResponse = await client.get('https://www.facebook.com/');
    
    const setCookies = loginPageResponse.headers['set-cookie'] || [];
    parseCookies(setCookies, collectedCookies);
    
    const $ = cheerio.load(loginPageResponse.data);
    
    const loginForm: Record<string, string> = {};
    $('form input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value');
      if (name && value !== undefined) {
        loginForm[name] = value;
      }
    });
    
    const lsd = $('input[name="lsd"]').val() as string || loginForm['lsd'] || '';
    const jazoest = $('input[name="jazoest"]').val() as string || loginForm['jazoest'] || '';
    
    if (!lsd) {
      logger.debug('LSD token not found, generating...');
    }

    const formData = new URLSearchParams({
      ...loginForm,
      lsd,
      jazoest,
      email: credentials.email,
      pass: credentials.password,
      login: '1',
      persistent: '1',
      default_persistent: '1'
    });

    logger.debug('Submitting login credentials...');
    
    const loginResponse = await client.post(MOBILE_LOGIN_URL, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': formatCookies(collectedCookies),
        'Origin': 'https://m.facebook.com',
        'Referer': 'https://m.facebook.com/'
      }
    });

    const loginCookies = loginResponse.headers['set-cookie'] || [];
    parseCookies(loginCookies, collectedCookies);
    
    const responseUrl = loginResponse.request?.res?.responseUrl || loginResponse.headers['location'] || '';
    const responseHtml = loginResponse.data;
    
    if (isCheckpoint(responseUrl, responseHtml)) {
      logger.warning('Checkpoint detected, handling...');
      return await handleCheckpoint(
        responseUrl,
        responseHtml,
        collectedCookies,
        client,
        options,
        logger
      );
    }
    
    if (is2FARequired(responseUrl, responseHtml)) {
      logger.warning('Two-Factor Authentication required...');
      return await handle2FA(
        responseUrl,
        responseHtml,
        collectedCookies,
        client,
        options,
        logger
      );
    }
    
    const cUserCookie = collectedCookies.find(c => c.name === 'c_user');
    if (!cUserCookie) {
      const errorMatch = responseHtml.match(/id="error"[^>]*>([^<]+)/i) ||
                         responseHtml.match(/class="[^"]*error[^"]*"[^>]*>([^<]+)/i);
      const errorMessage = errorMatch ? errorMatch[1].trim() : 'Login failed - Invalid credentials or account locked';
      throw new Error(errorMessage);
    }
    
    logger.success('Login successful, extracting session data...');
    
    const fbDtsg = extractFbDtsg(responseHtml);
    const revision = extractRevision(responseHtml);
    
    return {
      cookies: collectedCookies,
      fbDtsg,
      userId: cUserCookie.value,
      revision,
      lastRefresh: Date.now()
    };
    
  } catch (error) {
    const err = error as Error;
    logger.error('Login failed', { error: err.message });
    throw new Error(`Credential login failed: ${err.message}`);
  }
}

function isCheckpoint(url: string, html: string): boolean {
  return url.includes('/checkpoint/') ||
         html.includes('checkpoint') ||
         html.includes('verify your identity') ||
         html.includes('Confirm your identity') ||
         html.includes('Security Check');
}

function is2FARequired(url: string, html: string): boolean {
  return url.includes('two_step_verification') ||
         html.includes('two-factor') ||
         html.includes('approvals_code') ||
         html.includes('Enter login code') ||
         html.includes('authentication code');
}

async function handleCheckpoint(
  url: string,
  html: string,
  cookies: Cookie[],
  client: AxiosInstance,
  options: LoginOptionsWithCheckpoint,
  logger: Logger
): Promise<AppState> {
  const $ = cheerio.load(html);
  
  let checkpointType: CheckpointData['type'] = 'verification';
  
  if (html.includes('two-factor') || html.includes('approvals_code')) {
    checkpointType = 'two_factor';
  } else if (html.includes('captcha') || html.includes('recaptcha')) {
    checkpointType = 'captcha';
  } else if (html.includes('identity') || html.includes('photo')) {
    checkpointType = 'identity';
  }
  
  const checkpointData: CheckpointData = {
    type: checkpointType,
    challengeUrl: url,
    message: $('div[role="main"]').text().trim() || 
             $('body').text().slice(0, 200).trim() ||
             'Checkpoint verification required'
  };
  
  logger.warning(`Checkpoint type: ${checkpointType}`);
  
  if (!options.checkpointHandler) {
    throw new Error(
      `Checkpoint required: ${checkpointData.message}\n` +
      'Please provide a checkpointHandler in options to handle this verification.'
    );
  }
  
  try {
    const response = await options.checkpointHandler.onCheckpoint(checkpointData);
    
    if (typeof response === 'string') {
      return await submitCheckpointCode(response, url, html, cookies, client, logger);
    } else {
      return await submit2FACode(response, url, html, cookies, client, logger);
    }
  } catch (error) {
    options.checkpointHandler.onError?.(error as Error);
    throw error;
  }
}

async function handle2FA(
  url: string,
  html: string,
  cookies: Cookie[],
  client: AxiosInstance,
  options: LoginOptionsWithCheckpoint,
  logger: Logger
): Promise<AppState> {
  logger.info('Handling Two-Factor Authentication...');
  
  if (options.twoFactorCode) {
    return await submit2FACode(
      { method: '2fa_code', code: options.twoFactorCode },
      url,
      html,
      cookies,
      client,
      logger
    );
  }
  
  if (options.checkpointHandler) {
    const checkpointData: CheckpointData = {
      type: 'two_factor',
      challengeUrl: url,
      message: 'Two-Factor Authentication required. Please enter your code.'
    };
    
    const response = await options.checkpointHandler.onCheckpoint(checkpointData);
    
    if (typeof response === 'string') {
      return await submit2FACode(
        { method: '2fa_code', code: response },
        url,
        html,
        cookies,
        client,
        logger
      );
    } else {
      return await submit2FACode(response, url, html, cookies, client, logger);
    }
  }
  
  throw new Error(
    'Two-Factor Authentication required. ' +
    'Please provide twoFactorCode or a checkpointHandler in options.'
  );
}

async function submitCheckpointCode(
  code: string,
  url: string,
  html: string,
  cookies: Cookie[],
  client: AxiosInstance,
  logger: Logger
): Promise<AppState> {
  logger.debug('Submitting checkpoint verification code...');
  
  const $ = cheerio.load(html);
  
  const formData: Record<string, string> = {};
  $('form input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value');
    if (name && value !== undefined) {
      formData[name] = value;
    }
  });
  
  formData['approvals_code'] = code;
  formData['submit[Submit Code]'] = '1';
  
  const response = await client.post(url, new URLSearchParams(formData).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': formatCookies(cookies)
    }
  });
  
  const responseCookies = response.headers['set-cookie'] || [];
  parseCookies(responseCookies, cookies);
  
  const cUserCookie = cookies.find(c => c.name === 'c_user');
  if (!cUserCookie) {
    throw new Error('Checkpoint verification failed - Invalid code or expired session');
  }
  
  const fbDtsg = extractFbDtsg(response.data);
  const revision = extractRevision(response.data);
  
  logger.success('Checkpoint verification successful');
  
  return {
    cookies,
    fbDtsg,
    userId: cUserCookie.value,
    revision,
    lastRefresh: Date.now()
  };
}

async function submit2FACode(
  twoFAOptions: TwoFactorAuthOptions,
  url: string,
  html: string,
  cookies: Cookie[],
  client: AxiosInstance,
  logger: Logger
): Promise<AppState> {
  logger.debug(`Submitting 2FA code (method: ${twoFAOptions.method})...`);
  
  const $ = cheerio.load(html);
  
  const formData: Record<string, string> = {};
  $('form input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value');
    if (name && value !== undefined) {
      formData[name] = value;
    }
  });
  
  if (twoFAOptions.method === 'backup_code') {
    formData['approvals_code'] = twoFAOptions.code;
    formData['codes_submitted'] = '1';
  } else {
    formData['approvals_code'] = twoFAOptions.code;
  }
  
  formData['submit[Submit Code]'] = '1';
  formData['submit[Continue]'] = '1';
  
  const submitUrl = url.includes('checkpoint') ? url : FB_2FA_URL;
  
  const response = await client.post(submitUrl, new URLSearchParams(formData).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': formatCookies(cookies),
      'Referer': url
    }
  });
  
  const responseCookies = response.headers['set-cookie'] || [];
  parseCookies(responseCookies, cookies);
  
  const responseHtml = response.data;
  const responseUrl = response.request?.res?.responseUrl || '';
  
  if (responseHtml.includes('approvals_code') || responseHtml.includes('try again')) {
    throw new Error('Invalid 2FA code. Please try again.');
  }
  
  const cUserCookie = cookies.find(c => c.name === 'c_user');
  if (!cUserCookie) {
    if (responseHtml.includes('save this browser')) {
      logger.debug('Browser save prompt detected, continuing...');
      return await handleBrowserSavePrompt(response, cookies, client, logger);
    }
    throw new Error('2FA verification failed - Could not complete authentication');
  }
  
  const fbDtsg = extractFbDtsg(responseHtml);
  const revision = extractRevision(responseHtml);
  
  logger.success('Two-Factor Authentication successful');
  
  return {
    cookies,
    fbDtsg,
    userId: cUserCookie.value,
    revision,
    lastRefresh: Date.now()
  };
}

async function handleBrowserSavePrompt(
  response: any,
  cookies: Cookie[],
  client: AxiosInstance,
  logger: Logger
): Promise<AppState> {
  const $ = cheerio.load(response.data);
  const url = response.request?.res?.responseUrl || FB_CHECKPOINT_URL;
  
  const formData: Record<string, string> = {};
  $('form input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value');
    if (name && value !== undefined) {
      formData[name] = value;
    }
  });
  
  formData['name_action_selected'] = 'save_device';
  formData['submit[Continue]'] = '1';
  
  const saveResponse = await client.post(url, new URLSearchParams(formData).toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': formatCookies(cookies)
    }
  });
  
  const responseCookies = saveResponse.headers['set-cookie'] || [];
  parseCookies(responseCookies, cookies);
  
  const cUserCookie = cookies.find(c => c.name === 'c_user');
  if (!cUserCookie) {
    throw new Error('Could not complete login after browser save prompt');
  }
  
  const fbDtsg = extractFbDtsg(saveResponse.data);
  const revision = extractRevision(saveResponse.data);
  
  return {
    cookies,
    fbDtsg,
    userId: cUserCookie.value,
    revision,
    lastRefresh: Date.now()
  };
}

function parseCookies(setCookieHeaders: string[], cookieArray: Cookie[]): void {
  for (const header of setCookieHeaders) {
    const parts = header.split(';');
    const mainPart = parts[0];
    const [name, ...valueParts] = mainPart.split('=');
    const value = valueParts.join('=');
    
    if (name && value) {
      const existingIndex = cookieArray.findIndex(c => c.name === name.trim());
      
      const cookie: Cookie = {
        name: name.trim(),
        value: value.trim(),
        domain: '.facebook.com',
        path: '/'
      };
      
      for (const part of parts.slice(1)) {
        const [key, val] = part.trim().split('=');
        const keyLower = key.toLowerCase();
        
        if (keyLower === 'expires' && val) {
          cookie.expires = new Date(val).getTime();
        } else if (keyLower === 'domain' && val) {
          cookie.domain = val;
        } else if (keyLower === 'path' && val) {
          cookie.path = val;
        } else if (keyLower === 'httponly') {
          cookie.httpOnly = true;
        } else if (keyLower === 'secure') {
          cookie.secure = true;
        }
      }
      
      if (existingIndex >= 0) {
        cookieArray[existingIndex] = cookie;
      } else {
        cookieArray.push(cookie);
      }
    }
  }
}

function formatCookies(cookies: Cookie[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

function extractFbDtsg(html: string): string {
  const patterns = [
    /"DTSGInitialData"[^}]*"token":"([^"]+)"/,
    /name="fb_dtsg"\s*value="([^"]+)"/,
    /"dtsg":\{"token":"([^"]+)"/,
    /\["DTSGInitData",\[\],\{"token":"([^"]+)"/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  
  return '';
}

function extractRevision(html: string): number {
  const patterns = [
    /"client_revision":(\d+)/,
    /"server_revision":(\d+)/,
    /revision"?:(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  
  return 1;
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

export async function loginWithTwoFactor(
  credentials: LoginCredentials,
  twoFactorCode: string,
  options: LiwanagOptions = {},
  callback: ApiCallback
): Promise<void> {
  return login(credentials, { ...options, twoFactorCode } as LoginOptionsWithCheckpoint, callback);
}

export async function loginWithCheckpointHandler(
  credentials: LoginCredentials,
  checkpointHandler: CheckpointHandler,
  options: LiwanagOptions = {},
  callback: ApiCallback
): Promise<void> {
  return login(credentials, { ...options, checkpointHandler } as LoginOptionsWithCheckpoint, callback);
}
