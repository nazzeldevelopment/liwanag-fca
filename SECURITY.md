# Security Policy 🔒

## Tungkol sa Security ng Liwanag

Ang security ay isa sa mga pangunahing priority ng Liwanag FCA library. Ang dokumentong ito ay naglalaman ng impormasyon tungkol sa:
- Supported versions
- Paano mag-report ng security vulnerabilities
- Security best practices
- Known security considerations

## 🛡️ Supported Versions

Ang mga sumusunod na versions ng Liwanag ay kasalukuyang supported ng security updates:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.x.x   | ✅ Yes             | TBD            |
| 0.x.x   | ⚠️ Beta/Testing    | TBD            |

**Note**: Recommended na palaging gumamit ng latest stable version para sa best security.

## 🚨 Reporting a Vulnerability

### Paano Mag-report ng Security Issue

Kung nakahanap ka ng security vulnerability sa Liwanag, please **HUWAG** mag-create ng public GitHub issue. Instead, sundin ang mga steps na ito:

### 1. Private Disclosure

**Email**: security@nazzelofficial.com

**Format ng Report**:
```
Subject: [SECURITY] Brief description of vulnerability

Description:
- Detailed explanation ng vulnerability
- Affected versions
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

Environment:
- Liwanag version:
- Node.js version:
- Operating System:
```

### 2. Ano ang Aasahan

- **Initial Response**: 48 hours
- **Status Update**: 7 days
- **Fix Timeline**: Depende sa severity
  - Critical: 1-3 days
  - High: 3-7 days
  - Medium: 7-14 days
  - Low: 14-30 days

### 3. Disclosure Policy

- Hihintayin namin na mag-coordinate sa iyo bago mag-public disclosure
- I-credit ka namin sa security advisory (kung gusto mo)
- Mag-release kami ng patch bago mag-public announcement

## 🔐 Security Features ng Liwanag

### 1. Cookie Management
```typescript
// Secure cookie handling
api.autoRefreshCookies({
  enabled: true,
  interval: 30,
  refreshBeforeExpiry: 10,
  maxRetries: 3
});
```

**Security Considerations:**
- Cookies ay encrypted sa storage
- Automatic expiration detection
- Secure refresh mechanism

### 2. Anti-Detection Suite

```typescript
// Fingerprint management
api.fingerprintManager({
  autoRotate: true,
  rotationInterval: 6 * 60 * 60 * 1000,
  consistency: 'high'
});

// Request obfuscation
api.requestObfuscator({
  enabled: true,
  entropyLevel: 'high',
  headerRandomization: true
});
```

**Security Benefits:**
- Prevents tracking
- Mimics human behavior
- Reduces detection risk

### 3. Rate Limiting

```typescript
// Smart rate limiting
api.smartRateLimiter({
  enabled: true,
  adaptive: true,
  limits: {
    messagesPerMinute: 10,
    messagesPerHour: 200,
    messagesPerDay: 1500
  }
});
```

**Protection Against:**
- Account suspension
- IP banning
- Service throttling

## 🔒 Security Best Practices

### 1. Credential Management

**✅ DO:**
```typescript
// Store credentials securely
require('dotenv').config();
const credentials = {
  email: process.env.FB_EMAIL,
  password: process.env.FB_PASSWORD
};

// Use appState instead of credentials
const appState = require('./appstate.json');
liwanag.login({ appState }, options, callback);
```

**❌ DON'T:**
```typescript
// NEVER hardcode credentials
const credentials = {
  email: 'myemail@example.com',  // ❌ Mali!
  password: 'mypassword123'      // ❌ Mali!
};

// NEVER commit appstate.json to git
git add appstate.json  // ❌ Mali!
```

### 2. AppState Security

**Secure Storage:**
```typescript
// Encrypt appstate
const crypto = require('crypto');
const fs = require('fs');

function encryptAppState(appState, secret) {
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(JSON.stringify(appState), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptAppState(encrypted, secret) {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Usage
const secret = process.env.ENCRYPTION_KEY;
const encrypted = encryptAppState(appState, secret);
fs.writeFileSync('appstate.enc', encrypted);
```

**File Permissions:**
```bash
# Linux/Mac: Restrict access sa appstate file
chmod 600 appstate.json

# Gitignore
echo "appstate.json" >> .gitignore
echo "appstate.enc" >> .gitignore
echo ".env" >> .gitignore
```

### 3. Environment Variables

**Setup .env file:**
```bash
# .env
FB_EMAIL=your_email@example.com
FB_PASSWORD=your_secure_password
ENCRYPTION_KEY=your_random_encryption_key
LOG_LEVEL=INFO
```

**Load securely:**
```typescript
require('dotenv').config();

// Validate environment variables
if (!process.env.FB_EMAIL || !process.env.FB_PASSWORD) {
  throw new Error('Missing required environment variables');
}
```

### 4. Logging Security

```typescript
// Avoid logging sensitive data
const options = {
  logConfig: {
    level: 'INFO',
    sanitizeLogs: true,  // Remove sensitive info
    maskPatterns: [
      /password/i,
      /token/i,
      /cookie/i,
      /appstate/i
    ]
  }
};
```

### 5. Network Security

