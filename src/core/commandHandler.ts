import { EventEmitter } from 'events';
import {
  Message,
  CommandConfig,
  Command,
  CommandContext,
  CommandResult,
  CommandPermission,
  CommandCooldown,
  ThreadSettings
} from '../types';
import { Logger } from '../utils/logger';

export class CommandHandler extends EventEmitter {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();
  private cooldowns: Map<string, Map<string, number>> = new Map();
  private threadSettings: Map<string, ThreadSettings> = new Map();
  private config: CommandConfig;
  private logger: Logger;
  private botAdmins: Set<string> = new Set();

  constructor(config: Partial<CommandConfig> = {}, logger?: Logger) {
    super();
    this.config = {
      prefixes: config.prefixes || ['!'],
      caseSensitive: config.caseSensitive ?? false,
      ignoreBots: config.ignoreBots ?? true,
      ignoreSelf: config.ignoreSelf ?? true,
      defaultCooldown: config.defaultCooldown ?? 3000,
      adminOnly: config.adminOnly ?? false,
      maintenanceMode: config.maintenanceMode ?? false,
      maintenanceMessage: config.maintenanceMessage || '⚠️ Bot is under maintenance. Please try again later.',
      errorMessage: config.errorMessage || '❌ An error occurred while executing the command.',
      cooldownMessage: config.cooldownMessage || '⏳ Slow down! Please wait {time}s before sending another command.',
      permissionMessage: config.permissionMessage || '🚫 You do not have permission to use this command.',
      unknownCommandMessage: config.unknownCommandMessage,
      logCommands: config.logCommands ?? true,
      deleteCommandMessage: config.deleteCommandMessage ?? false,
      mentionAsPrefix: config.mentionAsPrefix ?? false,
      selfID: config.selfID
    };
    this.logger = logger || new Logger({ language: 'tl' });

    this.registerBuiltInCommands();
  }

