# Changelog

Lahat ng notable changes sa project na ito ay dokumentado dito.

Ang format ay based sa [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
at ang project na ito ay sumusunod sa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-12-09

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
- Credential-based login implementation
- Two-Factor Authentication (2FA) support
- Checkpoint handling
- Photo/Video message support
- Sticker support
- Timeline posting features
- Friend request management
- Notification handling
- Webhook integration

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
