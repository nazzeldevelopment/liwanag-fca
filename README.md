# Liwanag 🌟

### Filipino Facebook Chat API Library

Ang **Liwanag** ay isang comprehensive at user-friendly na Filipino version ng Facebook Chat API library na specially designed para sa mga Filipino developers. Nag-aalok ito ng complete automation at interaction capabilities para sa Facebook accounts.

[![npm version](https://badge.fury.io/js/liwanag-fca.svg)](https://www.npmjs.com/package/liwanag-fca)
[![CI](https://github.com/nazzeldevelopment/liwanag-fca/actions/workflows/ci.yml/badge.svg)](https://github.com/nazzeldevelopment/liwanag/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-98.8%25-blue)](https://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/node/v/liwanag-fca)](https://nodejs.org)
[![Downloads](https://img.shields.io/npm/dm/liwanag-fca.svg)](https://www.npmjs.com/package/liwanag-fca)
[![GitHub Stars](https://img.shields.io/github/stars/nazzeldevelopment/bituin-fca)](https://github.com/nazzeldevelopment/liwanag-fca/stargazers)

---

## 📦 Installation

```bash
npm install liwanag-fca
```

---

## 🚀 Quick Start

### Using AppState (Recommended)

```typescript
const liwanag = require('liwanag-fca');

// Load your appstate (cookies from browser)
const appState = require('./appstate.json');

liwanag.login({ appState }, {}, (err, api) => {
    if (err) return console.error(err);
    
    console.log('Logged in as:', api.getUserID());
    
    // Makinig sa messages
    api.makinigSaMensahe((err, message) => {
        if (err) return console.error(err);
        
        console.log('Message received:', message.body);
        
        // Mag-reply
        api.magpadalaNgMensahe('Salamat sa message mo!', message.threadID);
    });
});
```

---

## 🎨 Advanced Logging System

### Beautiful Console Logs with Colors and Formatting

```typescript
const liwanag = require('liwanag-fca');

const options = {
    logConfig: {
        level: 'INFO',           // Minimum log level
        colorize: true,          // Enable colors
        timestamp: true,         // Show timestamps
        saveToFile: true,        // Save logs to file
        logDirectory: './logs',  // Log file location
        maxFileSize: '10MB',     // Max log file size
        maxFiles: 7,             // Keep 7 days of logs
        format: 'detailed',      // 'simple', 'detailed', or 'json'
        showPerformance: true,   // Show response times
        showMemory: true,        // Show memory usage
        language: 'tl'           // 'tl' for Tagalog, 'en' for English
    }
};

liwanag.login({ appState }, options, (err, api) => {
    // Your code here
});
```

### Log Levels
- **SUCCESS** 🟢 - Green colored success messages
- **INFO** 🔵 - Blue colored information logs
- **WARNING** 🟡 - Yellow colored warnings
- **ERROR** 🔴 - Red colored errors
- **DEBUG** 🟣 - Purple colored debug information
- **SYSTEM** ⚪ - White colored system messages

---

## 🔄 Auto-Refresh Cookies System

### Intelligent Cookie Management

```typescript
api.autoRefreshCookies({
    enabled: true,
    interval: 30,              // Check every 30 minutes
    refreshBeforeExpiry: 10,   // Refresh 10 minutes before expiry
    maxRetries: 3,             // Retry 3 times if failed
    onRefresh: (info) => {
        console.log('Cookies refreshed!', info);
    },
    onError: (error) => {
        console.error('Refresh failed:', error);
    }
});

// Manual refresh
await api.refreshCookies();

// Get cookie status
const status = api.getCookieStatus();
console.log(status);
// {
//   valid: true,
//   expiresIn: '1h 45m',
//   lastRefresh: '30m ago',
//   nextRefresh: '15m',
//   health: 'excellent'
// }
```

---

## 🕵️ Anti-Detection Suite

### FingerprintManager
```typescript
api.fingerprintManager({
    autoRotate: true,
    rotationInterval: 6 * 60 * 60 * 1000, // 6 hours
    consistency: 'high',
    browserProfile: 'chrome',
    platform: 'Windows',
    onRotation: (newFingerprint) => {
        console.log('Fingerprint rotated:', newFingerprint);
    }
});
```

### RequestObfuscator
```typescript
api.requestObfuscator({
    enabled: true,
    entropyLevel: 'high',
    headerRandomization: true,
    payloadEncryption: true,
    parameterShuffle: true,
    timestampFuzz: {
        enabled: true,
        variance: 500
    }
});
```

### PatternDiffuser
```typescript
api.patternDiffuser({
    enabled: true,
    humanLikeDelays: {
        min: 800,
        max: 3500,
        distribution: 'normal'
    },
    burstPrevention: {
        maxBurst: 5,
        cooldownPeriod: 10000
    },
    typingSimulation: {
        enabled: true,
        wpm: 45,
        variance: 15
    }
});
```

### SmartRateLimiter
```typescript
api.smartRateLimiter({
    enabled: true,
    adaptive: true,
    limits: {
        messagesPerMinute: 10,
        messagesPerHour: 200,
        messagesPerDay: 1500,
        newAccountMultiplier: 0.5,
        groupMessagesMultiplier: 0.7
    },
    burstAllowance: {
        enabled: true,
        maxBurst: 20,
        cooldown: 600000
    }
});
```

---

## 🎯 Main Features

### Messaging
```typescript
// Magpadala ng text message
await api.magpadalaNgMensahe('Hello!', threadID);

// Magpadala ng message with options
await api.sendMessage({
    body: 'Hello @User!',
    mentions: [{ id: 'userID', tag: '@User' }]
}, threadID);

// Makinig sa mga mensahe
api.makinigSaMensahe((err, message) => {
    console.log(message.body);
});
```

### User Information
```typescript
// Kunin ang user info
const userInfo = await api.kuninAngUserInfo(['userID1', 'userID2']);

// Or using English method name
const userInfo = await api.getUserInfo(['userID1', 'userID2']);
```

### Thread Management
```typescript
// Kunin ang thread info
const threadInfo = await api.kuninAngThreadInfo(threadID);

// Kunin ang thread list
const threads = await api.getThreadList(20, null, []);
```

### Group Management
```typescript
// Gumawa ng group
const groupID = await api.gumawaNgGroup(['user1', 'user2'], 'Group Name');

// Magdagdag ng member
await api.magdagdagNgMember(threadID, 'newUserID');

// Magtanggal ng member
await api.magtanggalNgMember(threadID, 'userID');

// Palitan ang group name
await api.palitanAngGroupName(threadID, 'New Group Name');
```

---

## 🌟 Special Filipino Functions

### Mga Special na Pangalang Tagalog

| Tagalog Method | English Equivalent | Description |
|----------------|-------------------|-------------|
| `magpadalaNgMensahe()` | `sendMessage()` | Send message |
| `makinigSaMensahe()` | `listenMqtt()` | Listen to messages |
| `kuninAngUserInfo()` | `getUserInfo()` | Get user info |
| `kuninAngThreadInfo()` | `getThreadInfo()` | Get thread info |
| `kuninAngThreadList()` | `getThreadList()` | Get thread list |
| `gumawaNgGroup()` | `createGroup()` | Create group |
| `magdagdagNgMember()` | `addUserToGroup()` | Add member |
| `magtanggalNgMember()` | `removeUserFromGroup()` | Remove member |
| `palitanAngGroupName()` | `setTitle()` | Change group name |
| `magpadalaNgLarawan()` | `sendPhoto()` | Send photo |
| `magpadalaNgVideo()` | `sendVideo()` | Send video |
| `magpadalaNgSticker()` | `sendSticker()` | Send sticker |
| `magpostsaTimeline()` | `postToTimeline()` | Post to timeline |
| `magpadalaNgFriendRequest()` | `sendFriendRequest()` | Send friend request |
| `tanggapinAngFriendRequest()` | `acceptFriendRequest()` | Accept friend request |
| `kuninAngFriendRequests()` | `getFriendRequests()` | Get friend requests |
| `kuninAngNotifications()` | `getNotifications()` | Get notifications |

---

## 🛡️ Security Features

- **Rate Limiting** - Prevent spam detection
- **Request Delay** - Configurable delays between requests
- **Proxy Support** - Use proxy servers
- **User Agent Rotation** - Avoid detection
- **Cookie Management** - Handle session cookies
- **Auto-Refresh Cookies** - Automatic session refresh
- **Fingerprint Rotation** - Browser fingerprint spoofing
- **Traffic Analysis Resistance** - Timing jitter and variability

---

## 📋 API Reference

### Login Methods
- `login(credentials, options, callback)` - Login with credentials or appState
- `loginFromAppState(path, options, callback)` - Login from appState file
- `loginWithTwoFactor(credentials, code, options, callback)` - Login with 2FA code
- `loginWithCheckpointHandler(credentials, handler, options, callback)` - Login with checkpoint handler

### Messaging Methods
- `sendMessage(message, threadID, callback)` / `magpadalaNgMensahe()`
- `listenMqtt(callback)` / `makinigSaMensahe()`
- `setMessageReaction(reaction, messageID, callback)`
- `unsendMessage(messageID, callback)`
- `markAsRead(threadID, callback)`
- `markAsReadAll(callback)`

### Photo/Video Methods
- `sendPhoto(path, threadID, caption, callback)` / `magpadalaNgLarawan()`
- `sendVideo(path, threadID, caption, callback)` / `magpadalaNgVideo()`

### Sticker Methods
- `sendSticker(stickerID, threadID, callback)` / `magpadalaNgSticker()`
- `getStickerURL(stickerID, callback)` - Get sticker image URL

### Timeline Methods
- `postToTimeline(message, options, callback)` / `magpostsaTimeline()`
- `editPost(postID, newMessage, callback)`
- `deletePost(postID, callback)`

### Friend Request Methods
- `sendFriendRequest(userID, callback)` / `magpadalaNgFriendRequest()`
- `acceptFriendRequest(userID, callback)` / `tanggapinAngFriendRequest()`
- `declineFriendRequest(userID, callback)`
- `cancelFriendRequest(userID, callback)`
- `unfriend(userID, callback)`
- `getFriendRequests(callback)` / `kuninAngFriendRequests()`
- `getFriendsList(callback)`

### Notification Methods
- `getNotifications(limit, callback)` / `kuninAngNotifications()`
- `markNotificationAsRead(notificationID, callback)`
- `markAllNotificationsAsRead(callback)`
- `onNotification(callback)` - Real-time notification listener

### Webhook Methods
- `registerWebhook(config)` - Register webhook endpoint
- `unregisterWebhook(webhookID)` - Remove webhook
- `getWebhooks()` - List registered webhooks

### User Methods
- `getUserInfo(userIDs, callback)` / `kuninAngUserInfo()`
- `getUserID()` - Get current user ID

### Thread Methods
- `getThreadInfo(threadID, callback)` / `kuninAngThreadInfo()`
- `getThreadList(limit, timestamp, tags, callback)` / `kuninAngThreadList()`

### Group Methods
- `createGroup(participantIDs, name, callback)` / `gumawaNgGroup()`
- `addUserToGroup(userIDs, threadID, callback)` / `magdagdagNgMember()`
- `removeUserFromGroup(userID, threadID, callback)` / `magtanggalNgMember()`
- `setTitle(title, threadID, callback)` / `palitanAngGroupName()`

### Cookie Methods
- `autoRefreshCookies(config)` - Configure auto refresh
- `refreshCookies()` - Manual refresh
- `getCookieStatus()` - Get cookie status
- `checkCookieHealth()` - Check cookie health
- `exportCookies()` - Export cookies
- `saveCookies(path)` - Save to file
- `loadCookies(path)` - Load from file
- `rotateCookies(options)` - Rotate cookies

### Anti-Detection Methods
- `fingerprintManager(config)` - Configure fingerprint manager
- `requestObfuscator(config)` - Configure request obfuscator
- `patternDiffuser(config)` - Configure pattern diffuser
- `smartRateLimiter(config)` - Configure rate limiter

---

## 🎤 Voice Message Support

```typescript
// Send voice message
await api.sendVoice('./audio.mp3', threadID, { duration: 30 });
await api.magpadalaNgBoses('./audio.mp3', threadID);
```

---

## 📎 File Attachment Support

```typescript
// Send documents and files
await api.sendFile('./document.pdf', threadID, { filename: 'Report.pdf' });
await api.magpadalaNgFile('./spreadsheet.xlsx', threadID);
```

Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR (up to 100MB)

---

## 📱 Story/Reels Posting

### Stories
```typescript
// Post a story
const story = await api.postStory('./photo.jpg', {
  privacy: 'friends',
  textOverlay: 'Hello World!',
  expiresIn: 24 * 60 * 60 * 1000 // 24 hours
});

// Get stories
const stories = await api.getStories();
await api.kuninAngStories(userID);

// Delete story
await api.deleteStory(storyID);
```

### Reels
```typescript
// Post a reel
const reel = await api.postReel('./video.mp4', {
  caption: 'Check this out!',
  privacy: 'public'
});

// Get reels
const reels = await api.getReels();
await api.kuninAngReels(userID);
```

---

## 🛒 Marketplace Integration

```typescript
// Create a listing
const listing = await api.createListing({
  title: 'iPhone 15 Pro',
  description: 'Brand new, sealed',
  price: 65000,
  currency: 'PHP',
  category: 'electronics',
  condition: 'new',
  photos: ['./photo1.jpg', './photo2.jpg'],
  location: 'Manila'
});

// Search marketplace
const results = await api.searchMarketplace({
  query: 'iPhone',
  category: 'electronics',
  minPrice: 20000,
  maxPrice: 80000,
  sortBy: 'price_low'
});

// Get my listings
const myListings = await api.getMyListings();
await api.kuninAngMgaListingsKo();

// Mark as sold
await api.markAsSold(listingID);
```

---

## 🎮 Gaming & Watch Together

### Watch Together
```typescript
// Start watch party
const session = await api.startWatchTogether(threadID, {
  videoUrl: 'https://youtube.com/watch?v=...',
  videoTitle: 'Movie Night',
  autoStart: true
});

// Control playback
await api.controlWatchTogether(sessionID, 'play');
await api.controlWatchTogether(sessionID, 'pause');
await api.controlWatchTogether(sessionID, 'seek', 120); // Seek to 2:00
```

### Gaming
```typescript
// Get available games
const games = await api.getAvailableGames();

// Start a game
const game = await api.startGame(threadID, 'trivia');

// Send game invite
await api.sendGameInvite(threadID, 'wordguess');
```

---

## 📊 Analytics Dashboard

```typescript
// Get analytics
const analytics = await api.getAnalytics('week');
console.log(analytics.messageStats);
console.log(analytics.performanceStats);

// Export analytics
await api.exportAnalytics('json', './analytics.json');
await api.exportAnalytics('csv', './analytics.csv');

// Reset analytics
await api.resetAnalytics();
```

---

## 🔌 Plugin System

```typescript
// Create a plugin
const myPlugin = {
  id: 'auto-reply',
  name: 'Auto Reply Plugin',
  version: '1.0.0',
  description: 'Automatically replies to messages',
  author: 'Your Name',
  enabled: true,
  hooks: [{
    event: 'onMessageReceived',
    priority: 10,
    handler: async (message, api) => {
      if (message.body.toLowerCase() === 'hello') {
        await api.sendMessage('Hi there!', message.threadID);
      }
      return message;
    }
  }]
};

// Register plugin
api.registerPlugin(myPlugin);

// Manage plugins
api.enablePlugin('auto-reply');
api.disablePlugin('auto-reply');
api.unregisterPlugin('auto-reply');

// List plugins
const plugins = api.getPlugins();
```

---

## 📺 Live Video Streaming

```typescript
// Start a live stream
const stream = await api.startLiveStream({
  title: 'My Live Stream',
  description: 'Streaming with Liwanag!',
  privacy: 'friends'
});
await api.magsimulaNgLiveStream(options);

console.log('RTMP URL:', stream.rtmpUrl);
console.log('Stream Key:', stream.streamKey);

// Listen for stream events
api.onLiveStreamEvent(stream.streamId, (event) => {
  console.log('Viewers:', event.viewerCount);
  console.log('Comments:', event.comments);
});

// End the stream
await api.endLiveStream(stream.streamId);
await api.tapusinAngLiveStream(streamId);

// Get active streams
const streams = await api.getLiveStreams();
await api.kuninAngMgaLiveStream();
```

---

## 🤖 NLP Chatbot Integration

```typescript
// Configure chatbot
api.configureChatbot({
  enabled: true,
  language: 'tl', // Tagalog
  fallbackResponse: 'Pasensya, hindi ko maintindihan.',
  provider: 'builtin'
});
api.iConfigAngChatbot(options);

// Add intents
api.addChatbotIntent({
  name: 'greeting',
  patterns: ['hello', 'hi', 'kumusta', 'musta'],
  responses: ['Hello!', 'Kumusta ka?', 'Hi din!']
});

// Process messages
const response = await api.processChatbotMessage('Kumusta po?');
console.log(response.reply); // 'Kumusta ka?'
console.log(response.intent); // 'greeting'
console.log(response.confidence); // 0.95

// Manage context
const context = api.getChatbotContext(userId);
api.clearChatbotContext(userId);
```

---

## 👥 Multi-Account Management

```typescript
// Add accounts
await api.addAccount(appState1, { name: 'Primary' });
await api.addAccount(appState2, { name: 'Secondary' });
await api.magdagdagNgAccount(appState, options);

// Switch between accounts
await api.switchAccount(accountId);
await api.lumipatNgAccount(accountId);

// Get all accounts
const accounts = await api.getAccounts();
await api.kuninAngMgaAccount();

// Get active account
const active = api.getActiveAccount();

// Get account statistics
const stats = await api.getAccountStats(accountId);

// Configure account manager
api.configureAccountManager({
  maxAccounts: 5,
  autoRotation: false,
  failover: true
});
```

---

## 📝 Automated Response Templates

```typescript
// Add a template
api.addTemplate({
  id: 'welcome',
  name: 'Welcome Message',
  trigger: {
    type: 'keyword',
    value: 'hello',
    matchType: 'contains'
  },
  response: {
    type: 'text',
    content: 'Welcome to our page! How can I help you?'
  },
  enabled: true
});
api.magdagdagNgTemplate(template);

// Get templates
const templates = api.getTemplates();
await api.kuninAngMgaTemplate();

// Enable/disable templates
api.enableTemplate('welcome');
api.disableTemplate('welcome');

// Test template matching
const result = api.testTemplate('Hello po!');
console.log(result.matched); // true
console.log(result.response); // 'Welcome to our page!'
```

---

## ⏰ Message Scheduling

```typescript
// Schedule a message
const scheduled = await api.scheduleMessage({
  threadId: '123456789',
  message: 'Good morning!',
  scheduledTime: new Date('2025-12-25 08:00:00'),
  recurrence: 'daily'
});
await api.magScheduleNgMensahe(options);

// Get scheduled messages
const messages = await api.getScheduledMessages();
await api.kuninAngMgaScheduledMessage();

// Update scheduled message
await api.updateScheduledMessage(messageId, { message: 'Updated message' });

// Cancel scheduled message
await api.cancelScheduledMessage(messageId);

// Configure scheduler
api.configureScheduler({
  enabled: true,
  timezone: 'Asia/Manila',
  retryOnFail: true
});
```

---

## 🛡️ Advanced Spam Detection

```typescript
// Configure spam detection
api.configureSpamDetection({
  enabled: true,
  sensitivity: 'medium', // low, medium, high
  actions: ['notify', 'delete'],
  customPatterns: [{ type: 'keyword', value: 'spam', action: 'block' }]
});
api.iConfigAngSpamDetection(options);

// Check if message is spam
const result = await api.checkForSpam('Free money! Click here!');
await api.suriiinKungSpam(message);
console.log(result.isSpam); // true
console.log(result.score); // 0.95
console.log(result.reasons); // ['Contains spam pattern']

// Manage whitelist/blacklist
api.addToWhitelist(userId);
api.addToBlacklist(userId);
api.removeFromWhitelist(userId);
api.removeFromBlacklist(userId);

// Get spam reports
const reports = await api.getSpamReports();
await api.resolveSpamReport(reportId, 'dismiss');
```

---

## 📊 Group Analytics

```typescript
// Get group analytics
const analytics = await api.getGroupAnalytics(threadId, 'month');
await api.kuninAngGroupAnalytics(threadId, period);

console.log(analytics.memberStats);   // { total, active, new, left }
console.log(analytics.activityStats); // { messages, photos, videos }
console.log(analytics.peakTimes);     // ['20:00', '21:00']
console.log(analytics.sentiment);     // { positive: 0.6, neutral: 0.3, negative: 0.1 }

// Get top contributors
const contributors = await api.getTopContributors(threadId, 10);
await api.kuninAngTopContributors(threadId, limit);

// Get group sentiment
const sentiment = await api.getGroupSentiment(threadId);

// Export analytics
await api.exportGroupAnalytics(threadId, 'json', './group-analytics.json');
await api.exportGroupAnalytics(threadId, 'csv', './group-analytics.csv');
```

---

## 🌉 Cross-Platform Messaging Bridge

```typescript
// Configure bridge
api.configureBridge({
  syncMode: 'two_way',
  attachmentHandling: 'forward',
  messageFilter: (msg) => !msg.body.includes('secret')
});
api.iConfigAngBridge(options);

// Add platforms
api.addPlatform({
  type: 'telegram',
  credentials: { botToken: 'your-token' },
  channelMappings: [{ from: 'fb-thread-id', to: '-100123456789' }]
});
api.addPlatform({
  type: 'discord',
  credentials: { botToken: 'your-token' },
  channelMappings: [{ from: 'fb-thread-id', to: 'discord-channel-id' }]
});

// Send cross-platform message
await api.sendCrossPlatformMessage({
  message: 'Hello from Facebook!',
  targetPlatform: 'telegram',
  targetChannel: '-100123456789'
});
await api.magpadalaSaIbangPlatform(options);

// Get bridge statistics
const stats = await api.getBridgeStats();
await api.kuninAngBridgeStats();
console.log(stats.messagesBridged);
console.log(stats.platformsActive);

// Get bridged messages
const messages = await api.getBridgedMessages();
```

Supported Platforms: Telegram, Discord, Slack, WhatsApp, Viber, LINE, Messenger

---

## 📞 Voice & Video Calls

```typescript
// Start a voice call
const voiceCall = await api.startVoiceCall(threadID, { encrypted: true });
await api.magsimulaNgVoiceCall(threadID, options);

// Start a video call
const videoCall = await api.startVideoCall(threadID);
await api.magsimulaNgVideoCall(threadID, options);

// Join an existing call
await api.joinCall(callID);
await api.sumaliSaTawag(callID);

// Call controls
await api.toggleMute(callID, true);   // Mute
await api.toggleVideo(callID, false); // Turn off video

// Listen for call events
api.onCallEvent(callID, (event) => {
  console.log('Event:', event.type);
  console.log('Participant:', event.participantID);
});

// End the call
await api.endCall(callID);
await api.tapusinAngTawag(callID);

// Get active calls
const calls = api.getActiveCalls();
await api.kuninAngMgaTawag();
```

---

## 🖥️ Screen Sharing

```typescript
// Start screen sharing during a call
const screenShare = await api.startScreenShare(callID, {
  quality: 'high',
  audio: true,
  optimizeFor: 'detail'
});
await api.magsimulaNgScreenShare(callID, options);

// Pause/Resume screen sharing
await api.pauseScreenShare(callID);
await api.resumeScreenShare(callID);

// Stop screen sharing
await api.stopScreenShare(callID);
await api.itigilAngScreenShare(callID);
```

---

## 🤖 AI Content Moderation

```typescript
// Configure moderation
api.configureModeration({
  enabled: true,
  provider: 'builtin',
  sensitivity: 'medium',
  categories: ['hate_speech', 'spam', 'harassment'],
  actions: [
    { category: 'hate_speech', action: 'delete', threshold: 0.8 },
    { category: 'spam', action: 'flag', threshold: 0.7 }
  ],
  autoModerate: true,
  notifyAdmins: true
});
api.iConfigAngModeration(config);

// Evaluate a message
const result = await api.evaluateMessage(message, senderID, threadID);
await api.suriiinAngMensahe(message, senderID, threadID);
console.log(result.flagged);      // true/false
console.log(result.overallScore); // 0.0 - 1.0
console.log(result.categories);   // Detected categories

// Get moderation queue
const queue = api.getModerationQueue('pending');
await api.kuninAngModerationQueue('pending');

// Review flagged content
await api.approveFlaggedMessage(resultID);
await api.rejectFlaggedMessage(resultID);

// Get moderation statistics
const stats = api.getModerationStats();
await api.kuninAngModerationStats();

// Add custom moderation rule
api.addModerationRule({
  id: 'no-links',
  name: 'Block External Links',
  type: 'regex',
  pattern: 'https?://[^\\s]+',
  category: 'spam',
  action: 'flag',
  severity: 'medium',
  enabled: true
});
```

---

## 🔐 End-to-End Encryption

```typescript
// Configure encryption
api.configureEncryption({
  enabled: true,
  algorithm: 'aes-256-gcm',
  keyExchange: 'x25519',
  autoRotateKeys: true,
  rotationInterval: 24 * 60 * 60 * 1000 // 24 hours
});
api.iConfigAngEncryption(config);

// Enable encryption for a thread
const status = await api.enableEncryption(threadID);
await api.paganahinAngEncryption(threadID);
console.log(status.enabled);   // true
console.log(status.verified);  // true

// Check encryption status
const encStatus = api.getEncryptionStatus(threadID);
await api.kuninAngEncryptionStatus(threadID);

// Rotate encryption keys
const newKeys = await api.rotateEncryptionKeys(threadID);

// Verify participant
const verified = await api.verifyParticipant(threadID, userID);

// Get all encrypted threads
const threads = api.getEncryptedThreads();

// Disable encryption
await api.disableEncryption(threadID);
await api.patayinAngEncryption(threadID);
```

---

## 🏪 Bot Marketplace

```typescript
// Configure marketplace
api.configureBotMarketplace({
  enabled: true,
  maxInstalledBots: 10,
  autoUpdate: true,
  sandboxMode: false
});
api.iConfigAngBotMarketplace(config);

// Search for bots
const bots = await api.searchBots({
  query: 'moderation',
  category: 'moderation',
  minRating: 4.0,
  verified: true,
  sortBy: 'rating'
});
await api.hanapiNgMgaBot(options);

// Get bot details
const botDetails = await api.getBotDetails(botID);
await api.kuninAngBotDetails(botID);

// Install a bot
const installed = await api.installBot(botID, { autoReply: true });
await api.iInstallAngBot(botID, config);

// Get installed bots
const myBots = api.getInstalledBots();
await api.kuninAngMgaInstalledBot();

// Enable/disable bot
api.enableBot(botID);
api.disableBot(botID);

// Configure bot for specific thread
api.configureBotForThread(botID, threadID, { prefix: '!' });

// Submit a review
await api.submitBotReview(botID, 5, 'Great bot!');

// Uninstall bot
await api.uninstallBot(botID);
await api.iUninstallAngBot(botID);
```

---

## 🔄 Webhook Transformations

```typescript
// Configure webhook transformations
api.configureWebhookTransforms({
  enabled: true,
  transformations: [],
  errorHandling: 'skip',
  logging: true
});
api.iConfigAngWebhookTransforms(config);

// Add a transformation
api.addWebhookTransformation({
  id: 'uppercase-sender',
  name: 'Uppercase Sender Name',
  priority: 1,
  enabled: true,
  type: 'map',
  config: {
    mappings: [
      { source: 'senderName', target: 'senderName', transform: 'uppercase' },
      { source: 'message', target: 'content' }
    ],
    enrichments: [
      { field: 'processedAt', source: 'timestamp' }
    ]
  }
});
api.magdagdagNgTransformation(transformation);

// Test transformation
const result = api.testWebhookTransformation('uppercase-sender', {
  senderName: 'john doe',
  message: 'Hello!'
});
console.log(result.transformedPayload);
// { senderName: 'JOHN DOE', content: 'Hello!', processedAt: 1702... }

// Get all transformations
const transforms = api.getWebhookTransformations();
await api.kuninAngMgaTransformation();

// Enable/disable transformation
api.enableWebhookTransformation('uppercase-sender');
api.disableWebhookTransformation('uppercase-sender');
```

---

## 🌟 New Filipino Functions (v0.5.0)

| Tagalog Method | English Equivalent | Description |
|----------------|-------------------|-------------|
| `magsimulaNgVoiceCall()` | `startVoiceCall()` | Start voice call |
| `magsimulaNgVideoCall()` | `startVideoCall()` | Start video call |
| `sumaliSaTawag()` | `joinCall()` | Join call |
| `tapusinAngTawag()` | `endCall()` | End call |
| `kuninAngMgaTawag()` | `getActiveCalls()` | Get active calls |
| `magsimulaNgScreenShare()` | `startScreenShare()` | Start screen share |
| `itigilAngScreenShare()` | `stopScreenShare()` | Stop screen share |
| `iConfigAngModeration()` | `configureModeration()` | Configure moderation |
| `suriiinAngMensahe()` | `evaluateMessage()` | Evaluate message |
| `kuninAngModerationQueue()` | `getModerationQueue()` | Get moderation queue |
| `kuninAngModerationStats()` | `getModerationStats()` | Get moderation stats |
| `iConfigAngEncryption()` | `configureEncryption()` | Configure encryption |
| `paganahinAngEncryption()` | `enableEncryption()` | Enable encryption |
| `patayinAngEncryption()` | `disableEncryption()` | Disable encryption |
| `kuninAngEncryptionStatus()` | `getEncryptionStatus()` | Get encryption status |
| `iConfigAngBotMarketplace()` | `configureBotMarketplace()` | Configure marketplace |
| `hanapiNgMgaBot()` | `searchBots()` | Search bots |
| `kuninAngBotDetails()` | `getBotDetails()` | Get bot details |
| `iInstallAngBot()` | `installBot()` | Install bot |
| `iUninstallAngBot()` | `uninstallBot()` | Uninstall bot |
| `kuninAngMgaInstalledBot()` | `getInstalledBots()` | Get installed bots |
| `iConfigAngWebhookTransforms()` | `configureWebhookTransforms()` | Configure transforms |
| `magdagdagNgTransformation()` | `addWebhookTransformation()` | Add transformation |
| `kuninAngMgaTransformation()` | `getWebhookTransformations()` | Get transformations |

---

## 🌟 Filipino Functions (v0.4.0)

| Tagalog Method | English Equivalent | Description |
|----------------|-------------------|-------------|
| `magsimulaNgLiveStream()` | `startLiveStream()` | Start live video |
| `tapusinAngLiveStream()` | `endLiveStream()` | End live stream |
| `kuninAngMgaLiveStream()` | `getLiveStreams()` | Get active streams |
| `iConfigAngChatbot()` | `configureChatbot()` | Configure chatbot |
| `magdagdagNgAccount()` | `addAccount()` | Add account |
| `lumipatNgAccount()` | `switchAccount()` | Switch account |
| `kuninAngMgaAccount()` | `getAccounts()` | Get all accounts |
| `magdagdagNgTemplate()` | `addTemplate()` | Add response template |
| `kuninAngMgaTemplate()` | `getTemplates()` | Get templates |
| `magScheduleNgMensahe()` | `scheduleMessage()` | Schedule message |
| `kuninAngMgaScheduledMessage()` | `getScheduledMessages()` | Get scheduled messages |
| `iConfigAngSpamDetection()` | `configureSpamDetection()` | Configure spam detection |
| `suriiinKungSpam()` | `checkForSpam()` | Check if spam |
| `kuninAngGroupAnalytics()` | `getGroupAnalytics()` | Get group analytics |
| `kuninAngTopContributors()` | `getTopContributors()` | Get top contributors |
| `iConfigAngBridge()` | `configureBridge()` | Configure bridge |
| `magpadalaSaIbangPlatform()` | `sendCrossPlatformMessage()` | Send cross-platform |
| `kuninAngBridgeStats()` | `getBridgeStats()` | Get bridge stats |

---

## 🌟 Filipino Functions (v0.3.0)

| Tagalog Method | English Equivalent | Description |
|----------------|-------------------|-------------|
| `magpadalaNgBoses()` | `sendVoice()` | Send voice message |
| `magpadalaNgFile()` | `sendFile()` | Send file attachment |
| `magpostNgStory()` | `postStory()` | Post story |
| `kuninAngStories()` | `getStories()` | Get stories |
| `magpostNgReel()` | `postReel()` | Post reel |
| `kuninAngReels()` | `getReels()` | Get reels |
| `gumawaNgListing()` | `createListing()` | Create marketplace listing |
| `hanapiNgListings()` | `searchMarketplace()` | Search marketplace |
| `kuninAngMgaListingsKo()` | `getMyListings()` | Get my listings |
| `magsimulaNgWatchTogether()` | `startWatchTogether()` | Start watch party |
| `magsimulaNgLaro()` | `startGame()` | Start game |
| `kuninAngMgaLaro()` | `getAvailableGames()` | Get available games |
| `kuninAngAnalytics()` | `getAnalytics()` | Get analytics |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 🙏 Salamat!

Maraming salamat sa paggamit ng Liwanag! Made with ❤️ for Filipino developers.
