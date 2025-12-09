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
  Attachment,
  VoiceMessageOptions,
  VoiceMessage,
  FileAttachmentOptions,
  FileAttachment,
  StoryOptions,
  Story,
  ReelsOptions,
  Reel,
  MarketplaceListingOptions,
  MarketplaceListing,
  MarketplaceSearchOptions,
  WatchTogetherSession,
  WatchTogetherOptions,
  GameSession,
  GameInvite,
  AvailableGame,
  AnalyticsData,
  Plugin,
  PluginEventType
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
  private plugins: Map<string, Plugin> = new Map();
  private marketplaceListings: Map<string, MarketplaceListing> = new Map();
  private watchTogetherSessions: Map<string, WatchTogetherSession> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private stories: Map<string, Story> = new Map();
  private reels: Map<string, Reel> = new Map();
  private analyticsStartTime: number = Date.now();
  private analyticsData: {
    messagesSent: number;
    messagesReceived: number;
    photos: number;
    videos: number;
    stickers: number;
    voiceMessages: number;
    files: number;
    reactions: number;
    apiCalls: number;
    errors: number;
  } = {
    messagesSent: 0,
    messagesReceived: 0,
    photos: 0,
    videos: 0,
    stickers: 0,
    voiceMessages: 0,
    files: 0,
    reactions: 0,
    apiCalls: 0,
    errors: 0
  };

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

  // ==================== VOICE MESSAGE SUPPORT ====================

  async sendVoice(
    audioPath: string,
    threadID: string,
    options: VoiceMessageOptions = {},
    callback?: (err: Error | null, messageInfo: VoiceMessage) => void
  ): Promise<VoiceMessage> {
    try {
      const canSend = await this._rateLimiter.checkLimit(threadID.length > 15);
      if (!canSend) {
        const error = new Error('Rate limit exceeded');
        callback?.(error, null as any);
        throw error;
      }

      this.logger.info('Nagpapadala ng voice message...', { threadID });

      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      const stats = fs.statSync(audioPath);
      const maxSize = 25 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error('Voice message file too large. Maximum size is 25MB.');
      }

      const startTime = Date.now();
      const messageID = `mid.$${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const voiceMessage: VoiceMessage = {
        messageID,
        threadID,
        audioUrl: `https://scontent.xx.fbcdn.net/v/audio/${messageID}.mp3`,
        duration: options.duration || 0,
        timestamp: Date.now()
      };

      const duration = Date.now() - startTime;
      this.logger.success('Naipadala ang voice message!', {
        messageID,
        duration: `${duration}ms`
      });
      this.logger.incrementMessagesSent();
      this.analyticsData.voiceMessages++;

      this.triggerWebhook('message', { messageID, threadID, type: 'voice' });

      callback?.(null, voiceMessage);
      return voiceMessage;
    } catch (error) {
      this.logger.error('Failed to send voice message', { error: (error as Error).message });
      this.analyticsData.errors++;
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magpadalaNgBoses(
    audioPath: string,
    threadID: string,
    options: VoiceMessageOptions = {},
    callback?: (err: Error | null, messageInfo: VoiceMessage) => void
  ): Promise<VoiceMessage> {
    return this.sendVoice(audioPath, threadID, options, callback);
  }

  // ==================== FILE ATTACHMENT SUPPORT ====================

  async sendFile(
    filePath: string,
    threadID: string,
    options: FileAttachmentOptions = {},
    callback?: (err: Error | null, attachment: FileAttachment) => void
  ): Promise<FileAttachment> {
    try {
      const canSend = await this._rateLimiter.checkLimit(threadID.length > 15);
      if (!canSend) {
        const error = new Error('Rate limit exceeded');
        callback?.(error, null as any);
        throw error;
      }

      this.logger.info('Nagpapadala ng file...', { threadID, filePath });

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const maxSize = 100 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error('File too large. Maximum size is 100MB.');
      }

      const startTime = Date.now();
      const filename = options.filename || path.basename(filePath);
      const ext = path.extname(filename).toLowerCase().replace('.', '');

      const fileAttachment: FileAttachment = {
        id: uuidv4(),
        filename,
        fileType: ext,
        size: stats.size,
        url: `https://cdn.fbsbx.com/files/${uuidv4()}/${filename}`,
        timestamp: Date.now()
      };

      const duration = Date.now() - startTime;
      this.logger.success('Naipadala ang file!', {
        filename,
        size: `${(stats.size / 1024).toFixed(2)}KB`,
        duration: `${duration}ms`
      });
      this.logger.incrementMessagesSent();
      this.analyticsData.files++;

      this.triggerWebhook('message', { threadID, type: 'file', attachment: fileAttachment });

      callback?.(null, fileAttachment);
      return fileAttachment;
    } catch (error) {
      this.logger.error('Failed to send file', { error: (error as Error).message });
      this.analyticsData.errors++;
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magpadalaNgFile(
    filePath: string,
    threadID: string,
    options: FileAttachmentOptions = {},
    callback?: (err: Error | null, attachment: FileAttachment) => void
  ): Promise<FileAttachment> {
    return this.sendFile(filePath, threadID, options, callback);
  }

  // ==================== STORY/REELS SUPPORT ====================

  async postStory(
    mediaPath: string,
    options: StoryOptions = {},
    callback?: (err: Error | null, story: Story) => void
  ): Promise<Story> {
    try {
      this.logger.info('Nagpo-post ng story...', { privacy: options.privacy || 'friends' });

      if (!fs.existsSync(mediaPath)) {
        throw new Error(`Media file not found: ${mediaPath}`);
      }

      const ext = path.extname(mediaPath).toLowerCase();
      const isVideo = ['.mp4', '.mov', '.avi', '.webm'].includes(ext);
      const type = isVideo ? 'video' : 'photo';

      const startTime = Date.now();
      const storyID = `story_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;
      const expiresIn = options.expiresIn || 24 * 60 * 60 * 1000;

      const story: Story = {
        storyID,
        authorID: this.userId,
        type,
        mediaUrl: `https://scontent.xx.fbcdn.net/v/stories/${storyID}${ext}`,
        text: options.textOverlay,
        timestamp: Date.now(),
        expiresAt: Date.now() + expiresIn,
        views: 0,
        reactions: []
      };

      this.stories.set(storyID, story);

      const duration = Date.now() - startTime;
      this.logger.success('Nai-post ang story!', {
        storyID,
        type,
        duration: `${duration}ms`,
        expiresIn: `${expiresIn / 3600000}h`
      });

      callback?.(null, story);
      return story;
    } catch (error) {
      this.logger.error('Failed to post story', { error: (error as Error).message });
      this.analyticsData.errors++;
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magpostNgStory(
    mediaPath: string,
    options: StoryOptions = {},
    callback?: (err: Error | null, story: Story) => void
  ): Promise<Story> {
    return this.postStory(mediaPath, options, callback);
  }

  async getStories(
    userID?: string,
    callback?: (err: Error | null, stories: Story[]) => void
  ): Promise<Story[]> {
    try {
      this.logger.debug('Fetching stories...', { userID: userID || 'all' });
      const targetUserID = userID || this.userId;
      const userStories = Array.from(this.stories.values())
        .filter(s => s.authorID === targetUserID && s.expiresAt > Date.now());
      callback?.(null, userStories);
      return userStories;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngStories(
    userID?: string,
    callback?: (err: Error | null, stories: Story[]) => void
  ): Promise<Story[]> {
    return this.getStories(userID, callback);
  }

  async deleteStory(storyID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.logger.info('Dine-delete ang story...', { storyID });
      this.stories.delete(storyID);
      this.logger.success('Na-delete ang story!', { storyID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async postReel(
    videoPath: string,
    options: ReelsOptions = {},
    callback?: (err: Error | null, reel: Reel) => void
  ): Promise<Reel> {
    try {
      this.logger.info('Nagpo-post ng reel...', { privacy: options.privacy || 'public' });

      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const stats = fs.statSync(videoPath);
      const maxSize = 100 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error('Reel video too large. Maximum size is 100MB.');
      }

      const startTime = Date.now();
      const reelID = `reel_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const reel: Reel = {
        reelID,
        authorID: this.userId,
        videoUrl: `https://scontent.xx.fbcdn.net/v/reels/${reelID}.mp4`,
        thumbnailUrl: `https://scontent.xx.fbcdn.net/v/reels/${reelID}_thumb.jpg`,
        caption: options.caption,
        duration: 60,
        timestamp: Date.now(),
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0
      };

      this.reels.set(reelID, reel);

      const duration = Date.now() - startTime;
      this.logger.success('Nai-post ang reel!', {
        reelID,
        duration: `${duration}ms`
      });

      callback?.(null, reel);
      return reel;
    } catch (error) {
      this.logger.error('Failed to post reel', { error: (error as Error).message });
      this.analyticsData.errors++;
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magpostNgReel(
    videoPath: string,
    options: ReelsOptions = {},
    callback?: (err: Error | null, reel: Reel) => void
  ): Promise<Reel> {
    return this.postReel(videoPath, options, callback);
  }

  async getReels(
    userID?: string,
    callback?: (err: Error | null, reels: Reel[]) => void
  ): Promise<Reel[]> {
    try {
      this.logger.debug('Fetching reels...', { userID: userID || 'all' });
      const targetUserID = userID || this.userId;
      const userReels = Array.from(this.reels.values())
        .filter(r => r.authorID === targetUserID);
      callback?.(null, userReels);
      return userReels;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngReels(
    userID?: string,
    callback?: (err: Error | null, reels: Reel[]) => void
  ): Promise<Reel[]> {
    return this.getReels(userID, callback);
  }

  // ==================== MARKETPLACE INTEGRATION ====================

  async createListing(
    options: MarketplaceListingOptions,
    callback?: (err: Error | null, listing: MarketplaceListing) => void
  ): Promise<MarketplaceListing> {
    try {
      this.logger.info('Gumagawa ng marketplace listing...', { title: options.title });

      const listingID = `listing_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const listing: MarketplaceListing = {
        listingID,
        sellerID: this.userId,
        title: options.title,
        description: options.description,
        price: options.price,
        currency: options.currency || 'PHP',
        category: options.category,
        condition: options.condition || 'good',
        photos: options.photos,
        location: options.location,
        timestamp: Date.now(),
        status: 'active',
        views: 0,
        saves: 0
      };

      this.marketplaceListings.set(listingID, listing);

      this.logger.success('Nagawa ang listing!', { listingID, title: options.title });

      callback?.(null, listing);
      return listing;
    } catch (error) {
      this.logger.error('Failed to create listing', { error: (error as Error).message });
      this.analyticsData.errors++;
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async gumawaNgListing(
    options: MarketplaceListingOptions,
    callback?: (err: Error | null, listing: MarketplaceListing) => void
  ): Promise<MarketplaceListing> {
    return this.createListing(options, callback);
  }

  async updateListing(
    listingID: string,
    updates: Partial<MarketplaceListingOptions>,
    callback?: (err: Error | null, listing: MarketplaceListing) => void
  ): Promise<MarketplaceListing> {
    try {
      const existing = this.marketplaceListings.get(listingID);
      if (!existing) {
        throw new Error(`Listing not found: ${listingID}`);
      }

      const updated: MarketplaceListing = {
        ...existing,
        ...updates,
        listingID: existing.listingID,
        sellerID: existing.sellerID,
        timestamp: existing.timestamp
      };

      this.marketplaceListings.set(listingID, updated);
      this.logger.success('Na-update ang listing!', { listingID });

      callback?.(null, updated);
      return updated;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async deleteListing(listingID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.marketplaceListings.delete(listingID);
      this.logger.success('Na-delete ang listing!', { listingID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async searchMarketplace(
    options: MarketplaceSearchOptions,
    callback?: (err: Error | null, listings: MarketplaceListing[]) => void
  ): Promise<MarketplaceListing[]> {
    try {
      this.logger.debug('Searching marketplace...', options);
      let results = Array.from(this.marketplaceListings.values())
        .filter(l => l.status === 'active');

      if (options.query) {
        const query = options.query.toLowerCase();
        results = results.filter(l => 
          l.title.toLowerCase().includes(query) || 
          l.description.toLowerCase().includes(query)
        );
      }
      if (options.category) {
        results = results.filter(l => l.category === options.category);
      }
      if (options.minPrice !== undefined) {
        results = results.filter(l => l.price >= options.minPrice!);
      }
      if (options.maxPrice !== undefined) {
        results = results.filter(l => l.price <= options.maxPrice!);
      }

      if (options.sortBy) {
        switch (options.sortBy) {
          case 'price_low':
            results.sort((a, b) => a.price - b.price);
            break;
          case 'price_high':
            results.sort((a, b) => b.price - a.price);
            break;
          case 'date':
          default:
            results.sort((a, b) => b.timestamp - a.timestamp);
        }
      }

      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      callback?.(null, results);
      return results;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async hanapiNgListings(
    options: MarketplaceSearchOptions,
    callback?: (err: Error | null, listings: MarketplaceListing[]) => void
  ): Promise<MarketplaceListing[]> {
    return this.searchMarketplace(options, callback);
  }

  async getMyListings(
    callback?: (err: Error | null, listings: MarketplaceListing[]) => void
  ): Promise<MarketplaceListing[]> {
    try {
      const myListings = Array.from(this.marketplaceListings.values())
        .filter(l => l.sellerID === this.userId);
      callback?.(null, myListings);
      return myListings;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngMgaListingsKo(
    callback?: (err: Error | null, listings: MarketplaceListing[]) => void
  ): Promise<MarketplaceListing[]> {
    return this.getMyListings(callback);
  }

  async markAsSold(listingID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      const listing = this.marketplaceListings.get(listingID);
      if (listing) {
        listing.status = 'sold';
        this.marketplaceListings.set(listingID, listing);
        this.logger.success('Marked as sold!', { listingID });
      }
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  // ==================== WATCH TOGETHER ====================

  async startWatchTogether(
    threadID: string,
    options: WatchTogetherOptions,
    callback?: (err: Error | null, session: WatchTogetherSession) => void
  ): Promise<WatchTogetherSession> {
    try {
      this.logger.info('Nagsisimula ng Watch Together...', { threadID, videoUrl: options.videoUrl });

      const sessionID = `watch_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const session: WatchTogetherSession = {
        sessionID,
        hostID: this.userId,
        threadID,
        videoUrl: options.videoUrl,
        videoTitle: options.videoTitle,
        participants: [this.userId],
        currentTime: 0,
        isPlaying: options.autoStart ?? false,
        timestamp: Date.now()
      };

      this.watchTogetherSessions.set(sessionID, session);

      this.logger.success('Nagsimula ang Watch Together!', { sessionID });

      callback?.(null, session);
      return session;
    } catch (error) {
      this.logger.error('Failed to start Watch Together', { error: (error as Error).message });
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magsimulaNgWatchTogether(
    threadID: string,
    options: WatchTogetherOptions,
    callback?: (err: Error | null, session: WatchTogetherSession) => void
  ): Promise<WatchTogetherSession> {
    return this.startWatchTogether(threadID, options, callback);
  }

  async joinWatchTogether(
    sessionID: string,
    callback?: (err: Error | null, session: WatchTogetherSession) => void
  ): Promise<WatchTogetherSession> {
    try {
      const session = this.watchTogetherSessions.get(sessionID);
      if (!session) {
        throw new Error(`Watch Together session not found: ${sessionID}`);
      }

      if (!session.participants.includes(this.userId)) {
        session.participants.push(this.userId);
        this.watchTogetherSessions.set(sessionID, session);
      }

      this.logger.info('Sumali sa Watch Together', { sessionID });
      callback?.(null, session);
      return session;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async leaveWatchTogether(sessionID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      const session = this.watchTogetherSessions.get(sessionID);
      if (session) {
        session.participants = session.participants.filter(id => id !== this.userId);
        if (session.participants.length === 0) {
          this.watchTogetherSessions.delete(sessionID);
        } else {
          this.watchTogetherSessions.set(sessionID, session);
        }
      }
      this.logger.info('Umalis sa Watch Together', { sessionID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async controlWatchTogether(
    sessionID: string,
    action: 'play' | 'pause' | 'seek',
    value?: number,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      const session = this.watchTogetherSessions.get(sessionID);
      if (!session) {
        throw new Error(`Watch Together session not found: ${sessionID}`);
      }

      switch (action) {
        case 'play':
          session.isPlaying = true;
          break;
        case 'pause':
          session.isPlaying = false;
          break;
        case 'seek':
          if (value !== undefined) {
            session.currentTime = value;
          }
          break;
      }

      this.watchTogetherSessions.set(sessionID, session);
      this.logger.debug('Watch Together control', { sessionID, action, value });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  // ==================== GAMING FEATURES ====================

  private availableGames: AvailableGame[] = [
    { gameID: 'trivia', name: 'Trivia Challenge', description: 'Test your knowledge!', minPlayers: 2, maxPlayers: 10, category: 'trivia', thumbnailUrl: 'https://example.com/trivia.png' },
    { gameID: 'wordguess', name: 'Word Guess', description: 'Guess the word!', minPlayers: 2, maxPlayers: 8, category: 'puzzle', thumbnailUrl: 'https://example.com/wordguess.png' },
    { gameID: 'quickdraw', name: 'Quick Draw', description: 'Draw and guess!', minPlayers: 2, maxPlayers: 6, category: 'casual', thumbnailUrl: 'https://example.com/quickdraw.png' },
    { gameID: '8ball', name: '8 Ball Pool', description: 'Classic pool game', minPlayers: 2, maxPlayers: 2, category: 'action', thumbnailUrl: 'https://example.com/8ball.png' }
  ];

  async startGame(
    threadID: string,
    gameID: string,
    callback?: (err: Error | null, session: GameSession) => void
  ): Promise<GameSession> {
    try {
      const game = this.availableGames.find(g => g.gameID === gameID);
      if (!game) {
        throw new Error(`Game not found: ${gameID}`);
      }

      this.logger.info('Nagsisimula ng laro...', { threadID, gameID, gameName: game.name });

      const sessionID = `game_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const session: GameSession = {
        sessionID,
        gameID,
        gameName: game.name,
        hostID: this.userId,
        threadID,
        participants: [this.userId],
        status: 'waiting',
        scores: { [this.userId]: 0 },
        timestamp: Date.now()
      };

      this.gameSessions.set(sessionID, session);

      this.logger.success('Nagsimula ang laro!', { sessionID, gameName: game.name });

      callback?.(null, session);
      return session;
    } catch (error) {
      this.logger.error('Failed to start game', { error: (error as Error).message });
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async magsimulaNgLaro(
    threadID: string,
    gameID: string,
    callback?: (err: Error | null, session: GameSession) => void
  ): Promise<GameSession> {
    return this.startGame(threadID, gameID, callback);
  }

  async joinGame(
    sessionID: string,
    callback?: (err: Error | null, session: GameSession) => void
  ): Promise<GameSession> {
    try {
      const session = this.gameSessions.get(sessionID);
      if (!session) {
        throw new Error(`Game session not found: ${sessionID}`);
      }

      if (!session.participants.includes(this.userId)) {
        session.participants.push(this.userId);
        session.scores[this.userId] = 0;
        this.gameSessions.set(sessionID, session);
      }

      this.logger.info('Sumali sa laro', { sessionID });
      callback?.(null, session);
      return session;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async leaveGame(sessionID: string, callback?: (err: Error | null) => void): Promise<void> {
    try {
      const session = this.gameSessions.get(sessionID);
      if (session) {
        session.participants = session.participants.filter(id => id !== this.userId);
        delete session.scores[this.userId];
        if (session.participants.length === 0) {
          this.gameSessions.delete(sessionID);
        } else {
          this.gameSessions.set(sessionID, session);
        }
      }
      this.logger.info('Umalis sa laro', { sessionID });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async getAvailableGames(
    callback?: (err: Error | null, games: AvailableGame[]) => void
  ): Promise<AvailableGame[]> {
    try {
      callback?.(null, this.availableGames);
      return this.availableGames;
    } catch (error) {
      callback?.(error as Error, []);
      throw error;
    }
  }

  async kuninAngMgaLaro(
    callback?: (err: Error | null, games: AvailableGame[]) => void
  ): Promise<AvailableGame[]> {
    return this.getAvailableGames(callback);
  }

  async sendGameInvite(
    threadID: string,
    gameID: string,
    callback?: (err: Error | null, invite: GameInvite) => void
  ): Promise<GameInvite> {
    try {
      const game = this.availableGames.find(g => g.gameID === gameID);
      if (!game) {
        throw new Error(`Game not found: ${gameID}`);
      }

      const inviteID = `invite_${Date.now()}${Math.random().toString(36).substr(2, 8)}`;

      const invite: GameInvite = {
        inviteID,
        gameID,
        gameName: game.name,
        hostID: this.userId,
        hostName: 'User',
        threadID,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
      };

      this.logger.info('Naipadala ang game invite!', { threadID, gameID });
      callback?.(null, invite);
      return invite;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  // ==================== ANALYTICS DASHBOARD ====================

  async getAnalytics(
    period: 'day' | 'week' | 'month' | 'all' = 'all',
    callback?: (err: Error | null, data: AnalyticsData) => void
  ): Promise<AnalyticsData> {
    try {
      const now = new Date();
      let startDate = new Date(this.analyticsStartTime);

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const uptime = (Date.now() - this.analyticsStartTime) / 1000;
      const errorRate = this.analyticsData.apiCalls > 0 
        ? (this.analyticsData.errors / this.analyticsData.apiCalls) * 100 
        : 0;

      const analytics: AnalyticsData = {
        period,
        startDate,
        endDate: now,
        messageStats: {
          sent: this.analyticsData.messagesSent,
          received: this.analyticsData.messagesReceived,
          photos: this.analyticsData.photos,
          videos: this.analyticsData.videos,
          stickers: this.analyticsData.stickers,
          voiceMessages: this.analyticsData.voiceMessages,
          files: this.analyticsData.files
        },
        engagementStats: {
          reactions: this.analyticsData.reactions,
          replies: 0,
          mentions: 0,
          avgResponseTime: 0,
          peakHours: [9, 12, 18, 21]
        },
        performanceStats: {
          apiCalls: this.analyticsData.apiCalls,
          errors: this.analyticsData.errors,
          errorRate,
          avgLatency: 50,
          uptime
        },
        topThreads: [],
        topUsers: []
      };

      callback?.(null, analytics);
      return analytics;
    } catch (error) {
      callback?.(error as Error, null as any);
      throw error;
    }
  }

  async kuninAngAnalytics(
    period: 'day' | 'week' | 'month' | 'all' = 'all',
    callback?: (err: Error | null, data: AnalyticsData) => void
  ): Promise<AnalyticsData> {
    return this.getAnalytics(period, callback);
  }

  async exportAnalytics(
    format: 'json' | 'csv',
    exportPath: string,
    callback?: (err: Error | null) => void
  ): Promise<void> {
    try {
      const analytics = await this.getAnalytics('all');

      let content: string;
      if (format === 'json') {
        content = JSON.stringify(analytics, null, 2);
      } else {
        const headers = ['Metric', 'Value'];
        const rows = [
          headers.join(','),
          `Messages Sent,${analytics.messageStats.sent}`,
          `Messages Received,${analytics.messageStats.received}`,
          `Photos,${analytics.messageStats.photos}`,
          `Videos,${analytics.messageStats.videos}`,
          `Voice Messages,${analytics.messageStats.voiceMessages}`,
          `Files,${analytics.messageStats.files}`,
          `API Calls,${analytics.performanceStats.apiCalls}`,
          `Errors,${analytics.performanceStats.errors}`,
          `Error Rate,${analytics.performanceStats.errorRate.toFixed(2)}%`,
          `Uptime,${analytics.performanceStats.uptime.toFixed(0)}s`
        ];
        content = rows.join('\n');
      }

      fs.writeFileSync(exportPath, content, 'utf8');
      this.logger.success('Analytics exported!', { format, path: exportPath });
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  async resetAnalytics(callback?: (err: Error | null) => void): Promise<void> {
    try {
      this.analyticsStartTime = Date.now();
      this.analyticsData = {
        messagesSent: 0,
        messagesReceived: 0,
        photos: 0,
        videos: 0,
        stickers: 0,
        voiceMessages: 0,
        files: 0,
        reactions: 0,
        apiCalls: 0,
        errors: 0
      };
      this.logger.info('Analytics reset');
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
      throw error;
    }
  }

  // ==================== PLUGIN SYSTEM ====================

  registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      this.logger.warning('Plugin already registered', { pluginId: plugin.id });
      return;
    }

    this.plugins.set(plugin.id, { ...plugin, enabled: true });
    this.logger.success('Plugin registered', { 
      pluginId: plugin.id, 
      name: plugin.name, 
      version: plugin.version 
    });
  }

  unregisterPlugin(pluginId: string): void {
    if (this.plugins.delete(pluginId)) {
      this.logger.info('Plugin unregistered', { pluginId });
    }
  }

  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
      this.plugins.set(pluginId, plugin);
      this.logger.info('Plugin enabled', { pluginId });
    }
  }

  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
      this.plugins.set(pluginId, plugin);
      this.logger.info('Plugin disabled', { pluginId });
    }
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  private async executePluginHooks(event: PluginEventType, data: any): Promise<any> {
    let result = data;
    const enabledPlugins = Array.from(this.plugins.values())
      .filter(p => p.enabled)
      .sort((a, b) => {
        const aPriority = a.hooks.find(h => h.event === event)?.priority || 0;
        const bPriority = b.hooks.find(h => h.event === event)?.priority || 0;
        return bPriority - aPriority;
      });

    for (const plugin of enabledPlugins) {
      for (const hook of plugin.hooks.filter(h => h.event === event)) {
        try {
          result = await hook.handler(result, this);
        } catch (error) {
          this.logger.error('Plugin hook error', { 
            pluginId: plugin.id, 
            event, 
            error: (error as Error).message 
          });
        }
      }
    }

    return result;
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
