import { 
  login, 
  loginWithCheckpointHandler,
  LiwanagOptions, 
  AppState, 
  LiwanagApi,
  CheckpointData,
  TwoFactorAuthOptions,
  TimelinePostOptions,
  WebhookConfig
} from './index';
import { Logger } from './utils/logger';

const demoAppState: AppState = {
  cookies: [
    { name: 'c_user', value: '100000000000000', domain: '.facebook.com', path: '/' },
    { name: 'xs', value: 'demo_session_token', domain: '.facebook.com', path: '/' },
    { name: 'datr', value: 'demo_datr_value', domain: '.facebook.com', path: '/' }
  ],
  userId: '100000000000000',
  fbDtsg: 'demo_dtsg_token',
  revision: 1
};

const options: LiwanagOptions = {
  logConfig: {
    level: 'DEBUG',
    colorize: true,
    timestamp: true,
    saveToFile: false,
    format: 'detailed',
    language: 'tl'
  },
  autoRefresh: {
    enabled: true,
    interval: 30,
    refreshBeforeExpiry: 10,
    maxRetries: 3
  },
  fingerprint: {
    autoRotate: true,
    rotationInterval: 6 * 60 * 60 * 1000,
    browserProfile: 'chrome',
    platform: 'Windows'
  },
  patternDiffuser: {
    enabled: true,
    humanLikeDelays: {
      min: 500,
      max: 2000,
      distribution: 'normal'
    }
  },
  rateLimiter: {
    enabled: true,
    adaptive: true,
    limits: {
      messagesPerMinute: 10,
      messagesPerHour: 200,
      messagesPerDay: 1500,
      newAccountMultiplier: 0.5,
      groupMessagesMultiplier: 0.7
    }
  }
};

console.log('\n');
console.log('='.repeat(60));
console.log('  LIWANAG FCA - Demo Application');
console.log('  Filipino Facebook Chat API Library');
console.log('='.repeat(60));
console.log('\n');