  private registerBuiltInCommands(): void {
    this.registerCommand({
      name: 'help',
      aliases: ['tulong', 'commands', 'cmd'],
      description: 'Shows list of available commands',
      category: 'utility',
      usage: 'help [command]',
      execute: async (ctx) => {
        const { args, api, message, prefix } = ctx;
        
        if (args.length > 0) {
          const cmdName = args[0].toLowerCase();
          const cmd = this.getCommand(cmdName);
          if (cmd) {
            const helpText = this.formatCommandHelp(cmd, prefix);
            await api.sendMessage(helpText, message.threadID);
            return { success: true };
          }
          await api.sendMessage(`❌ Command "${cmdName}" not found.`, message.threadID);
          return { success: false, error: 'Command not found' };
        }

        const helpText = this.formatHelpMenu(prefix);
        await api.sendMessage(helpText, message.threadID);
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'adminonly',
      aliases: ['ao'],
      description: 'Toggle admin-only mode for commands in this group',
      category: 'admin',
      usage: 'adminonly [on/off]',
      permissions: ['admin'],
      execute: async (ctx) => {
        const { args, api, message } = ctx;
        const settings = this.getThreadSettings(message.threadID);
        
        if (args.length === 0) {
          const status = settings.adminOnly ? 'ON' : 'OFF';
          await api.sendMessage(`ℹ️ Admin-only mode is currently ${status}`, message.threadID);
          return { success: true };
        }

        const toggle = args[0].toLowerCase();
        if (toggle === 'on' || toggle === '1' || toggle === 'true') {
          this.setThreadSettings(message.threadID, { ...settings, adminOnly: true });
          await api.sendMessage(
            '✅ Admin-only mode is now ON\n\n' +
            '━━━━━━━━━━━━━━\n' +
            '◉ DESCRIPTION\n' +
            '━━━━━━━━━━━━━━\n\n' +
            'When ON, only group admins can\n' +
            'use bot commands in this group.',
            message.threadID
          );
        } else if (toggle === 'off' || toggle === '0' || toggle === 'false') {
          this.setThreadSettings(message.threadID, { ...settings, adminOnly: false });
          await api.sendMessage('✅ Admin-only mode is now OFF\n\nAll members can use commands.', message.threadID);
        } else {
          await api.sendMessage('❌ Invalid option. Use: adminonly on/off', message.threadID);
          return { success: false };
        }
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'prefix',
      aliases: ['setprefix'],
      description: 'View or change the bot prefix for this group',
      category: 'admin',
      usage: 'prefix [new prefix]',
      permissions: ['admin'],
      execute: async (ctx) => {
        const { args, api, message, prefix } = ctx;
        const settings = this.getThreadSettings(message.threadID);

        if (args.length === 0) {
          const prefixes = settings.customPrefixes?.length ? settings.customPrefixes : this.config.prefixes;
          await api.sendMessage(`ℹ️ Current prefix(es): ${prefixes.join(', ')}`, message.threadID);
          return { success: true };
        }

        const newPrefix = args[0];
        if (newPrefix.length > 5) {
          await api.sendMessage('❌ Prefix must be 5 characters or less.', message.threadID);
          return { success: false };
        }

        this.setThreadSettings(message.threadID, { ...settings, customPrefixes: [newPrefix] });
        await api.sendMessage(`✅ Prefix changed to: ${newPrefix}`, message.threadID);
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'ping',
      aliases: ['latency'],
      description: 'Check bot response time',
      category: 'utility',
      usage: 'ping',
      execute: async (ctx) => {
        const { api, message } = ctx;
        const start = Date.now();
        await api.sendMessage('🏓 Pong!', message.threadID);
        const latency = Date.now() - start;
        return { success: true, data: { latency } };
      }
    });

    this.registerCommand({
      name: 'uptime',
      aliases: ['runtime'],
      description: 'Check bot uptime',
      category: 'utility',
      usage: 'uptime',
      execute: async (ctx) => {
        const { api, message } = ctx;
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        await api.sendMessage(`⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s`, message.threadID);
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'disable',
      aliases: ['disable-cmd'],
      description: 'Disable a command in this group',
      category: 'admin',
      usage: 'disable <command>',
      permissions: ['admin'],
      execute: async (ctx) => {
        const { args, api, message } = ctx;
        if (args.length === 0) {
          await api.sendMessage('❌ Please specify a command to disable.', message.threadID);
          return { success: false };
        }

        const cmdName = args[0].toLowerCase();
        const cmd = this.getCommand(cmdName);
        if (!cmd) {
          await api.sendMessage(`❌ Command "${cmdName}" not found.`, message.threadID);
          return { success: false };
        }

        if (['help', 'disable', 'enable', 'adminonly'].includes(cmd.name)) {
          await api.sendMessage('❌ This command cannot be disabled.', message.threadID);
          return { success: false };
        }

        const settings = this.getThreadSettings(message.threadID);
        const disabled = settings.disabledCommands || [];
        if (!disabled.includes(cmd.name)) {
          disabled.push(cmd.name);
          this.setThreadSettings(message.threadID, { ...settings, disabledCommands: disabled });
        }
        await api.sendMessage(`✅ Command "${cmd.name}" has been disabled.`, message.threadID);
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'enable',
      aliases: ['enable-cmd'],
      description: 'Enable a disabled command in this group',
      category: 'admin',
      usage: 'enable <command>',
      permissions: ['admin'],
      execute: async (ctx) => {
        const { args, api, message } = ctx;
        if (args.length === 0) {
          await api.sendMessage('❌ Please specify a command to enable.', message.threadID);
          return { success: false };
        }

        const cmdName = args[0].toLowerCase();
        const cmd = this.getCommand(cmdName);
        if (!cmd) {
          await api.sendMessage(`❌ Command "${cmdName}" not found.`, message.threadID);
          return { success: false };
        }

        const settings = this.getThreadSettings(message.threadID);
        const disabled = settings.disabledCommands || [];
        const index = disabled.indexOf(cmd.name);
        if (index > -1) {
          disabled.splice(index, 1);
          this.setThreadSettings(message.threadID, { ...settings, disabledCommands: disabled });
        }
        await api.sendMessage(`✅ Command "${cmd.name}" has been enabled.`, message.threadID);
        return { success: true };
      }
    });

    this.registerCommand({
      name: 'maintenance',
      aliases: ['maint'],
      description: 'Toggle maintenance mode',
      category: 'owner',
      usage: 'maintenance [on/off]',
      permissions: ['botAdmin'],
      execute: async (ctx) => {
        const { args, api, message } = ctx;

        if (args.length === 0) {
          const status = this.config.maintenanceMode ? 'ON' : 'OFF';
          await api.sendMessage(`🔧 Maintenance mode is currently ${status}`, message.threadID);
          return { success: true };
        }

        const toggle = args[0].toLowerCase();
        if (toggle === 'on' || toggle === '1') {
          this.config.maintenanceMode = true;
          await api.sendMessage('🔧 Maintenance mode is now ON', message.threadID);
        } else if (toggle === 'off' || toggle === '0') {
          this.config.maintenanceMode = false;
          await api.sendMessage('✅ Maintenance mode is now OFF', message.threadID);
        }
        return { success: true };
      }
    });
  }

  registerCommand(command: Command): void {
    if (this.commands.has(command.name)) {
      this.logger.warning(`Command "${command.name}" is being overwritten`);
    }

    this.commands.set(command.name.toLowerCase(), command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }

    this.cooldowns.set(command.name.toLowerCase(), new Map());
    this.logger.debug(`Command registered: ${command.name}`);
  }

  magdagdagNgCommand(command: Command): void {
    this.registerCommand(command);
  }

  unregisterCommand(name: string): boolean {
    const cmdName = name.toLowerCase();
    const cmd = this.commands.get(cmdName);
    if (!cmd) return false;

    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliases.delete(alias.toLowerCase());
      }
    }

    this.commands.delete(cmdName);
    this.cooldowns.delete(cmdName);
    return true;
  }

  magtanggalNgCommand(name: string): boolean {
    return this.unregisterCommand(name);
  }

  getCommand(name: string): Command | undefined {
    const cmdName = name.toLowerCase();
    return this.commands.get(cmdName) || this.commands.get(this.aliases.get(cmdName) || '');
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  kuninAngMgaCommand(): Command[] {
    return this.getCommands();
  }

  setPrefix(prefixes: string | string[]): void {
    this.config.prefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  }

  iSetAngPrefix(prefixes: string | string[]): void {
    this.setPrefix(prefixes);
  }

  getPrefix(): string[] {
    return this.config.prefixes;
  }

  addBotAdmin(userID: string): void {
    this.botAdmins.add(userID);
  }

  removeBotAdmin(userID: string): void {
    this.botAdmins.delete(userID);
  }

  getBotAdmins(): string[] {
    return Array.from(this.botAdmins);
  }

  isBotAdmin(userID: string): boolean {
    return this.botAdmins.has(userID);
  }

  getThreadSettings(threadID: string): ThreadSettings {
    return this.threadSettings.get(threadID) || {
      adminOnly: false,
      disabledCommands: [],
      customPrefixes: [],
      cooldownMultiplier: 1,
      adminIDs: []
    };
  }

  setThreadSettings(threadID: string, settings: ThreadSettings): void {
    this.threadSettings.set(threadID, settings);
  }

  async handleMessage(message: Message, api: any, threadInfo?: any): Promise<CommandResult | null> {
    if (this.config.ignoreSelf && message.senderID === this.config.selfID) {
      return null;
    }

    const settings = this.getThreadSettings(message.threadID);
    const prefixes = settings.customPrefixes?.length ? settings.customPrefixes : this.config.prefixes;
    
    let matchedPrefix: string | null = null;
    let content = message.body || '';

    if (this.config.mentionAsPrefix && this.config.selfID) {
      const mentionPattern = new RegExp(`^@?\\[?${this.config.selfID}\\]?\\s*`, 'i');
      if (mentionPattern.test(content)) {
        content = content.replace(mentionPattern, '').trim();
        matchedPrefix = '@mention';
      }
    }

    if (!matchedPrefix) {
      for (const prefix of prefixes) {
        const compareContent = this.config.caseSensitive ? content : content.toLowerCase();
        const comparePrefix = this.config.caseSensitive ? prefix : prefix.toLowerCase();
        
        if (compareContent.startsWith(comparePrefix)) {
          matchedPrefix = prefix;
          content = content.slice(prefix.length).trim();
          break;
        }
      }
    }

    if (!matchedPrefix) {
      return null;
    }

    const args = content.split(/\s+/).filter(arg => arg.length > 0);
    if (args.length === 0) {
      return null;
    }

    const commandName = args.shift()!;
    const command = this.getCommand(commandName);

    if (!command) {
      if (this.config.unknownCommandMessage) {
        await api.sendMessage(this.config.unknownCommandMessage, message.threadID);
      }
      return { success: false, error: 'Unknown command' };
    }

    if (this.config.maintenanceMode && !this.isBotAdmin(message.senderID)) {
      await api.sendMessage(this.config.maintenanceMessage, message.threadID);
      return { success: false, error: 'Maintenance mode' };
    }

    if (settings.disabledCommands?.includes(command.name)) {
      await api.sendMessage(`❌ Command "${command.name}" is disabled in this group.`, message.threadID);
      return { success: false, error: 'Command disabled' };
    }

    const adminIDs = threadInfo?.adminIDs || settings.adminIDs || [];
    const isGroupAdmin = adminIDs.includes(message.senderID);
    const isBotAdmin = this.isBotAdmin(message.senderID);

    if (settings.adminOnly && !isGroupAdmin && !isBotAdmin && 
        !['help', 'ping'].includes(command.name)) {
      await api.sendMessage(this.config.permissionMessage, message.threadID);
      return { success: false, error: 'Admin only mode' };
    }

    if (command.permissions) {
      const hasPermission = this.checkPermissions(command.permissions, message.senderID, isGroupAdmin, isBotAdmin);
      if (!hasPermission) {
        await api.sendMessage(this.config.permissionMessage, message.threadID);
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    const cooldownResult = this.checkCooldown(command, message.senderID, settings.cooldownMultiplier || 1);
    if (!cooldownResult.canExecute) {
      const cooldownMsg = this.config.cooldownMessage.replace('{time}', String(Math.ceil(cooldownResult.remaining! / 1000)));
      await api.sendMessage(cooldownMsg, message.threadID);
      return { success: false, error: 'Cooldown active' };
    }

    const context: CommandContext = {
      message,
      args,
      prefix: matchedPrefix === '@mention' ? '@' : matchedPrefix,
      command: command.name,
      api,
      threadInfo,
      isGroupAdmin,
      isBotAdmin,
      reply: async (text: string) => {
        return api.sendMessage(text, message.threadID);
      },
      react: async (emoji: string) => {
        return api.setMessageReaction(emoji, message.messageID);
      }
    };

    try {
      if (this.config.logCommands) {
        this.logger.info(`Command executed: ${command.name}`, {
          user: message.senderID,
          thread: message.threadID,
          args: args.join(' ')
        });
      }

      this.setCooldown(command, message.senderID);
      
      this.emit('commandStart', { command: command.name, context });
      
      const result = await command.execute(context);
      
      this.emit('commandEnd', { command: command.name, context, result });

      return result;
    } catch (error) {
      this.logger.error(`Command error: ${command.name}`, { error: (error as Error).message });
      await api.sendMessage(this.config.errorMessage, message.threadID);
      
      this.emit('commandError', { command: command.name, context, error });
      
      return { success: false, error: (error as Error).message };
    }
  }

  async pangasiwaan(message: Message, api: any, threadInfo?: any): Promise<CommandResult | null> {
    return this.handleMessage(message, api, threadInfo);
  }

  private checkPermissions(
    required: CommandPermission[],
    userID: string,
    isGroupAdmin: boolean,
    isBotAdmin: boolean
  ): boolean {
    for (const perm of required) {
      if (perm === 'admin' && !isGroupAdmin && !isBotAdmin) return false;
      if (perm === 'botAdmin' && !isBotAdmin) return false;
    }
    return true;
  }

  private checkCooldown(
    command: Command,
    userID: string,
    multiplier: number
  ): { canExecute: boolean; remaining?: number } {
    if (this.isBotAdmin(userID)) {
      return { canExecute: true };
    }

    const cooldownMap = this.cooldowns.get(command.name.toLowerCase());
    if (!cooldownMap) return { canExecute: true };

    const lastUsed = cooldownMap.get(userID);
    if (!lastUsed) return { canExecute: true };

    const cooldownTime = (command.cooldown || this.config.defaultCooldown) * multiplier;
    const elapsed = Date.now() - lastUsed;

    if (elapsed < cooldownTime) {
      return { canExecute: false, remaining: cooldownTime - elapsed };
    }

    return { canExecute: true };
  }

  private setCooldown(command: Command, userID: string): void {
    const cooldownMap = this.cooldowns.get(command.name.toLowerCase());
    if (cooldownMap) {
      cooldownMap.set(userID, Date.now());
    }
  }

  private formatHelpMenu(prefix: string): string {
    const categories = new Map<string, Command[]>();
    
    for (const cmd of this.commands.values()) {
      if (cmd.hidden) continue;
      const cat = cmd.category || 'uncategorized';
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
      categories.get(cat)!.push(cmd);
    }

    let helpText = '╔═══════════════════════╗\n';
    helpText += '║  📚 COMMAND LIST      ║\n';
    helpText += '╚═══════════════════════╝\n\n';

    const categoryIcons: Record<string, string> = {
      utility: '🔧',
      admin: '👑',
      owner: '⚡',
      fun: '🎮',
      moderation: '🛡️',
      uncategorized: '📁'
    };

    for (const [category, commands] of categories) {
      const icon = categoryIcons[category] || '📁';
      helpText += `${icon} ${category.toUpperCase()}\n`;
      helpText += '━━━━━━━━━━━━━━\n';
      
      for (const cmd of commands) {
        helpText += `➤ ${prefix}${cmd.name}`;
        if (cmd.description) {
          helpText += `\n   ${cmd.description}`;
        }
        helpText += '\n';
      }
      helpText += '\n';
    }

    helpText += `\n💡 Use ${prefix}help <command> for details`;
    
    return helpText;
  }

  private formatCommandHelp(cmd: Command, prefix: string): string {
    let text = '╔═══════════════════════╗\n';
    text += `║  📖 ${cmd.name.toUpperCase()}\n`;
    text += '╚═══════════════════════╝\n\n';
    
    if (cmd.description) {
      text += `📝 ${cmd.description}\n\n`;
    }
    
    if (cmd.usage) {
      text += `📌 Usage: ${prefix}${cmd.usage}\n\n`;
    }
    
    if (cmd.aliases?.length) {
      text += `🔗 Aliases: ${cmd.aliases.map(a => prefix + a).join(', ')}\n\n`;
    }
    
    if (cmd.category) {
      text += `📁 Category: ${cmd.category}\n`;
    }
    
    if (cmd.cooldown) {
      text += `⏱️ Cooldown: ${cmd.cooldown / 1000}s\n`;
    }
    
    if (cmd.permissions?.length) {
      text += `🔒 Permissions: ${cmd.permissions.join(', ')}\n`;
    }

    return text;
  }

  configure(config: Partial<CommandConfig>): void {
    this.config = { ...this.config, ...config };
  }

  iConfigAngCommandHandler(config: Partial<CommandConfig>): void {
    this.configure(config);
  }

  getConfig(): CommandConfig {
    return { ...this.config };
  }
}
