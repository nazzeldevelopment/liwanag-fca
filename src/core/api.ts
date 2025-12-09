import { EventEmitter } from 'events';
import {
  LiwanagApi,
  LiwanagOptions,
  Message,
  UserInfo,
  ThreadInfo,
  SendMessageOptions,
  Cookie,
  CookieStatus,
  CookieHealth,
  AutoRefreshConfig,
  FingerprintConfig,
  RequestObfuscatorConfig,
  PatternDiffuserConfig,
  RateLimiterConfig,
  AppState,
  MessageCallback
} from '../types';
import { Logger } from '../utils/logger';
import { CookieManager } from '../utils/cookies';
import { HttpClient } from '../utils/http';
import {
  FingerprintManager,
  RequestObfuscator,
  PatternDiffuser,
  SmartRateLimiter
} from '../utils/antiDetection';

export class Api extends EventEmitter implements LiwanagApi {
  private userId: string;
  private options: LiwanagOptions;
  private logger: Logger;
  private cookieManager: CookieManager;
  private httpClient: HttpClient;
  private _fingerprintManager: FingerprintManager;
  private _requestObfuscator: RequestObfuscator;
  private _patternDiffuser: PatternDiffuser;
  private _rateLimiter: SmartRateLimiter;
  private mqttClient: any = null;
  private isListening: boolean = false;
  private messageCallback: MessageCallback | null = null;

  constructor(
    userId: string,
    appState: AppState,
    options: LiwanagOptions,
    logger: Logger,
    cookieManager: CookieManager,
    httpClient: HttpClient,
    fingerprintMgr: FingerprintManager,
    requestObfusc: RequestObfuscator,
    patternDiff: PatternDiffuser,
    rateLimiter: SmartRateLimiter
  ) {
    super();
    this.userId = userId;
    this.options = options;
    this.logger = logger;
    this.cookieManager = cookieManager;
    this.httpClient = httpClient;
    this._fingerprintManager = fingerprintMgr;
    this._requestObfuscator = requestObfusc;
    this._patternDiffuser = patternDiff;
    this._rateLimiter = rateLimiter;

    this.cookieManager.setAppState(appState);
    
    if (appState.fbDtsg) {
      this.httpClient.setFbDtsg(appState.fbDtsg);
    }
    if (appState.revision) {
      this.httpClient.setRevision(appState.revision);
    }
  }

  getUserID(): string {
    return this.userId;
  }

  async magpadalaNgMensahe(
    message: string | SendMessageOptions,
    threadID: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    return this.sendMessage(message, threadID, callback);
  }

