import { login, LiwanagOptions, AppState, LiwanagApi } from './index';
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
