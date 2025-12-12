import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { CookieManager } from './cookies';
import { FingerprintManager, RequestObfuscator, PatternDiffuser } from './antiDetection';
import { Logger } from './logger';
import { SendMessageOptions } from '../types';

const FB_BASE_URL = 'https://www.facebook.com';
const MESSENGER_URL = 'https://www.messenger.com';

const FB_SEND_MESSAGE_URL = 'https://www.facebook.com/messaging/send/';
const FB_SEND_MESSAGE_URL_ALT = 'https://www.messenger.com/messaging/send/';
const FB_TYPING_URL = 'https://www.facebook.com/ajax/messaging/typ.php';
const FB_THREAD_INFO_URL = 'https://www.facebook.com/api/graphqlbatch/';
const FB_READ_STATUS_URL = 'https://www.facebook.com/ajax/mercury/change_read_status.php';
const FB_UNSEND_URL = 'https://www.facebook.com/messaging/unsend_message/';
const FB_REACTION_URL = 'https://www.facebook.com/ufi/reaction/';
const FB_ATTACHMENT_UPLOAD_URL = 'https://upload.facebook.com/ajax/mercury/upload.php';

export interface HttpClientConfig {
  proxy?: string;
  timeout?: number;
}

export interface SendMessageResult {
  messageID: string;
  timestamp: number;
  threadID: string;
}

export class HttpClient {
  private client: AxiosInstance;
  private cookieManager: CookieManager;
  private fingerprintManager: FingerprintManager;
  private requestObfuscator: RequestObfuscator;
  private patternDiffuser: PatternDiffuser;
  private logger: Logger;
  private fbDtsg: string = '';
  private revision: number = 1;
  private reqCounter: number = 0;

