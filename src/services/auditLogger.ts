import { CapabilityStatus, StructuredAuditLog } from '../types';

export class AuditLogger {
  private static logs: StructuredAuditLog[] = [];
  private static maxLogs: number = 50;
  private static subscribers: ((logs: StructuredAuditLog[]) => void)[] = [];

  static logAudit(params: {
    auditName: string;
    auditSource: string;
    requiredCapabilities: string[];
    availableCapabilities: string[];
    rawEvidence: Record<string, any>;
    evaluationRule: string;
    finalStatus: CapabilityStatus;
    limitations: string[];
    ttlMs: number;
    timestamp?: number;
  }): StructuredAuditLog {
    const timestamp = params.timestamp ?? Date.now();
    const entry: StructuredAuditLog = {
      id: `audit_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      auditName: params.auditName,
      auditSource: params.auditSource,
      requiredCapabilities: params.requiredCapabilities,
      availableCapabilities: params.availableCapabilities,
      rawEvidence: sanitizeEvidence(params.rawEvidence),
      evaluationRule: params.evaluationRule,
      finalStatus: params.finalStatus,
      limitations: params.limitations,
      ttlMs: params.ttlMs,
      expiresAt: timestamp + params.ttlMs,
    };

    // Format structured output to console for telemetry
    console.info(
      `[SENTINEL AUDIT] ${params.auditName}\n` +
      `  AUDIT START: ${new Date(timestamp).toISOString()}\n` +
      `  AUDIT SOURCE: ${params.auditSource}\n` +
      `  REQUIRED CAPABILITIES: [${params.requiredCapabilities.join(', ')}]\n` +
      `  AVAILABLE CAPABILITIES: [${params.availableCapabilities.join(', ')}]\n` +
      `  RAW EVIDENCE: ${JSON.stringify(entry.rawEvidence)}\n` +
      `  EVALUATION RULE: ${params.evaluationRule}\n` +
      `  FINAL STATUS: ${params.finalStatus}\n` +
      `  LIMITATIONS: [${params.limitations.join(' | ')}]\n` +
      `  TIMESTAMP: ${timestamp}\n` +
      `  TTL: ${params.ttlMs}ms`
    );

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notify();
    return entry;
  }

  static getLogs(): StructuredAuditLog[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  static subscribe(cb: (logs: StructuredAuditLog[]) => void): () => void {
    this.subscribers.push(cb);
    cb(this.getLogs());
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private static notify() {
    const snapshot = this.getLogs();
    this.subscribers.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('AuditLogger subscriber error:', err);
      }
    });
  }
}

/**
 * Strips potential PII such as phone numbers, raw IMSI/IMEI identifiers, SMS text, or contact names.
 */
function sanitizeEvidence(evidence: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(evidence)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('phone') ||
      lowerKey.includes('msisdn') ||
      lowerKey.includes('imsi') ||
      lowerKey.includes('imei') ||
      lowerKey.includes('contact') ||
      lowerKey.includes('message') ||
      lowerKey.includes('sms') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret')
    ) {
      sanitized[key] = '[REDACTED_PRIVACY_PROTECTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeEvidence(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
