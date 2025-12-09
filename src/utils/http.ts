import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieManager } from './cookies';
import { FingerprintManager, RequestObfuscator, PatternDiffuser } from './antiDetection';
import { Logger } from './logger';

const FB_GRAPH_URL = 'https://www.facebook.com/api/graphql/';
const FB_BASE_URL = 'https://www.facebook.com';
const MESSENGER_URL = 'https://www.messenger.com';

export interface HttpClientConfig {
  proxy?: string;
  timeout?: number;
}

export class HttpClient {
  private client: AxiosInstance;
  private cookieManager: CookieManager;
  private fingerprintManager: FingerprintManager;
  private requestObfuscator: RequestObfuscator;
  private patternDiffuser: PatternDiffuser;
  private logger: Logger;
  private fbDtsg: string = '';
  private revision: number = 1;

  constructor(
    cookieManager: CookieManager,
    fingerprintManager: FingerprintManager,
    requestObfuscator: RequestObfuscator,
    patternDiffuser: PatternDiffuser,
    logger: Logger,
    config?: HttpClientConfig
  ) {
    this.cookieManager = cookieManager;
    this.fingerprintManager = fingerprintManager;
    this.requestObfuscator = requestObfuscator;
    this.patternDiffuser = patternDiffuser;
    this.logger = logger;

    this.client = axios.create({
      timeout: config?.timeout || 30000,
      headers: this.getDefaultHeaders()
    });

    if (config?.proxy) {
    }
  }

  private getDefaultHeaders(): Record<string, string> {
    const fingerprint = this.fingerprintManager.getFingerprint();
    
    return {
      'User-Agent': fingerprint.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': fingerprint.language,
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };
  }

  setFbDtsg(dtsg: string): void {
    this.fbDtsg = dtsg;
  }

  setRevision(revision: number): void {
    this.revision = revision;
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.patternDiffuser.delay();
    
    const headers = this.requestObfuscator.obfuscateHeaders({
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      ...(config?.headers as Record<string, string> || {})
    });

    this.logger.incrementApiCalls();

    return this.client.get(url, { ...config, headers });
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.patternDiffuser.delay();
    await this.patternDiffuser.checkBurst();
    
    const headers = this.requestObfuscator.obfuscateHeaders({
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(config?.headers as Record<string, string> || {})
    });

    const obfuscatedData = this.requestObfuscator.obfuscateParams(data || {});
    this.logger.incrementApiCalls();

    return this.client.post(url, new URLSearchParams(obfuscatedData).toString(), { 
      ...config, 
      headers 
    });
  }

  async graphqlRequest(docId: string, variables: any): Promise<any> {
    const data = {
      fb_dtsg: this.fbDtsg,
      doc_id: docId,
      variables: JSON.stringify(variables),
      __rev: this.revision,
      __a: 1
    };

    const response = await this.post(FB_GRAPH_URL, data);
    return this.parseGraphqlResponse(response.data);
  }

  private parseGraphqlResponse(data: string | object): any {
    if (typeof data === 'string') {
      const lines = data.split('\n').filter(line => line.trim());
      const results: any[] = [];
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.replace('for (;;);', ''));
          results.push(parsed);
        } catch {
        }
      }
      
      return results.length === 1 ? results[0] : results;
    }
    return data;
  }

  getBaseUrl(): string {
    return FB_BASE_URL;
  }

  getMessengerUrl(): string {
    return MESSENGER_URL;
  }
}
