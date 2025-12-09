import { v4 as uuidv4 } from 'uuid';
import {
  FingerprintConfig,
  Fingerprint,
  RequestObfuscatorConfig,
  PatternDiffuserConfig,
  RateLimiterConfig,
  RateLimitInfo
} from '../types';
import { Logger } from './logger';

const CHROME_VERSIONS = ['120.0.0.0', '119.0.0.0', '118.0.0.0', '117.0.0.0'];
const EDGE_VERSIONS = ['120.0.0.0', '119.0.0.0', '118.0.0.0'];
const FIREFOX_VERSIONS = ['121.0', '120.0', '119.0'];

const PLATFORMS: Record<string, { platform: string; oscpu: string }> = {
  'Windows': { platform: 'Win32', oscpu: 'Windows NT 10.0; Win64; x64' },
  'macOS': { platform: 'MacIntel', oscpu: 'Intel Mac OS X 10_15_7' },
  'Linux': { platform: 'Linux x86_64', oscpu: 'Linux x86_64' }
};

const SCREEN_RESOLUTIONS = [
  '1920x1080', '2560x1440', '1366x768', '1536x864',
  '1440x900', '1280x720', '1600x900', '1680x1050'
];

export class FingerprintManager {
  private config: FingerprintConfig;
  private currentFingerprint: Fingerprint | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(logger: Logger, config?: Partial<FingerprintConfig>) {
    this.logger = logger;
    this.config = {
      autoRotate: true,
      rotationInterval: 6 * 60 * 60 * 1000,
      consistency: 'high',
      browserProfile: 'chrome',
      platform: 'Windows',
      ...config
    };
    this.generateFingerprint();
  }

  configure(config: Partial<FingerprintConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }

