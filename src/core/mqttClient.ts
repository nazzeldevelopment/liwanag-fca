import { EventEmitter } from 'events';
import * as mqtt from 'mqtt';
import { Message, AppState } from '../types';
import { Logger } from '../utils/logger';

export interface MqttConfig {
  region?: string;
  userAgent?: string;
  selfListen?: boolean;
  listenEvents?: boolean;
  updatePresence?: boolean;
}

export interface MqttConnectionData {
  mqttEndpoint: string;
  region: string;
  syncToken?: string;
  lastSeqId?: string;
  sessionId: string;
  clientId: string;
}

const MQTT_TOPICS = [
  '/t_ms',
  '/thread_typing',
  '/orca_typing_notifications',
  '/orca_presence',
  '/legacy_web',
  '/br_sr',
  '/sr_res',
  '/webrtc',
  '/onevc',
  '/notify_disconnect',
  '/inbox',
  '/mercury',
  '/messaging_events',
  '/orca_message_notifications',
  '/pp',
  '/webrtc_response',
  '/t_rtc',
  '/ls_req',
  '/ls_resp',
  '/ls_foreground_state',
  '/t_p',
  '/graphql',
  '/t_region_hint',
  '/notify_disconnect_v2',
  '/t_ms_gd',
  '/t_rtc_multi',
  '/t_trace',
  '/t_rtc_log',
  '/ig_messaging_events',
  '/ig_realtime_sub'
];

const FB_APP_ID = '219994525426954';
const MSGR_APP_ID = '256002347743983';
const INSTAGRAM_APP_ID = '567067343352427';

const MQTT_ENDPOINTS = [
  'wss://edge-chat.messenger.com/chat',
  'wss://edge-chat.facebook.com/chat',
  'wss://edge-chat.messenger.com/mqtt',
  'wss://mqtt-mini.facebook.com:443/mqtt',
  'wss://z-1-edge-chat.messenger.com/chat',
  'wss://z-p3-edge-chat.messenger.com/chat'
];

