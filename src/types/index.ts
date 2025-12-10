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

  // Voice message support
  sendVoice(audioPath: string, threadID: string, options?: VoiceMessageOptions, callback?: (err: Error | null, messageInfo: VoiceMessage) => void): Promise<VoiceMessage>;
  magpadalaNgBoses(audioPath: string, threadID: string, options?: VoiceMessageOptions, callback?: (err: Error | null, messageInfo: VoiceMessage) => void): Promise<VoiceMessage>;

  // File attachment support
  sendFile(filePath: string, threadID: string, options?: FileAttachmentOptions, callback?: (err: Error | null, attachment: FileAttachment) => void): Promise<FileAttachment>;
  magpadalaNgFile(filePath: string, threadID: string, options?: FileAttachmentOptions, callback?: (err: Error | null, attachment: FileAttachment) => void): Promise<FileAttachment>;

  // Story/Reels support
  postStory(mediaPath: string, options?: StoryOptions, callback?: (err: Error | null, story: Story) => void): Promise<Story>;
  magpostNgStory(mediaPath: string, options?: StoryOptions, callback?: (err: Error | null, story: Story) => void): Promise<Story>;
  getStories(userID?: string, callback?: (err: Error | null, stories: Story[]) => void): Promise<Story[]>;
  kuninAngStories(userID?: string, callback?: (err: Error | null, stories: Story[]) => void): Promise<Story[]>;
  deleteStory(storyID: string, callback?: (err: Error | null) => void): Promise<void>;
  postReel(videoPath: string, options?: ReelsOptions, callback?: (err: Error | null, reel: Reel) => void): Promise<Reel>;
  magpostNgReel(videoPath: string, options?: ReelsOptions, callback?: (err: Error | null, reel: Reel) => void): Promise<Reel>;
  getReels(userID?: string, callback?: (err: Error | null, reels: Reel[]) => void): Promise<Reel[]>;
  kuninAngReels(userID?: string, callback?: (err: Error | null, reels: Reel[]) => void): Promise<Reel[]>;

  // Marketplace integration
  createListing(options: MarketplaceListingOptions, callback?: (err: Error | null, listing: MarketplaceListing) => void): Promise<MarketplaceListing>;
  gumawaNgListing(options: MarketplaceListingOptions, callback?: (err: Error | null, listing: MarketplaceListing) => void): Promise<MarketplaceListing>;
  updateListing(listingID: string, updates: Partial<MarketplaceListingOptions>, callback?: (err: Error | null, listing: MarketplaceListing) => void): Promise<MarketplaceListing>;
  deleteListing(listingID: string, callback?: (err: Error | null) => void): Promise<void>;
  searchMarketplace(options: MarketplaceSearchOptions, callback?: (err: Error | null, listings: MarketplaceListing[]) => void): Promise<MarketplaceListing[]>;
  hanapiNgListings(options: MarketplaceSearchOptions, callback?: (err: Error | null, listings: MarketplaceListing[]) => void): Promise<MarketplaceListing[]>;
  getMyListings(callback?: (err: Error | null, listings: MarketplaceListing[]) => void): Promise<MarketplaceListing[]>;
  kuninAngMgaListingsKo(callback?: (err: Error | null, listings: MarketplaceListing[]) => void): Promise<MarketplaceListing[]>;
  markAsSold(listingID: string, callback?: (err: Error | null) => void): Promise<void>;

  // Watch Together
  startWatchTogether(threadID: string, options: WatchTogetherOptions, callback?: (err: Error | null, session: WatchTogetherSession) => void): Promise<WatchTogetherSession>;
  magsimulaNgWatchTogether(threadID: string, options: WatchTogetherOptions, callback?: (err: Error | null, session: WatchTogetherSession) => void): Promise<WatchTogetherSession>;
  joinWatchTogether(sessionID: string, callback?: (err: Error | null, session: WatchTogetherSession) => void): Promise<WatchTogetherSession>;
  leaveWatchTogether(sessionID: string, callback?: (err: Error | null) => void): Promise<void>;
  controlWatchTogether(sessionID: string, action: 'play' | 'pause' | 'seek', value?: number, callback?: (err: Error | null) => void): Promise<void>;

  // Gaming features
  startGame(threadID: string, gameID: string, callback?: (err: Error | null, session: GameSession) => void): Promise<GameSession>;
  magsimulaNgLaro(threadID: string, gameID: string, callback?: (err: Error | null, session: GameSession) => void): Promise<GameSession>;
  joinGame(sessionID: string, callback?: (err: Error | null, session: GameSession) => void): Promise<GameSession>;
  leaveGame(sessionID: string, callback?: (err: Error | null) => void): Promise<void>;
  getAvailableGames(callback?: (err: Error | null, games: AvailableGame[]) => void): Promise<AvailableGame[]>;
  kuninAngMgaLaro(callback?: (err: Error | null, games: AvailableGame[]) => void): Promise<AvailableGame[]>;
  sendGameInvite(threadID: string, gameID: string, callback?: (err: Error | null, invite: GameInvite) => void): Promise<GameInvite>;

  // Analytics dashboard
  getAnalytics(period?: 'day' | 'week' | 'month' | 'all', callback?: (err: Error | null, data: AnalyticsData) => void): Promise<AnalyticsData>;
  kuninAngAnalytics(period?: 'day' | 'week' | 'month' | 'all', callback?: (err: Error | null, data: AnalyticsData) => void): Promise<AnalyticsData>;
  exportAnalytics(format: 'json' | 'csv', path: string, callback?: (err: Error | null) => void): Promise<void>;
  resetAnalytics(callback?: (err: Error | null) => void): Promise<void>;

  // Plugin system
  registerPlugin(plugin: Plugin): void;
  unregisterPlugin(pluginId: string): void;
  enablePlugin(pluginId: string): void;
  disablePlugin(pluginId: string): void;
  getPlugins(): Plugin[];
  getPlugin(pluginId: string): Plugin | undefined;

  // Live Video Streaming
  startLiveStream(options: LiveStreamOptions, callback?: (err: Error | null, stream: LiveStream) => void): Promise<LiveStream>;
  magsimulaNgLiveStream(options: LiveStreamOptions, callback?: (err: Error | null, stream: LiveStream) => void): Promise<LiveStream>;
  endLiveStream(streamID: string, callback?: (err: Error | null) => void): Promise<void>;
  tapusinAngLiveStream(streamID: string, callback?: (err: Error | null) => void): Promise<void>;
  getLiveStreams(callback?: (err: Error | null, streams: LiveStream[]) => void): Promise<LiveStream[]>;
  kuninAngMgaLiveStream(callback?: (err: Error | null, streams: LiveStream[]) => void): Promise<LiveStream[]>;
  onLiveStreamEvent(streamID: string, callback: LiveStreamCallback): void;

  // NLP Chatbot Integration
  configureChatbot(config: ChatbotConfig): void;
  iConfigAngChatbot(config: ChatbotConfig): void;
  enableChatbot(): void;
  disableChatbot(): void;
  addChatbotIntent(intent: ChatbotIntent): void;
  removeChatbotIntent(intentName: string): void;
  processChatbotMessage(message: string, userID: string): Promise<ChatbotResponse>;
  getChatbotContext(userID: string): ChatbotContext | undefined;
  clearChatbotContext(userID: string): void;

  // Multi-Account Management
  addAccount(appState: AppState, name?: string): Promise<AccountInfo>;
  magdagdagNgAccount(appState: AppState, name?: string): Promise<AccountInfo>;
  removeAccount(accountID: string): void;
  switchAccount(accountID: string, options?: AccountSwitchOptions): Promise<void>;
  lumipatNgAccount(accountID: string, options?: AccountSwitchOptions): Promise<void>;
  getAccounts(): AccountInfo[];
  kuninAngMgaAccount(): AccountInfo[];
  getActiveAccount(): AccountInfo | undefined;
  getAccountStats(accountID?: string): AccountStats;
  configureAccountManager(config: AccountManagerConfig): void;

  // Automated Response Templates
  addTemplate(template: ResponseTemplate): void;
  magdagdagNgTemplate(template: ResponseTemplate): void;
  removeTemplate(templateID: string): void;
  updateTemplate(templateID: string, updates: Partial<ResponseTemplate>): void;
  getTemplates(): ResponseTemplate[];
  kuninAngMgaTemplate(): ResponseTemplate[];
  enableTemplate(templateID: string): void;
  disableTemplate(templateID: string): void;
  testTemplate(templateID: string, testMessage: string): TemplateResponse | null;

  // Message Scheduling
  scheduleMessage(threadID: string, message: string | SendMessageOptions, scheduledTime: Date, options?: Partial<ScheduledMessage>): Promise<ScheduledMessage>;
  magScheduleNgMensahe(threadID: string, message: string | SendMessageOptions, scheduledTime: Date, options?: Partial<ScheduledMessage>): Promise<ScheduledMessage>;
  cancelScheduledMessage(messageID: string): void;
  getScheduledMessages(): ScheduledMessage[];
  kuninAngMgaScheduledMessage(): ScheduledMessage[];
  updateScheduledMessage(messageID: string, updates: Partial<ScheduledMessage>): void;
  configureScheduler(config: SchedulerConfig): void;

  // Spam Detection
  configureSpamDetection(config: SpamDetectionConfig): void;
  iConfigAngSpamDetection(config: SpamDetectionConfig): void;
  checkForSpam(message: string, senderID: string, threadID: string): Promise<SpamCheckResult>;
  suriiinKungSpam(message: string, senderID: string, threadID: string): Promise<SpamCheckResult>;
  addToWhitelist(userID: string): void;
  addToBlacklist(userID: string): void;
  removeFromWhitelist(userID: string): void;
  removeFromBlacklist(userID: string): void;
  getSpamReports(): SpamReport[];
  resolveSpamReport(reportID: string): void;

  // Group Analytics
  getGroupAnalytics(groupID: string, period?: 'day' | 'week' | 'month' | 'all'): Promise<GroupAnalytics>;
  kuninAngGroupAnalytics(groupID: string, period?: 'day' | 'week' | 'month' | 'all'): Promise<GroupAnalytics>;
  exportGroupAnalytics(groupID: string, format: 'json' | 'csv', path: string): Promise<void>;
  getTopContributors(groupID: string, limit?: number): Promise<GroupContributor[]>;
  kuninAngTopContributors(groupID: string, limit?: number): Promise<GroupContributor[]>;
  getGroupSentiment(groupID: string): Promise<GroupSentiment>;

  // Cross-Platform Messaging Bridge
  configureBridge(config: MessagingBridgeConfig): void;
  iConfigAngBridge(config: MessagingBridgeConfig): void;
  addPlatform(platformConfig: PlatformConfig): void;
  removePlatform(platform: SupportedPlatform): void;
  getBridgeStats(): BridgeStats[];
  kuninAngBridgeStats(): BridgeStats[];
  sendCrossPlatformMessage(platform: SupportedPlatform, channel: string, message: string): Promise<BridgedMessage>;
  magpadalaSaIbangPlatform(platform: SupportedPlatform, channel: string, message: string): Promise<BridgedMessage>;
  getBridgedMessages(): BridgedMessage[];

  // Voice Call Support
  startVoiceCall(threadID: string, options?: Partial<CallOptions>, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  magsimulaNgVoiceCall(threadID: string, options?: Partial<CallOptions>, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  startVideoCall(threadID: string, options?: Partial<CallOptions>, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  magsimulaNgVideoCall(threadID: string, options?: Partial<CallOptions>, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  joinCall(callID: string, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  sumaliSaTawag(callID: string, callback?: (err: Error | null, call: CallSession) => void): Promise<CallSession>;
  endCall(callID: string, callback?: (err: Error | null) => void): Promise<void>;
  tapusinAngTawag(callID: string, callback?: (err: Error | null) => void): Promise<void>;
  toggleMute(callID: string, muted: boolean, callback?: (err: Error | null) => void): Promise<void>;
  toggleVideo(callID: string, videoOn: boolean, callback?: (err: Error | null) => void): Promise<void>;
  getActiveCalls(): CallSession[];
  kuninAngMgaTawag(): CallSession[];
  onCallEvent(callID: string, callback: CallCallback): void;

  // Screen Sharing
  startScreenShare(callID: string, options?: ScreenShareOptions, callback?: (err: Error | null, session: ScreenShareSession) => void): Promise<ScreenShareSession>;
  magsimulaNgScreenShare(callID: string, options?: ScreenShareOptions, callback?: (err: Error | null, session: ScreenShareSession) => void): Promise<ScreenShareSession>;
  stopScreenShare(callID: string, callback?: (err: Error | null) => void): Promise<void>;
  itigilAngScreenShare(callID: string, callback?: (err: Error | null) => void): Promise<void>;
  pauseScreenShare(callID: string, callback?: (err: Error | null) => void): Promise<void>;
  resumeScreenShare(callID: string, callback?: (err: Error | null) => void): Promise<void>;

  // AI Content Moderation
  configureModeration(config: ModerationConfig): void;
  iConfigAngModeration(config: ModerationConfig): void;
  evaluateMessage(message: string, senderID: string, threadID: string): Promise<ModerationResult>;
  suriiinAngMensahe(message: string, senderID: string, threadID: string): Promise<ModerationResult>;
  getModerationQueue(status?: 'pending' | 'approved' | 'rejected'): ModerationQueue;
  kuninAngModerationQueue(status?: 'pending' | 'approved' | 'rejected'): ModerationQueue;
  approveFlaggedMessage(resultID: string, callback?: (err: Error | null) => void): Promise<void>;
  rejectFlaggedMessage(resultID: string, callback?: (err: Error | null) => void): Promise<void>;
  getModerationStats(): ModerationStats;
  kuninAngModerationStats(): ModerationStats;
  addModerationRule(rule: ModerationRule): void;
  removeModerationRule(ruleID: string): void;

  // End-to-End Encryption
  configureEncryption(config: EncryptionConfig): void;
  iConfigAngEncryption(config: EncryptionConfig): void;
  enableEncryption(threadID: string, callback?: (err: Error | null, status: EncryptionStatus) => void): Promise<EncryptionStatus>;
  paganahinAngEncryption(threadID: string, callback?: (err: Error | null, status: EncryptionStatus) => void): Promise<EncryptionStatus>;
  disableEncryption(threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  patayinAngEncryption(threadID: string, callback?: (err: Error | null) => void): Promise<void>;
  rotateEncryptionKeys(threadID: string, callback?: (err: Error | null, keyPair: EncryptionKeyPair) => void): Promise<EncryptionKeyPair>;
  getEncryptionStatus(threadID: string): EncryptionStatus | undefined;
  kuninAngEncryptionStatus(threadID: string): EncryptionStatus | undefined;
  verifyParticipant(threadID: string, userID: string, callback?: (err: Error | null, verified: boolean) => void): Promise<boolean>;
  getEncryptedThreads(): EncryptedThread[];

  // Bot Marketplace
  configureBotMarketplace(config: BotMarketplaceConfig): void;
  iConfigAngBotMarketplace(config: BotMarketplaceConfig): void;
  searchBots(options?: BotSearchOptions): Promise<BotListing[]>;
  hanapiNgMgaBot(options?: BotSearchOptions): Promise<BotListing[]>;
  getBotDetails(botID: string): Promise<BotListing | undefined>;
  kuninAngBotDetails(botID: string): Promise<BotListing | undefined>;
  installBot(botID: string, config?: Record<string, any>, callback?: (err: Error | null, bot: InstalledBot) => void): Promise<InstalledBot>;
  iInstallAngBot(botID: string, config?: Record<string, any>, callback?: (err: Error | null, bot: InstalledBot) => void): Promise<InstalledBot>;
  uninstallBot(botID: string, callback?: (err: Error | null) => void): Promise<void>;
  iUninstallAngBot(botID: string, callback?: (err: Error | null) => void): Promise<void>;
  getInstalledBots(): InstalledBot[];
  kuninAngMgaInstalledBot(): InstalledBot[];
  enableBot(botID: string): void;
  disableBot(botID: string): void;
  configureBotForThread(botID: string, threadID: string, config?: Record<string, any>): void;
  getBotReviews(botID: string): Promise<BotReview[]>;
  submitBotReview(botID: string, rating: number, review: string): Promise<BotReview>;

  // Custom Webhook Transformations
  configureWebhookTransforms(config: WebhookTransformConfig): void;
  iConfigAngWebhookTransforms(config: WebhookTransformConfig): void;
  addWebhookTransformation(transformation: WebhookTransformation): void;
  magdagdagNgTransformation(transformation: WebhookTransformation): void;
  removeWebhookTransformation(transformationID: string): void;
  updateWebhookTransformation(transformationID: string, updates: Partial<WebhookTransformation>): void;
  getWebhookTransformations(): WebhookTransformation[];
  kuninAngMgaTransformation(): WebhookTransformation[];
  testWebhookTransformation(transformationID: string, testPayload: any): TransformationResult;
  enableWebhookTransformation(transformationID: string): void;
  disableWebhookTransformation(transformationID: string): void;
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

// ==================== VOICE MESSAGE TYPES ====================
export interface VoiceMessageOptions {
  duration?: number;
  waveform?: number[];
}

export interface VoiceMessage {
  messageID: string;
  threadID: string;
  audioUrl: string;
  duration: number;
  timestamp: number;
}

// ==================== FILE ATTACHMENT TYPES ====================
export interface FileAttachmentOptions {
  filename?: string;
  description?: string;
}

export type SupportedFileType = 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'txt' | 'zip' | 'rar';

export interface FileAttachment {
  id: string;
  filename: string;
  fileType: SupportedFileType | string;
  size: number;
  url?: string;
  timestamp: number;
}

// ==================== STORY/REELS TYPES ====================
export interface StoryOptions {
  duration?: number;
  backgroundColor?: string;
  textOverlay?: string;
  musicId?: string;
  privacy?: 'public' | 'friends' | 'close_friends';
  allowReplies?: boolean;
  expiresIn?: number;
}

export interface Story {
  storyID: string;
  authorID: string;
  type: 'photo' | 'video' | 'text';
  mediaUrl?: string;
  text?: string;
  timestamp: number;
  expiresAt: number;
  views: number;
  reactions: StoryReaction[];
}

export interface StoryReaction {
  userID: string;
  reaction: string;
  timestamp: number;
}

export interface ReelsOptions {
  caption?: string;
  music?: {
    trackId: string;
    startTime?: number;
    duration?: number;
  };
  effects?: string[];
  privacy?: 'public' | 'friends';
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

export interface Reel {
  reelID: string;
  authorID: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption?: string;
  duration: number;
  timestamp: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

// ==================== MARKETPLACE TYPES ====================
export interface MarketplaceListingOptions {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category: MarketplaceCategory;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  photos: string[];
  location?: string;
  deliveryOptions?: ('pickup' | 'shipping' | 'both')[];
  negotiable?: boolean;
}

export type MarketplaceCategory = 
  | 'vehicles'
  | 'property'
  | 'electronics'
  | 'clothing'
  | 'furniture'
  | 'toys'
  | 'sports'
  | 'books'
  | 'music'
  | 'garden'
  | 'pets'
  | 'home'
  | 'other';

export interface MarketplaceListing {
  listingID: string;
  sellerID: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: MarketplaceCategory;
  condition: string;
  photos: string[];
  location?: string;
  timestamp: number;
  status: 'active' | 'sold' | 'pending' | 'removed';
  views: number;
  saves: number;
}

export interface MarketplaceSearchOptions {
  query?: string;
  category?: MarketplaceCategory;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  radius?: number;
  condition?: string[];
  sortBy?: 'date' | 'price_low' | 'price_high' | 'distance';
  limit?: number;
}

// ==================== WATCH TOGETHER TYPES ====================
export interface WatchTogetherSession {
  sessionID: string;
  hostID: string;
  threadID: string;
  videoUrl: string;
  videoTitle?: string;
  participants: string[];
  currentTime: number;
  isPlaying: boolean;
  timestamp: number;
}

export interface WatchTogetherOptions {
  videoUrl: string;
  videoTitle?: string;
  autoStart?: boolean;
}

// ==================== GAMING TYPES ====================
export interface GameSession {
  sessionID: string;
  gameID: string;
  gameName: string;
  hostID: string;
  threadID: string;
  participants: string[];
  status: 'waiting' | 'playing' | 'finished';
  scores: Record<string, number>;
  timestamp: number;
}

export interface GameInvite {
  inviteID: string;
  gameID: string;
  gameName: string;
  hostID: string;
  hostName: string;
  threadID: string;
  timestamp: number;
  expiresAt: number;
}

export interface AvailableGame {
  gameID: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  category: 'puzzle' | 'trivia' | 'action' | 'multiplayer' | 'casual';
  thumbnailUrl: string;
}

// ==================== ANALYTICS TYPES ====================
export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'all';
  startDate: Date;
  endDate: Date;
  messageStats: MessageStats;
  engagementStats: EngagementStats;
  performanceStats: PerformanceStats;
  topThreads: ThreadStats[];
  topUsers: UserStats[];
}

export interface MessageStats {
  sent: number;
  received: number;
  photos: number;
  videos: number;
  stickers: number;
  voiceMessages: number;
  files: number;
}

export interface EngagementStats {
  reactions: number;
  replies: number;
  mentions: number;
  avgResponseTime: number;
  peakHours: number[];
}

export interface PerformanceStats {
  apiCalls: number;
  errors: number;
  errorRate: number;
  avgLatency: number;
  uptime: number;
}

export interface ThreadStats {
  threadID: string;
  threadName: string;
  messageCount: number;
  lastActivity: number;
}

export interface UserStats {
  userID: string;
  userName: string;
  messageCount: number;
  lastActivity: number;
}

// ==================== PLUGIN SYSTEM TYPES ====================
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  hooks: PluginHook[];
  config?: Record<string, any>;
}

export interface PluginHook {
  event: PluginEventType;
  handler: (data: any, api: LiwanagApi) => Promise<any> | any;
  priority?: number;
}

export type PluginEventType =
  | 'beforeSendMessage'
  | 'afterSendMessage'
  | 'onMessageReceived'
  | 'beforeLogin'
  | 'afterLogin'
  | 'onError'
  | 'onReaction'
  | 'onTyping'
  | 'onPresence'
  | 'custom';

export interface PluginContext {
  api: LiwanagApi;
  logger: any;
  storage: PluginStorage;
}

export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface PluginManager {
  register(plugin: Plugin): void;
  unregister(pluginId: string): void;
  enable(pluginId: string): void;
  disable(pluginId: string): void;
  getPlugin(pluginId: string): Plugin | undefined;
  getPlugins(): Plugin[];
  executeHook(event: PluginEventType, data: any): Promise<any>;
}

// ==================== LIVE VIDEO STREAMING TYPES ====================
export interface LiveStreamOptions {
  title: string;
  description?: string;
  privacy?: 'public' | 'friends' | 'only_me';
  allowComments?: boolean;
  notifyFollowers?: boolean;
  scheduledTime?: Date;
}

export interface LiveStream {
  streamID: string;
  hostID: string;
  title: string;
  description?: string;
  privacy: string;
  status: 'scheduled' | 'live' | 'ended';
  rtmpUrl?: string;
  streamKey?: string;
  viewers: number;
  peakViewers: number;
  likes: number;
  comments: number;
  startedAt?: number;
  endedAt?: number;
  duration?: number;
  timestamp: number;
}

export interface LiveStreamComment {
  id: string;
  userID: string;
  userName: string;
  message: string;
  timestamp: number;
}

export interface LiveStreamCallback {
  (event: 'viewer_joined' | 'viewer_left' | 'comment' | 'reaction' | 'ended', data: any): void;
}

// ==================== NLP CHATBOT TYPES ====================
export interface ChatbotConfig {
  enabled: boolean;
  language: 'tl' | 'en' | 'auto';
  responseDelay?: number;
  typingSimulation?: boolean;
  intents: ChatbotIntent[];
  fallbackResponse?: string;
  nlpProvider?: 'built-in' | 'openai' | 'dialogflow';
  apiKey?: string;
  contextMemory?: number;
}

export interface ChatbotIntent {
  name: string;
  patterns: string[];
  responses: string[];
  entities?: string[];
  context?: string[];
  followUp?: string[];
  priority?: number;
}

export interface ChatbotResponse {
  intent: string;
  confidence: number;
  response: string;
  entities: Record<string, string>;
  suggestedActions?: string[];
}

export interface ChatbotContext {
  sessionID: string;
  userID: string;
  history: ChatbotMessage[];
  entities: Record<string, any>;
  currentIntent?: string;
  lastInteraction: number;
}

export interface ChatbotMessage {
  role: 'user' | 'bot';
  message: string;
  timestamp: number;
  intent?: string;
}

// ==================== MULTI-ACCOUNT MANAGEMENT TYPES ====================
export interface AccountInfo {
  accountID: string;
  userID: string;
  name: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended' | 'rate_limited';
  lastActive: number;
  createdAt: number;
  appState?: AppState;
}

export interface AccountSwitchOptions {
  preserveListeners?: boolean;
  warmup?: boolean;
  timeout?: number;
}

export interface AccountManagerConfig {
  maxAccounts: number;
  autoRotate?: boolean;
  rotateInterval?: number;
  balanceLoad?: boolean;
  failoverEnabled?: boolean;
}

export interface AccountStats {
  accountID: string;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  rateLimitHits: number;
  uptime: number;
}

// ==================== AUTOMATED RESPONSE TEMPLATES TYPES ====================
export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  trigger: TemplateTrigger;
  response: TemplateResponse;
  conditions?: TemplateCondition[];
  schedule?: TemplateSchedule;
  enabled: boolean;
  priority: number;
  stats: TemplateStats;
}

export interface TemplateTrigger {
  type: 'keyword' | 'regex' | 'intent' | 'event' | 'scheduled';
  value: string | string[];
  caseSensitive?: boolean;
  matchType?: 'exact' | 'contains' | 'startsWith' | 'endsWith';
}

export interface TemplateResponse {
  type: 'text' | 'random' | 'sequential' | 'conditional';
  content: string | string[];
  attachments?: string[];
  sticker?: string;
  delay?: number;
  variables?: Record<string, string>;
}

export interface TemplateCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: any;
}

export interface TemplateSchedule {
  enabled: boolean;
  days?: number[];
  startTime?: string;
  endTime?: string;
  timezone?: string;
}

export interface TemplateStats {
  triggered: number;
  lastTriggered?: number;
  successRate: number;
}

// ==================== MESSAGE SCHEDULING TYPES ====================
export interface ScheduledMessage {
  id: string;
  threadID: string;
  message: string | SendMessageOptions;
  scheduledTime: Date;
  timezone?: string;
  recurrence?: MessageRecurrence;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  createdAt: number;
  sentAt?: number;
  error?: string;
  retryCount?: number;
}

export interface MessageRecurrence {
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
  maxOccurrences?: number;
  occurrenceCount?: number;
}

export interface SchedulerConfig {
  enabled: boolean;
  checkInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  timezone?: string;
}

// ==================== SPAM DETECTION TYPES ====================
export interface SpamDetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  actions: SpamAction[];
  whitelist?: string[];
  blacklist?: string[];
  customPatterns?: SpamPattern[];
  mlEnabled?: boolean;
  reportToFacebook?: boolean;
}

export interface SpamPattern {
  name: string;
  pattern: string;
  type: 'regex' | 'keyword' | 'fuzzy';
  weight: number;
  action?: SpamAction;
}

export type SpamAction = 'ignore' | 'delete' | 'block' | 'report' | 'notify' | 'quarantine';

export interface SpamCheckResult {
  isSpam: boolean;
  score: number;
  reasons: SpamReason[];
  suggestedAction: SpamAction;
  confidence: number;
}

export interface SpamReason {
  type: 'pattern' | 'behavior' | 'reputation' | 'content' | 'frequency';
  description: string;
  weight: number;
}

export interface SpamReport {
  id: string;
  messageID: string;
  senderID: string;
  threadID: string;
  content: string;
  reasons: SpamReason[];
  action: SpamAction;
  timestamp: number;
  resolved?: boolean;
}

// ==================== GROUP ANALYTICS TYPES ====================
export interface GroupAnalytics {
  groupID: string;
  groupName: string;
  period: 'day' | 'week' | 'month' | 'all';
  memberStats: GroupMemberStats;
  activityStats: GroupActivityStats;
  contentStats: GroupContentStats;
  growthStats: GroupGrowthStats;
  topContributors: GroupContributor[];
  peakActivityTimes: PeakActivityTime[];
  sentimentAnalysis?: GroupSentiment;
}

export interface GroupMemberStats {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  leftMembers: number;
  adminCount: number;
  averageResponseTime: number;
}

export interface GroupActivityStats {
  totalMessages: number;
  averageMessagesPerDay: number;
  photos: number;
  videos: number;
  links: number;
  polls: number;
  events: number;
  reactions: number;
}

export interface GroupContentStats {
  topTopics: { topic: string; count: number }[];
  topEmojis: { emoji: string; count: number }[];
  topLinks: { domain: string; count: number }[];
  mediaRatio: number;
}

export interface GroupGrowthStats {
  memberGrowthRate: number;
  activityGrowthRate: number;
  retentionRate: number;
  churnRate: number;
}

export interface GroupContributor {
  userID: string;
  userName: string;
  messageCount: number;
  reactionCount: number;
  mediaCount: number;
  score: number;
}

export interface PeakActivityTime {
  hour: number;
  day: number;
  messageCount: number;
}

export interface GroupSentiment {
  positive: number;
  neutral: number;
  negative: number;
  overallScore: number;
}

// ==================== CROSS-PLATFORM MESSAGING BRIDGE TYPES ====================
export interface MessagingBridgeConfig {
  enabled: boolean;
  platforms: PlatformConfig[];
  syncMode: 'one-way' | 'two-way';
  messageFormat?: 'preserve' | 'standardize';
  attachmentHandling?: 'forward' | 'convert' | 'link';
}

export interface PlatformConfig {
  platform: SupportedPlatform;
  enabled: boolean;
  credentials: Record<string, string>;
  channelMappings: ChannelMapping[];
  messagePrefix?: string;
  webhookUrl?: string;
}

export type SupportedPlatform = 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'viber' | 'line' | 'messenger';

export interface ChannelMapping {
  sourceChannel: string;
  targetChannel: string;
  bidirectional: boolean;
  filters?: MessageFilter[];
}

export interface MessageFilter {
  type: 'include' | 'exclude';
  field: 'sender' | 'content' | 'type';
  pattern: string;
}

export interface BridgedMessage {
  id: string;
  sourcePlatform: SupportedPlatform;
  targetPlatform: SupportedPlatform;
  sourceChannel: string;
  targetChannel: string;
  originalMessage: any;
  transformedMessage: any;
  status: 'pending' | 'sent' | 'failed';
  timestamp: number;
  error?: string;
}

export interface BridgeStats {
  platform: SupportedPlatform;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  lastActivity: number;
}

// ==================== VOICE/VIDEO CALL TYPES ====================
export interface CallSession {
  callID: string;
  type: 'voice' | 'video';
  threadID: string;
  participants: CallParticipant[];
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  startTime: number;
  endTime?: number;
  duration?: number;
  initiatorID: string;
  quality: CallQuality;
  screenShare?: ScreenShareSession;
  encryption?: boolean;
}

export interface CallParticipant {
  userID: string;
  userName: string;
  joinedAt: number;
  leftAt?: number;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CallQuality {
  bitrate: number;
  packetLoss: number;
  latency: number;
  resolution?: string;
  frameRate?: number;
}

export interface CallOptions {
  type: 'voice' | 'video';
  encrypted?: boolean;
  maxParticipants?: number;
  recordCall?: boolean;
  timeout?: number;
}

export interface CallCallback {
  (event: CallEvent): void;
}

export interface CallEvent {
  type: 'participant_joined' | 'participant_left' | 'mute_changed' | 'video_changed' | 'quality_changed' | 'screen_share_started' | 'screen_share_ended' | 'call_ended';
  callID: string;
  participantID?: string;
  data?: any;
  timestamp: number;
}

// ==================== SCREEN SHARING TYPES ====================
export interface ScreenShareSession {
  sessionID: string;
  callID: string;
  sharerID: string;
  status: 'active' | 'paused' | 'ended';
  startTime: number;
  endTime?: number;
  quality: ScreenShareQuality;
  viewerCount: number;
}

export interface ScreenShareQuality {
  resolution: string;
  frameRate: number;
  bitrate: number;
}

export interface ScreenShareOptions {
  quality?: 'low' | 'medium' | 'high' | 'auto';
  audio?: boolean;
  optimizeFor?: 'motion' | 'detail';
}

// ==================== AI CONTENT MODERATION TYPES ====================
export interface ModerationConfig {
  enabled: boolean;
  provider?: 'builtin' | 'openai' | 'perspective' | 'custom';
  apiKey?: string;
  sensitivity: 'low' | 'medium' | 'high' | 'strict';
  categories: ModerationCategory[];
  actions: ModerationAction[];
  autoModerate?: boolean;
  notifyAdmins?: boolean;
  logAll?: boolean;
  customRules?: ModerationRule[];
}

export type ModerationCategory = 
  | 'hate_speech'
  | 'harassment'
  | 'violence'
  | 'sexual_content'
  | 'self_harm'
  | 'spam'
  | 'scam'
  | 'misinformation'
  | 'profanity'
  | 'personal_info'
  | 'illegal_content';

export interface ModerationRule {
  id: string;
  name: string;
  type: 'keyword' | 'regex' | 'ai' | 'custom';
  pattern?: string;
  category: ModerationCategory;
  action: ModerationActionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export type ModerationActionType = 'flag' | 'delete' | 'warn' | 'mute' | 'ban' | 'quarantine' | 'notify';

export interface ModerationAction {
  category: ModerationCategory;
  action: ModerationActionType;
  threshold: number;
}

export interface ModerationResult {
  id: string;
  messageID: string;
  threadID: string;
  senderID: string;
  content: string;
  flagged: boolean;
  categories: ModerationCategoryResult[];
  overallScore: number;
  action: ModerationActionType | null;
  actionTaken: boolean;
  timestamp: number;
  reviewedBy?: string;
  reviewedAt?: number;
  status: 'pending' | 'approved' | 'rejected' | 'auto_resolved';
}

export interface ModerationCategoryResult {
  category: ModerationCategory;
  score: number;
  flagged: boolean;
  details?: string;
}

export interface ModerationStats {
  totalChecked: number;
  totalFlagged: number;
  totalApproved: number;
  totalRejected: number;
  byCategory: Record<ModerationCategory, number>;
  byAction: Record<ModerationActionType, number>;
  avgProcessingTime: number;
  falsePositiveRate: number;
}

export interface ModerationQueue {
  items: ModerationResult[];
  totalCount: number;
  pendingCount: number;
}

// ==================== END-TO-END ENCRYPTION TYPES ====================
export interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305';
  keyExchange: 'ecdh' | 'x25519';
  autoRotateKeys: boolean;
  rotationInterval?: number;
  verifyIdentity?: boolean;
}

export interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
  createdAt: number;
  expiresAt?: number;
  keyId: string;
}

export interface EncryptedThread {
  threadID: string;
  enabled: boolean;
  keyPair: EncryptionKeyPair;
  participantKeys: Record<string, string>;
  lastRotation: number;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  tag: string;
  keyId: string;
  timestamp: number;
}

export interface EncryptionStatus {
  threadID: string;
  enabled: boolean;
  verified: boolean;
  lastKeyRotation: number;
  participantCount: number;
  allParticipantsVerified: boolean;
}

// ==================== BOT MARKETPLACE TYPES ====================
export interface BotMarketplaceConfig {
  enabled: boolean;
  allowExternalBots?: boolean;
  maxInstalledBots?: number;
  autoUpdate?: boolean;
  sandboxMode?: boolean;
}

export interface BotListing {
  id: string;
  name: string;
  description: string;
  author: string;
  authorID: string;
  version: string;
  category: BotCategory;
  capabilities: BotCapability[];
  rating: number;
  reviewCount: number;
  installCount: number;
  price: number;
  currency: string;
  verified: boolean;
  featured: boolean;
  iconUrl: string;
  screenshots: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
  permissions: BotPermission[];
}

export type BotCategory = 
  | 'productivity'
  | 'entertainment'
  | 'moderation'
  | 'analytics'
  | 'games'
  | 'utilities'
  | 'social'
  | 'education'
  | 'business'
  | 'other';

export type BotCapability = 
  | 'messaging'
  | 'commands'
  | 'reactions'
  | 'media'
  | 'moderation'
  | 'analytics'
  | 'scheduling'
  | 'webhooks'
  | 'ai'
  | 'games';

export type BotPermission = 
  | 'read_messages'
  | 'send_messages'
  | 'manage_threads'
  | 'manage_members'
  | 'access_user_info'
  | 'access_analytics'
  | 'manage_settings'
  | 'external_requests';

export interface InstalledBot {
  id: string;
  botID: string;
  name: string;
  version: string;
  installedAt: number;
  updatedAt: number;
  enabled: boolean;
  config: Record<string, any>;
  threads: string[];
  stats: BotStats;
}

export interface BotStats {
  commandsExecuted: number;
  messagesProcessed: number;
  errorsCount: number;
  lastActive: number;
  uptime: number;
}

export interface BotReview {
  id: string;
  botID: string;
  userID: string;
  userName: string;
  rating: number;
  review: string;
  createdAt: number;
  helpful: number;
  reported: boolean;
}

export interface BotSearchOptions {
  query?: string;
  category?: BotCategory;
  capabilities?: BotCapability[];
  minRating?: number;
  maxPrice?: number;
  verified?: boolean;
  sortBy?: 'rating' | 'installs' | 'newest' | 'price';
  limit?: number;
  offset?: number;
}

// ==================== CUSTOM WEBHOOK TRANSFORMATION TYPES ====================
export interface WebhookTransformConfig {
  enabled: boolean;
  transformations: WebhookTransformation[];
  errorHandling: 'skip' | 'abort' | 'fallback';
  fallbackPayload?: any;
  logging?: boolean;
}

export interface WebhookTransformation {
  id: string;
  name: string;
  webhookID?: string;
  eventTypes?: WebhookEventType[];
  priority: number;
  enabled: boolean;
  type: 'map' | 'filter' | 'enrich' | 'custom';
  config: TransformationConfig;
}

export interface TransformationConfig {
  mappings?: FieldMapping[];
  filters?: TransformFilter[];
  enrichments?: Enrichment[];
  customFunction?: string;
  template?: string;
}

export interface FieldMapping {
  source: string;
  target: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'hash' | 'mask' | 'custom';
  defaultValue?: any;
}

export interface TransformFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'matches' | 'exists';
  value: any;
  action: 'include' | 'exclude';
}

export interface Enrichment {
  field: string;
  source: 'user_info' | 'thread_info' | 'timestamp' | 'custom';
  value?: any;
}

export interface TransformationResult {
  transformationID: string;
  success: boolean;
  originalPayload: any;
  transformedPayload: any;
  error?: string;
  processingTime: number;
}

