import * as fs from 'fs';
import { Cookie, CookieStatus, CookieHealth, AutoRefreshConfig, RefreshInfo, AppState } from '../types';
import { Logger } from './logger';

export class CookieManager {
  private cookies: Cookie[] = [];
  private lastRefresh: Date | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private config: AutoRefreshConfig;
  private logger: Logger;
  private appState: AppState | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    this.config = {
      enabled: false,
      interval: 30,
      refreshBeforeExpiry: 10,
      maxRetries: 3
    };
  }

  setCookies(cookies: Cookie[]): void {
    this.cookies = cookies;
    this.lastRefresh = new Date();
  }

  getCookies(): Cookie[] {
    return [...this.cookies];
  }

  setAppState(appState: AppState): void {
    this.appState = appState;
    this.cookies = appState.cookies;
    this.lastRefresh = appState.lastRefresh ? new Date(appState.lastRefresh) : new Date();
  }

  getAppState(): AppState | null {
    if (!this.appState) return null;
    return {
      ...this.appState,
      cookies: this.cookies,
      lastRefresh: Date.now()
    };
  }

  getCookieString(): string {
    return this.cookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  findCookie(name: string): Cookie | undefined {
    return this.cookies.find(c => c.name === name);
  }

  updateCookie(name: string, value: string): void {
    const cookie = this.cookies.find(c => c.name === name);
    if (cookie) {
      cookie.value = value;
    }
  }

  getStatus(): CookieStatus {
    const now = Date.now();
    const oldestExpiry = this.getOldestExpiry();
    const expiresIn = oldestExpiry ? oldestExpiry - now : 0;
    const lastRefreshAgo = this.lastRefresh ? now - this.lastRefresh.getTime() : 0;
    const nextRefresh = this.config.enabled ? 
      (this.config.interval * 60 * 1000) - lastRefreshAgo : 0;

    let health: CookieStatus['health'] = 'excellent';
    if (expiresIn < 30 * 60 * 1000) health = 'poor';
    else if (expiresIn < 60 * 60 * 1000) health = 'fair';
    else if (expiresIn < 2 * 60 * 60 * 1000) health = 'good';

    return {
      valid: this.cookies.length > 0 && expiresIn > 0,
      expiresIn: this.formatDuration(expiresIn),
      lastRefresh: this.formatDuration(lastRefreshAgo) + ' ago',
      nextRefresh: this.formatDuration(nextRefresh),
      health
    };
  }

  async checkHealth(): Promise<CookieHealth> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (this.cookies.length === 0) {
      issues.push('No cookies found');
      score -= 100;
    }

    const requiredCookies = ['c_user', 'xs', 'datr'];
    for (const name of requiredCookies) {
      if (!this.findCookie(name)) {
        issues.push(`Missing required cookie: ${name}`);
        score -= 20;
      }
    }

    const oldestExpiry = this.getOldestExpiry();
    if (oldestExpiry) {
      const expiresIn = oldestExpiry - Date.now();
      if (expiresIn < 30 * 60 * 1000) {
        issues.push('Cookies expiring soon');
        recommendations.push('Refresh cookies immediately');
        score -= 30;
      } else if (expiresIn < 60 * 60 * 1000) {
        recommendations.push('Consider refreshing cookies');
        score -= 10;
      }
    }

    if (!this.config.enabled) {
      recommendations.push('Enable auto-refresh for better session stability');
    }

    let status: CookieHealth['status'] = 'healthy';
    if (score < 50) status = 'unhealthy';
    else if (score < 80) status = 'degraded';

    return { status, score: Math.max(0, score), issues, recommendations };
  }

  configureAutoRefresh(config: Partial<AutoRefreshConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.config.enabled) {
      const intervalMs = this.config.interval * 60 * 1000;
      this.refreshInterval = setInterval(() => this.autoRefresh(), intervalMs);
      this.logger.info('Auto-refresh cookies enabled', { 
        interval: `${this.config.interval} minutes` 
      });
    }
  }

  private async autoRefresh(): Promise<void> {
    this.logger.info(this.logger.getMessage('cookieRefresh'));
    
    let attempts = 0;
    let success = false;

    while (attempts < this.config.maxRetries && !success) {
      attempts++;
      try {
        await this.performRefresh();
        success = true;
        this.lastRefresh = new Date();
        
        const info: RefreshInfo = {
          timestamp: this.lastRefresh,
          success: true,
          newExpiry: this.getExpiryDate(),
          attempts
        };

        this.logger.success(this.logger.getMessage('cookieRefreshed'));
        this.config.onRefresh?.(info);
      } catch (error) {
        if (attempts >= this.config.maxRetries) {
          this.logger.error('Cookie refresh failed', { attempts });
          this.config.onError?.(error as Error);
        } else {
          this.logger.warning('Cookie refresh attempt failed, retrying...', { 
            attempt: attempts 
          });
        }
      }
    }
  }

  private async performRefresh(): Promise<void> {
    this.lastRefresh = new Date();
  }

  async saveCookies(filePath: string): Promise<void> {
    const data = JSON.stringify(this.getAppState(), null, 2);
    await fs.promises.writeFile(filePath, data, 'utf-8');
    this.logger.info('Cookies saved', { path: filePath });
  }

  async loadCookies(filePath: string): Promise<void> {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const appState = JSON.parse(data) as AppState;
    this.setAppState(appState);
    this.logger.info('Cookies loaded', { path: filePath });
  }

  exportCookies(): Cookie[] {
    return [...this.cookies];
  }

  async rotateCookies(options: { clearCache?: boolean; renewSession?: boolean }): Promise<void> {
    this.logger.info('Rotating cookies...', options);
    if (options.clearCache) {
    }
    if (options.renewSession) {
      await this.performRefresh();
    }
    this.logger.success('Cookies rotated');
  }

  private getOldestExpiry(): number | null {
    const expiringCookies = this.cookies.filter(c => c.expires);
    if (expiringCookies.length === 0) return null;
    return Math.min(...expiringCookies.map(c => c.expires!));
  }

  private getExpiryDate(): Date | undefined {
    const expiry = this.getOldestExpiry();
    return expiry ? new Date(expiry) : undefined;
  }

  private formatDuration(ms: number): string {
    if (ms < 0) return '0m';
    const minutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
