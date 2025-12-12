# Liwanag 🌟 - Filipino Facebook Chat API Library

## Overview
Ang **Liwanag** ay isang comprehensive at user-friendly na Filipino version ng Facebook Chat API library na specially designed para sa mga Filipino developers. Built with TypeScript, nag-aalok ito ng complete automation at interaction capabilities para sa Facebook accounts.

## Project Structure

```
├── src/
│   ├── index.ts           # Main export file
│   ├── demo.ts            # Demo application
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces and types
│   ├── core/
│   │   ├── api.ts         # Main API class
│   │   └── login.ts       # Login functionality
│   └── utils/
│       ├── logger.ts      # Advanced logging system
│       ├── cookies.ts     # Cookie management
│       ├── http.ts        # HTTP client
│       └── antiDetection.ts # Anti-detection suite
├── dist/                  # Compiled JavaScript (after build)
├── package.json           # NPM configuration
├── tsconfig.json          # TypeScript configuration
├── README.md              # Documentation
├── CHANGELOG.md           # Version history
└── LICENSE                # MIT License
```

## Key Features

### Core Features
- **Login System** - AppState-based authentication
- **Messaging** - Send/receive messages with Filipino method names
- **Group Management** - Create groups, add/remove members
- **Cookie Management** - Auto-refresh, health monitoring

### Anti-Detection Suite
- **FingerprintManager** - Browser fingerprint rotation
- **RequestObfuscator** - Request obfuscation
- **PatternDiffuser** - Human-like delays
- **SmartRateLimiter** - Intelligent rate limiting

### Special Filipino Methods
- `magpadalaNgMensahe()` - Send message
- `makinigSaMensahe()` - Listen for messages
- `kuninAngUserInfo()` - Get user info
- `gumawaNgGroup()` - Create group
- `magdagdagNgMember()` - Add member
- `magtanggalNgMember()` - Remove member

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run demo
npm run dev

# Clean build
npm run clean
```

## Usage

```typescript
const liwanag = require('liwanag-fca');

// Login with appState
liwanag.login({ appState: require('./appstate.json') }, {}, (err, api) => {
    if (err) return console.error(err);
    
    // Listen for messages
    api.makinigSaMensahe((err, message) => {
        console.log('Received:', message.body);
        api.magpadalaNgMensahe('Salamat!', message.threadID);
    });
});
```

## Recent Changes

### v0.6.5 (2025-12-12)
- **Critical Lightspeed Fix**: Fixed Lightspeed messages not being emitted properly
- **Enhanced processLightspeedMessage()**: Correctly extracts threadID from message-level properties
- **Fixed processLightspeedData()**: Properly distinguishes between delta and Lightspeed formats
- **Improved tryExtractMessage()**: Correctly routes messages to appropriate handlers

### v0.6.4 (2025-12-12)
- **Critical Bot Fix**: Fixed bot not responding to Group Chat and Private Messages
- **New Topic Handlers**: Added `/graphql`, `/orca_message_notifications`, `/ls_foreground_state`
- **Lightspeed Support**: Added processLightspeedData() and processLightspeedMessage()
- **Enhanced Message Parsing**: Better extraction from multiple message formats

### v0.6.3 (2025-12-12)
- **Critical MQTT Fix**: Fixed authentication - password now uses JSON-serialized session cookies
- **Improved Message Handling**: Mercury and messaging_events handlers now properly emit messages
- **Enhanced Delta Processing**: All message handlers funnel through processDelta() for consistency
- **Full Group Chat Support**: Improved parsing for group thread IDs and member messages
- **Private Message Support**: Enhanced handling for 1:1 conversations via MQTT

### v0.5.0 (2025-12-10)
- Voice/Video Call Support with screen sharing
- AI-Powered Content Moderation
- End-to-End Encryption Options
- Bot Marketplace Integration
- Custom Webhook Transformations
- Complete Tagalog method aliases for all new features

### v0.4.0 (2025-12-10)
- Live Video Streaming
- NLP Chatbot Integration
- Multi-Account Management
- Automated Response Templates
- Message Scheduling
- Spam Detection System
- Group Analytics
- Cross-Platform Messaging Bridge

### v0.3.0 (2025-12-10)
- Voice/File Attachments
- Stories and Reels
- Marketplace Features
- Watch Together Sessions
- Gaming Features
- Plugin System

### v0.1.0 (2024-12-09)
- Initial release
- Core messaging features
- Advanced logging system
- Cookie auto-refresh
- Anti-detection suite
- Filipino method names