  constructor(
    cookieManager: CookieManager,
    fingerprintManager: FingerprintManager,
    requestObfuscator: RequestObfuscator,
    patternDiffuser: PatternDiffuser,
    logger: Logger,
    config?: HttpClientConfig
  ) {
    this.cookieManager = cookieManager;
    this.fingerprintManager = fingerprintManager;
    this.requestObfuscator = requestObfuscator;
    this.patternDiffuser = patternDiffuser;
    this.logger = logger;

    this.client = axios.create({
      timeout: config?.timeout || 30000,
      headers: this.getDefaultHeaders(),
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (config?.proxy) {
    }
  }

  private getDefaultHeaders(): Record<string, string> {
    const fingerprint = this.fingerprintManager.getFingerprint();
    
    return {
      'User-Agent': fingerprint.userAgent,
      'Accept': '*/*',
      'Accept-Language': fingerprint.language,
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
  }

  setFbDtsg(dtsg: string): void {
    this.fbDtsg = dtsg;
  }

  setRevision(revision: number): void {
    this.revision = revision;
  }

  getFbDtsg(): string {
    return this.fbDtsg;
  }

  private generateMessageID(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 4294967295);
    return `mid.$c${timestamp.toString(16)}${random.toString(16)}`;
  }

  private generateOfflineThreadingID(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 4294967295);
    return (timestamp << 22 | random).toString();
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

  async get(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.patternDiffuser.delay();
    
    const headers = this.requestObfuscator.obfuscateHeaders({
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      ...(config?.headers as Record<string, string> || {})
    });

    this.logger.incrementApiCalls();

    return this.client.get(url, { ...config, headers });
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.patternDiffuser.delay();
    await this.patternDiffuser.checkBurst();
    
    const headers = this.requestObfuscator.obfuscateHeaders({
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': FB_BASE_URL,
      'Referer': `${FB_BASE_URL}/`,
      ...(config?.headers as Record<string, string> || {})
    });

    const obfuscatedData = this.requestObfuscator.obfuscateParams(data || {});
    this.logger.incrementApiCalls();

    return this.client.post(url, new URLSearchParams(obfuscatedData).toString(), { 
      ...config, 
      headers 
    });
  }

  async postForm(url: string, form: Record<string, string>, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    await this.patternDiffuser.delay();
    await this.patternDiffuser.checkBurst();
    
    const headers = this.requestObfuscator.obfuscateHeaders({
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': FB_BASE_URL,
      'Referer': `${FB_BASE_URL}/`,
      ...(config?.headers as Record<string, string> || {})
    });

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(form)) {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    }

    this.logger.incrementApiCalls();

    return this.client.post(url, params.toString(), { 
      ...config, 
      headers 
    });
  }

  async sendMessage(
    message: SendMessageOptions,
    threadID: string,
    userID: string
  ): Promise<SendMessageResult> {
    const messageID = this.generateMessageID();
    const offlineThreadingID = this.generateOfflineThreadingID();
    const timestamp = Date.now();
    const isGroup = threadID.length > 15;

    const form: Record<string, string> = {
      client: 'mercury',
      action_type: 'ma-type:user-generated-message',
      author: `fbid:${userID}`,
      timestamp: timestamp.toString(),
      timestamp_absolute: 'Today',
      timestamp_relative: new Date().toLocaleTimeString(),
      timestamp_time_passed: '0',
      is_unread: 'false',
      is_cleared: 'false',
      is_forward: 'false',
      is_filtered_content: 'false',
      is_filtered_content_bh: 'false',
      is_filtered_content_account: 'false',
      is_filtered_content_quasar: 'false',
      is_filtered_content_invalid_app: 'false',
      is_spoof_warning: 'false',
      source: 'source:chat:web',
      'source_tags[0]': 'source:chat',
      body: message.body || '',
      has_attachment: 'false',
      html_body: 'false',
      status: '0',
      offline_threading_id: offlineThreadingID,
      message_id: messageID,
      threading_id: `<${Date.now()}:${Math.random().toString(36).substr(2)}@mail.projektitan.com>`,
      ephemeral_ttl_mode: '0',
      manual_retry_cnt: '0',
      signatureID: Math.random().toString(36).substr(2),
      fb_dtsg: this.fbDtsg,
      __user: userID,
      __a: '1',
      __req: (++this.reqCounter).toString(36),
      __be: '-1',
      __pc: 'EXP1:DEFAULT',
      __rev: this.revision.toString()
    };

    if (isGroup) {
      form['thread_fbid'] = threadID;
    } else {
      form['other_user_fbid'] = threadID;
      form['specific_to_list[0]'] = `fbid:${threadID}`;
    }

    if (message.sticker) {
      form['sticker_id'] = message.sticker;
      form['has_attachment'] = 'true';
    }

    if (message.emoji) {
      form['body'] = message.emoji;
    }

    if (message.mentions && message.mentions.length > 0) {
      form['profile_xmd'] = JSON.stringify(
        message.mentions.map((m) => ({
          id: m.id,
          offset: m.tag.indexOf('@'),
          length: m.tag.length,
          type: 'p'
        }))
      );
    }

    if (message.replyToMessage) {
      form['replied_to_message_id'] = message.replyToMessage;
    }

    try {
      const response = await this.postForm(FB_SEND_MESSAGE_URL, form);
      
      const result = this.parseResponse(response.data);
      
      if (result.error) {
        if (result.errorSummary?.includes('rate limit') || 
            result.errorDescription?.includes('try again')) {
          throw new Error('Rate limit reached. Please wait before sending more messages.');
        }
        throw new Error(result.errorDescription || result.errorSummary || 'Failed to send message');
      }

      return {
        messageID: messageID,
        timestamp: timestamp,
        threadID: threadID
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('HTTP sendMessage failed', { error: err.message });
      
      try {
        const altResponse = await this.postForm(FB_SEND_MESSAGE_URL_ALT, form, {
          headers: {
            'Origin': MESSENGER_URL,
            'Referer': `${MESSENGER_URL}/`
          }
        });
        
        const result = this.parseResponse(altResponse.data);
        
        if (result.error) {
          throw new Error(result.errorDescription || result.errorSummary || 'Failed to send message');
        }

        return {
          messageID: messageID,
          timestamp: timestamp,
          threadID: threadID
        };
      } catch (altError) {
        throw error;
      }
    }
  }

  async sendTypingIndicator(threadID: string, userID: string, isTyping: boolean): Promise<void> {
    const form: Record<string, string> = {
      typ: isTyping ? '1' : '0',
      source: 'mercury-chat',
      fb_dtsg: this.fbDtsg,
      __user: userID,
      __a: '1',
      __req: (++this.reqCounter).toString(36),
      __rev: this.revision.toString()
    };

    if (threadID.length > 15) {
      form['thread'] = threadID;
    } else {
      form['to'] = threadID;
    }

    try {
      await this.postForm(FB_TYPING_URL, form);
    } catch {
    }
  }

  async markAsRead(threadID: string, userID: string): Promise<void> {
    const form: Record<string, string> = {
      ids: JSON.stringify({ [threadID]: true }),
      watermarkTimestamp: Date.now().toString(),
      shouldSendReadReceipt: 'true',
      commerce_last_message_type: '',
      fb_dtsg: this.fbDtsg,
      __user: userID,
      __a: '1',
      __req: (++this.reqCounter).toString(36),
      __rev: this.revision.toString()
    };

    try {
      await this.postForm(FB_READ_STATUS_URL, form);
    } catch {
    }
  }

  async unsendMessage(messageID: string, userID: string): Promise<void> {
    const form: Record<string, string> = {
      message_id: messageID,
      fb_dtsg: this.fbDtsg,
      __user: userID,
      __a: '1',
      __req: (++this.reqCounter).toString(36),
      __rev: this.revision.toString()
    };

    try {
      await this.postForm(FB_UNSEND_URL, form);
    } catch (error) {
      throw new Error('Failed to unsend message');
    }
  }

  async setMessageReaction(messageID: string, reaction: string, userID: string): Promise<void> {
    const form: Record<string, string> = {
      message_id: messageID,
      reaction: reaction,
      fb_dtsg: this.fbDtsg,
      __user: userID,
      __a: '1',
      __req: (++this.reqCounter).toString(36),
      __rev: this.revision.toString()
    };

    try {
      await this.postForm(FB_REACTION_URL, form);
    } catch (error) {
      throw new Error('Failed to set reaction');
    }
  }

  async uploadAttachment(filePath: string, userID: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const formData = new FormData();
    formData.append('fb_dtsg', this.fbDtsg);
    formData.append('__user', userID);
    formData.append('__a', '1');
    formData.append('__req', (++this.reqCounter).toString(36));
    formData.append('__rev', this.revision.toString());
    formData.append('upload_1024', fs.createReadStream(filePath), {
      filename: path.basename(filePath)
    });

    const headers = {
      ...this.getDefaultHeaders(),
      'Cookie': this.cookieManager.getCookieString(),
      'Origin': FB_BASE_URL,
      ...formData.getHeaders()
    };

    try {
      const response = await this.client.post(FB_ATTACHMENT_UPLOAD_URL, formData, { headers });
      const result = this.parseResponse(response.data);
      
      if (result.error) {
        throw new Error(result.errorDescription || 'Failed to upload attachment');
      }

      return result.payload?.metadata?.[0]?.fbid || 
             result.payload?.metadata?.[0]?.image_id ||
             result.payload?.metadata?.[0]?.video_id ||
             '';
    } catch (error) {
      throw new Error('Failed to upload attachment');
    }
  }

  private parseResponse(data: string | object): any {
    if (typeof data === 'string') {
      let cleanData = data;
      if (cleanData.startsWith('for (;;);')) {
        cleanData = cleanData.substring(9);
      }
      
      try {
        return JSON.parse(cleanData);
      } catch {
        const lines = cleanData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            let cleanLine = line;
            if (cleanLine.startsWith('for (;;);')) {
              cleanLine = cleanLine.substring(9);
            }
            return JSON.parse(cleanLine);
          } catch {
            continue;
          }
        }
        return { error: true, errorDescription: 'Failed to parse response' };
      }
    }
    return data;
  }

  getBaseUrl(): string {
    return FB_BASE_URL;
  }

  getMessengerUrl(): string {
    return MESSENGER_URL;
  }
}