**Use HTTPS Proxy:**
```typescript
const options = {
  proxy: {
    host: 'proxy.example.com',
    port: 8080,
    protocol: 'https',  // Always use HTTPS
    auth: {
      username: process.env.PROXY_USER,
      password: process.env.PROXY_PASS
    }
  }
};
```

**Validate SSL Certificates:**
```typescript
const options = {
  httpsAgent: new https.Agent({
    rejectUnauthorized: true,  // Validate SSL certs
    minVersion: 'TLSv1.2'      // Use modern TLS
  })
};
```

### 6. Input Validation

```typescript
// Sanitize user input
function sanitizeMessage(message) {
  // Remove scripts
  message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Validate length
  if (message.length > 5000) {
    throw new Error('Message too long');
  }
  
  return message;
}

// Validate thread ID
function isValidThreadID(threadID) {
  return /^\d+$/.test(threadID);
}
```

### 7. Error Handling

```typescript
// Don't expose sensitive info in errors
try {
  await api.magpadalaNgMensahe(message, threadID);
} catch (error) {
  // Log full error internally
  console.error('[Internal]', error);
  
  // Show generic error to user
  throw new Error('Failed to send message. Please try again.');
}
```

## ⚠️ Known Security Considerations

### 1. Facebook Terms of Service

**IMPORTANTE**: Ang paggamit ng Liwanag ay maaaring lumalabag sa Facebook Terms of Service. Gamitin at your own risk.

**Risks:**
- Account suspension
- Permanent ban
- Legal action (rare pero possible)

**Mitigation:**
- Use with test accounts
- Follow rate limits
- Enable all anti-detection features
- Don't use for spam or abuse

### 2. Two-Factor Authentication (2FA)

Kung enabled ang 2FA sa account:
```typescript
// Handle 2FA
liwanag.loginWithTwoFactor(credentials, twoFactorCode, options, callback);

// Or use app passwords
const credentials = {
  email: 'your_email@example.com',
  password: 'APP_SPECIFIC_PASSWORD'  // Not your main password
};
```

### 3. Cookie Expiration

**Automatic Handling:**
```typescript
api.autoRefreshCookies({
  enabled: true,
  onError: (error) => {
    console.error('Cookie refresh failed:', error);
    // Implement re-authentication logic
  }
});
```

### 4. Checkpoint/Verification

Kung na-checkpoint ang account:
```typescript
liwanag.loginWithCheckpointHandler(credentials, (checkpointUrl) => {
  console.log('Please complete checkpoint:', checkpointUrl);
  // Manually complete checkpoint
  // Return verification code
}, options, callback);
```

## 🔍 Security Checklist

Bago i-deploy sa production:

- [ ] AppState files ay naka-encrypt
- [ ] Credentials sa environment variables, hindi hard-coded
- [ ] `.env` at `appstate.json` ay naka-gitignore
- [ ] Rate limiting enabled
- [ ] Anti-detection features configured
- [ ] Logging ay properly sanitized
- [ ] Error handling ay hindi nag-leak ng sensitive data
- [ ] HTTPS used para sa lahat ng connections
- [ ] Input validation implemented
- [ ] File permissions properly set
- [ ] Dependencies up to date
- [ ] Security patches applied

## 🆘 Emergency Response

### Account Compromised

Kung na-compromise ang account:

1. **Immediate Actions:**
   ```typescript
   // Logout from all sessions
   api.logout();
   
   // Delete appstate
   fs.unlinkSync('appstate.json');
   ```

2. **Facebook Account:**
   - Change password immediately
   - Enable/update 2FA
   - Check active sessions
   - Review connected apps

3. **Application:**
   - Rotate all API keys
   - Update environment variables
   - Check logs for suspicious activity
   - Notify affected users

### Data Breach

If sensitive data was exposed:

1. Assess impact
2. Notify affected parties
3. Report to authorities (kung required)
4. Implement additional security measures
5. Document incident

## 📚 Additional Resources

### Security Guides
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Facebook Security](https://www.facebook.com/security)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Check dependencies
- [Snyk](https://snyk.io/) - Security scanning
- [Git-secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets

### Monitoring
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update dependencies
npm update
```

## 📞 Contact

### Security Team
- **Email**: security@nazzelofficial.com
- **Response Time**: 48 hours
- **PGP Key**: [Link to public key]

### General Support
- **GitHub Issues**: For non-security bugs
- **Discussions**: For questions
- **Email**: support@nazzelofficial.com

## 📜 Disclosure Timeline

Typical security issue timeline:

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Initial assessment
3. **Day 3-7**: Develop fix
4. **Day 8-14**: Test fix
5. **Day 15**: Release patch
6. **Day 16**: Public disclosure

**Note**: Critical vulnerabilities ay expedited.

## 🙏 Acknowledgments

Salamat sa lahat ng nag-report ng security issues responsibly. Ang inyong contributions ay tumutulong na gawing mas secure ang Liwanag para sa lahat.

### Hall of Fame
<!-- Security researchers who reported vulnerabilities will be listed here -->

---

**Reminder**: Security is everyone's responsibility. Kung nakakita ka ng something suspicious, mag-report agad. Better safe than sorry! 🔒

Last Updated: December 2025