    if (this.config.autoRotate) {
      this.rotationTimer = setInterval(() => {
        this.rotate();
      }, this.config.rotationInterval);
    }
  }

  generateFingerprint(): Fingerprint {
    const versions = this.config.browserProfile === 'chrome' ? CHROME_VERSIONS :
                     this.config.browserProfile === 'edge' ? EDGE_VERSIONS : FIREFOX_VERSIONS;
    const version = versions[Math.floor(Math.random() * versions.length)];
    const platformInfo = PLATFORMS[this.config.platform];
    const resolution = SCREEN_RESOLUTIONS[Math.floor(Math.random() * SCREEN_RESOLUTIONS.length)];

    let userAgent: string;
    if (this.config.browserProfile === 'chrome') {
      userAgent = `Mozilla/5.0 (${platformInfo.oscpu}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
    } else if (this.config.browserProfile === 'edge') {
      userAgent = `Mozilla/5.0 (${platformInfo.oscpu}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 Edg/${version}`;
    } else {
      userAgent = `Mozilla/5.0 (${platformInfo.oscpu}; rv:${version}) Gecko/20100101 Firefox/${version}`;
    }

    this.currentFingerprint = {
      userAgent,
      language: 'en-US,en;q=0.9',
      platform: platformInfo.platform,
      screenResolution: resolution,
      timezone: 'Asia/Manila',
      plugins: this.generatePluginList(),
      canvas: this.generateCanvasHash(),
      webgl: this.generateWebGLHash()
    };

    return this.currentFingerprint;
  }

  rotate(): void {
    const newFingerprint = this.generateFingerprint();
    this.logger.info('Fingerprint rotated');
    this.config.onRotation?.(newFingerprint);
  }

  getFingerprint(): Fingerprint {
    if (!this.currentFingerprint) {
      return this.generateFingerprint();
    }
    return this.currentFingerprint;
  }

  getUserAgent(): string {
    return this.getFingerprint().userAgent;
  }

  private generatePluginList(): string[] {
    const plugins = [
      'Chrome PDF Viewer',
      'Chromium PDF Viewer',
      'Microsoft Edge PDF Viewer',
      'WebKit built-in PDF'
    ];
    const count = Math.floor(Math.random() * 3) + 1;
    return plugins.slice(0, count);
  }

  private generateCanvasHash(): string {
    return uuidv4().replace(/-/g, '').substring(0, 32);
  }

  private generateWebGLHash(): string {
    return uuidv4().replace(/-/g, '').substring(0, 32);
  }

  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

export class RequestObfuscator {
  private config: RequestObfuscatorConfig;
  private logger: Logger;

  constructor(logger: Logger, config?: Partial<RequestObfuscatorConfig>) {
    this.logger = logger;
    this.config = {
      enabled: true,
      entropyLevel: 'medium',
      headerRandomization: true,
      payloadEncryption: false,
      parameterShuffle: true,
      timestampFuzz: { enabled: true, variance: 500 },
      ...config
    };
  }

  configure(config: Partial<RequestObfuscatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  obfuscateHeaders(headers: Record<string, string>): Record<string, string> {
    if (!this.config.enabled || !this.config.headerRandomization) {
      return headers;
    }

    const obfuscated = { ...headers };
    
    const randomHeaders = [
      ['sec-ch-ua-mobile', '?0'],
      ['sec-ch-ua-platform', '"Windows"'],
      ['sec-fetch-dest', 'empty'],
      ['sec-fetch-mode', 'cors'],
      ['sec-fetch-site', 'same-origin']
    ];

    for (const [key, value] of randomHeaders) {
      if (Math.random() > 0.3) {
        obfuscated[key] = value;
      }
    }

    return obfuscated;
  }

  obfuscateParams(params: Record<string, any>): Record<string, any> {
    if (!this.config.enabled) return params;

    let result = { ...params };

    if (this.config.parameterShuffle) {
      const entries = Object.entries(result);
      for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
      }
      result = Object.fromEntries(entries);
    }

    if (this.config.timestampFuzz.enabled) {
      const variance = this.config.timestampFuzz.variance;
      const fuzz = Math.floor(Math.random() * variance * 2) - variance;
      if (result['timestamp']) {
        result['timestamp'] = Number(result['timestamp']) + fuzz;
      }
    }

    return result;
  }

  addEntropy(data: any): any {
    if (!this.config.enabled) return data;

    const entropyMap: Record<string, number> = {
      'low': 0.1,
      'medium': 0.2,
      'high': 0.3,
      'extreme': 0.5
    };

    const probability = entropyMap[this.config.entropyLevel];
    
    if (Math.random() < probability && typeof data === 'object') {
      data['__rand'] = Math.random().toString(36).substring(7);
    }

    return data;
  }
}

export class PatternDiffuser {
  private config: PatternDiffuserConfig;
  private lastActionTime: number = 0;
  private burstCount: number = 0;
  private burstStartTime: number = 0;
  private logger: Logger;

  constructor(logger: Logger, config?: Partial<PatternDiffuserConfig>) {
    this.logger = logger;
    this.config = {
      enabled: true,
      humanLikeDelays: { min: 800, max: 3500, distribution: 'normal' },
      burstPrevention: { maxBurst: 5, cooldownPeriod: 10000 },
      idleSimulation: { enabled: true, minIdle: 30000, maxIdle: 300000, frequency: 0.15 },
      typingSimulation: { enabled: true, wpm: 45, variance: 15 },
      ...config
    };
  }

  configure(config: Partial<PatternDiffuserConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async delay(): Promise<void> {
    if (!this.config.enabled) return;

    let delayMs: number;
    const { min, max, distribution } = this.config.humanLikeDelays;

    switch (distribution) {
      case 'normal':
        const u = Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        delayMs = min + (max - min) * (0.5 + z * 0.15);
        break;
      case 'exponential':
        delayMs = min + Math.log(1 - Math.random()) * -(max - min) / 3;
        break;
      default:
        delayMs = min + Math.random() * (max - min);
    }

    delayMs = Math.max(min, Math.min(max, delayMs));
    await this.sleep(delayMs);
  }

  async checkBurst(): Promise<void> {
    if (!this.config.enabled) return;

    const now = Date.now();
    const { maxBurst, cooldownPeriod } = this.config.burstPrevention;

    if (now - this.burstStartTime > cooldownPeriod) {
      this.burstCount = 0;
      this.burstStartTime = now;
    }

    this.burstCount++;

    if (this.burstCount >= maxBurst) {
      this.logger.warning('Burst limit reached, cooling down...');
      await this.sleep(cooldownPeriod);
      this.burstCount = 0;
      this.burstStartTime = Date.now();
    }
  }

  async simulateIdle(): Promise<boolean> {
    if (!this.config.enabled || !this.config.idleSimulation.enabled) return false;

    if (Math.random() < this.config.idleSimulation.frequency) {
      const { minIdle, maxIdle } = this.config.idleSimulation;
      const idleTime = minIdle + Math.random() * (maxIdle - minIdle);
      this.logger.debug('Simulating idle period', { duration: `${Math.round(idleTime / 1000)}s` });
      await this.sleep(idleTime);
      return true;
    }

    return false;
  }

  getTypingDelay(text: string): number {
    if (!this.config.enabled || !this.config.typingSimulation.enabled) return 0;

    const { wpm, variance } = this.config.typingSimulation;
    const actualWpm = wpm + (Math.random() * variance * 2 - variance);
    const wordsCount = text.split(/\s+/).length;
    const milliseconds = (wordsCount / actualWpm) * 60 * 1000;

    return Math.max(500, milliseconds);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class SmartRateLimiter {
  private config: RateLimiterConfig;
  private counters: {
    minute: { count: number; resetTime: number };
    hour: { count: number; resetTime: number };
    day: { count: number; resetTime: number };
  };
  private logger: Logger;

  constructor(logger: Logger, config?: Partial<RateLimiterConfig>) {
    this.logger = logger;
    this.config = {
      enabled: true,
      adaptive: true,
      limits: {
        messagesPerMinute: 10,
        messagesPerHour: 200,
        messagesPerDay: 1500,
        newAccountMultiplier: 0.5,
        groupMessagesMultiplier: 0.7
      },
      burstAllowance: { enabled: true, maxBurst: 20, cooldown: 600000 },
      warningThresholds: { 80: 'warning', 95: 'critical' },
      ...config
    };

    const now = Date.now();
    this.counters = {
      minute: { count: 0, resetTime: now + 60000 },
      hour: { count: 0, resetTime: now + 3600000 },
      day: { count: 0, resetTime: now + 86400000 }
    };
  }

  configure(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async checkLimit(isGroup: boolean = false): Promise<boolean> {
    if (!this.config.enabled) return true;

    this.updateCounters();

    const multiplier = isGroup ? this.config.limits.groupMessagesMultiplier : 1;
    const minuteLimit = Math.floor(this.config.limits.messagesPerMinute * multiplier);
    const hourLimit = Math.floor(this.config.limits.messagesPerHour * multiplier);
    const dayLimit = Math.floor(this.config.limits.messagesPerDay * multiplier);

    const minutePercent = (this.counters.minute.count / minuteLimit) * 100;
    const hourPercent = (this.counters.hour.count / hourLimit) * 100;
    const dayPercent = (this.counters.day.count / dayLimit) * 100;

    const maxPercent = Math.max(minutePercent, hourPercent, dayPercent);

    for (const [threshold, level] of Object.entries(this.config.warningThresholds)) {
      if (maxPercent >= Number(threshold)) {
        if (level === 'critical') {
          this.logger.error('Rate limit critical', { usage: `${maxPercent.toFixed(1)}%` });
          this.config.onLimitReached?.({
            type: 'critical',
            current: this.counters.minute.count,
            limit: minuteLimit,
            resetIn: this.counters.minute.resetTime - Date.now()
          });
          return false;
        } else {
          this.logger.warning(this.logger.getMessage('rateLimitWarning'), { 
            usage: `${maxPercent.toFixed(1)}%` 
          });
        }
      }
    }

    if (this.counters.minute.count >= minuteLimit) {
      const waitTime = this.counters.minute.resetTime - Date.now();
      this.logger.warning('Minute limit reached, waiting...', { waitTime: `${waitTime}ms` });
      await this.sleep(waitTime);
      return true;
    }

    this.counters.minute.count++;
    this.counters.hour.count++;
    this.counters.day.count++;

    return true;
  }

  private updateCounters(): void {
    const now = Date.now();

    if (now >= this.counters.minute.resetTime) {
      this.counters.minute = { count: 0, resetTime: now + 60000 };
    }
    if (now >= this.counters.hour.resetTime) {
      this.counters.hour = { count: 0, resetTime: now + 3600000 };
    }
    if (now >= this.counters.day.resetTime) {
      this.counters.day = { count: 0, resetTime: now + 86400000 };
    }
  }

  getStatus(): RateLimitInfo {
    this.updateCounters();
    return {
      type: 'minute',
      current: this.counters.minute.count,
      limit: this.config.limits.messagesPerMinute,
      resetIn: this.counters.minute.resetTime - Date.now()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