const DELTA_CLASSES = [
  'NewMessage',
  'ReadReceipt',
  'AdminTextMessage',
  'ForcedFetch',
  'DeliveryReceipt',
  'MarkRead',
  'ThreadName',
  'ParticipantsAddedToGroupThread',
  'ParticipantLeftGroupThread',
  'ThreadMuteSettings',
  'ThreadAction',
  'MessageReaction',
  'RepliedMessage'
];

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private logger: Logger;
  private userId: string;
  private appState: AppState;
  private config: MqttConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 100;
  private lastSeqId: string = '';
  private syncToken: string = '';
  private sessionId: number;
  private deviceId: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private connectionStartTime: number = 0;
  private currentEndpointIndex: number = 0;
  private epochId: number = 0;
  private mqttSessionId: number = 0;
  private requestId: number = 1;
  private irisSeqId: string = '';
  private irisSnapshotTimestampMs: string = '';
  private messageIds: Set<string> = new Set();
  private lastMessageTimestamp: number = 0;

  constructor(
    userId: string,
    appState: AppState,
    config: MqttConfig = {},
    logger?: Logger
  ) {
    super();
    this.userId = userId;
    this.appState = appState;
    this.config = {
      region: config.region || this.detectRegion(),
      userAgent: config.userAgent || this.getRandomUserAgent(),
      selfListen: config.selfListen ?? false,
      listenEvents: config.listenEvents ?? true,
      updatePresence: config.updatePresence ?? true
    };
    this.logger = logger || new Logger({ language: 'tl' });
    this.sessionId = Math.floor(Math.random() * 0xFFFFFFFF);
    this.deviceId = this.generateDeviceId();
    this.epochId = Date.now();
    this.mqttSessionId = Math.floor(Math.random() * 0x7FFFFFFF);
    
    this.messageIds = new Set();
  }

  private detectRegion(): string {
    const regions = ['prn', 'pnb', 'ash', 'frc', 'sin', 'hkg', 'syd'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private generateDeviceId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateClientId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `mqttwsclient_${this.userId}_${timestamp}_${random}`;
  }

  private getCookieString(): string {
    return this.appState.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  private getSessionCookies(): string {
    const sessionCookies: Record<string, string> = {};
    for (const cookie of this.appState.cookies) {
      sessionCookies[cookie.name] = cookie.value;
    }
    return JSON.stringify(sessionCookies);
  }

  private getCookieValue(name: string): string {
    const cookie = this.appState.cookies.find(c => c.name === name);
    return cookie?.value || '';
  }

  private buildUsername(): string {
    const cUser = this.getCookieValue('c_user') || this.userId;
    
    const payload = {
      u: cUser,
      s: this.mqttSessionId,
      cp: 3,
      ecp: 10,
      chat_on: true,
      fg: true,
      d: this.deviceId,
      ct: 'websocket',
      mqtt_sid: '',
      aid: parseInt(FB_APP_ID),
      st: MQTT_TOPICS,
      pm: [],
      dc: '',
      no_auto_fg: true,
      gas: null,
      pack: [],
      a: this.config.userAgent,
      aids: null
    };

    return JSON.stringify(payload);
  }

  private buildConnectPayload(): string {
    const cid = this.getCookieValue('c_user') || this.userId;
    
    return JSON.stringify({
      app_id: FB_APP_ID,
      capabilities: 0,
      chat_on: true,
      fg: true,
      no_auto_fg: true,
      d: this.deviceId,
      mqtt_sid: this.mqttSessionId.toString(),
      cp: 3,
      ecp: 10,
      ct: 'websocket',
      lc: 1,
      dc: '',
      st: MQTT_TOPICS,
      u: cid,
      s: this.sessionId,
      pm: [],
      aid: parseInt(FB_APP_ID)
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const baseEndpoint = MQTT_ENDPOINTS[this.currentEndpointIndex % MQTT_ENDPOINTS.length];
        const endpoint = `${baseEndpoint}?region=${this.config.region}&sid=${this.mqttSessionId}`;
        
        this.logger.info('Kumokonekta sa MQTT server...', {
          endpoint: baseEndpoint.replace('wss://', '').split('/')[0],
          region: this.config.region
        });

        this.connectionStartTime = Date.now();

        const options: mqtt.IClientOptions = {
          clientId: this.generateClientId(),
          protocolId: 'MQTT',
          protocolVersion: 4,
          clean: true,
          keepalive: 60,
          connectTimeout: 60000,
          reconnectPeriod: 0,
          username: this.buildUsername(),
          password: this.getSessionCookies(),
          wsOptions: {
            headers: {
              'Cookie': this.getCookieString(),
              'User-Agent': this.config.userAgent,
              'Origin': 'https://www.messenger.com',
              'Host': baseEndpoint.replace('wss://', '').split('/')[0],
              'Sec-WebSocket-Protocol': 'wss',
              'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            handshakeTimeout: 30000
          }
        };

        this.client = mqtt.connect(endpoint, options);

        const connectTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.logger.warning('Connection timeout, trying next endpoint...');
            this.currentEndpointIndex++;
            if (this.client) {
              this.client.end(true);
            }
            this.scheduleReconnect();
          }
        }, 45000);

        this.client.on('connect', () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.success('Nakakonekta sa MQTT!');
          
          this.subscribeToTopics();
          this.sendPresenceRequest();
          this.sendInitialSync();
          this.startPingInterval();
          this.startSyncInterval();
          
          this.emit('connected');
          resolve();
        });

        this.client.on('message', (topic: string, payload: Buffer) => {
          this.handleMessage(topic, payload);
        });

        this.client.on('error', (error: Error) => {
          clearTimeout(connectTimeout);
          this.logger.error('MQTT error', { error: error.message });
          this.emit('error', error);
          
          if (!this.isConnected) {
            this.currentEndpointIndex++;
            this.scheduleReconnect();
          }
        });

        this.client.on('close', () => {
          clearTimeout(connectTimeout);
          const wasConnected = this.isConnected;
          this.isConnected = false;
          this.stopPingInterval();
          this.stopSyncInterval();
          
          if (wasConnected) {
            this.logger.warning('MQTT connection closed');
            this.emit('disconnected');
            this.scheduleReconnect();
          }
        });

        this.client.on('offline', () => {
          this.logger.warning('MQTT client offline');
          this.scheduleReconnect();
        });

        this.client.on('packetreceive', () => {
          this.lastPingTime = Date.now();
        });

      } catch (error) {
        this.logger.error('Failed to connect to MQTT', { 
          error: (error as Error).message 
        });
        reject(error);
      }
    });
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.lastPingTime = Date.now();
    
    this.pingInterval = setInterval(() => {
      if (this.client && this.isConnected) {
        const timeSinceLastPing = Date.now() - this.lastPingTime;
        
        if (timeSinceLastPing > 180000) {
          this.logger.warning('MQTT ping timeout, reconnecting...');
          this.forceReconnect();
        }
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private startSyncInterval(): void {
    this.stopSyncInterval();
    
    this.syncInterval = setInterval(() => {
      if (this.client && this.isConnected) {
        this.sendSyncRequest();
      }
    }, 60000);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      this.emit('max_reconnect_reached');
      return;
    }

    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(1.5, this.reconnectAttempts), maxDelay);
    const jitter = Math.random() * 1000;
    const totalDelay = delay + jitter;

    this.reconnectAttempts++;
    this.logger.info('Reconnecting to MQTT...', { 
      attempt: this.reconnectAttempts,
      delayMs: Math.round(totalDelay)
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.forceReconnect();
    }, totalDelay);
  }

  private async forceReconnect(): Promise<void> {
    try {
      if (this.client) {
        this.client.end(true);
        this.client = null;
      }
      
      this.sessionId = Math.floor(Math.random() * 0xFFFFFFFF);
      this.mqttSessionId = Math.floor(Math.random() * 0x7FFFFFFF);
      this.deviceId = this.generateDeviceId();
      
      await this.connect();
    } catch (error) {
      this.logger.error('Reconnect failed', { 
        error: (error as Error).message 
      });
      this.scheduleReconnect();
    }
  }

  private subscribeToTopics(): void {
    if (!this.client) return;

    for (const topic of MQTT_TOPICS) {
      this.client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          this.logger.debug(`Failed to subscribe to ${topic}`, { 
            error: err.message 
          });
        }
      });
    }
  }

  private sendPresenceRequest(): void {
    if (!this.client) return;

    const presencePayload = {
      make_user_available_when_in_foreground: true
    };

    this.client.publish(
      '/foreground_state',
      JSON.stringify(presencePayload),
      { qos: 0 }
    );
  }

  private sendInitialSync(): void {
    if (!this.client) return;

    const createQueuePayload = {
      sync_api_version: 10,
      max_deltas_able_to_process: 1000,
      delta_batch_size: 500,
      encoding: 'JSON',
      entity_fbid: this.userId,
      initial_titan_sequence_id: '0',
      device_params: null
    };

    this.client.publish(
      '/messenger_sync_create_queue',
      JSON.stringify(createQueuePayload),
      { qos: 1 }
    );

    setTimeout(() => {
      this.sendSyncRequest();
    }, 500);
  }

  private sendSyncRequest(): void {
    if (!this.client) return;

    const syncPayload = {
      sync_api_version: 10,
      max_deltas_able_to_process: 1000,
      delta_batch_size: 500,
      encoding: 'JSON',
      entity_fbid: this.userId,
      last_seq_id: this.lastSeqId || '0',
      sync_token: this.syncToken || null,
      queue_type: 'messages',
      queue_params: {
        limit: 50,
        tags: ['inbox', 'other', 'pending', 'archived']
      }
    };

    this.client.publish(
      '/messenger_sync_get_diffs',
      JSON.stringify(syncPayload),
      { qos: 1 }
    );

    const graphQLPayload = {
      request_id: ++this.requestId,
      type: 1,
      payload: JSON.stringify({
        sync_groups: [
          'INBOX',
          'MESSAGE_REQUESTS', 
          'ARCHIVED',
          'OTHER'
        ],
        database: 2,
        version: 1,
        last_applied_cursor: null
      }),
      app_id: FB_APP_ID
    };

    this.client.publish('/ls_req', JSON.stringify(graphQLPayload), { qos: 0 });
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      let data: any;
      
      try {
        data = JSON.parse(payload.toString());
      } catch {
        const payloadStr = payload.toString();
        if (payloadStr.length > 0) {
          const jsonMatch = payloadStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[0]);
            } catch {
              return;
            }
          } else {
            return;
          }
        } else {
          return;
        }
      }

      switch (topic) {
        case '/t_ms':
          this.handleMessengerSync(data);
          break;
        case '/t_ms_gd':
          this.handleMessengerSync(data);
          break;
        case '/thread_typing':
        case '/orca_typing_notifications':
          this.handleTypingEvent(data);
          break;
        case '/orca_presence':
          this.handlePresenceEvent(data);
          break;
        case '/legacy_web':
          this.handleLegacyEvent(data);
          break;
        case '/inbox':
          this.handleInboxEvent(data);
          break;
        case '/mercury':
          this.handleMercuryEvent(data);
          break;
        case '/messaging_events':
          this.handleMessagingEvents(data);
          break;
        case '/ig_messaging_events':
          this.handleInstagramMessaging(data);
          break;
        case '/t_p':
          this.handlePresenceTopic(data);
          break;
        case '/ls_resp':
          this.handleLightspeedResponse(data);
          break;
        case '/graphql':
          this.handleGraphQLResponse(data);
          break;
        case '/orca_message_notifications':
          this.handleOrcaMessageNotifications(data);
          break;
        case '/ls_foreground_state':
          this.handleForegroundState(data);
          break;
        case '/t_region_hint':
          this.handleRegionHint(data);
          break;
        case '/notify_disconnect':
        case '/notify_disconnect_v2':
          this.handleDisconnectNotify(data);
          break;
        default:
          if (data && Object.keys(data).length > 0) {
            this.tryExtractMessage(data, topic);
          }
      }
    } catch (error) {
      this.logger.debug(`Error processing message on ${topic}`, { 
        error: (error as Error).message 
      });
    }
  }

  private handleMessengerSync(data: any): void {
    if (data.errorCode) {
      this.logger.warning('Sync error', { code: data.errorCode });
      if (data.errorCode === 'ERROR_QUEUE_NOT_FOUND' || 
          data.errorCode === 'ERROR_QUEUE_OVERFLOW' ||
          data.errorCode === 'ERROR_QUEUE_UNDERFLOW') {
        setTimeout(() => this.sendInitialSync(), 1000);
      }
      return;
    }

    if (data.deltas && Array.isArray(data.deltas)) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }

    if (data.batches && Array.isArray(data.batches)) {
      for (const batch of data.batches) {
        if (batch.deltas && Array.isArray(batch.deltas)) {
          for (const delta of batch.deltas) {
            this.processDelta(delta);
          }
        }
      }
    }

    if (data.payload) {
      this.processPayload(data.payload);
    }

    if (data.threads && Array.isArray(data.threads)) {
      for (const thread of data.threads) {
        if (thread.messages && Array.isArray(thread.messages)) {
          for (const msg of thread.messages) {
            const processedMsg = { ...msg };
            if (!processedMsg.threadId && !processedMsg.threadKey) {
              processedMsg.threadId = thread.threadId || thread.thread_id || thread.id;
              processedMsg.threadKey = thread.threadKey || thread.thread_key;
            }
            this.processDelta(processedMsg);
          }
        }
        if (thread.lastMessage) {
          const lastMsg = { ...thread.lastMessage };
          if (!lastMsg.threadId && !lastMsg.threadKey) {
            lastMsg.threadId = thread.threadId || thread.thread_id || thread.id;
          }
          this.processDelta(lastMsg);
        }
      }
    }

    if (data.messages && Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        this.processDelta(msg);
      }
    }

    if (data.lastIssuedSeqId) {
      this.lastSeqId = data.lastIssuedSeqId.toString();
    }
    if (data.syncToken) {
      this.syncToken = data.syncToken;
    }
    if (data.irisSeqId) {
      this.irisSeqId = data.irisSeqId.toString();
    }
    if (data.irisSnapshotTimestampMs) {
      this.irisSnapshotTimestampMs = data.irisSnapshotTimestampMs.toString();
    }
    if (data.firstDeltaSeqId) {
      this.lastSeqId = data.firstDeltaSeqId.toString();
    }
  }

  private processPayload(payload: any): void {
    try {
      let parsed: any;
      
      if (Buffer.isBuffer(payload)) {
        const payloadStr = payload.toString('utf8');
        if (!payloadStr || payloadStr.trim().length === 0) {
          return;
        }
        try {
          parsed = JSON.parse(payloadStr);
        } catch {
          return;
        }
      } else if (typeof payload === 'string') {
        if (!payload || payload.trim().length === 0) {
          return;
        }
        try {
          parsed = JSON.parse(payload);
        } catch {
          return;
        }
      } else if (typeof payload === 'object' && payload !== null) {
        parsed = payload;
      } else {
        return;
      }
      
      if (parsed.deltas && Array.isArray(parsed.deltas)) {
        for (const delta of parsed.deltas) {
          this.processDelta(delta);
        }
      }
      if (parsed.data) {
        this.processLightspeedData(parsed.data);
      }
      if (parsed.threads && Array.isArray(parsed.threads)) {
        for (const thread of parsed.threads) {
          if (thread.messages && Array.isArray(thread.messages)) {
            for (const msg of thread.messages) {
              this.processLightspeedMessage(msg, thread);
            }
          }
        }
      }
    } catch {
    }
  }

  private processDelta(delta: any): void {
    if (!delta) return;

    const deltaClass = delta.class || delta.deltaClass || delta.type || delta.__typename;

    switch (deltaClass) {
      case 'NewMessage':
        this.handleNewMessage(delta);
        break;
      case 'ReadReceipt':
        this.emit('read_receipt', delta);
        break;
      case 'AdminTextMessage':
        this.handleAdminMessage(delta);
        break;
      case 'ForcedFetch':
        this.emit('forced_fetch', delta);
        this.sendSyncRequest();
        break;
      case 'DeliveryReceipt':
        this.emit('delivery_receipt', delta);
        break;
      case 'MarkRead':
        this.emit('mark_read', delta);
        break;
      case 'ThreadName':
        this.handleThreadNameChange(delta);
        break;
      case 'ParticipantsAddedToGroupThread':
        this.handleParticipantAdded(delta);
        break;
      case 'ParticipantLeftGroupThread':
        this.handleParticipantLeft(delta);
        break;
      case 'ThreadMuteSettings':
        this.emit('thread_mute', delta);
        break;
      case 'ThreadAction':
        this.handleThreadAction(delta);
        break;
      case 'MessageReaction':
        this.handleMessageReaction(delta);
        break;
      case 'RepliedMessage':
        this.handleNewMessage(delta);
        break;
      case 'NoOp':
        break;
      default:
        if (delta.messageMetadata || delta.body !== undefined || delta.message || delta.snippet) {
          this.handleNewMessage(delta);
        } else if (delta.irisSeqId || delta.deltas) {
        } else {
          this.emit('delta', delta);
        }
    }
  }

  private handleNewMessage(delta: any): void {
    const messageData = delta.messageMetadata || delta;
    const body = delta.body || delta.snippet || delta.text || 
                 delta.message?.text || delta.message?.body || 
                 delta.content || '';
    
    let threadID = '';
    let isGroup = false;
    
    if (messageData.threadKey) {
      const threadKey = messageData.threadKey;
      if (threadKey.threadFbId) {
        threadID = threadKey.threadFbId.toString();
        isGroup = true;
      } else if (threadKey.otherUserFbId) {
        threadID = threadKey.otherUserFbId.toString();
        isGroup = false;
      } else if (threadKey.otherUserID) {
        threadID = threadKey.otherUserID.toString();
        isGroup = false;
      } else if (threadKey.other_user_id) {
        threadID = threadKey.other_user_id.toString();
        isGroup = false;
      } else if (threadKey.thread_fbid) {
        threadID = threadKey.thread_fbid.toString();
        isGroup = true;
      }
    }
    
    if (!threadID) {
      threadID = this.extractThreadId(delta, messageData);
      isGroup = threadID.length > 15;
    }

    const senderID = this.extractSenderId(delta, messageData);
    
    const messageID = this.extractMessageId(delta, messageData);
    
    const timestamp = this.extractTimestamp(delta, messageData);

    if (!threadID || !messageID) {
      return;
    }

    if (this.messageIds.has(messageID)) {
      return;
    }
    
    this.messageIds.add(messageID);
    if (this.messageIds.size > 5000) {
      const idsArray = Array.from(this.messageIds);
      this.messageIds = new Set(idsArray.slice(-2500));
    }

    if (!this.config.selfListen && senderID === this.userId) {
      return;
    }

    const attachments = this.parseAttachments(
      delta.attachments || 
      delta.fileAttachments || 
      delta.blob_attachments ||
      delta.extensible_attachments ||
      delta.message?.attachments ||
      []
    );
    const mentions = this.parseMentions(
      delta.data?.prng || 
      delta.mentions || 
      delta.message_tags ||
      delta.message?.mentions ||
      []
    );

    const message: Message = {
      messageID,
      threadID,
      senderID: senderID || 'unknown',
      body: body.toString(),
      timestamp,
      type: this.determineMessageType(delta),
      attachments,
      mentions,
      isGroup,
      isUnread: delta.isUnread ?? delta.unread ?? true,
      replyToMessage: this.extractReplyInfo(delta)
    };

    this.lastMessageTimestamp = timestamp;

    this.logger.info('Natanggap na mensahe', {
      from: senderID,
      thread: threadID,
      type: message.type,
      isGroup
    });

    this.emit('message', message);
  }

  private extractThreadId(delta: any, messageData: any): string {
    return (
      delta.threadId ||
      delta.thread_id ||
      delta.threadFbId ||
      delta.thread_fbid ||
      delta.other_user_fbid ||
      delta.otherUserFbId ||
      messageData.threadId ||
      messageData.thread_id ||
      delta.thread?.thread_key?.thread_fbid ||
      delta.thread?.thread_key?.other_user_id ||
      delta.thread?.id ||
      delta.message_thread?.id ||
      delta.conversation_id ||
      ''
    ).toString();
  }

  private extractSenderId(delta: any, messageData: any): string {
    return (
      messageData.actorFbId || 
      messageData.actor_fbid ||
      delta.senderId || 
      delta.sender_id ||
      delta.senderFbId || 
      delta.authorId ||
      delta.author?.split(':')[1] ||
      delta.author ||
      delta.from?.id ||
      delta.message_sender?.id ||
      delta.message?.sender_id ||
      delta.userId ||
      delta.user_id ||
      ''
    ).toString();
  }

  private extractMessageId(delta: any, messageData: any): string {
    return (
      messageData.messageId || 
      messageData.message_id ||
      delta.messageId || 
      delta.message_id ||
      delta.mid || 
      delta.id ||
      delta.message?.id ||
      delta.message?.mid ||
      ''
    ).toString();
  }

  private extractTimestamp(delta: any, messageData: any): number {
    return parseInt(
      messageData.timestamp || 
      delta.timestamp || 
      delta.timestamp_precise ||
      delta.offlineThreadingId ||
      delta.message?.timestamp ||
      delta.createdTime ||
      delta.created_time
    ) || Date.now();
  }

  private extractReplyInfo(delta: any): Message['replyToMessage'] {
    if (delta.replyToMessageId || delta.replied_to_message || delta.reply_to_message) {
      const repliedTo = delta.replied_to_message || delta.reply_to_message || {};
      return {
        messageID: delta.replyToMessageId || repliedTo.id || repliedTo.message_id || '',
        senderID: delta.replyToSenderId || repliedTo.sender_id || repliedTo.author || '',
        body: delta.replyToMessage || repliedTo.text || repliedTo.body || repliedTo.snippet || ''
      };
    }
    return undefined;
  }

  private parseAttachments(attachments: any[]): any[] {
    if (!Array.isArray(attachments)) return [];
    
    return attachments.map((att: any) => ({
      type: att.mimeType?.split('/')[0] || att.type || att.__typename || 'file',
      url: att.playableUrl || att.url || att.previewUrl || 
           att.largePreviewUrl || att.preview?.uri || att.large_preview?.uri || '',
      id: att.id || att.attachmentId || att.legacy_attachment_id || '',
      filename: att.filename || att.name || att.title || '',
      size: att.fileSize || att.size || 0,
      width: att.width || att.original_dimensions?.x,
      height: att.height || att.original_dimensions?.y,
      duration: att.playableDurationInMs || att.duration || att.video_duration
    }));
  }

  private parseMentions(mentions: any[]): any[] {
    if (!Array.isArray(mentions)) return [];
    
    return mentions.map((m: any) => ({
      id: m.i || m.id || m.userId || m.user_id,
      offset: m.o || m.offset || 0,
      length: m.l || m.length || 0,
      name: m.name || m.text || ''
    }));
  }

  private determineMessageType(delta: any): 'text' | 'sticker' | 'photo' | 'video' | 'audio' | 'file' | 'gif' | 'location' | 'share' {
    if (delta.stickerId || delta.stickerID || delta.sticker) return 'sticker';
    if (delta.shareInfo || delta.story || delta.share) return 'share';
    if (delta.coordinates || delta.location || delta.extensibleAttachment?.story_attachment?.target?.location) return 'location';
    
    const attachments = delta.attachments || delta.fileAttachments || 
                       delta.blob_attachments || delta.message?.attachments || [];
    
    if (attachments.length > 0) {
      const att = attachments[0];
      const mime = att?.mimeType || att?.contentType || att?.mime_type || '';
      const type = att?.type || att?.__typename || '';
      
      if (mime.startsWith('image/gif') || type === 'gif' || type.includes('Animated')) return 'gif';
      if (mime.startsWith('image/') || type === 'photo' || type === 'image' || type.includes('Photo')) return 'photo';
      if (mime.startsWith('video/') || type === 'video' || type.includes('Video')) return 'video';
      if (mime.startsWith('audio/') || type === 'audio' || type === 'voice' || type.includes('Audio')) return 'audio';
      return 'file';
    }
    return 'text';
  }

  private handleAdminMessage(delta: any): void {
    const type = delta.type || delta.adminType || delta.untypedData?.type;
    
    switch (type) {
      case 'change_thread_nickname':
        this.emit('nickname_change', delta);
        break;
      case 'change_thread_theme':
        this.emit('theme_change', delta);
        break;
      case 'change_thread_icon':
      case 'change_thread_emoji':
        this.emit('icon_change', delta);
        break;
      case 'change_thread_admins':
        this.emit('admin_change', delta);
        break;
      case 'group_poll':
        this.emit('poll', delta);
        break;
      default:
        this.emit('admin_message', delta);
    }
  }

  private handleThreadNameChange(delta: any): void {
    const threadKey = delta.messageMetadata?.threadKey || delta.threadKey || {};
    const threadID = threadKey.threadFbId || threadKey.thread_fbid || 
                     threadKey.otherUserFbId || delta.threadId || '';
    const name = delta.name || delta.threadName || delta.newTitle || '';
    const actorID = delta.messageMetadata?.actorFbId || delta.actorFbId || delta.actor_fbid || '';

    this.emit('thread_name', {
      threadID: threadID.toString(),
      name,
      actorID: actorID.toString(),
      timestamp: Date.now()
    });
  }

  private handleParticipantAdded(delta: any): void {
    const threadKey = delta.messageMetadata?.threadKey || delta.threadKey || {};
    const threadID = (threadKey.threadFbId || threadKey.thread_fbid || delta.threadId || '').toString();
    const addedParticipants = delta.addedParticipants || delta.participantsAdded || delta.added_participants || [];
    const actorID = (delta.messageMetadata?.actorFbId || delta.actorFbId || delta.actor_fbid || '').toString();

    const userIDs = addedParticipants.map((p: any) => 
      (p.userFbId || p.user_fbid || p.id || p.participantId || p.participant_id || '').toString()
    );

    this.emit('participant_added', {
      threadID,
      userIDs,
      actorID,
      timestamp: Date.now()
    });
  }

  private handleParticipantLeft(delta: any): void {
    const threadKey = delta.messageMetadata?.threadKey || delta.threadKey || {};
    const threadID = (threadKey.threadFbId || threadKey.thread_fbid || delta.threadId || '').toString();
    const leftParticipantFbId = delta.leftParticipantFbId || delta.left_participant_fbid || 
                                 delta.participantFbId || delta.participant_fbid || '';
    const actorID = (delta.messageMetadata?.actorFbId || delta.actorFbId || delta.actor_fbid || '').toString();

    this.emit('participant_left', {
      threadID,
      userID: leftParticipantFbId.toString(),
      actorID,
      timestamp: Date.now()
    });
  }

  private handleThreadAction(delta: any): void {
    this.emit('thread_action', delta);
  }

  private handleMessageReaction(delta: any): void {
    const threadKey = delta.threadKey || delta.messageMetadata?.threadKey || {};
    const threadID = (threadKey.threadFbId || threadKey.otherUserFbId || delta.threadId || '').toString();
    const messageID = delta.messageId || delta.message_id || '';
    const reaction = delta.reaction || delta.emoji || '';
    const actorID = (delta.actorFbId || delta.senderId || '').toString();

    this.emit('message_reaction', {
      threadID,
      messageID: messageID.toString(),
      reaction,
      senderID: actorID,
      timestamp: Date.now()
    });
  }

  private handleTypingEvent(data: any): void {
    const senderID = (data.sender_fbid || data.from || data.senderId || 
                      data.userId || data.user_id || data.sender).toString();
    const threadID = (data.thread || data.thread_fbid || data.threadId || 
                      data.thread_id || data.to).toString();
    const isTyping = data.state === 1 || data.isTyping === true || data.typing === true;

    if (senderID && threadID) {
      this.emit('typing', {
        senderID,
        threadID,
        isTyping
      });
    }
  }

  private handlePresenceEvent(data: any): void {
    if (data.list && Array.isArray(data.list)) {
      for (const presence of data.list) {
        const userID = (presence.u || presence.userId || presence.user_id || '').toString();
        if (userID) {
          this.emit('presence', {
            userID,
            isActive: presence.p !== 0,
            lastActive: presence.lat || presence.lastActiveTime || presence.last_active,
            status: presence.p === 2 ? 'active' : presence.p === 0 ? 'offline' : 'idle'
          });
        }
      }
    }
  }

  private handlePresenceTopic(data: any): void {
    if (data.list_type === 'full' && data.list) {
      for (const item of data.list) {
        this.emit('presence', {
          userID: (item.u || '').toString(),
          isActive: item.p === 2,
          lastActive: item.l || item.lat
        });
      }
    }
  }

  private handleLegacyEvent(data: any): void {
    if (data.delta) {
      this.processDelta(data.delta);
    } else if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    } else if (data.type === 'messaging') {
      this.handleMessagingEvents(data);
    } else {
      this.emit('legacy_event', data);
    }
  }

  private handleInboxEvent(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.threads) {
      for (const thread of data.threads) {
        if (thread.messages) {
          for (const msg of thread.messages) {
            this.processDelta({ ...msg, threadId: thread.threadId || thread.id });
          }
        }
      }
    }
    this.emit('inbox', data);
  }

  private handleMercuryEvent(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.actions) {
      for (const action of data.actions) {
        const actionType = action.action_type || action.type || '';
        if (actionType === 'log:subscribe' || 
            actionType === 'ma-type:user-generated-message' ||
            action.body !== undefined ||
            action.message_id) {
          const message = this.convertMercuryToMessage(action);
          if (message.threadID && message.messageID) {
            if (!this.messageIds.has(message.messageID)) {
              this.messageIds.add(message.messageID);
              this.emit('message', message);
            }
          }
        }
      }
    }
    if (data.payload?.actions) {
      for (const action of data.payload.actions) {
        const message = this.convertMercuryToMessage(action);
        if (message.threadID && message.messageID) {
          if (!this.messageIds.has(message.messageID)) {
            this.messageIds.add(message.messageID);
            this.emit('message', message);
          }
        }
      }
    }
  }

  private handleMessagingEvents(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.messages) {
      for (const msg of data.messages) {
        this.processDelta(msg);
      }
    }
    if (data.event) {
      this.emit('messaging_event', data.event);
    }
    if (data.threads) {
      for (const thread of data.threads) {
        if (thread.messages) {
          for (const msg of thread.messages) {
            this.processDelta({ ...msg, threadId: thread.id || thread.threadId });
          }
        }
      }
    }
  }

  private handleInstagramMessaging(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.data) {
      this.processLightspeedData(data.data);
    }
  }

  private handleLightspeedResponse(data: any): void {
    if (data.payload) {
      this.processPayload(data.payload);
    }
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.data) {
      this.processLightspeedData(data.data);
    }
    if (data.request_id && data.payload) {
      try {
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        if (payload.step_data) {
          this.processStepData(payload.step_data);
        }
      } catch {
      }
    }
  }

  private processStepData(stepData: any): void {
    if (!stepData) return;
    
    if (Array.isArray(stepData)) {
      for (const step of stepData) {
        if (step.messages) {
          for (const msg of step.messages) {
            this.processLightspeedMessage(msg, step.thread || {});
          }
        }
        if (step.deltas) {
          for (const delta of step.deltas) {
            this.processDelta(delta);
          }
        }
      }
    }
  }

  private processLightspeedData(data: any): void {
    if (!data) return;
    
    if (data.viewer?.message_threads?.nodes) {
      for (const thread of data.viewer.message_threads.nodes) {
        if (thread.messages?.nodes) {
          for (const msg of thread.messages.nodes) {
            this.processLightspeedMessage(msg, thread);
          }
        }
        if (thread.all_participants?.nodes) {
        }
      }
    }

    if (data.message_threads?.nodes) {
      for (const thread of data.message_threads.nodes) {
        if (thread.messages?.nodes) {
          for (const msg of thread.messages.nodes) {
            this.processLightspeedMessage(msg, thread);
          }
        }
      }
    }

    if (data.message_thread?.messages?.nodes) {
      for (const msg of data.message_thread.messages.nodes) {
        this.processLightspeedMessage(msg, data.message_thread);
      }
    }

    if (data.messages && Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        if (msg.class || msg.deltaClass || msg.type || msg.messageMetadata) {
          this.processDelta(msg);
        } else {
          this.processLightspeedMessage(msg, { thread_key: msg.thread_key || {} });
        }
      }
    }

    if (data.deltas && Array.isArray(data.deltas)) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }

    if (data.threads && Array.isArray(data.threads)) {
      for (const thread of data.threads) {
        if (thread.messages?.nodes) {
          for (const msg of thread.messages.nodes) {
            this.processLightspeedMessage(msg, thread);
          }
        } else if (thread.messages && Array.isArray(thread.messages)) {
          for (const msg of thread.messages) {
            this.processLightspeedMessage(msg, thread);
          }
        }
      }
    }
  }

  private processLightspeedMessage(msg: any, thread: any): void {
    if (!msg) return;
    
    let threadID = '';
    let isGroup = false;
    
    if (thread?.thread_key?.thread_fbid) {
      threadID = thread.thread_key.thread_fbid.toString();
      isGroup = true;
    } else if (thread?.thread_key?.other_user_id) {
      threadID = thread.thread_key.other_user_id.toString();
      isGroup = false;
    } else if (thread?.id) {
      threadID = thread.id.toString();
      isGroup = threadID.length > 15;
    } else if (thread?.threadId) {
      threadID = thread.threadId.toString();
      isGroup = threadID.length > 15;
    }
    
    if (!threadID && msg.thread_id) {
      threadID = msg.thread_id.toString();
      isGroup = threadID.length > 15;
    } else if (!threadID && msg.threadId) {
      threadID = msg.threadId.toString();
      isGroup = threadID.length > 15;
    } else if (!threadID && msg.thread) {
      threadID = (msg.thread.id || msg.thread.thread_id || '').toString();
      isGroup = threadID.length > 15;
    }
    
    const senderID = (
      msg.message_sender?.id ||
      msg.sender?.id ||
      msg.sender_id ||
      msg.senderId ||
      msg.senderFbId ||
      msg.actorFbId ||
      msg.author?.split(':')[1] ||
      msg.author ||
      msg.from?.id ||
      msg.user_id ||
      ''
    ).toString();
    
    const messageID = (
      msg.message_id || 
      msg.messageId ||
      msg.id || 
      msg.mid ||
      ''
    ).toString();
    
    const body = (
      msg.message?.text || 
      msg.snippet || 
      msg.text || 
      msg.body ||
      msg.content ||
      ''
    ).toString();
    
    const timestamp = parseInt(msg.timestamp_precise || msg.timestamp || msg.created_time) || Date.now();

    if (!threadID || !messageID) return;
    if (!senderID && !body) return;
    
    if (this.messageIds.has(messageID)) return;
    this.messageIds.add(messageID);
    
    if (!this.config.selfListen && senderID === this.userId) return;

    const message: Message = {
      messageID,
      threadID,
      senderID: senderID || 'unknown',
      body,
      timestamp,
      type: this.determineMessageType(msg),
      attachments: this.parseAttachments(msg.attachments || msg.blob_attachments || msg.message?.attachments || []),
      mentions: this.parseMentions(msg.mentions || msg.message_tags || msg.message?.mentions || []),
      isGroup,
      isUnread: msg.isUnread ?? msg.unread ?? true
    };

    this.logger.info('Lightspeed mensahe natanggap', {
      from: senderID,
      thread: threadID,
      isGroup
    });

    this.emit('message', message);
  }

  private handleGraphQLResponse(data: any): void {
    if (data.data) {
      this.processLightspeedData(data.data);
    }
    if (data.payload) {
      try {
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        this.processLightspeedData(payload);
        if (payload.data) {
          this.processLightspeedData(payload.data);
        }
      } catch {
      }
    }
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
  }

  private handleOrcaMessageNotifications(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.payload) {
      this.processPayload(data.payload);
    }
    if (data.message || data.body !== undefined) {
      this.handleNewMessage(data);
    }
    if (data.threads) {
      for (const thread of data.threads) {
        if (thread.messages) {
          for (const msg of thread.messages) {
            this.processDelta({ ...msg, threadId: thread.id || thread.threadId });
          }
        }
      }
    }
  }

  private handleForegroundState(data: any): void {
    this.emit('foreground_state', data);
  }

  private handleRegionHint(data: any): void {
    if (data.region) {
      this.config.region = data.region;
      this.logger.debug('Region hint received', { region: data.region });
    }
  }

  private handleDisconnectNotify(data: any): void {
    this.logger.warning('Disconnect notification received', data);
    this.emit('disconnect_notify', data);
    
    if (data.reason === 'new_session' || data.reason === 'session_replaced') {
      this.scheduleReconnect();
    }
  }

  private tryExtractMessage(data: any, topic: string): void {
    if (data.deltas && Array.isArray(data.deltas)) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
      return;
    }
    
    if (data.delta) {
      this.processDelta(data.delta);
      return;
    }

    if (data.class || data.deltaClass || data.messageMetadata) {
      this.handleNewMessage(data);
      return;
    }

    if (data.message || data.body !== undefined || data.snippet) {
      if (data.threadId || data.thread_id || data.threadKey || data.thread_fbid || data.thread) {
        this.handleNewMessage(data);
      } else {
        this.processLightspeedMessage(data, {});
      }
      return;
    }

    if (data.viewer?.message_threads?.nodes || 
        data.message_thread?.messages?.nodes ||
        data.message_threads?.nodes) {
      this.processLightspeedData(data);
      return;
    }

    if (data.payload) {
      this.processPayload(data.payload);
    }

    if (data.data) {
      this.processLightspeedData(data.data);
    }

    if (data.threads && Array.isArray(data.threads)) {
      for (const thread of data.threads) {
        if (thread.messages) {
          for (const msg of thread.messages) {
            this.processDelta({ ...msg, threadId: thread.id || thread.threadId });
          }
        }
      }
    }
  }

  private convertMercuryToMessage(action: any): Message {
    const threadID = action.thread_fbid || action.other_user_fbid || 
                     action.thread_id || action.threadId || '';
    const senderID = action.author?.split(':')[1] || action.author || 
                     action.sender_id || action.senderId || '';
    
    return {
      messageID: action.message_id || action.messageId || action.mid || '',
      threadID: threadID.toString(),
      senderID: senderID.toString(),
      body: action.body || action.snippet || action.text || '',
      timestamp: parseInt(action.timestamp || action.timestamp_precise) || Date.now(),
      type: this.determineMessageType(action),
      attachments: this.parseAttachments(action.attachments || []),
      mentions: this.parseMentions(action.mentions || []),
      isGroup: !!action.thread_fbid
    };
  }

  disconnect(): void {
    this.stopPingInterval();
    this.stopSyncInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.logger.info('MQTT disconnected');
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  sendPresence(isOnline: boolean): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      make_user_available_when_in_foreground: isOnline
    };

    this.client.publish('/foreground_state', JSON.stringify(payload), { qos: 0 });
  }

  sendTypingIndicator(threadID: string, isTyping: boolean): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      thread: threadID,
      state: isTyping ? 1 : 0,
      to: threadID
    };

    this.client.publish('/typing', JSON.stringify(payload), { qos: 0 });
    this.client.publish('/thread_typing', JSON.stringify(payload), { qos: 0 });
  }

  markAsDelivered(threadID: string, messageID: string): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      threadID,
      messageID,
      action: 'delivered'
    };

    this.client.publish('/t_ms', JSON.stringify(payload), { qos: 0 });
  }

  markAsRead(threadID: string): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      threadID,
      action: 'mark_read',
      timestamp: Date.now()
    };

    this.client.publish('/t_ms', JSON.stringify(payload), { qos: 0 });
  }

  getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }

  getProcessedMessageCount(): number {
    return this.messageIds.size;
  }
}
