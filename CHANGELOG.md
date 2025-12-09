# Changelog

Lahat ng notable changes sa project na ito ay dokumentado dito.

Ang format ay based sa [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
at ang project na ito ay sumusunod sa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2025-12-10

### 🎉 Major Update - Full API Interface Implementation

Ang major update na ito ay nagdadala ng complete API interface at type definitions para sa lahat ng planned features. Ang mga implementations ay nagbibigay ng proper structure, validation, at error handling patterns na pwedeng i-extend para sa actual Facebook API integration.

> **Note**: Ang mga API methods ay nagbibigay ng complete interface at type safety. Para sa production use, kailangan i-configure ang actual Facebook API endpoints at authentication. Ang library ay designed para maging extensible at maintainable.

### ✨ Added

#### 🔐 Credential-Based Login System
- **Full Email/Password Login**
  - Native credential-based authentication flow
  - Automatic session token extraction
  - Cookie parsing and management
  - Support for mobile and desktop login endpoints

#### 🔒 Two-Factor Authentication (2FA) Support
- **Multiple 2FA Methods**
  - `2fa_code` - Standard authenticator app codes
  - `backup_code` - Backup verification codes
  - `authenticator` - Hardware authenticator support
- **Helper Functions**
  - `loginWithTwoFactor()` - Direct 2FA login
  - `loginWithCheckpointHandler()` - Custom checkpoint handling

#### 🛡️ Checkpoint Handling
- **Checkpoint Types**
  - `two_factor` - Two-factor authentication prompts
  - `verification` - Account verification challenges
  - `captcha` - CAPTCHA challenges
  - `identity` - Identity verification (photo upload)
- **CheckpointHandler Interface**
  - Custom callback for checkpoint resolution
  - Error handling support
  - Browser save prompt handling

#### 📷 Photo/Video Message Support
- **Photo Messages**
  - `sendPhoto()` / `magpadalaNgLarawan()` - Send single or multiple photos
  - Support for file path arrays
  - Caption support
  - File validation
- **Video Messages**
  - `sendVideo()` / `magpadalaNgVideo()` - Send video files
  - 25MB file size limit enforcement
  - Duration validation

#### 🎨 Sticker Support
- **Sticker Messaging**
  - `sendSticker()` / `magpadalaNgSticker()` - Send stickers by ID
  - `getStickerURL()` - Get sticker image URL
  - Rate limiting integration

#### 📝 Timeline Posting Features
- **Post Management**
  - `postToTimeline()` / `magpostsaTimeline()` - Create timeline posts
  - `editPost()` - Edit existing posts
  - `deletePost()` - Delete posts
- **Post Options**
  - Privacy settings (public, friends, only_me)
  - Photo attachments
  - Location tagging
  - Feeling/Activity status
  - User tagging
  - Scheduled posting support

#### 👥 Friend Request Management
- **Friend Request Actions**
  - `sendFriendRequest()` / `magpadalaNgFriendRequest()` - Send requests
  - `acceptFriendRequest()` / `tanggapinAngFriendRequest()` - Accept requests
  - `declineFriendRequest()` - Decline requests
  - `cancelFriendRequest()` - Cancel sent requests
  - `unfriend()` - Remove friends
- **Friend Data**
  - `getFriendRequests()` / `kuninAngFriendRequests()` - List pending requests
  - `getFriendsList()` - Get all friends

#### 🔔 Notification Handling
- **Notification Management**
  - `getNotifications()` / `kuninAngNotifications()` - Fetch notifications
  - `markNotificationAsRead()` - Mark as read
  - `markAllNotificationsAsRead()` - Mark all as read
  - `onNotification()` - Real-time notification listener
- **Notification Types**
  - message, friend_request, comment, like
  - mention, tag, group, event
  - birthday, memory, other

#### 🔗 Webhook Integration
- **Webhook Management**
  - `registerWebhook()` - Register webhook endpoints
  - `unregisterWebhook()` - Remove webhooks
  - `getWebhooks()` - List all webhooks
- **Webhook Features**
  - Event filtering (message, reaction, friend_request, etc.)
  - Secret-based signature verification (HMAC-SHA256)
  - Custom headers support
  - Automatic retry with configurable count and delay
- **Webhook Events**
  - `message` - Message events
  - `message_reaction` - Reaction events
  - `message_read` - Read receipt events
  - `friend_request` - Friend request events
  - `notification` - Notification events
  - `presence` - Online status events
  - `typing` - Typing indicator events
  - `all` - All events

### 🔧 Technical Improvements
- Enhanced type definitions for all new features
- Improved error handling and validation
- Better logging with Tagalog language support
- Webhook payload signing for security
- Notification polling system

---

## [0.1.0] - 2025-12-10

### 🎉 Initial Release

Ang unang release ng **Liwanag** - Filipino Facebook Chat API Library!

### ✨ Added

#### Core Features
- **Login System**
  - AppState-based login para sa secure authentication
  - Session management with automatic token handling
  - Support para sa credential-based login (future implementation)

- **Messaging System**
  - `magpadalaNgMensahe()` / `sendMessage()` - Send text messages
  - `makinigSaMensahe()` / `listenMqtt()` - Real-time message listener
  - `setMessageReaction()` - React to messages
  - `unsendMessage()` - Unsend sent messages
  - `markAsRead()` / `markAsReadAll()` - Mark messages as read

- **User Information**
  - `kuninAngUserInfo()` / `getUserInfo()` - Retrieve user profile information
  - `getUserID()` - Get current logged in user ID

- **Thread Management**
  - `kuninAngThreadInfo()` / `getThreadInfo()` - Get thread details
  - `kuninAngThreadList()` / `getThreadList()` - List all conversations

- **Group Chat Management**
  - `gumawaNgGroup()` / `createGroup()` - Create new group chats
  - `magdagdagNgMember()` / `addUserToGroup()` - Add members to groups
  - `magtanggalNgMember()` / `removeUserFromGroup()` - Remove members
  - `palitanAngGroupName()` / `setTitle()` - Change group name

#### 🎨 Advanced Logging System
- **Log Levels**: SUCCESS, INFO, WARNING, ERROR, DEBUG, SYSTEM
- **Color Coding**: Beautiful colored console output using chalk
- **Timestamps**: Automatic timestamp sa bawat log entry
- **Icons/Emojis**: Visual indicators (✓, ✗, ⚠, ℹ, ⚙)
- **File Logging**: Save logs to file (JSON at text format)
- **Log Rotation**: Automatic log file management
- **Language Support**: Tagalog at English log messages
- **Performance Metrics**: Response time tracking
- **Session Statistics**: Runtime, message counts, error rates

#### 🔄 Cookie Management System
- **Auto-Refresh**: Automatic cookie refresh before expiration
- **Health Monitoring**: Real-time cookie health checking
- **Manual Controls**: Force refresh, export, import cookies
- **Status Tracking**: Expiry time, last refresh, health score
- **Backup Support**: Save and load cookie states

#### 🕵️ Anti-Detection Suite
- **FingerprintManager**
  - Browser fingerprint spoofing
  - Automatic fingerprint rotation (default: 6 hours)
  - Chrome, Edge, Firefox profiles
  - Windows, macOS, Linux platform support

- **RequestObfuscator**
  - Header randomization
  - Parameter shuffling
  - Timestamp fuzzing
  - Entropy injection

- **PatternDiffuser**
  - Human-like random delays
  - Burst prevention
  - Idle time simulation
  - Typing speed simulation

- **SmartRateLimiter**
  - Adaptive rate limiting
  - Per-minute, hour, and day limits
  - Group message multipliers
  - Burst allowance with cooldown
  - Warning thresholds

#### 📝 Documentation
- Comprehensive README.md with examples
- TypeScript type definitions
- Tagalog method names para sa Filipino developers

### 🔧 Technical Details
- Built with TypeScript for type safety
- Full ESM and CommonJS support
- Node.js 16+ compatibility
- Modular architecture for easy extension

### 📦 Dependencies
- `axios` - HTTP client
- `chalk` - Console colors
- `cheerio` - HTML parsing
- `mqtt` - Real-time messaging
- `tough-cookie` - Cookie management
- `uuid` - Unique ID generation
- `ws` - WebSocket support

---

## [Unreleased]

### 🚧 Planned Features
- Voice message support
- File attachment support (documents, PDFs)
- Live video streaming
- Story/Reels posting
- Marketplace integration
- Gaming/Watch Together features
- Advanced analytics dashboard
- Plugin system for extensions

---

## Legend

- 🎉 **Initial Release** - First version
- ✨ **Added** - New features
- 🔄 **Changed** - Changes in existing functionality
- 🗑️ **Deprecated** - Soon-to-be removed features
- 🚫 **Removed** - Removed features
- 🐛 **Fixed** - Bug fixes
- 🔒 **Security** - Security improvements
- 🚧 **Planned** - Future features
