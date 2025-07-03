import { ConsoleLogger, Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

export type LogCategory = 'server-action' | 'user-action' | 'message';

export interface LogContext {
  category?: LogCategory;
  userId?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class CustomLoggerService extends ConsoleLogger implements LoggerService {
  private readonly logFormat: string;

  constructor(
    private readonly configService: ConfigService,
    context?: string,
  ) {
    super(context || 'CustomLogger');
    this.logFormat = this.configService.logFormat;
  }

  private formatSplunkMessage(
    level: string,
    message: string,
    context: LogContext = {},
  ): string {
    const timestamp = new Date().toISOString();
    const category = context.category || 'message';
    const userId = context.userId || '';
    
    return `${timestamp};${level};${category};${userId};${message}`;
  }

  private shouldUseSplunkFormat(): boolean {
    return this.logFormat === 'splunk';
  }

  private logWithContext(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context: LogContext = {},
  ) {
    if (this.shouldUseSplunkFormat()) {
      const formattedMessage = this.formatSplunkMessage(
        level.toUpperCase(),
        message,
        context,
      );
      console.log(formattedMessage);
    } else {
      // Use the parent ConsoleLogger methods directly to avoid circular calls
      const contextString = this.context || context.category || 'Application';
      super[level](message, contextString);
    }
  }

  // Override base Logger methods
  log(message: string, context?: LogContext | string) {
    if (typeof context === 'string') {
      this.logWithContext('log', message, { category: 'message' });
    } else {
      this.logWithContext('log', message, context);
    }
  }

  error(message: string, trace?: string, context?: LogContext | string) {
    const errorContext = typeof context === 'string' 
      ? { category: 'message' as LogCategory } 
      : context;
    
    const fullMessage = trace ? `${message} - ${trace}` : message;
    this.logWithContext('error', fullMessage, errorContext);
  }

  warn(message: string, context?: LogContext | string) {
    if (typeof context === 'string') {
      this.logWithContext('warn', message, { category: 'message' });
    } else {
      this.logWithContext('warn', message, context);
    }
  }

  debug(message: string, context?: LogContext | string) {
    if (typeof context === 'string') {
      this.logWithContext('debug', message, { category: 'message' });
    } else {
      this.logWithContext('debug', message, context);
    }
  }

  verbose(message: string, context?: LogContext | string) {
    if (typeof context === 'string') {
      this.logWithContext('verbose', message, { category: 'message' });
    } else {
      this.logWithContext('verbose', message, context);
    }
  }

  // Custom methods for specific categories
  logServerAction(message: string, additionalContext: Omit<LogContext, 'category'> = {}) {
    this.logWithContext('log', message, { 
      ...additionalContext, 
      category: 'server-action' 
    });
  }

  logUserAction(message: string, userId: string, additionalContext: Omit<LogContext, 'category' | 'userId'> = {}) {
    this.logWithContext('log', message, { 
      ...additionalContext, 
      category: 'user-action',
      userId 
    });
  }

  errorServerAction(message: string, trace?: string, additionalContext: Omit<LogContext, 'category'> = {}) {
    const fullMessage = trace ? `${message} - ${trace}` : message;
    this.logWithContext('error', fullMessage, { 
      ...additionalContext, 
      category: 'server-action' 
    });
  }

  errorUserAction(message: string, userId: string, trace?: string, additionalContext: Omit<LogContext, 'category' | 'userId'> = {}) {
    const fullMessage = trace ? `${message} - ${trace}` : message;
    this.logWithContext('error', fullMessage, { 
      ...additionalContext, 
      category: 'user-action',
      userId 
    });
  }
}