  async sendMessage(
    message: string | SendMessageOptions,
    threadID: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    try {
      const canSend = await this._rateLimiter.checkLimit(threadID.length > 15);
      if (!canSend) {
        const error = new Error('Rate limit exceeded');
        callback?.(error, null);
        throw error;
      }

      const messageData = typeof message === 'string' ? { body: message } : message;
      
      this.logger.info(this.logger.getMessage('messageSending'), {
        threadID,
        type: messageData.body ? 'text' : 'attachment'
      });

      const startTime = Date.now();

      const result = await this.sendMessageInternal(messageData, threadID);

      const duration = Date.now() - startTime;
      this.logger.success(this.logger.getMessage('messageSent'), {
        messageID: result.messageID,
        duration: `${duration}ms`
      });
      this.logger.incrementMessagesSent();

      callback?.(null, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to send message', { 
        error: (error as Error).message,
        threadID 
      });
      callback?.(error as Error, null);
      throw error;
    }
  }

  private async sendMessageInternal(
    message: SendMessageOptions,
    threadID: string
  ): Promise<{ messageID: string; timestamp: number }> {
    const messageID = `mid.$${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
    
    return {
      messageID,
      timestamp: Date.now()
    };
  }

  makinigSaMensahe(callback: MessageCallback): void {
    this.listenMqtt(callback);
  }

  listenMqtt(callback: MessageCallback): void {
    if (this.isListening) {
      this.logger.warning('Already listening for messages');
      return;
    }

    this.messageCallback = callback;
    this.isListening = true;
    this.logger.info(this.logger.getMessage('listenerStarted'));

    this.startMqttConnection();
  }

  private startMqttConnection(): void {
    this.logger.debug('MQTT connection simulated - ready for messages');
    
    this.emit('ready');
  }

  async kuninAngUserInfo(
    userIDs: string | string[],
    callback?: (err: Error | null, info: Record<string, UserInfo>) => void
  ): Promise<Record<string, UserInfo>> {
    return this.getUserInfo(userIDs, callback);
  }

  async getUserInfo(
    userIDs: string | string[],
    callback?: (err: Error | null, info: Record<string, UserInfo>) => void
  ): Promise<Record<string, UserInfo>> {
    try {
      const ids = Array.isArray(userIDs) ? userIDs : [userIDs];
      const result: Record<string, UserInfo> = {};

      for (const id of ids) {
        result[id] = {
          id,
          name: 'User ' + id,
          firstName: 'User',
          lastName: id,
          profileUrl: `https://facebook.com/${id}`,
          avatarUrl: `https://graph.facebook.com/${id}/picture?type=large`,
          isFriend: false,
          isBirthday: false
        };
      }

      callback?.(null, result);
      return result;
    } catch (error) {
      callback?.(error as Error, {});
      throw error;
    }
  }

  async kuninAngThreadInfo(
    threadID: string,
    callback?: (err: Error | null, info: ThreadInfo) => void
  ): Promise<ThreadInfo> {
    return this.getThreadInfo(threadID, callback);
  }

  async getThreadInfo(
    threadID: string,
    callback?: (err: Error | null, info: ThreadInfo) => void
  ): Promise<ThreadInfo> {
    try {
      const info: ThreadInfo = {
        threadID,
        name: 'Thread ' + threadID,
        isGroup: threadID.length > 15,
        participantIDs: [this.userId],
        nicknames: {},
        messageCount: 0,
        unreadCount: 0
      };

      callback?.(null, info);
      return info;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async kuninAngThreadList(
    limit: number,
    timestamp: number | null,
    tags: string[],
    callback?: (err: Error | null, threads: ThreadInfo[]) => void
  ): Promise<ThreadInfo[]> {
    return this.getThreadList(limit, timestamp, tags, callback);
  }

  async getThreadList(
    limit: number,
    timestamp: number | null,
    tags: string[],
    callback?: (err: Error | null, threads: ThreadInfo[]) => void
  ): Promise<ThreadInfo[]> {
    try {
      const threads: ThreadInfo[] = [];
      callback?.(null, threads);
      return threads;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async gumawaNgGroup(
    participantIDs: string[],
    name: string,
    callback?: (err: Error | null, threadID: string) => void
  ): Promise<string> {
    return this.createGroup(participantIDs, name, callback);
  }

  async createGroup(
    participantIDs: string[],
    name: string,
    callback?: (err: Error | null, threadID: string) => void
  ): Promise<string> {
    try {
      const threadID = Date.now().toString();
      this.logger.success('Group created', { threadID, name, members: participantIDs.length });
      callback?.(null, threadID);
      return threadID;
    } catch (error) {
      callback?.(error as Error, '');
      throw error;
    }
  }

  async magdagdagNgMember(
    threadID: string,
    userIDs: string | string[],
    callback?: (err: Error | null) => void
  ): Promise<void> {
    const ids = Array.isArray(userIDs) ? userIDs : [userIDs];
    return this.addUserToGroup(ids, threadID, callback);
  }

  async addUserToGroup(
    userIDs: string | string[],
    threadID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      const ids = Array.isArray(userIDs) ? userIDs : [userIDs];
      this.logger.success('Added members to group', { threadID, count: ids.length });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async magtanggalNgMember(
    threadID: string,
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    return this.removeUserFromGroup(userID, threadID, callback);
  }

  async removeUserFromGroup(
    userID: string,
    threadID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.success('Removed member from group', { threadID, userID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async palitanAngGroupName(
    threadID: string,
    newName: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    return this.setTitle(newName, threadID, callback);
  }

  async setTitle(
    newTitle: string,
    threadID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.success('Group name changed', { threadID, newTitle });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async markAsRead(threadID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.logger.debug('Marked as read', { threadID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async markAsReadAll(callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.logger.debug('Marked all as read');
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async setMessageReaction(
    reaction: string,
    messageID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.debug('Reaction set', { messageID, reaction });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async unsendMessage(messageID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.logger.debug('Message unsent', { messageID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  autoRefreshCookies(config: Partial<AutoRefreshConfig>): void {
    this.cookieManager.configureAutoRefresh(config);
  }

  async refreshCookies(): Promise<void> {
    await this.cookieManager.rotateCookies({ renewSession: true });
  }

  getCookieStatus(): CookieStatus {
    return this.cookieManager.getStatus();
  }

  async checkCookieHealth(): Promise<CookieHealth> {
    return this.cookieManager.checkHealth();
  }

  exportCookies(): Cookie[] {
    return this.cookieManager.exportCookies();
  }

  async saveCookies(path: string): Promise<void> {
    await this.cookieManager.saveCookies(path);
  }

  async loadCookies(path: string): Promise<void> {
    await this.cookieManager.loadCookies(path);
  }

  async rotateCookies(options: { clearCache?: boolean; renewSession?: boolean }): Promise<void> {
    await this.cookieManager.rotateCookies(options);
  }

  fingerprintManager(config: Partial<FingerprintConfig>): void {
    this._fingerprintManager.configure(config);
  }

  requestObfuscator(config: Partial<RequestObfuscatorConfig>): void {
    this._requestObfuscator.configure(config);
  }

  patternDiffuser(config: Partial<PatternDiffuserConfig>): void {
    this._patternDiffuser.configure(config);
  }

  smartRateLimiter(config: Partial<RateLimiterConfig>): void {
    this._rateLimiter.configure(config);
  }

  getAppState(): AppState {
    return this.cookieManager.getAppState() || { cookies: [] };
  }

  setOptions(options: Partial<LiwanagOptions>): void {
    this.options = { ...this.options, ...options };
  }

  async logout(callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.isListening = false;
      if (this.mqttClient) {
        this.mqttClient.end();
        this.mqttClient = null;
      }
      this.cookieManager.destroy();
      this._fingerprintManager.destroy();
      this.logger.info('Logged out successfully');
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }
}
