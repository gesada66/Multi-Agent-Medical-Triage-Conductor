interface LogContext {
  [key: string]: any;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.redactPII(context || {}),
    };
    
    return JSON.stringify(logEntry);
  }

  private redactPII(context: LogContext): LogContext {
    const redacted = { ...context };
    
    // Redact common PII fields
    const piiFields = ['ssn', 'socialSecurityNumber', 'email', 'phone', 'phoneNumber', 'address'];
    
    for (const field of piiFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    // Redact API keys
    const keyFields = ['apiKey', 'api_key', 'token', 'password', 'secret'];
    for (const field of keyFields) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    // Redact potential medical identifiers in nested objects
    if (redacted.patientData) {
      redacted.patientData = this.redactMedicalPII(redacted.patientData);
    }
    
    return redacted;
  }

  private redactMedicalPII(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const redacted = { ...data };
    
    // Common medical PII fields
    const medicalPII = ['mrn', 'medicalRecordNumber', 'dateOfBirth', 'dob', 'fullName', 'name'];
    
    for (const field of medicalPII) {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }

  // Medical-specific logging methods
  medicalEvent(event: string, context: LogContext): void {
    this.info(`[MEDICAL_EVENT] ${event}`, {
      ...context,
      eventType: 'medical',
      requiresAudit: true,
    });
  }

  securityEvent(event: string, context: LogContext): void {
    this.warn(`[SECURITY_EVENT] ${event}`, {
      ...context,
      eventType: 'security',
      requiresAlert: true,
    });
  }

  performanceMetric(metric: string, value: number, context?: LogContext): void {
    this.info(`[PERFORMANCE] ${metric}`, {
      ...context,
      metric,
      value,
      eventType: 'performance',
    });
  }

  costMetric(provider: string, cost: number, context?: LogContext): void {
    this.info(`[COST] ${provider} usage`, {
      ...context,
      provider,
      cost,
      eventType: 'cost',
    });
  }
}

export const logger = new Logger();

// Export types for use in other modules
export type { LogLevel, LogContext };