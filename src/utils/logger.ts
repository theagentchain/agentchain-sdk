export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  enableColors: boolean;
  prefix?: string;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableTimestamp: true,
      enableColors: true,
      ...config
    };
  }

  private formatMessage(level: string, message: string, data?: any): string {
    let formatted = '';
    
    if (this.config.enableTimestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }
    
    if (this.config.prefix) {
      formatted += `[${this.config.prefix}] `;
    }
    
    formatted += `${level}: ${message}`;
    
    if (data) {
      formatted += ` ${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }
}

// Default logger instance
export const logger = new Logger(); 