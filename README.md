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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 🙏 Salamat!

Maraming salamat sa paggamit ng Liwanag! Made with ❤️ for Filipino developers.
