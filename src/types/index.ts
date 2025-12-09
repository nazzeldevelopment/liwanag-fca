export interface LogConfig {
  level: LogLevel;
  colorize: boolean;
  timestamp: boolean;
  saveToFile: boolean;
  logDirectory: string;
  maxFileSize: string;
  maxFiles: number;
  format: 'simple' | 'detailed' | 'json';
  showPerformance: boolean;
  showMemory: boolean;
  language: 'tl' | 'en';
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'SYSTEM';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AppState {
  cookies: Cookie[];
  fbDtsg?: string;
  userId?: string;
  revision?: number;
  lastRefresh?: number;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface CookieStatus {
  valid: boolean;
  expiresIn: string;
  lastRefresh: string;
  nextRefresh: string;
  health: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CookieHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface AutoRefreshConfig {
  enabled: boolean;
  interval: number;
  refreshBeforeExpiry: number;
  maxRetries: number;
  onRefresh?: (info: RefreshInfo) => void;
  onError?: (error: Error) => void;
}

export interface RefreshInfo {
  timestamp: Date;
  success: boolean;
  newExpiry?: Date;
  attempts: number;
}

export interface Message {
  messageID: string;
  threadID: string;
  senderID: string;
  body: string;
  timestamp: number;
  type: MessageType;
  attachments: Attachment[];
  mentions: Mention[];
  isGroup: boolean;
}

export type MessageType = 'text' | 'sticker' | 'photo' | 'video' | 'audio' | 'file' | 'gif';

export interface Attachment {
  type: string;
  url?: string;
  id?: string;
  filename?: string;
  size?: number;
}

export interface Mention {
  id: string;
  offset: number;
  length: number;
  name: string;
}

export interface UserInfo {
  id: string;
  name: string;
  firstName: string;
  lastName?: string;
  vanity?: string;
  profileUrl: string;
  avatarUrl: string;
  gender?: number;
  isFriend: boolean;
  isBirthday: boolean;
}

export interface ThreadInfo {
  threadID: string;
  name: string;
  isGroup: boolean;
  participantIDs: string[];
  nicknames: Record<string, string>;
  emoji?: string;
  color?: string;
  messageCount: number;
  unreadCount: number;
  lastMessage?: Message;
  adminIDs?: string[];
}

export interface SendMessageOptions {
  body?: string;
  sticker?: string;
  attachment?: string | string[];
  url?: string;
  emoji?: string;
  mentions?: MentionInput[];
  replyToMessage?: string;
}

export interface MentionInput {
  id: string;
  tag: string;
}

export interface FingerprintConfig {
  autoRotate: boolean;
  rotationInterval: number;
  consistency: 'high' | 'medium' | 'low';
  browserProfile: 'chrome' | 'edge' | 'firefox';
  platform: 'Windows' | 'macOS' | 'Linux';
  onRotation?: (fingerprint: Fingerprint) => void;
}

export interface Fingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  plugins: string[];
  canvas: string;
  webgl: string;
}

export interface RequestObfuscatorConfig {
  enabled: boolean;
  entropyLevel: 'low' | 'medium' | 'high' | 'extreme';
  headerRandomization: boolean;
  payloadEncryption: boolean;
  parameterShuffle: boolean;
  timestampFuzz: {
    enabled: boolean;
    variance: number;
  };
}

export interface PatternDiffuserConfig {
  enabled: boolean;
  humanLikeDelays: {
    min: number;
    max: number;
    distribution: 'uniform' | 'normal' | 'exponential';
  };
  burstPrevention: {
    maxBurst: number;
    cooldownPeriod: number;
  };
  idleSimulation: {
    enabled: boolean;
    minIdle: number;
    maxIdle: number;
    frequency: number;
  };
  typingSimulation: {
    enabled: boolean;
    wpm: number;
    variance: number;
  };
}

export interface RateLimiterConfig {
  enabled: boolean;
  adaptive: boolean;
  limits: {
    messagesPerMinute: number;
    messagesPerHour: number;
    messagesPerDay: number;
    newAccountMultiplier: number;
    groupMessagesMultiplier: number;
  };
  burstAllowance: {
    enabled: boolean;
    maxBurst: number;
    cooldown: number;
  };
  warningThresholds: Record<number, 'warning' | 'critical'>;
  onLimitReached?: (info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  type: string;
  current: number;
  limit: number;
  resetIn: number;
}

export interface LiwanagOptions {
  logConfig?: Partial<LogConfig>;
  autoRefresh?: Partial<AutoRefreshConfig>;
  fingerprint?: Partial<FingerprintConfig>;
  requestObfuscator?: Partial<RequestObfuscatorConfig>;
  patternDiffuser?: Partial<PatternDiffuserConfig>;
  rateLimiter?: Partial<RateLimiterConfig>;
  userAgent?: string;
  proxy?: string;
  selfListen?: boolean;
  listenEvents?: boolean;
}

export interface ApiCallback {
  (error: Error | null, api: LiwanagApi): void;
}

export interface MessageCallback {
  (error: Error | null, message: Message): void;
}

export interface LiwanagApi {
  getUserID(): string;
  
  magpadalaNgMensahe(message: string | SendMessageOptions, threadID: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  sendMessage(message: string | SendMessageOptions, threadID: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  
  makinigSaMensahe(callback: MessageCallback): void;
  listenMqtt(callback: MessageCallback): void;
  
  kuninAngUserInfo(userIDs: string | string[], callback?: (err: Error | null, info: Record<string, UserInfo>) => void): Promise<Record<string, UserInfo>>;
  getUserInfo(userIDs: string | string[], callback?: (err: Error | null, info: Record<string, UserInfo>) => void): Promise<Record<string, UserInfo>>;
  
  kuninAngThreadInfo(threadID: string, callback?: (err: Error | null, info: ThreadInfo) => void): Promise<ThreadInfo>;
  getThreadInfo(threadID: string, callback?: (err: Error | null, info: ThreadInfo) => void): Promise<ThreadInfo>;
  
  kuninAngThreadList(limit: number, timestamp: number | null, tags: string[], callback?: (err: Error | null, threads: ThreadInfo[]) => void): Promise<ThreadInfo[]>;
  getThreadList(limit: number, timestamp: number | null, tags: string[], callback?: (err: Error | null, threads: ThreadInfo[]) => void): Promise<ThreadInfo[]>;
  
  gumawaNgGroup(participantIDs: string[], name: string, callback?: (err: Error | null, threadID: string) => void): Promise<string>;
  createGroup(participantIDs: string[], name: string, callback?: (err: Error | null, threadID: string) => void): Promise<string>;
  
  magdagdagNgMember(threadID: string, userIDs: string | string[], callback?: (err: Error | null) => void): Promise<void>;
  addUserToGroup(userIDs: string | string[], threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  
  magtanggalNgMember(threadID: string, userID: string, callback?: (err: Error | null) => void): Promise<void>;
  removeUserFromGroup(userID: string, threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  
  palitanAngGroupName(threadID: string, newName: string, callback?: (err: Error | null) => void): Promise<void>;
  setTitle(newTitle: string, threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  
  markAsRead(threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  markAsReadAll(callback?: (err: Error | null) => void): Promise<void>;
  
  setMessageReaction(reaction: string, messageID: string, callback?: (err: Error | null) => void): Promise<void>;
  unsendMessage(messageID: string, callback?: (err: Error | null) => void): Promise<void>;
  
  autoRefreshCookies(config: Partial<AutoRefreshConfig>): void;
  refreshCookies(): Promise<void>;
  getCookieStatus(): CookieStatus;
  checkCookieHealth(): Promise<CookieHealth>;
  exportCookies(): Cookie[];
  saveCookies(path: string): Promise<void>;
  loadCookies(path: string): Promise<void>;
  rotateCookies(options: { clearCache?: boolean; renewSession?: boolean }): Promise<void>;
  
  fingerprintManager(config: Partial<FingerprintConfig>): void;
  requestObfuscator(config: Partial<RequestObfuscatorConfig>): void;
  patternDiffuser(config: Partial<PatternDiffuserConfig>): void;
  smartRateLimiter(config: Partial<RateLimiterConfig>): void;
  
  getAppState(): AppState;
  setOptions(options: Partial<LiwanagOptions>): void;
  logout(callback?: (err: Error | null) => void): Promise<void>;

  // Photo/Video support
  sendPhoto(photoPath: string | string[], threadID: string, caption?: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  magpadalaNgLarawan(photoPath: string | string[], threadID: string, caption?: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  sendVideo(videoPath: string, threadID: string, caption?: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  magpadalaNgVideo(videoPath: string, threadID: string, caption?: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;

  // Sticker support
  sendSticker(stickerID: string, threadID: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  magpadalaNgSticker(stickerID: string, threadID: string, callback?: (err: Error | null, messageInfo: any) => void): Promise<any>;
  getStickerURL(stickerID: string, callback?: (err: Error | null, url: string) => void): Promise<string>;

  // Timeline posting
  postToTimeline(message: string, options?: TimelinePostOptions, callback?: (err: Error | null, postInfo: TimelinePost) => void): Promise<TimelinePost>;
  magpostsaTimeline(message: string, options?: TimelinePostOptions, callback?: (err: Error | null, postInfo: TimelinePost) => void): Promise<TimelinePost>;
  deletePost(postID: string, callback?: (err: Error | null) => void): Promise<void>;
  editPost(postID: string, newMessage: string, callback?: (err: Error | null) => void): Promise<void>;

  // Friend request management
  sendFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  magpadalaNgFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  acceptFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  tanggapinAngFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  declineFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  cancelFriendRequest(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  unfriend(userID: string, callback?: (err: Error | null) => void): Promise<void>;
  getFriendRequests(callback?: (err: Error | null, requests: FriendRequest[]) => void): Promise<FriendRequest[]>;
  kuninAngFriendRequests(callback?: (err: Error | null, requests: FriendRequest[]) => void): Promise<FriendRequest[]>;
  getFriendsList(callback?: (err: Error | null, friends: UserInfo[]) => void): Promise<UserInfo[]>;

  // Notification handling
  getNotifications(limit?: number, callback?: (err: Error | null, notifications: Notification[]) => void): Promise<Notification[]>;
  kuninAngNotifications(limit?: number, callback?: (err: Error | null, notifications: Notification[]) => void): Promise<Notification[]>;
  markNotificationAsRead(notificationID: string, callback?: (err: Error | null) => void): Promise<void>;
  markAllNotificationsAsRead(callback?: (err: Error | null) => void): Promise<void>;
  onNotification(callback: NotificationCallback): void;

  // Webhook integration
  registerWebhook(config: WebhookConfig): void;
  unregisterWebhook(webhookID: string): void;
  getWebhooks(): WebhookConfig[];
}

// Two-Factor Authentication Types
export interface TwoFactorAuthOptions {
  method: '2fa_code' | 'backup_code' | 'authenticator';
  code: string;
}

export interface CheckpointData {
  type: 'two_factor' | 'verification' | 'captcha' | 'identity';
  challengeUrl?: string;
  message?: string;
}

export interface CheckpointHandler {
  onCheckpoint: (data: CheckpointData) => Promise<string | TwoFactorAuthOptions>;
  onError?: (error: Error) => void;
}

// Timeline/Post Types
export interface TimelinePostOptions {
  privacy?: 'public' | 'friends' | 'only_me';
  photos?: string[];
  location?: string;
  feeling?: string;
  taggedUsers?: string[];
  scheduledTime?: Date;
}

export interface TimelinePost {
  postID: string;
  authorID: string;
  message: string;
  timestamp: number;
  privacy: string;
  likes: number;
  comments: number;
  shares: number;
  attachments: Attachment[];
}

// Friend Request Types
export interface FriendRequest {
  id: string;
  senderID: string;
  senderName: string;
  senderProfileUrl: string;
  senderAvatarUrl: string;
  timestamp: number;
  mutualFriends: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  isRead: boolean;
  link?: string;
  senderID?: string;
  senderName?: string;
  senderAvatar?: string;
}

export type NotificationType = 
  | 'message'
  | 'friend_request'
  | 'comment'
  | 'like'
  | 'mention'
  | 'tag'
  | 'group'
  | 'event'
  | 'birthday'
  | 'memory'
  | 'other';

export interface NotificationCallback {
  (notification: Notification): void;
}

// Webhook Types
export interface WebhookConfig {
  id?: string;
  url: string;
  events: WebhookEventType[];
  secret?: string;
  headers?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
}

export type WebhookEventType = 
  | 'message'
  | 'message_reaction'
  | 'message_read'
  | 'friend_request'
  | 'notification'
  | 'presence'
  | 'typing'
  | 'all';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: number;
  data: any;
}
