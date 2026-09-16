import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private isProduction = process.env.NODE_ENV === 'production';

  log(message: unknown, context?: string) {
    this.printMessage('INFO', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.printMessage('ERROR', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.printMessage('WARN', message, context);
  }

  debug(message: unknown, context?: string) {
    if (!this.isProduction) {
      this.printMessage('DEBUG', message, context);
    }
  }

  verbose(message: unknown, context?: string) {
    if (!this.isProduction) {
      this.printMessage('VERBOSE', message, context);
    }
  }

  private printMessage(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context || 'Application';

    if (this.isProduction) {
      const logEntry = {
        timestamp,
        level,
        context: sanitizedContext,
        message: typeof message === 'object' ? message : String(message),
        ...(trace ? { trace } : {}),
      };
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else {
      const color = this.getColor(level);
      const reset = '\x1b[0m';
      const formattedMessage =
        typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);
      
      process.stdout.write(
        `[${timestamp}] ${color}[${level.padEnd(5)}]${reset} [${sanitizedContext}] ${formattedMessage}\n`,
      );
      if (trace) {
        process.stderr.write(`${color}${trace}${reset}\n`);
      }
    }
  }

  private getColor(level: string): string {
    switch (level) {
      case 'ERROR':
        return '\x1b[31m'; // Red
      case 'WARN':
        return '\x1b[33m'; // Yellow
      case 'INFO':
        return '\x1b[32m'; // Green
      case 'DEBUG':
        return '\x1b[34m'; // Blue
      case 'VERBOSE':
        return '\x1b[36m'; // Cyan
      default:
        return '\x1b[37m'; // White
    }
  }
}
