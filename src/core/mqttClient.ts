import { EventEmitter } from 'events';
import * as mqtt from 'mqtt';
import { Message, AppState, Attachment, Mention } from '../types';
import { Logger } from '../utils/logger';

export interface MqttConfig {
  region?: string;
  userAgent?: string;
  selfListen?: boolean;
  listenEvents?: boolean;
  updatePresence?: boolean;
  forceLogin?: boolean;
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
  '/ls_foreground_state',
  '/t_p',
  '/t_region_hint',
  '/notify_disconnect_v2',
  '/t_ms_gd',
  '/t_rtc_multi',
  '/t_trace',
  '/t_rtc_log'
];

const FB_MQTT_BROKER = 'wss://edge-chat.messenger.com/chat';
const FB_MQTT_BROKER_FALLBACKS = [
  'wss://edge-chat.facebook.com/chat',
  'wss://edge-chat.messenger.com/mqtt',
  'wss://mqtt-mini.facebook.com:443/mqtt',
  'wss://z-1-edge-chat.messenger.com/chat',
  'wss://z-p3-edge-chat.messenger.com/chat',
  'wss://z-p4-edge-chat.messenger.com/chat'
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
  'RepliedMessage',
  'ThreadFolder',
  'RTCEventLog',
  'MessageUnsend',
  'ThreadImageUpdate'
];

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private logger: Logger;
  private userId: string;
  private appState: AppState;
  private config: MqttConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 150;
  private lastSeqId: string = '0';
  private syncToken: string = '';
  private sessionId: number;
  private deviceId: string;
  private clientId: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private presenceInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private connectionStartTime: number = 0;
  private currentEndpointIndex: number = 0;
  private irisSeqId: string = '';
  private irisSnapshotTimestampMs: string = '';
  private messageIds: Set<string> = new Set();
  private lastMessageTimestamp: number = 0;
  private fbDtsg: string = '';
  private ttstamp: string = '';

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
      userAgent: config.userAgent || this.getDefaultUserAgent(),
      selfListen: config.selfListen ?? false,
      listenEvents: config.listenEvents ?? true,
      updatePresence: config.updatePresence ?? true,
      forceLogin: config.forceLogin ?? false
    };
    this.logger = logger || new Logger({ language: 'tl' });
    this.sessionId = Math.floor(Math.random() * 0xFFFFFFFF);
    this.deviceId = this.generateDeviceId();
    this.clientId = this.generateClientId();
    this.fbDtsg = appState.fbDtsg || '';
    this.ttstamp = this.generateTtstamp();
    this.messageIds = new Set();
  }

  private detectRegion(): string {
    const regions = ['prn', 'pnb', 'ash', 'frc', 'sin', 'hkg', 'syd', 'lla', 'nrt'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getDefaultUserAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
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
    return `mqttwsclient-${this.userId.slice(-6)}-${timestamp}-${random}`;
  }

  private generateTtstamp(): string {
    let ttstamp = '2';
    if (this.fbDtsg) {
      for (let i = 0; i < this.fbDtsg.length; i++) {
        ttstamp += this.fbDtsg.charCodeAt(i).toString();
      }
    }
    return ttstamp;
  }

  private getCookieString(): string {
    if (!this.appState.cookies || !Array.isArray(this.appState.cookies)) {
      return '';
    }
    return this.appState.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  private getCookieValue(name: string): string {
    if (!this.appState.cookies || !Array.isArray(this.appState.cookies)) {
      return '';
    }
    const cookie = this.appState.cookies.find(c => c.name === name);
    return cookie?.value || '';
  }

  private buildMqttUsername(): string {
    const cUser = this.getCookieValue('c_user') || this.userId;
    
    const userInfo = {
      u: cUser,
      s: this.sessionId,
      chat_on: true,
      fg: true,
      d: this.deviceId,
      ct: 'websocket',
      mqtt_sid: '',
      aid: 219994525426954,
      st: [],
      pm: [],
      cp: 3,
      ecp: 10,
      dc: '',
      no_auto_fg: true,
      gas: null,
      pack: [],
      php_override: ''
    };

    return JSON.stringify(userInfo);
  }

  private buildPassword(): string {
    const cookies: Record<string, string> = {};
    if (this.appState.cookies && Array.isArray(this.appState.cookies)) {
      for (const cookie of this.appState.cookies) {
        cookies[cookie.name] = cookie.value;
      }
    }
    return JSON.stringify(cookies);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const endpoints = [FB_MQTT_BROKER, ...FB_MQTT_BROKER_FALLBACKS];
        const baseEndpoint = endpoints[this.currentEndpointIndex % endpoints.length];
        const endpoint = `${baseEndpoint}?region=${this.config.region}&sid=${this.sessionId}`;
        
        this.logger.info('Kumokonekta sa Messenger MQTT...', {
          endpoint: baseEndpoint.replace('wss://', '').split('/')[0],
          region: this.config.region
        });

        this.connectionStartTime = Date.now();

        const options: mqtt.IClientOptions = {
          clientId: this.clientId,
          protocolId: 'MQIsdp',
          protocolVersion: 3,
          clean: true,
          keepalive: 60,
          connectTimeout: 60000,
          reconnectPeriod: 0,
          username: this.buildMqttUsername(),
          password: this.buildPassword(),
          wsOptions: {
            headers: {
              'Cookie': this.getCookieString(),
              'User-Agent': this.config.userAgent,
              'Origin': 'https://www.facebook.com',
              'Host': baseEndpoint.replace('wss://', '').split('/')[0],
              'Sec-WebSocket-Protocol': 'wss',
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
          this.logger.success('Nakakonekta sa Messenger MQTT!');
          
          this.subscribeToTopics();
          this.sendConnectPayload();
          this.startPingInterval();
          this.startSyncInterval();
          this.startPresenceInterval();
          
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
          this.stopPresenceInterval();
          
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

  private sendConnectPayload(): void {
    if (!this.client) return;

    const connectPayload = {
      type: 'connect',
      database: 1,
      max_deltas_able_to_process: 1000,
      sync_api_version: 10,
      delta_batch_size: 500,
      encoding: 'JSON',
      device_id: this.deviceId,
      device_params: null,
      entity_fbid: this.userId,
      initial_titan_sequence_id: this.lastSeqId,
      irisSeqID: this.irisSeqId || undefined
    };

    this.client.publish(
      '/messenger_sync_create_queue',
      JSON.stringify(connectPayload),
      { qos: 1 }
    );

    setTimeout(() => {
      this.sendPresence(true);
      this.sendInitialSync();
    }, 500);
  }

  private sendInitialSync(): void {
    if (!this.client) return;

    const syncPayload = {
      type: 'delta',
      delta_batch_size: 500,
      max_deltas_able_to_process: 1000,
      sync_api_version: 10,
      encoding: 'JSON',
      entity_fbid: this.userId,
      last_seq_id: this.lastSeqId,
      sync_token: this.syncToken || null,
      queue_params: {
        buzz_on_deltas_enabled: false
      }
    };

    this.client.publish(
      '/messenger_sync_get_diffs',
      JSON.stringify(syncPayload),
      { qos: 1 }
    );
  }

  sendPresence(isOnline: boolean): void {
    if (!this.client || !this.isConnected) return;

    const presencePayload = {
      type: 1,
      visibility: isOnline,
      last_active: Date.now()
    };

    this.client.publish(
      '/foreground_state',
      JSON.stringify(presencePayload),
      { qos: 0 }
    );
  }

  sendTypingIndicator(threadID: string, isTyping: boolean = true): void {
    if (!this.client || !this.isConnected) return;

    const typingPayload = {
      thread: threadID,
      sender_fbid: this.userId,
      state: isTyping ? 1 : 0,
      typ: isTyping ? 1 : 0
    };

    this.client.publish(
      '/typing',
      JSON.stringify(typingPayload),
      { qos: 0 }
    );
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
        this.sendInitialSync();
      }
    }, 60000);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private startPresenceInterval(): void {
    this.stopPresenceInterval();
    
    if (this.config.updatePresence) {
      this.presenceInterval = setInterval(() => {
        if (this.client && this.isConnected) {
          this.sendPresence(true);
        }
      }, 60000);
    }
  }

  private stopPresenceInterval(): void {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
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
      this.clientId = this.generateClientId();
      this.deviceId = this.generateDeviceId();
      
      await this.connect();
    } catch (error) {
      this.logger.error('Reconnect failed', { 
        error: (error as Error).message 
      });
      this.scheduleReconnect();
    }
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
        case '/t_ms_gd':
          this.handleMessengerSync(data);
          break;
        case '/thread_typing':
        case '/orca_typing_notifications':
          this.handleTypingEvent(data);
          break;
        case '/orca_presence':
        case '/t_p':
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
        case '/orca_message_notifications':
          this.handleOrcaNotifications(data);
          break;
        case '/notify_disconnect':
        case '/notify_disconnect_v2':
          this.handleDisconnectNotify(data);
          break;
        case '/t_region_hint':
          this.handleRegionHint(data);
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
        setTimeout(() => this.sendConnectPayload(), 1000);
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

    if (data.threads && Array.isArray(data.threads)) {
      for (const thread of data.threads) {
        this.processThread(thread);
      }
    }

    if (data.messages && Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        this.processMessageData(msg);
      }
    }

    this.updateSyncState(data);
  }

  private processThread(thread: any): void {
    if (thread.messages && Array.isArray(thread.messages)) {
      for (const msg of thread.messages) {
        const processedMsg = { ...msg };
        if (!processedMsg.threadId && !processedMsg.threadKey) {
          processedMsg.threadId = thread.threadId || thread.thread_id || thread.id;
          processedMsg.threadKey = thread.threadKey || thread.thread_key;
        }
        this.processMessageData(processedMsg);
      }
    }
    if (thread.lastMessage) {
      const lastMsg = { ...thread.lastMessage };
      if (!lastMsg.threadId && !lastMsg.threadKey) {
        lastMsg.threadId = thread.threadId || thread.thread_id || thread.id;
      }
      this.processMessageData(lastMsg);
    }
  }

  private updateSyncState(data: any): void {
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
        this.sendInitialSync();
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
      case 'MessageUnsend':
        this.emit('message_unsend', delta);
        break;
      default:
        if (delta.messageMetadata || delta.body || delta.message || delta.text) {
          this.handleNewMessage(delta);
        }
    }
  }

  private handleNewMessage(delta: any): void {
    try {
      const messageId = this.extractMessageId(delta);
      
      if (messageId && this.messageIds.has(messageId)) {
        return;
      }
      
      if (messageId) {
        this.messageIds.add(messageId);
        if (this.messageIds.size > 5000) {
          const iterator = this.messageIds.values();
          for (let i = 0; i < 1000; i++) {
            const first = iterator.next().value;
            if (first) this.messageIds.delete(first);
          }
        }
      }

      const threadId = this.extractThreadId(delta);
      const senderId = this.extractSenderId(delta);
      const timestamp = this.extractTimestamp(delta);
      const body = this.extractBody(delta);
      const attachments = this.extractAttachments(delta);
      const mentions = this.extractMentions(delta);
      const replyInfo = this.extractReplyInfo(delta);
      const isGroup = threadId ? threadId.length > 15 : false;

      if (!this.config.selfListen && senderId === this.userId) {
        return;
      }

      if (!threadId || !senderId) {
        return;
      }

      const message: Message = {
        messageID: messageId || `msg_${Date.now()}`,
        threadID: threadId,
        senderID: senderId,
        body: body,
        timestamp: timestamp,
        type: this.determineMessageType(delta, attachments),
        attachments: attachments,
        mentions: mentions,
        isGroup: isGroup,
        isUnread: delta.isUnread ?? delta.unread ?? true,
        replyToMessage: replyInfo
      };

      this.lastMessageTimestamp = timestamp;
      
      this.logger.debug('Natanggap ang mensahe', {
        threadID: threadId.slice(-6),
        senderID: senderId.slice(-6),
        isGroup
      });
      
      this.emit('message', message);
    } catch (error) {
      this.logger.debug('Error processing new message', { 
        error: (error as Error).message 
      });
    }
  }

  private extractMessageId(delta: any): string {
    return delta.messageMetadata?.messageId ||
           delta.messageId ||
           delta.mid ||
           delta.message_id ||
           delta.id ||
           delta.messageID ||
           delta.message?.message_id ||
           delta.message?.id ||
           '';
  }

  private extractThreadId(delta: any): string {
    if (delta.messageMetadata?.threadKey?.threadFbId) {
      return delta.messageMetadata.threadKey.threadFbId.toString();
    }
    if (delta.messageMetadata?.threadKey?.otherUserFbId) {
      return delta.messageMetadata.threadKey.otherUserFbId.toString();
    }
    if (delta.threadKey?.threadFbId) {
      return delta.threadKey.threadFbId.toString();
    }
    if (delta.threadKey?.otherUserFbId) {
      return delta.threadKey.otherUserFbId.toString();
    }
    if (delta.thread?.thread_key?.thread_fbid) {
      return delta.thread.thread_key.thread_fbid.toString();
    }
    if (delta.thread?.thread_key?.other_user_id) {
      return delta.thread.thread_key.other_user_id.toString();
    }
    
    const fields = [
      'threadId', 'thread_id', 'threadID', 'thread_fbid',
      'conversation_id', 'tid', 'thread'
    ];
    
    for (const field of fields) {
      if (delta[field]) {
        const value = delta[field];
        if (typeof value === 'object') {
          return value.thread_fbid?.toString() || 
                 value.threadFbId?.toString() || 
                 value.other_user_id?.toString() ||
                 value.otherUserFbId?.toString() ||
                 '';
        }
        return value.toString();
      }
    }
    
    return '';
  }

  private extractSenderId(delta: any): string {
    if (delta.messageMetadata?.actorFbId) {
      return delta.messageMetadata.actorFbId.toString();
    }
    
    const fields = [
      'actorFbId', 'senderId', 'sender_id', 'senderID',
      'author', 'from', 'user_id', 'userId', 'author_id',
      'message_sender'
    ];
    
    for (const field of fields) {
      if (delta[field]) {
        const value = delta[field];
        if (typeof value === 'object') {
          return value.id?.toString() || 
                 value.fbid?.toString() ||
                 '';
        }
        const strValue = value.toString();
        if (strValue.includes(':')) {
          return strValue.split(':')[1] || strValue;
        }
        return strValue;
      }
    }
    
    return '';
  }

  private extractTimestamp(delta: any): number {
    const fields = [
      'messageMetadata.timestamp',
      'timestamp',
      'timestamp_ms',
      'timestampMs',
      'timestamp_precise',
      'sentTimestamp',
      'time'
    ];
    
    for (const field of fields) {
      const parts = field.split('.');
      let value: any = delta;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value) {
        const numValue = parseInt(value.toString(), 10);
        if (!isNaN(numValue)) {
          return numValue;
        }
      }
    }
    
    return Date.now();
  }

  private extractBody(delta: any): string {
    return delta.body ||
           delta.text ||
           delta.messageMetadata?.body ||
           delta.message?.text ||
           delta.message?.body ||
           delta.snippet ||
           '';
  }

  private extractAttachments(delta: any): Attachment[] {
    const attachments: Attachment[] = [];
    
    const rawAttachments = delta.attachments || 
                          delta.messageMetadata?.attachments ||
                          delta.blob_attachments ||
                          delta.extensible_attachments ||
                          [];
    
    for (const att of rawAttachments) {
      const attachment: Attachment = {
        type: this.getAttachmentType(att),
        url: att.url || att.preview_url || att.playable_url || att.image?.uri,
        id: att.id || att.attachment_id,
        filename: att.filename || att.name,
        size: att.fileSize || att.file_size
      };
      attachments.push(attachment);
    }
    
    return attachments;
  }

  private getAttachmentType(att: any): string {
    if (att.type) return att.type;
    if (att.attach_type) return att.attach_type;
    if (att.__typename) {
      const typename = att.__typename.toLowerCase();
      if (typename.includes('image') || typename.includes('photo')) return 'photo';
      if (typename.includes('video')) return 'video';
      if (typename.includes('audio')) return 'audio';
      if (typename.includes('file')) return 'file';
      if (typename.includes('sticker')) return 'sticker';
      if (typename.includes('gif')) return 'gif';
    }
    return 'file';
  }

  private extractMentions(delta: any): Mention[] {
    const mentions: Mention[] = [];
    
    const rawMentions = delta.mentions || 
                       delta.messageMetadata?.mentions ||
                       delta.message_tags ||
                       [];
    
    for (const m of rawMentions) {
      mentions.push({
        id: m.id || m.user_id || m.i,
        offset: m.offset || m.o || 0,
        length: m.length || m.l || 0,
        name: m.name || m.n || ''
      });
    }
    
    return mentions;
  }

  private extractReplyInfo(delta: any): Message['replyToMessage'] | undefined {
    const reply = delta.repliedToMessage || 
                 delta.replied_to_message ||
                 delta.replyToMessage ||
                 delta.quotedMessage;
    
    if (!reply) return undefined;
    
    return {
      messageID: reply.message_id || reply.messageId || reply.mid || reply.id || '',
      senderID: reply.sender_id || reply.senderId || reply.author || '',
      body: reply.body || reply.text || reply.snippet || ''
    };
  }

  private determineMessageType(delta: any, attachments: Attachment[]): Message['type'] {
    if (delta.stickerId || delta.sticker_id) return 'sticker';
    if (attachments.length > 0) {
      const firstType = attachments[0].type;
      if (firstType === 'photo' || firstType === 'image') return 'photo';
      if (firstType === 'video') return 'video';
      if (firstType === 'audio') return 'audio';
      if (firstType === 'sticker') return 'sticker';
      if (firstType === 'gif') return 'gif';
      if (firstType === 'file') return 'file';
    }
    if (delta.coordinates || delta.location) return 'location';
    if (delta.share || delta.url) return 'share';
    return 'text';
  }

  private processMessageData(msg: any): void {
    this.handleNewMessage(msg);
  }

  private handleAdminMessage(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const adminType = delta.adminTextType || delta.type || 'unknown';
    
    this.emit('admin_message', {
      threadID: threadId,
      type: adminType,
      data: delta
    });
  }

  private handleTypingEvent(data: any): void {
    const threadId = data.thread || data.threadId || data.thread_id;
    const senderId = data.sender_fbid || data.from || data.senderId;
    const isTyping = data.st === 1 || data.state === 1 || data.typing === true;
    
    this.emit('typing', {
      threadID: threadId,
      senderID: senderId,
      isTyping
    });
  }

  private handlePresenceEvent(data: any): void {
    if (data.list || data.list_type === 'inc') {
      const presenceList = data.list || [];
      for (const presence of presenceList) {
        const userId = presence.u || presence.id;
        const status = presence.p || presence.status;
        const lastActive = presence.lat || presence.last_active;
        
        this.emit('presence', {
          userID: userId,
          status: status === 2 || status === 'active' ? 'online' : 'offline',
          lastActive
        });
      }
    }
  }

  private handleLegacyEvent(data: any): void {
    if (data.ms && Array.isArray(data.ms)) {
      for (const msg of data.ms) {
        this.processDelta(msg);
      }
    }
  }

  private handleInboxEvent(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
  }

  private handleMercuryEvent(data: any): void {
    if (data.actions && Array.isArray(data.actions)) {
      for (const action of data.actions) {
        this.processMessageData(action);
      }
    }
  }

  private handleMessagingEvents(data: any): void {
    if (data.deltas && Array.isArray(data.deltas)) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.event) {
      this.processDelta(data);
    }
  }

  private handleOrcaNotifications(data: any): void {
    if (data.payload) {
      try {
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        this.processDelta(payload);
      } catch {
      }
    }
  }

  private handleThreadNameChange(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const newName = delta.name || delta.thread_name || delta.title;
    const actorId = delta.messageMetadata?.actorFbId || delta.actorFbId || delta.author;
    
    this.emit('thread_name', {
      threadID: threadId,
      name: newName,
      actorID: actorId
    });
  }

  private handleParticipantAdded(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const addedParticipants = delta.addedParticipants || delta.added_participants || [];
    const actorId = delta.messageMetadata?.actorFbId || delta.actorFbId;
    
    this.emit('participant_added', {
      threadID: threadId,
      participants: addedParticipants.map((p: any) => p.userFbId || p.id),
      actorID: actorId
    });
  }

  private handleParticipantLeft(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const leftParticipant = delta.leftParticipantFbId || delta.left_participant;
    
    this.emit('participant_left', {
      threadID: threadId,
      participantID: leftParticipant
    });
  }

  private handleThreadAction(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const actionType = delta.actionType || delta.action_type || delta.type;
    
    this.emit('thread_action', {
      threadID: threadId,
      type: actionType,
      data: delta
    });
  }

  private handleMessageReaction(delta: any): void {
    const threadId = this.extractThreadId(delta);
    const messageId = delta.messageId || delta.message_id;
    const reaction = delta.reaction || delta.emoji;
    const senderId = delta.senderId || delta.userId || delta.actor;
    
    this.emit('message_reaction', {
      threadID: threadId,
      messageID: messageId,
      reaction: reaction,
      senderID: senderId
    });
  }

  private handleDisconnectNotify(data: any): void {
    this.logger.warning('Received disconnect notification', { reason: data.reason });
    if (data.reason === 'mqtt_over_limit' || data.reason === 'connection_limit') {
      setTimeout(() => this.forceReconnect(), 5000);
    }
  }

  private handleRegionHint(data: any): void {
    if (data.region) {
      this.config.region = data.region;
      this.logger.debug('Region hint received', { region: data.region });
    }
  }

  private tryExtractMessage(data: any, topic: string): void {
    if (data.deltas && Array.isArray(data.deltas)) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }
    if (data.message || data.body || data.text) {
      this.processMessageData(data);
    }
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopPingInterval();
    this.stopSyncInterval();
    this.stopPresenceInterval();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    
    this.logger.info('MQTT disconnected');
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  getLastMessageTimestamp(): number {
    return this.lastMessageTimestamp;
  }

  getProcessedMessageCount(): number {
    return this.messageIds.size;
  }

  markAsDelivered(threadID: string, messageID: string): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      thread_id: threadID,
      message_id: messageID,
      action: 'delivery'
    };

    this.client.publish(
      '/t_ms',
      JSON.stringify({ type: 'delivery_receipt', ...payload }),
      { qos: 0 }
    );
  }

  markAsRead(threadID: string): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      thread_id: threadID,
      action: 'mark_read',
      timestamp: Date.now()
    };

    this.client.publish(
      '/t_ms',
      JSON.stringify({ type: 'mark_read', ...payload }),
      { qos: 0 }
    );
  }
}
