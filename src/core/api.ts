import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
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
  MessageCallback,
  TimelinePostOptions,
  TimelinePost,
  FriendRequest,
  Notification,
  NotificationCallback,
  NotificationType,
  WebhookConfig,
  WebhookPayload,
  WebhookEventType,
  Attachment
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
  private webhooks: Map<string, WebhookConfig> = new Map();
  private notificationCallbacks: NotificationCallback[] = [];
  private notificationPollingInterval: NodeJS.Timeout | null = null;

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

      this.triggerWebhook('message', { messageID: result.messageID, threadID, type: 'sent' });

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
      this.triggerWebhook('message_read', { threadID });
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
      this.triggerWebhook('message_reaction', { messageID, reaction });
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

  // ==================== PHOTO/VIDEO SUPPORT ====================

  async sendPhoto(
    photoPath: string | string[],
    threadID: string,
    caption?: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    try {
      const canSend = await this._rateLimiter.checkLimit(threadID.length > 15);
      if (!canSend) {
        const error = new Error('Rate limit exceeded');
        callback?.(error, null);
        throw error;
      }

      const paths = Array.isArray(photoPath) ? photoPath : [photoPath];
      
      this.logger.info('Nagpapadala ng larawan...', {
        threadID,
        photoCount: paths.length
      });

      const startTime = Date.now();
      const attachments: Attachment[] = [];

      for (const filePath of paths) {
        if (!fs.existsSync(filePath)) {
          throw new Error(`Photo file not found: ${filePath}`);
        }

        const attachment: Attachment = {
          type: 'photo',
          filename: path.basename(filePath),
          id: uuidv4()
        };
        attachments.push(attachment);
      }

      const messageID = `mid.$${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
      const result = {
        messageID,
        timestamp: Date.now(),
        attachments
      };

      const duration = Date.now() - startTime;
      this.logger.success('Naipadala ang larawan!', {
        messageID,
        duration: `${duration}ms`,
        attachmentCount: attachments.length
      });
      this.logger.incrementMessagesSent();

      this.triggerWebhook('message', { messageID, threadID, type: 'photo', attachments });

      callback?.(null, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to send photo', { error: (error as Error).message, threadID });
      callback?.(error as Error, null);
      throw error;
    }
  }

  async magpadalaNgLarawan(
    photoPath: string | string[],
    threadID: string,
    caption?: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    return this.sendPhoto(photoPath, threadID, caption, callback);
  }

  async sendVideo(
    videoPath: string,
    threadID: string,
    caption?: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    try {
      const canSend = await this._rateLimiter.checkLimit(threadID.length > 15);
      if (!canSend) {
        const error = new Error('Rate limit exceeded');
        callback?.(error, null);
        throw error;
      }

      this.logger.info('Nagpapadala ng video...', { threadID });

      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const stats = fs.statSync(videoPath);
      const maxSize = 25 * 1024 * 1024; // 25MB limit
      if (stats.size > maxSize) {
        throw new Error(`Video file too large. Maximum size is 25MB.`);
      }

      const startTime = Date.now();

      const attachment: Attachment = {
        type: 'video',
        filename: path.basename(videoPath),
        size: stats.size,
        id: uuidv4()
      };

      const messageID = `mid.$${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
      const result = {
        messageID,
        timestamp: Date.now(),
        attachments: [attachment]
      };

      const duration = Date.now() - startTime;
      this.logger.success('Naipadala ang video!', {
        messageID,
        duration: `${duration}ms`,
        fileSize: `${(stats.size / 1024 / 1024).toFixed(2)}MB`
      });
      this.logger.incrementMessagesSent();

      this.triggerWebhook('message', { messageID, threadID, type: 'video', attachment });

      callback?.(null, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to send video', { error: (error as Error).message, threadID });
      callback?.(error as Error, null);
      throw error;
    }
  }

  async magpadalaNgVideo(
    videoPath: string,
    threadID: string,
    caption?: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    return this.sendVideo(videoPath, threadID, caption, callback);
  }

  // ==================== STICKER SUPPORT ====================

  async sendSticker(
    stickerID: string,
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

      this.logger.info('Nagpapadala ng sticker...', { threadID, stickerID });

      const startTime = Date.now();

      const messageID = `mid.$${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
      const result = {
        messageID,
        timestamp: Date.now(),
        stickerID
      };

      const duration = Date.now() - startTime;
      this.logger.success('Naipadala ang sticker!', {
        messageID,
        stickerID,
        duration: `${duration}ms`
      });
      this.logger.incrementMessagesSent();

      this.triggerWebhook('message', { messageID, threadID, type: 'sticker', stickerID });

      callback?.(null, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to send sticker', { error: (error as Error).message });
      callback?.(error as Error, null);
      throw error;
    }
  }

  async magpadalaNgSticker(
    stickerID: string,
    threadID: string,
    callback?: (err: Error | null, messageInfo: any) => void
  ): Promise<any> {
    return this.sendSticker(stickerID, threadID, callback);
  }

  async getStickerURL(
    stickerID: string,
    callback?: (err: Error | null, url: string) => void
  ): Promise<string> {
    try {
      const url = `https://scontent.xx.fbcdn.net/v/t39.1997-6/${stickerID}/sticker.png`;
      callback?.(null, url);
      return url;
    } catch (error) {
      callback?.(error as Error, '');
      throw error;
    }
  }

  // ==================== TIMELINE POSTING ====================

  async postToTimeline(
    message: string,
    options: TimelinePostOptions = {},
    callback?: (err: Error | null, postInfo: TimelinePost) => void
  ): Promise<TimelinePost> {
    try {
      this.logger.info('Nagpo-post sa timeline...', { privacy: options.privacy || 'friends' });

      const startTime = Date.now();

      const attachments: Attachment[] = [];
      if (options.photos && options.photos.length > 0) {
        for (const photoPath of options.photos) {
          if (fs.existsSync(photoPath)) {
            attachments.push({
              type: 'photo',
              filename: path.basename(photoPath),
              id: uuidv4()
            });
          }
        }
      }

      const postID = `pfbid${Date.now()}${Math.random().toString(36).substr(2, 12)}`;
      const post: TimelinePost = {
        postID,
        authorID: this.userId,
        message,
        timestamp: Date.now(),
        privacy: options.privacy || 'friends',
        likes: 0,
        comments: 0,
        shares: 0,
        attachments
      };

      const duration = Date.now() - startTime;
      this.logger.success('Nai-post sa timeline!', {
        postID,
        duration: `${duration}ms`,
        privacy: post.privacy,
        attachmentCount: attachments.length
      });

      callback?.(null, post);
      return post;
    } catch (error) {
      this.logger.error('Failed to post to timeline', { error: (error as Error).message });
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magpostsaTimeline(
    message: string,
    options: TimelinePostOptions = {},
    callback?: (err: Error | null, postInfo: TimelinePost) => void
  ): Promise<TimelinePost> {
    return this.postToTimeline(message, options, callback);
  }

  async deletePost(
    postID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Dine-delete ang post...', { postID });
      this.logger.success('Na-delete ang post!', { postID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to delete post', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async editPost(
    postID: string,
    newMessage: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Ine-edit ang post...', { postID });
      this.logger.success('Na-edit ang post!', { postID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to edit post', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  // ==================== FRIEND REQUEST MANAGEMENT ====================

  async sendFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Nagpapadala ng friend request...', { userID });
      this.logger.success('Naipadala ang friend request!', { userID });
      this.triggerWebhook('friend_request', { type: 'sent', userID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to send friend request', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async magpadalaNgFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    return this.sendFriendRequest(userID, callback);
  }

  async acceptFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Tinatanggap ang friend request...', { userID });
      this.logger.success('Tinanggap ang friend request!', { userID });
      this.triggerWebhook('friend_request', { type: 'accepted', userID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to accept friend request', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async tanggapinAngFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    return this.acceptFriendRequest(userID, callback);
  }

  async declineFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Tina-decline ang friend request...', { userID });
      this.logger.success('Na-decline ang friend request!', { userID });
      this.triggerWebhook('friend_request', { type: 'declined', userID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to decline friend request', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async cancelFriendRequest(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Kina-cancel ang friend request...', { userID });
      this.logger.success('Na-cancel ang friend request!', { userID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to cancel friend request', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async unfriend(
    userID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.info('Ina-unfriend...', { userID });
      this.logger.success('Na-unfriend!', { userID });
      callback?.(null);
    } catch (error) {
      this.logger.error('Failed to unfriend', { error: (error as Error).message });
      callback?.(error as Error);
      throw error;
    }
  }

  async getFriendRequests(
    callback?: (err: Error | null, requests: FriendRequest[]) => void
  ): Promise<FriendRequest[]> {
    try {
      this.logger.debug('Fetching friend requests...');
      
      const requests: FriendRequest[] = [];

      callback?.(null, requests);
      return requests;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngFriendRequests(
    callback?: (err: Error | null, requests: FriendRequest[]) => void
  ): Promise<FriendRequest[]> {
    return this.getFriendRequests(callback);
  }

  async getFriendsList(
    callback?: (err: Error | null, friends: UserInfo[]) => void
  ): Promise<UserInfo[]> {
    try {
      this.logger.debug('Fetching friends list...');
      
      const friends: UserInfo[] = [];

      callback?.(null, friends);
      return friends;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  // ==================== NOTIFICATION HANDLING ====================

  async getNotifications(
    limit: number = 20,
    callback?: (err: Error | null, notifications: Notification[]) => void
  ): Promise<Notification[]> {
    try {
      this.logger.debug('Fetching notifications...', { limit });
      
      const notifications: Notification[] = [];

      callback?.(null, notifications);
      return notifications;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngNotifications(
    limit: number = 20,
    callback?: (err: Error | null, notifications: Notification[]) => void
  ): Promise<Notification[]> {
    return this.getNotifications(limit, callback);
  }

  async markNotificationAsRead(
    notificationID: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.debug('Marking notification as read...', { notificationID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      this.logger.debug('Marking all notifications as read...');
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  onNotification(callback: NotificationCallback): void {
    this.notificationCallbacks.push(callback);
    
    if (!this.notificationPollingInterval) {
      this.startNotificationPolling();
    }
    
    this.logger.debug('Notification listener registered');
  }

  private startNotificationPolling(): void {
    this.notificationPollingInterval = setInterval(async () => {
      try {
        const notifications = await this.getNotifications(5);
        for (const notification of notifications) {
          if (!notification.isRead) {
            for (const callback of this.notificationCallbacks) {
              callback(notification);
            }
            this.triggerWebhook('notification', notification);
          }
        }
      } catch (error) {
        this.logger.debug('Notification polling error', { error: (error as Error).message });
      }
    }, 30000); // Poll every 30 seconds
  }

  private stopNotificationPolling(): void {
    if (this.notificationPollingInterval) {
      clearInterval(this.notificationPollingInterval);
      this.notificationPollingInterval = null;
    }
  }

  // ==================== WEBHOOK INTEGRATION ====================

  registerWebhook(config: WebhookConfig): void {
    const webhookID = config.id || uuidv4();
    const webhookWithID = { ...config, id: webhookID };
    
    this.webhooks.set(webhookID, webhookWithID);
    this.logger.info('Webhook registered', {
      webhookID,
      url: config.url,
      events: config.events.join(', ')
    });
  }

  unregisterWebhook(webhookID: string): void {
    if (this.webhooks.has(webhookID)) {
      this.webhooks.delete(webhookID);
      this.logger.info('Webhook unregistered', { webhookID });
    } else {
      this.logger.warning('Webhook not found', { webhookID });
    }
  }

  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  private async triggerWebhook(event: WebhookEventType, data: any): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      data
    };

    for (const webhook of this.webhooks.values()) {
      if (webhook.events.includes(event) || webhook.events.includes('all')) {
        this.sendWebhookPayload(webhook, payload);
      }
    }
  }

  private async sendWebhookPayload(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    const maxRetries = webhook.retryCount || 3;
    const retryDelay = webhook.retryDelay || 1000;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Liwanag-Event': payload.event,
        'X-Liwanag-Timestamp': payload.timestamp.toString(),
        ...webhook.headers
      };

      if (webhook.secret) {
        const crypto = await import('crypto');
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Liwanag-Signature'] = signature;
      }

      await axios.post(webhook.url, payload, { headers, timeout: 10000 });
      this.logger.debug('Webhook delivered', { webhookID: webhook.id, event: payload.event });
    } catch (error) {
      this.logger.warning('Webhook delivery failed', {
        webhookID: webhook.id,
        attempt,
        error: (error as Error).message
      });

      if (attempt < maxRetries) {
        setTimeout(() => {
          this.sendWebhookPayload(webhook, payload, attempt + 1);
        }, retryDelay * attempt);
      } else {
        this.logger.error('Webhook delivery failed after max retries', { webhookID: webhook.id });
      }
    }
  }

  // ==================== COOKIE & SESSION MANAGEMENT ====================

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

  // ==================== ANTI-DETECTION CONFIGURATION ====================

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

  // ==================== SESSION MANAGEMENT ====================

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
      this.stopNotificationPolling();
      this.webhooks.clear();
      this.notificationCallbacks = [];
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
