export type CapabilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE';

export type CapabilityId =
  | 'VPN_TRANSPORT'
  | 'VPN_HANDSHAKE'
  | 'RADAR_TELEPHONY'
  | 'CALL_MMI'
  | 'PHISHING_PROTECTION'
  | 'AD_TELEMETRY_FILTER'
  | 'REALTIME_SHIELD'
  | 'AI_THREAT_ANALYSIS'
  | 'DARK_WEB_LOOKUP'
  | 'NETWORK_AUDIT'
  | 'LEGAL_GUIDANCE';

export interface EvidenceProvenance {
  source: string;
  collectedAtEpochMs: number;
  runtimeBacked: boolean;
  verificationRule: string;
}

export interface CapabilityEvidence {
  id: CapabilityId;
  title: string;
  status: CapabilityStatus;
  source: string;
  details: string;
  lastCheckedEpochMs: number;
  provenance?: EvidenceProvenance;
  expiresAtEpochMs: number;
}

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

export interface ThreatItem {
  id: string;
  title: string;
  category: string;
  severity: ThreatSeverity;
  description: string;
  recommendation: string;
  timestamp: number;
  isResolved: boolean;
  runtimeBacked?: boolean;
}

export interface VpnServer {
  id: string;
  country: string;
  city: string;
  flagEmoji: string;
  pingMs: number;
  protocol: string;
  isPremium: boolean;
  endpoint?: string;
  publicKey?: string;
  allowedIPs?: string;
  jurisdictionScore?: number;
  privacyType?: '14-Eyes' | 'Privacy Haven' | '5-Eyes' | 'Standard';
}

export type VpnTunnelState =
  | 'Disconnected'
  | 'Starting'
  | 'Verifying'
  | 'Connected'
  | 'Error'
  | 'AwaitingUserConsent';

export type SignalKind = 'BLE' | 'CELLULAR' | 'WIFI_NETWORK' | 'VPN_NETWORK';
export type SignalRisk = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ThreatRisk = 'NORMAL' | 'WATCH' | 'SUSPICIOUS' | 'HIGH';

export interface SignalRadarItem {
  id: string;
  kind: SignalKind;
  label: string;
  technology: string;
  rssiDbm?: number;
  estimatedDistanceMeters?: number;
  cellId?: number;
  areaCode?: number;
  signalLevel?: number;
  latitude?: number;
  longitude?: number;
  bearingDegrees?: number;
  locationSource?: string;
  locationAccuracyMeters?: number;
  mcc?: number;
  mnc?: number;
  risk: SignalRisk;
  explanation: string;
  observedAtEpochMs: number;
  runtimeBacked: boolean;
  firstObservedAtEpochMs: number;
  observationCount: number;
  minRssiDbm?: number;
  maxRssiDbm?: number;
  rssiTrendDbm?: number;
  persistenceSeconds: number;
  anomalyScore: number;
  locationConsistency: string;
}

export interface SignalRadarSnapshot {
  scanning: boolean;
  signals: SignalRadarItem[];
  bleCount: number;
  cellularCount: number;
  networkCount: number;
  anomalyCount: number;
  anomalyScore: number;
  startedAtEpochMs: number;
  lastUpdatedEpochMs: number;
  error?: string | null;
}

export interface DeviceLocationState {
  hasFix: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  coordinateLabel: string;
  isLiveGps: boolean;
  timestamp: number;
}

export interface NetworkObservation {
  available: boolean;
  transports: string[];
  validated: boolean;
  vpnTransport: boolean;
  dnsServers: string[];
  interfaceName?: string | null;
  blocked: boolean;
}

export interface NetworkSpeedResult {
  pingMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  wifiSsid: string;
  securityEncryption: string;
  isDnsSecure: boolean;
  publicIp: string;
  timestamp: number;
}

export interface ScanLog {
  id: number;
  scanDate: string;
  overallScore: number;
  threatsFound: number;
  summary: string;
  resolved: boolean;
  timestamp: number;
}

export interface DarkWebBreach {
  id: string;
  domain: string;
  breachDate: string;
  compromisedFields: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

export interface JurisdictionProtection {
  country: string;
  code: string;
  privacyScore: number; // 0 - 100
  tier: 'Privacy Haven' | 'GDPR Enforced' | '14-Eyes Alliance' | '5-Eyes Alliance';
  wiretapRestrictions: string;
  dataRetentionMandate: string;
  flag: string;
}

export type ActiveTab =
  | 'shield'
  | 'radar'
  | 'vpn'
  | 'call_sec'
  | 'ai_scanner'
  | 'network_audit'
  | 'dark_web'
  | 'legal'
  | 'vault';

export type AppSkinId =
  | 'phosphor'
  | 'cyber_cyan'
  | 'stealth_midnight'
  | 'solar_amber'
  | 'titanium_light';

export interface AppSkinConfig {
  id: AppSkinId;
  displayName: string;
  icon: string;
  isDark: boolean;
  primaryColor: string;
  bgColor: string;
  surfaceColor: string;
  cardColor: string;
  borderColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  textMutedColor: string;
  accentSecondary: string;
}

export type AppLanguageCode = 'auto' | 'hr' | 'en' | 'de' | 'es' | 'fr' | 'it';
