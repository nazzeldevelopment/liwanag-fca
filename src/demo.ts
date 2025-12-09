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
  console.log('  Demo Complete! Liwanag is ready to use.');
  console.log('='.repeat(60));
  console.log('\n');

  const logger = new Logger({ language: 'tl' });
  logger.printStats();

  console.log('\nPress Ctrl+C to exit...\n');
});

console.log('\n--- Credential Login Example (with 2FA/Checkpoint support) ---');
console.log(`
// Example: Login with email/password and checkpoint handler
import { login, loginWithCheckpointHandler } from 'liwanag-fca';

// Method 1: Using checkpointHandler
loginWithCheckpointHandler(
  { email: 'your@email.com', password: 'your-password' },
  {
    onCheckpoint: async (data) => {
      console.log('Checkpoint type:', data.type);
      console.log('Message:', data.message);
      
      // Return the verification code
      // You can prompt the user for input here
      if (data.type === 'two_factor') {
        return { method: '2fa_code', code: '123456' };
      }
      return 'verification-code';
    },
    onError: (error) => {
      console.error('Checkpoint error:', error.message);
    }
  },
  {},
  (err, api) => {
    if (err) {
      console.error('Login failed:', err.message);
      return;
    }
    console.log('Logged in successfully!');
  }
);

// Method 2: Using twoFactorCode directly
import { loginWithTwoFactor } from 'liwanag-fca';

loginWithTwoFactor(
  { email: 'your@email.com', password: 'your-password' },
  '123456', // Your 2FA code
  {},
  (err, api) => {
    if (err) return console.error(err);
    console.log('Logged in with 2FA!');
  }
);
`);
