import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { LogConfig, LogLevel } from '../types';

const LOG_ICONS: Record<LogLevel, string> = {
  SUCCESS: '✓',
  INFO: 'ℹ',
  WARNING: '⚠',
  ERROR: '✗',
  DEBUG: '⚙',
  SYSTEM: '⚙'
};

const LOG_COLORS: Record<LogLevel, typeof chalk.green> = {
  SUCCESS: chalk.green,
  INFO: chalk.blue,
  WARNING: chalk.yellow,
  ERROR: chalk.red,
  DEBUG: chalk.magenta,
  SYSTEM: chalk.white
};

const LOG_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  SUCCESS: 1,
  SYSTEM: 1
};

const MESSAGES = {
  tl: {
    loginStart: 'Nagsisimula ang login process...',
    loginSuccess: 'Matagumpay na nag-login!',
    loginFailed: 'Hindi matagumpay ang login',
    messageReceived: 'Natanggap ang mensahe',
    messageSent: 'Naipadala ang mensahe!',
    messageSending: 'Nagpapadala ng mensahe...',
    cookieRefresh: 'Auto-refreshing cookies...',
    cookieRefreshed: 'Cookies refreshed successfully!',
    rateLimitWarning: 'Rate limit approaching',
    sessionActive: 'Active',
    delivered: 'Delivered',
    listenerStarted: 'Nagsimula ang message listener...',
    readingAppstate: 'Binabasa ang appstate file...',
    retrying: 'Retrying automatically...'
  },
  en: {
    loginStart: 'Starting login process...',
    loginSuccess: 'Login successful!',
    loginFailed: 'Login failed',
    messageReceived: 'Message received',
    messageSent: 'Message sent!',
    messageSending: 'Sending message...',
    cookieRefresh: 'Auto-refreshing cookies...',
    cookieRefreshed: 'Cookies refreshed successfully!',
    rateLimitWarning: 'Rate limit approaching',
    sessionActive: 'Active',
    delivered: 'Delivered',
    listenerStarted: 'Message listener started...',
    readingAppstate: 'Reading appstate file...',
    retrying: 'Retrying automatically...'
  }
};

export class Logger {
  private config: LogConfig;
  private logBuffer: string[] = [];
  private startTime: number;
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private apiCalls: number = 0;
  private errors: number = 0;

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      level: 'INFO',
      colorize: true,
      timestamp: true,
      saveToFile: false,
      logDirectory: './logs',
      maxFileSize: '10MB',
      maxFiles: 7,
      format: 'detailed',
      showPerformance: true,
      showMemory: false,
      language: 'tl',
      ...config
    };
    this.startTime = Date.now();
  }

  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatMessage(level: LogLevel, message: string, details?: Record<string, any>): string {
    const timestamp = this.config.timestamp ? `[${this.getTimestamp()}]` : '';
    const icon = LOG_ICONS[level];
    const colorFn = this.config.colorize ? LOG_COLORS[level] : (s: string) => s;
    const levelStr = level.padEnd(7);

    let output = '';
    
    if (this.config.format === 'json') {
      output = JSON.stringify({
        timestamp: this.getTimestamp(),
        level,
        message,
        details
      });
    } else if (this.config.format === 'simple') {
      output = `${timestamp} ${icon} ${levelStr} │ ${message}`;
    } else {
      output = `${timestamp} ${colorFn(`${icon} ${levelStr}`)} │ ${message}`;
      
      if (details && Object.keys(details).length > 0) {
        for (const [key, value] of Object.entries(details)) {
          output += `\n${''.padEnd(22)}│ ${key}: ${JSON.stringify(value)}`;
        }
      }
    }

    return output;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_PRIORITY[level] >= LOG_PRIORITY[this.config.level];
  }

  private writeToFile(message: string): void {
    if (!this.config.saveToFile) return;

    try {
      if (!fs.existsSync(this.config.logDirectory)) {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      }

      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.config.logDirectory, `liwanag-${date}.log`);
      const plainMessage = message.replace(/\x1b\[[0-9;]*m/g, '') + '\n';
      
      fs.appendFileSync(logFile, plainMessage);
    } catch (err) {
    }
  }

  log(level: LogLevel, message: string, details?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, details);
    console.log(formattedMessage);
    this.logBuffer.push(formattedMessage);
    this.writeToFile(formattedMessage);

    if (level === 'ERROR') this.errors++;
  }

  success(message: string, details?: Record<string, any>): void {
    this.log('SUCCESS', message, details);
  }

  info(message: string, details?: Record<string, any>): void {
    this.log('INFO', message, details);
  }

  warning(message: string, details?: Record<string, any>): void {
    this.log('WARNING', message, details);
  }

  error(message: string, details?: Record<string, any>): void {
    this.log('ERROR', message, details);
  }

  debug(message: string, details?: Record<string, any>): void {
    this.log('DEBUG', message, details);
  }

  system(message: string, details?: Record<string, any>): void {
    this.log('SYSTEM', message, details);
  }

  getMessage(key: keyof typeof MESSAGES['tl']): string {
    return MESSAGES[this.config.language][key];
  }

  incrementMessagesSent(): void {
    this.messagesSent++;
  }

  incrementMessagesReceived(): void {
    this.messagesReceived++;
  }

  incrementApiCalls(): void {
    this.apiCalls++;
  }

  printBanner(version: string): void {
    const nodeVersion = process.version;
    const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.yellow('🌟 LIWANAG FCA')} - Filipino Facebook API Library               ${chalk.cyan('║')}
${chalk.cyan('║')}  Version ${version} | Node.js ${nodeVersion}                              ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}
`;
    console.log(banner);
  }

  printStats(): void {
    const runtime = this.formatDuration(Date.now() - this.startTime);
    const failureRate = this.apiCalls > 0 ? ((this.errors / this.apiCalls) * 100).toFixed(2) : '0.00';
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const stats = `
${chalk.cyan('╭───────────────── SESSION STATISTICS ─────────────────╮')}
${chalk.cyan('│')} Runtime: ${runtime.padEnd(44)}${chalk.cyan('│')}
${chalk.cyan('│')} Messages Sent: ${this.messagesSent.toLocaleString().padEnd(38)}${chalk.cyan('│')}
${chalk.cyan('│')} Messages Received: ${this.messagesReceived.toLocaleString().padEnd(34)}${chalk.cyan('│')}
${chalk.cyan('│')} API Calls: ${this.apiCalls.toLocaleString().padEnd(42)}${chalk.cyan('│')}
${chalk.cyan('│')} Errors: ${this.errors} (${failureRate}% failure rate)${' '.repeat(Math.max(0, 32 - failureRate.length))}${chalk.cyan('│')}
${chalk.cyan('│')} Memory Usage: ${memoryUsage} MB${' '.repeat(Math.max(0, 38 - memoryUsage.length))}${chalk.cyan('│')}
${chalk.cyan('╰───────────────────────────────────────────────────────╯')}
`;
    console.log(stats);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }
}

export const defaultLogger = new Logger();
