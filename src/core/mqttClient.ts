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
  '/pp'
];

const FB_APP_ID = '219994525426954';

export class MqttClient extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private logger: Logger;
  private userId: string;
  private appState: AppState;
  private config: MqttConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private lastSeqId: string = '';
  private syncToken: string = '';
  private sessionId: number;
  private deviceId: string;

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
  }

  private generateDeviceId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

  private buildUsername(): string {
    const payload = {
      u: this.userId,
      s: this.sessionId,
      cp: 3,
      ecp: 10,
      chat_on: true,
      fg: false,
      d: this.deviceId,
      ct: 'websocket',
      mqtt_sid: '',
      aid: parseInt(FB_APP_ID),
      st: MQTT_TOPICS,
      pm: [],
      dc: '',
      no_auto_fg: true,
      gas: null,
      pack: []
    };

    return JSON.stringify(payload);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const endpoint = `wss://edge-chat.messenger.com/chat?region=${this.config.region}&sid=${this.sessionId}`;
        
        this.logger.info('Kumokonekta sa MQTT server...', {
          endpoint: 'edge-chat.messenger.com',
          region: this.config.region
        });

        const options: mqtt.IClientOptions = {
          clientId: 'mqttwsclient',
          protocolId: 'MQIsdp',
          protocolVersion: 3,
          clean: true,
          keepalive: 10,
          connectTimeout: 60000,
          reconnectPeriod: 5000,
          username: this.buildUsername(),
          password: this.getSessionCookies(),
          wsOptions: {
            headers: {
              'Cookie': this.getCookieString(),
              'User-Agent': this.config.userAgent,
              'Origin': 'https://www.messenger.com'
            }
          }
        };

        this.client = mqtt.connect(endpoint, options);

        this.client.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.logger.success('Nakakonekta sa MQTT!');
          
          this.subscribeToTopics();
          this.sendSyncRequest();
          
          this.emit('connected');
          resolve();
        });

        this.client.on('message', (topic: string, payload: Buffer) => {
          this.handleMessage(topic, payload);
        });

        this.client.on('error', (error: Error) => {
          this.logger.error('MQTT error', { error: error.message });
          this.emit('error', error);
        });

        this.client.on('close', () => {
          this.isConnected = false;
          this.logger.warning('MQTT connection closed');
          this.emit('disconnected');
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          this.logger.info('Reconnecting to MQTT...', { 
            attempt: this.reconnectAttempts 
          });
        });

        this.client.on('offline', () => {
          this.logger.warning('MQTT client offline');
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
          this.logger.error(`Failed to subscribe to ${topic}`, { 
            error: err.message 
          });
        } else {
          this.logger.debug(`Subscribed to ${topic}`);
        }
      });
    }
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
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const data = JSON.parse(payload.toString());
      
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
        default:
          this.logger.debug(`Received message on ${topic}`, { 
            dataKeys: Object.keys(data) 
          });
      }
    } catch (error) {
      if (payload.length > 0) {
        this.logger.debug(`Non-JSON message on ${topic}`, { 
          length: payload.length 
        });
      }
    }
  }

  private handleMessengerSync(data: any): void {
    if (data.deltas) {
      for (const delta of data.deltas) {
        this.processDelta(delta);
      }
    }

    if (data.lastIssuedSeqId) {
      this.lastSeqId = data.lastIssuedSeqId;
    }

    if (data.syncToken) {
      this.syncToken = data.syncToken;
    }
  }

  private processDelta(delta: any): void {
    const deltaClass = delta.class;

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
        break;
      case 'DeliveryReceipt':
        this.emit('delivery_receipt', delta);
        break;
      case 'MarkRead':
        this.emit('mark_read', delta);
        break;
      case 'ThreadName':
        this.emit('thread_name', delta);
        break;
      case 'ParticipantsAddedToGroupThread':
        this.emit('participant_added', delta);
        break;
      case 'ParticipantLeftGroupThread':
        this.emit('participant_left', delta);
        break;
      default:
        this.emit('delta', delta);
    }
  }

  private handleNewMessage(delta: any): void {
    const messageData = delta.messageMetadata || {};
    const body = delta.body || '';
    
    const threadKey = messageData.threadKey || {};
    const threadID = threadKey.threadFbId || threadKey.otherUserFbId || '';
    const senderID = messageData.actorFbId || '';
    const messageID = messageData.messageId || '';
    const timestamp = parseInt(messageData.timestamp) || Date.now();

    if (!this.config.selfListen && senderID === this.userId) {
      return;
    }

    const attachments = (delta.attachments || []).map((att: any) => ({
      type: att.mimeType?.split('/')[0] || 'file',
      url: att.playableUrl || att.url || '',
      id: att.id || '',
      filename: att.filename || '',
      size: att.fileSize || 0
    }));

    const mentions = (delta.data?.prng || []).map((m: any) => ({
      id: m.i,
      offset: m.o,
      length: m.l,
      name: ''
    }));

    const message: Message = {
      messageID,
      threadID,
      senderID,
      body,
      timestamp,
      type: this.determineMessageType(delta),
      attachments,
      mentions,
      isGroup: !!threadKey.threadFbId
    };

    this.logger.info('Natanggap na mensahe', {
      from: senderID,
      thread: threadID,
      type: message.type
    });

    this.emit('message', message);
  }

  private determineMessageType(delta: any): 'text' | 'sticker' | 'photo' | 'video' | 'audio' | 'file' | 'gif' {
    if (delta.stickerId) return 'sticker';
    if (delta.attachments?.length > 0) {
      const att = delta.attachments[0];
      const mime = att.mimeType || '';
      if (mime.startsWith('image/gif')) return 'gif';
      if (mime.startsWith('image/')) return 'photo';
      if (mime.startsWith('video/')) return 'video';
      if (mime.startsWith('audio/')) return 'audio';
      return 'file';
    }
    return 'text';
  }

  private handleAdminMessage(delta: any): void {
    const type = delta.type;
    
    switch (type) {
      case 'change_thread_nickname':
        this.emit('nickname_change', delta);
        break;
      case 'change_thread_theme':
        this.emit('theme_change', delta);
        break;
      case 'change_thread_icon':
        this.emit('icon_change', delta);
        break;
      default:
        this.emit('admin_message', delta);
    }
  }

  private handleTypingEvent(data: any): void {
    this.emit('typing', {
      senderID: data.sender_fbid || data.from,
      threadID: data.thread || data.thread_fbid,
      isTyping: data.state === 1
    });
  }

  private handlePresenceEvent(data: any): void {
    if (data.list) {
      for (const presence of data.list) {
        this.emit('presence', {
          userID: presence.u,
          isActive: presence.p !== 0,
          lastActive: presence.lat
        });
      }
    }
  }

  private handleLegacyEvent(data: any): void {
    this.emit('legacy_event', data);
  }

  private handleInboxEvent(data: any): void {
    this.emit('inbox', data);
  }

  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.logger.info('MQTT disconnected');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  sendPresence(isOnline: boolean): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      make_user_available_when_in_foreground: isOnline
    };

    this.client.publish('/foreground_state', JSON.stringify(payload));
  }

  sendTypingIndicator(threadID: string, isTyping: boolean): void {
    if (!this.client || !this.isConnected) return;

    const payload = {
      thread: threadID,
      state: isTyping ? 1 : 0
    };

    this.client.publish('/typing', JSON.stringify(payload));
  }
}