login({ appState: demoAppState }, options, async (err, api) => {
  if (err) {
    console.error('Login failed:', err.message);
    return;
  }

  console.log('\n--- API Ready ---\n');

  console.log('User ID:', api.getUserID());
  console.log('\n');

  console.log('--- Cookie Status ---');
  const cookieStatus = api.getCookieStatus();
  console.log('Valid:', cookieStatus.valid);
  console.log('Health:', cookieStatus.health);
  console.log('Expires In:', cookieStatus.expiresIn);
  console.log('\n');

  console.log('--- Cookie Health Check ---');
  const health = await api.checkCookieHealth();
  console.log('Status:', health.status);
  console.log('Score:', health.score);
  if (health.issues.length > 0) {
    console.log('Issues:', health.issues.join(', '));
  }
  if (health.recommendations.length > 0) {
    console.log('Recommendations:', health.recommendations.join(', '));
  }
  console.log('\n');

  console.log('--- Getting User Info ---');
  try {
    const userInfo = await api.kuninAngUserInfo(['100000000000001', '100000000000002']);
    console.log('Retrieved user info for', Object.keys(userInfo).length, 'users');
  } catch (error) {
    console.log('User info example complete');
  }
  console.log('\n');

  console.log('--- Sending Message Demo ---');
  try {
    const result = await api.magpadalaNgMensahe('Kumusta! Ito ay test message.', '123456789');
    console.log('Message sent with ID:', result.messageID);
  } catch (error) {
    console.log('Message demo complete');
  }
  console.log('\n');

  // ==================== NEW FEATURES DEMO ====================

  console.log('--- Sticker Support Demo ---');
  try {
    const stickerResult = await api.magpadalaNgSticker('369239263222822', '123456789');
    console.log('Sticker sent with ID:', stickerResult.messageID);
    
    const stickerUrl = await api.getStickerURL('369239263222822');
    console.log('Sticker URL:', stickerUrl);
  } catch (error) {
    console.log('Sticker demo complete');
  }
  console.log('\n');

  console.log('--- Timeline Posting Demo ---');
  try {
    const postOptions: TimelinePostOptions = {
      privacy: 'friends',
      feeling: 'happy'
    };
    const post = await api.magpostsaTimeline('Kumusta mundo! Testing Liwanag FCA!', postOptions);
    console.log('Posted to timeline with ID:', post.postID);
    console.log('Privacy:', post.privacy);
  } catch (error) {
    console.log('Timeline posting demo complete');
  }
  console.log('\n');

  console.log('--- Friend Request Management Demo ---');
  try {
    await api.magpadalaNgFriendRequest('100000000000003');
    console.log('Friend request sent successfully');
    
    const friendRequests = await api.kuninAngFriendRequests();
    console.log('Pending friend requests:', friendRequests.length);
    
    const friends = await api.getFriendsList();
    console.log('Total friends:', friends.length);
  } catch (error) {
    console.log('Friend request demo complete');
  }
  console.log('\n');

  console.log('--- Notification Handling Demo ---');
  try {
    const notifications = await api.kuninAngNotifications(10);
    console.log('Recent notifications:', notifications.length);
    
    api.onNotification((notification) => {
      console.log('New notification:', notification.title);
    });
    console.log('Notification listener registered');
  } catch (error) {
    console.log('Notification demo complete');
  }
  console.log('\n');

  console.log('--- Webhook Integration Demo ---');
  try {
    const webhookConfig: WebhookConfig = {
      url: 'https://your-webhook-url.com/liwanag',
      events: ['message', 'friend_request', 'notification'],
      secret: 'your-webhook-secret',
      retryCount: 3,
      retryDelay: 1000
    };
    
    api.registerWebhook(webhookConfig);
    
    const registeredWebhooks = api.getWebhooks();
    console.log('Registered webhooks:', registeredWebhooks.length);
    console.log('Webhook events:', webhookConfig.events.join(', '));
  } catch (error) {
    console.log('Webhook demo complete');
  }
  console.log('\n');

  // ==================== VERSION 0.4.0 NEW FEATURES ====================

  console.log('--- Live Video Streaming Demo ---');
  try {
    const liveStream = await api.startLiveStream({
      title: 'Liwanag FCA Live Demo',
      description: 'Testing live streaming feature',
      privacy: 'friends'
    });
    console.log('Live stream started with ID:', liveStream.streamID);
    console.log('RTMP URL:', liveStream.rtmpUrl);
    
    api.onLiveStreamEvent(liveStream.streamID, (eventType, data) => {
      console.log('Live stream event:', eventType, data);
    });
    
    const activeStreams = await api.getLiveStreams();
    console.log('Active streams:', activeStreams.length);
    
    await api.endLiveStream(liveStream.streamID);
    console.log('Live stream ended');
  } catch (error) {
    console.log('Live streaming demo complete');
  }
  console.log('\n');

  console.log('--- NLP Chatbot Integration Demo ---');
  try {
    api.configureChatbot({
      enabled: true,
      language: 'tl',
      intents: [
        {
          name: 'greeting',
          patterns: ['kumusta', 'hello', 'hi', 'magandang araw'],
          responses: ['Kumusta ka!', 'Hello! Paano kita matutulungan?']
        },
        {
          name: 'farewell',
          patterns: ['paalam', 'bye', 'goodbye'],
          responses: ['Paalam!', 'Ingat ka!']
        }
      ],
      contextMemory: 5,
      fallbackResponse: 'Pasensya, hindi ko maintindihan. Pwede mo bang ulitin?'
    });
    console.log('Chatbot configured with intents');
    
    const response = await api.processChatbotMessage('100000000000001', 'kumusta po');
    console.log('Chatbot response:', response.response);
    console.log('Matched intent:', response.intent);
    console.log('Confidence:', response.confidence);
  } catch (error) {
    console.log('Chatbot demo complete');
  }
  console.log('\n');

  console.log('--- Multi-Account Management Demo ---');
  try {
    const account1 = await api.addAccount(demoAppState, 'Primary Account');
    console.log('Added account:', account1.name);
    
    const accounts = api.getAccounts();
    console.log('Total accounts:', accounts.length);
    
    await api.switchAccount(account1.accountID);
    console.log('Switched to account:', account1.name);
  } catch (error) {
    console.log('Multi-account demo complete');
  }
  console.log('\n');

  console.log('--- Automated Response Templates Demo ---');
  try {
    api.addTemplate({
      id: 'welcome',
      name: 'Welcome Message',
      category: 'greetings',
      trigger: { type: 'event', value: 'new_member' },
      response: { type: 'text', content: 'Maligayang pagdating sa grupo! Basahin po ang rules.' },
      enabled: true,
      priority: 1,
      stats: { triggered: 0, successRate: 100 }
    });
    console.log('Template added: Welcome Message');
    
    const templates = api.getTemplates();
    console.log('Total templates:', templates.length);
  } catch (error) {
    console.log('Templates demo complete');
  }
  console.log('\n');

  console.log('--- Message Scheduling Demo ---');
  try {
    const scheduled = await api.scheduleMessage(
      '123456789',
      'Scheduled message from Liwanag!',
      new Date(Date.now() + 60000)
    );
    console.log('Message scheduled with ID:', scheduled.id);
    console.log('Scheduled for:', new Date(scheduled.scheduledTime).toLocaleString());
    
    api.configureScheduler({ enabled: true, checkInterval: 5000 });
    console.log('Scheduler enabled');
    
    const pendingMessages = api.getScheduledMessages();
    console.log('Pending scheduled messages:', pendingMessages.length);
  } catch (error) {
    console.log('Scheduler demo complete');
  }
  console.log('\n');

  console.log('--- Spam Detection Demo ---');
  try {
    api.configureSpamDetection({
      enabled: true,
      sensitivity: 'medium',
      actions: ['notify', 'quarantine'],
      customPatterns: [
        { name: 'buy_now', pattern: 'buy now', type: 'keyword', weight: 0.8 },
        { name: 'free_money', pattern: 'free money', type: 'keyword', weight: 0.9 },
        { name: 'click_here', pattern: 'click here', type: 'keyword', weight: 0.6 }
      ]
    });
    console.log('Spam detection configured');
    
    const spamCheck = await api.checkForSpam('Click here for free money!', '100000000000001', '123456789');
    console.log('Is spam:', spamCheck.isSpam);
    console.log('Spam score:', spamCheck.score);
    console.log('Reasons:', spamCheck.reasons.map(r => r.description).join(', '));
    
    api.addToWhitelist('100000000000002');
    console.log('Added user to whitelist');
  } catch (error) {
    console.log('Spam detection demo complete');
  }
  console.log('\n');

  console.log('--- Group Analytics Demo ---');
  try {
    const analytics = await api.getGroupAnalytics('123456789012345');
    console.log('Group analytics retrieved');
    console.log('Total messages:', analytics.activityStats.totalMessages);
    console.log('Active members:', analytics.memberStats.activeMembers);
    console.log('Peak times:', analytics.peakActivityTimes.length);
    
    const topContributors = await api.getTopContributors('123456789012345', 5);
    console.log('Top contributors:', topContributors.length);
    
    const sentiment = await api.getGroupSentiment('123456789012345');
    console.log('Group sentiment score:', sentiment.overallScore);
    console.log('Positive:', sentiment.positive + '%');
  } catch (error) {
    console.log('Group analytics demo complete');
  }
  console.log('\n');

  console.log('--- Cross-Platform Messaging Bridge Demo ---');
  try {
    api.configureBridge({
      enabled: true,
      platforms: [
        { platform: 'telegram', enabled: true, credentials: { token: 'demo-token' }, channelMappings: [] },
        { platform: 'discord', enabled: true, credentials: { webhookUrl: 'https://discord.com/api/webhooks/demo' }, channelMappings: [] }
      ],
      syncMode: 'two-way',
      messageFormat: 'standardize'
    });
    console.log('Bridge configured for: Telegram, Discord');
    
    const bridgeResult = await api.sendCrossPlatformMessage('telegram', '-100123456789', 'Hello from Liwanag FCA!');
    console.log('Cross-platform message sent');
    console.log('  Message ID:', bridgeResult.id);
    console.log('  Target platform:', bridgeResult.targetPlatform);
    console.log('  Status:', bridgeResult.status);
    
    const bridgedMessages = api.getBridgedMessages();
    console.log('Total bridged messages:', bridgedMessages.length);
    
    const bridgeStats = api.getBridgeStats();
    console.log('Bridge platforms active:', bridgeStats.length);
  } catch (error) {
    console.log('Cross-platform bridge demo complete');
  }
  console.log('\n');

  // ==================== v0.5.0 FEATURES ====================

  console.log('--- Voice/Video Call Demo ---');
  try {
    const voiceCall = await api.startVoiceCall('demo_thread', { encrypted: true });
    console.log('Voice call started:', voiceCall.callID);
    console.log('Call status:', voiceCall.status);
    console.log('Participants:', voiceCall.participants.length);
    
    const videoCall = await api.magsimulaNgVideoCall('demo_thread');
    console.log('Video call started:', videoCall.callID);
    console.log('Video call type:', videoCall.type);
    
    const activeCalls = api.getActiveCalls();
    console.log('Active calls:', activeCalls.length);
    
    await api.endCall(voiceCall.callID);
    console.log('Voice call ended');
  } catch (error) {
    console.log('Voice/Video call demo complete');
  }
  console.log('\n');

  console.log('--- Screen Sharing Demo ---');
  try {
    const call = await api.startVideoCall('screen_demo_thread');
    const screenShare = await api.startScreenShare(call.callID, {
      quality: 'high',
      audio: true,
      optimizeFor: 'detail'
    });
    console.log('Screen share started:', screenShare.sessionID);
    console.log('Screen share status:', screenShare.status);
    
    await api.pauseScreenShare(call.callID);
    console.log('Screen share paused');
    
    await api.resumeScreenShare(call.callID);
    console.log('Screen share resumed');
    
    await api.itigilAngScreenShare(call.callID);
    console.log('Screen share stopped');
  } catch (error) {
    console.log('Screen sharing demo complete');
  }
  console.log('\n');

  console.log('--- AI Content Moderation Demo ---');
  try {
    api.configureModeration({
      enabled: true,
      provider: 'builtin',
      sensitivity: 'medium',
      categories: ['hate_speech', 'spam', 'harassment', 'violence'],
      actions: [
        { category: 'hate_speech', action: 'delete', threshold: 0.8 },
        { category: 'spam', action: 'flag', threshold: 0.7 }
      ],
      autoModerate: true,
      notifyAdmins: true
    });
    console.log('Moderation configured');
    
    const cleanResult = await api.evaluateMessage('Kumusta! Magandang araw!', 'user1', 'thread1');
    console.log('Clean message flagged:', cleanResult.flagged);
    console.log('Clean message score:', cleanResult.overallScore.toFixed(2));
    
    const suspectResult = await api.suriiinAngMensahe('This is spam content for testing', 'user2', 'thread2');
    console.log('Suspect message flagged:', suspectResult.flagged);
    console.log('Suspect message score:', suspectResult.overallScore.toFixed(2));
    
    const queue = api.getModerationQueue('pending');
    console.log('Moderation queue items:', queue.pendingCount);
    
    const stats = api.kuninAngModerationStats();
    console.log('Total messages checked:', stats.totalChecked);
    console.log('Total flagged:', stats.totalFlagged);
  } catch (error) {
    console.log('AI moderation demo complete');
  }
  console.log('\n');

  console.log('--- End-to-End Encryption Demo ---');
  try {
    api.configureEncryption({
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyExchange: 'x25519',
      autoRotateKeys: true,
      rotationInterval: 24 * 60 * 60 * 1000
    });
    console.log('Encryption configured');
    
    const encStatus = await api.enableEncryption('encrypted_thread');
    console.log('Encryption enabled:', encStatus.enabled);
    console.log('Encryption verified:', encStatus.verified);
    
    const status = api.kuninAngEncryptionStatus('encrypted_thread');
    console.log('Thread encryption status:', status?.enabled);
    
    const newKeys = await api.rotateEncryptionKeys('encrypted_thread');
    console.log('Keys rotated, new key ID:', newKeys.keyId);
    
    const threads = api.getEncryptedThreads();
    console.log('Total encrypted threads:', threads.length);
  } catch (error) {
    console.log('E2E encryption demo complete');
  }
  console.log('\n');

  console.log('--- Bot Marketplace Demo ---');
  try {
    api.configureBotMarketplace({
      enabled: true,
      maxInstalledBots: 10,
      autoUpdate: true,
      sandboxMode: false
    });
    console.log('Bot marketplace configured');
    
    const bots = await api.hanapiNgMgaBot({ category: 'moderation', verified: true });
    console.log('Found', bots.length, 'bots matching criteria');
    
    if (bots.length > 0) {
      const bot = bots[0];
      console.log('Top bot:', bot.name, '- Rating:', bot.rating);
      
      const installed = await api.installBot(bot.id);
      console.log('Bot installed:', installed.name);
      
      const installedBots = api.kuninAngMgaInstalledBot();
      console.log('Total installed bots:', installedBots.length);
      
      api.enableBot(bot.id);
      console.log('Bot enabled');
      
      api.configureBotForThread(bot.id, 'demo_thread', { prefix: '!' });
      console.log('Bot configured for thread');
    }
  } catch (error) {
    console.log('Bot marketplace demo complete');
  }
  console.log('\n');

  console.log('--- Webhook Transformations Demo ---');
  try {
    api.configureWebhookTransforms({
      enabled: true,
      transformations: [],
      errorHandling: 'skip',
      logging: true
    });
    console.log('Webhook transforms configured');
    
    api.addWebhookTransformation({
      id: 'demo-transform',
      name: 'Demo Transformation',
      priority: 1,
      enabled: true,
      type: 'map',
      config: {
        mappings: [
          { source: 'senderName', target: 'sender', transform: 'uppercase' },
          { source: 'message', target: 'content' }
        ],
        enrichments: [
          { field: 'processedAt', source: 'timestamp' }
        ]
      }
    });
    console.log('Transformation added');
    
    const testResult = api.testWebhookTransformation('demo-transform', {
      senderName: 'john doe',
      message: 'Hello world!'
    });
    console.log('Transform test success:', testResult.success);
    console.log('Original sender:', 'john doe');
    console.log('Transformed sender:', testResult.transformedPayload?.sender);
    
    const transforms = api.kuninAngMgaTransformation();
    console.log('Total transformations:', transforms.length);
  } catch (error) {
    console.log('Webhook transformations demo complete');
  }
  console.log('\n');

  console.log('--- Starting Message Listener ---');
  api.makinigSaMensahe((err, message) => {
    if (err) {
      console.error('Listener error:', err.message);
      return;
    }
    console.log('Received message:', message.body);
  });

  console.log('\n');
  console.log('='.repeat(60));
  console.log('  Demo Complete! Liwanag v0.6.6 is ready to use.');
  console.log('  Enhanced MQTT for Group Chat & Private Messages!');
  console.log('='.repeat(60));
  console.log('\n');

  const logger = new Logger({ language: 'tl' });
  logger.printStats();

  console.log('\nPress Ctrl+C to exit...\n');
});
