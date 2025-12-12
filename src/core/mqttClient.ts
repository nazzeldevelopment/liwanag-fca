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
  '/notify_disconnect_v2'
];

const FB_APP_ID = '219994525426954';

const MQTT_ENDPOINTS = [
  'wss://edge-chat.messenger.com/chat',
  'wss://edge-chat.facebook.com/chat',
  'wss://edge-chat.messenger.com/mqtt',
  'wss://mqtt-mini.facebook.com:443/mqtt'
];

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private logger: Logger;
  private userId: string;
  private appState: AppState;
  private config: MqttConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 50;
  private lastSeqId: string = '';
  private syncToken: string = '';
  private sessionId: number;
  private deviceId: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime: number = 0;
  private connectionStartTime: number = 0;
  private currentEndpointIndex: number = 0;
  private epochId: number = 0;
  private mqttSessionId: number = 0;
  private requestId: number = 1;
  private irisSeqId: string = '';
  private irisSnapshotTimestampMs: string = '';

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
      region: config.region || 'prn',
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      selfListen: config.selfListen ?? false,
      listenEvents: config.listenEvents ?? true,
      updatePresence: config.updatePresence ?? true
    };
    this.logger = logger || new Logger({ language: 'tl' });
    this.sessionId = Math.floor(Math.random() * 0xFFFFFFFF);
    this.deviceId = this.generateDeviceId();
    this.epochId = Date.now();
    this.mqttSessionId = Math.floor(Math.random() * 0x7FFFFFFF);
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
    return `mqttwsclient_${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
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
    const payload = {
      u: this.userId,
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
    const dtsg = this.appState.fbDtsg || '';
    
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
          protocolId: 'MQIsdp',
          protocolVersion: 3,
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
              'Sec-WebSocket-Protocol': 'wss'
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
        }, 30000);

        this.client.on('connect', () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.success('Nakakonekta sa MQTT!');
          
          this.subscribeToTopics();
          this.sendPresenceRequest();
          this.sendSyncRequest();
          this.startPingInterval();
          
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
          this.logger.error(`Failed to subscribe to ${topic}`, { 
            error: err.message 
          });
        } else {
          this.logger.debug(`Subscribed to ${topic}`);
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

  private sendSyncRequest(): void {
    if (!this.client) return;

    const syncPayload = {
      sync_api_version: 10,
      max_deltas_able_to_process: 1000,
      delta_batch_size: 500,
      encoding: 'JSON',
      entity_fbid: this.userId,
      initial_titan_sequence_id: this.lastSeqId || '0',
      device_params: null
    };

    this.client.publish(
      '/messenger_sync_create_queue',
      JSON.stringify(syncPayload),
      { qos: 1 }
    );

    const syncPayload2 = {
      sync_api_version: 10,
      max_deltas_able_to_process: 1000,
      delta_batch_size: 500,
      encoding: 'JSON',
      entity_fbid: this.userId,
      last_seq_id: this.lastSeqId || '0',
      sync_token: this.syncToken || null,
      queue_type: 'messages',
      queue_params: {
        limit: 1,
        tags: ['inbox', 'other']
      }
    };

    this.client.publish(
      '/messenger_sync_get_diffs',
      JSON.stringify(syncPayload2),
      { qos: 1 }
    );
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
              this.logger.debug(`Non-JSON message on ${topic}`, { length: payload.length });
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
        case '/t_p':
          this.handlePresenceTopic(data);
          break;
        case '/ls_resp':
          this.handleLightspeedResponse(data);
          break;
        default:
          if (data && Object.keys(data).length > 0) {
            this.logger.debug(`Received message on ${topic}`, { 
              dataKeys: Object.keys(data) 
            });
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
      if (data.errorCode === 'ERROR_QUEUE_NOT_FOUND') {
        this.sendSyncRequest();
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
  }

  private processDelta(delta: any): void {
    if (!delta) return;

    const deltaClass = delta.class || delta.deltaClass || delta.type;

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
      case 'NoOp':
        break;
      default:
        if (delta.messageMetadata || delta.body !== undefined) {
          this.handleNewMessage(delta);
        } else {
          this.emit('delta', delta);
        }
    }
  }

  private handleNewMessage(delta: any): void {
    const messageData = delta.messageMetadata || delta;
    const body = delta.body || delta.snippet || delta.text || '';
    
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
      }
    } else if (delta.threadId) {
      threadID = delta.threadId.toString();
      isGroup = threadID.length > 15;
    } else if (delta.threadFbId) {
      threadID = delta.threadFbId.toString();
      isGroup = true;
    }

    const senderID = (messageData.actorFbId || delta.senderId || delta.senderFbId || delta.authorId || '').toString();
    const messageID = (messageData.messageId || delta.messageId || delta.mid || delta.id || '').toString();
    const timestamp = parseInt(messageData.timestamp || delta.timestamp || delta.offlineThreadingId) || Date.now();

    if (!threadID || !messageID) {
      return;
    }

    if (!this.config.selfListen && senderID === this.userId) {
      return;
    }

    const attachments = this.parseAttachments(delta.attachments || delta.fileAttachments || []);
    const mentions = this.parseMentions(delta.data?.prng || delta.mentions || []);

    const message: Message = {
      messageID,
      threadID,
      senderID,
      body,
      timestamp,
      type: this.determineMessageType(delta),
      attachments,
      mentions,
      isGroup,
      isUnread: delta.isUnread ?? true,
      replyToMessage: delta.replyToMessageId ? {
        messageID: delta.replyToMessageId,
        senderID: delta.replyToSenderId || '',
        body: delta.replyToMessage || ''
      } : undefined
    };

    this.logger.info('Natanggap na mensahe', {
      from: senderID,
      thread: threadID,
      type: message.type,
      isGroup
    });

    this.emit('message', message);
  }

  private parseAttachments(attachments: any[]): any[] {
    if (!Array.isArray(attachments)) return [];
    
    return attachments.map((att: any) => ({
      type: att.mimeType?.split('/')[0] || att.type || 'file',
      url: att.playableUrl || att.url || att.previewUrl || att.largePreviewUrl || '',
      id: att.id || att.attachmentId || '',
      filename: att.filename || att.name || '',
      size: att.fileSize || att.size || 0,
      width: att.width,
      height: att.height,
      duration: att.playableDurationInMs || att.duration
    }));
  }

  private parseMentions(mentions: any[]): any[] {
    if (!Array.isArray(mentions)) return [];
    
    return mentions.map((m: any) => ({
      id: m.i || m.id || m.userId,
      offset: m.o || m.offset || 0,
      length: m.l || m.length || 0,
      name: m.name || ''
    }));
  }

  private determineMessageType(delta: any): 'text' | 'sticker' | 'photo' | 'video' | 'audio' | 'file' | 'gif' | 'location' | 'share' {
    if (delta.stickerId || delta.stickerID) return 'sticker';
    if (delta.shareInfo || delta.story) return 'share';
    if (delta.coordinates || delta.location) return 'location';
    
    if (delta.attachments?.length > 0 || delta.fileAttachments?.length > 0) {
      const att = delta.attachments?.[0] || delta.fileAttachments?.[0];
      const mime = att?.mimeType || att?.contentType || '';
      const type = att?.type || '';
      
      if (mime.startsWith('image/gif') || type === 'gif') return 'gif';
      if (mime.startsWith('image/') || type === 'photo' || type === 'image') return 'photo';
      if (mime.startsWith('video/') || type === 'video') return 'video';
      if (mime.startsWith('audio/') || type === 'audio' || type === 'voice') return 'audio';
      return 'file';
    }
    return 'text';
  }

  private handleAdminMessage(delta: any): void {
    const type = delta.type || delta.adminType;
    
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
    const threadID = threadKey.threadFbId || threadKey.otherUserFbId || delta.threadId || '';
    const name = delta.name || delta.threadName || '';
    const actorID = delta.messageMetadata?.actorFbId || delta.actorFbId || '';

    this.emit('thread_name', {
      threadID: threadID.toString(),
      name,
      actorID: actorID.toString(),
      timestamp: Date.now()
    });
  }

  private handleParticipantAdded(delta: any): void {
    const threadKey = delta.messageMetadata?.threadKey || delta.threadKey || {};
    const threadID = (threadKey.threadFbId || delta.threadId || '').toString();
    const addedParticipants = delta.addedParticipants || delta.participantsAdded || [];
    const actorID = (delta.messageMetadata?.actorFbId || delta.actorFbId || '').toString();

    const userIDs = addedParticipants.map((p: any) => 
      (p.userFbId || p.id || p.participantId || '').toString()
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
    const threadID = (threadKey.threadFbId || delta.threadId || '').toString();
    const leftParticipantFbId = delta.leftParticipantFbId || delta.participantFbId || '';
    const actorID = (delta.messageMetadata?.actorFbId || delta.actorFbId || '').toString();

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

  private handleTypingEvent(data: any): void {
    const senderID = (data.sender_fbid || data.from || data.senderId || data.userId || '').toString();
    const threadID = (data.thread || data.thread_fbid || data.threadId || '').toString();
    const isTyping = data.state === 1 || data.isTyping === true;

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
        const userID = (presence.u || presence.userId || '').toString();
        if (userID) {
          this.emit('presence', {
            userID,
            isActive: presence.p !== 0,
            lastActive: presence.lat || presence.lastActiveTime,
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
          userID: item.u?.toString(),
          isActive: item.p === 2,
          lastActive: item.l
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
            this.emit('message', message);
          }
        }
      }
    }
    if (data.payload && data.payload.actions) {
      for (const action of data.payload.actions) {
        const message = this.convertMercuryToMessage(action);
        if (message.threadID && message.messageID) {
          this.emit('message', message);
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
  }

  private handleLightspeedResponse(data: any): void {
    if (data.payload) {
      try {
        const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
        if (payload.deltas) {
          for (const delta of payload.deltas) {
            this.processDelta(delta);
          }
        }
      } catch {
        this.logger.debug('Failed to parse lightspeed payload');
      }
    }
  }

  private convertMercuryToMessage(action: any): Message {
    return {
      messageID: action.message_id || '',
      threadID: action.thread_fbid || action.other_user_fbid || '',
      senderID: action.author?.split(':')[1] || action.author || '',
      body: action.body || '',
      timestamp: parseInt(action.timestamp) || Date.now(),
      type: 'text',
      attachments: action.attachments || [],
      mentions: [],
      isGroup: !!action.thread_fbid
    };
  }

  disconnect(): void {
    this.stopPingInterval();
    
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
}
