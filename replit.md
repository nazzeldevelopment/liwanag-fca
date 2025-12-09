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

### v0.1.0 (2024-12-09)
- Initial release
- Core messaging features
- Advanced logging system
- Cookie auto-refresh
- Anti-detection suite
- Filipino method names
