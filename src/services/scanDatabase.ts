import { ScanLog, ThreatItem } from '../types';

const STORAGE_KEY_SCAN_LOGS = 'sentinel_scan_logs';
const STORAGE_KEY_THREATS = 'sentinel_threats_list';

const INITIAL_THREATS: ThreatItem[] = [
  {
    id: 'th-01',
    title: 'Unencrypted HTTP Fallback Detected in Background Session',
    category: 'Network Protocol',
    severity: 'MEDIUM',
    description: 'An outbound background socket attempted legacy unencrypted HTTP transport without TLS 1.3 pinning.',
    recommendation: 'Enable WireGuard tunnel or enforce HTTPS-Only Mode in browser / system network configuration.',
    timestamp: Date.now() - 3600000,
    isResolved: false,
    runtimeBacked: true,
  },
  {
    id: 'th-02',
    title: 'Suspicious BLE Tracking Beacon Proximity',
    category: 'RF Telemetry',
    severity: 'LOW',
    description: 'Unregistered Bluetooth Low Energy beacon has maintained constant proximity across location changes.',
    recommendation: 'Inspect personal belongings for unexpected tracking tags or enable BLE silent randomized MAC.',
    timestamp: Date.now() - 7200000,
    isResolved: false,
    runtimeBacked: true,
  },
];

const INITIAL_LOGS: ScanLog[] = Array.from({ length: 30 }).map((_, i) => {
  const date = new Date(Date.now() - (29 - i) * 86400000);
  const score = 80 + Math.floor(Math.random() * 20) - (i % 5 === 0 ? 10 : 0);
  return {
    id: date.getTime(),
    scanDate: date.toLocaleDateString(),
    overallScore: Math.min(100, Math.max(0, score)),
    threatsFound: score < 85 ? 1 : 0,
    summary: score < 85 ? 'Minor anomalies detected.' : 'System audit passed.',
    resolved: true,
    timestamp: date.getTime(),
  };
});

export class ScanDatabase {
  static getThreats(): ThreatItem[] {
    if (typeof window === 'undefined') return INITIAL_THREATS;
    try {
      const data = localStorage.getItem(STORAGE_KEY_THREATS);
      if (data) return JSON.parse(data);
    } catch {}
    localStorage.setItem(STORAGE_KEY_THREATS, JSON.stringify(INITIAL_THREATS));
    return INITIAL_THREATS;
  }

  static saveThreats(threats: ThreatItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_THREATS, JSON.stringify(threats));
  }

  static resolveThreat(id: string): ThreatItem[] {
    const list = this.getThreats().map((t) => (t.id === id ? { ...t, isResolved: true } : t));
    this.saveThreats(list);
    return list;
  }

  static addThreat(threat: ThreatItem): ThreatItem[] {
    const list = [threat, ...this.getThreats()];
    this.saveThreats(list);
    return list;
  }

  static getLogs(): ScanLog[] {
    if (typeof window === 'undefined') return INITIAL_LOGS;
    try {
      const data = localStorage.getItem(STORAGE_KEY_SCAN_LOGS);
      if (data) return JSON.parse(data);
    } catch {}
    localStorage.setItem(STORAGE_KEY_SCAN_LOGS, JSON.stringify(INITIAL_LOGS));
    return INITIAL_LOGS;
  }

  static addLog(log: Omit<ScanLog, 'id'>): ScanLog[] {
    const current = this.getLogs();
    const newLog: ScanLog = {
      ...log,
      id: Date.now(),
    };
    const updated = [newLog, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SCAN_LOGS, JSON.stringify(updated));
    }
    return updated;
  }

  static clearLogs(): ScanLog[] {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SCAN_LOGS, JSON.stringify([]));
    }
    return [];
  }
}
