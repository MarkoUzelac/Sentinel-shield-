export type AuditStatus = 'UNAVAILABLE' | 'UNVERIFIED' | 'VERIFIED' | 'FAILED';
export type CapabilityStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNAVAILABLE' | 'FAILED';
export type EvidenceFreshness = 'VERIFIED' | 'ACTIVE_UNVERIFIED' | 'STALE' | 'UNAVAILABLE' | 'FAILED';
export type LocationConfidence = 'KNOWN_LOCATION' | 'ESTIMATED_ZONE' | 'LAST_SEEN' | 'UNAVAILABLE';
export type GeolocationPermissionState = 'PROMPT' | 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED' | 'UNSUPPORTED';

export type MmiAuditState =
  | 'IDLE'
  | 'DISPATCH_REQUESTED'
  | 'DIALER_OPENED'
  | 'WAITING_FOR_OPERATOR_RESULT'
  | 'UNVERIFIED'
  | 'VERIFIED'
  | 'FAILED'
  | 'UNAVAILABLE';

export interface AuditActionRequired {
  label: string;
  action: string;
  type: 'GRANT_PERMISSION' | 'OPEN_SETTINGS' | 'RUN_PROBE' | 'RETRY' | 'RUN_MMI' | 'REFRESH_AUDIT';
}

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
  freshness?: EvidenceFreshness;
  source: string;
  reason: string;
  details: string;
  lastCheckedEpochMs: number;
  ttlMs: number;
  expiresAtEpochMs: number;
  isStale?: boolean;
  evidence: Record<string, any>;
  limitations: string[];
  requiredCapabilities?: string[];
  availableCapabilities?: string[];
  actionRequired?: AuditActionRequired;
  provenance?: EvidenceProvenance;
}

export interface StructuredAuditLog {
  id: string;
  timestamp: number;
  auditName: string;
  auditSource: string;
  requiredCapabilities: string[];
  availableCapabilities: string[];
  rawEvidence: Record<string, any>;
  evaluationRule: string;
  finalStatus: CapabilityStatus;
  limitations: string[];
  ttlMs: number;
  expiresAt: number;
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
  freshness?: EvidenceFreshness;
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
  privacyType?: '14-Eyes' | 'Privacy Haven' | '5-Eyes' | 'Standard' | '9-Eyes' | 'Restricted';
}

export type VpnTunnelState =
  | 'Disconnected'
  | 'Starting'
  | 'Verifying'
  | 'Connected'
  | 'Error'
  | 'AwaitingUserConsent';

export interface VpnEvidenceState {
  tunnelState: VpnTunnelState;
  selectedServer: VpnServer;
  rxBytes: number;
  txBytes: number;
  connectedSince: number | null;
  lastHandshakeEpochMs: number | null;
  handshakeVerified: boolean;
  freshness: EvidenceFreshness;
  endpoint: string;
  customConfig?: string;
}

export type SignalKind = 'BLE' | 'CELLULAR' | 'WIFI_NETWORK' | 'VPN_NETWORK';
export type SignalRisk = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ThreatRisk = 'NORMAL' | 'WATCH' | 'SUSPICIOUS' | 'HIGH';

export type RadarState =
  | 'NO_DATA'
  | 'SCANNING'
  | 'LIVE_DATA'
  | 'PARTIAL_DATA'
  | 'TEST_DATA'
  | 'PERMISSION_REQUIRED'
  | 'UNAVAILABLE'
  | 'ERROR';

export type TelemetrySourceType = 'NATIVE_ANDROID' | 'OPENCELLID_BACKUP' | 'TEST';

export type CapabilityAccessState =
  | 'LIVE'
  | 'INFERRED'
  | 'BACKUP_API'
  | 'TEST'
  | 'UNAVAILABLE'
  | 'PERMISSION_REQUIRED';

export type CapabilityState =
  | 'LIVE_HARDWARE'
  | 'PARTIAL_HARDWARE'
  | 'SIMULATED'
  | 'TEST_EVIDENCE'
  | 'UNAVAILABLE'
  | 'PERMISSION_REQUIRED';

export type SignalClassification =
  | 'UNREGISTERED_BEACON'
  | 'CONFIRMED_TRACKER'
  | 'SERVING_CELL'
  | 'NEIGHBOR_CELL'
  | 'LOCAL_BEACON'
  | 'UNKNOWN';

export type SignalVerificationStatus =
  | 'OBSERVED'
  | 'NETWORK_PROVIDED'
  | 'CRYPTOGRAPHICALLY_VERIFIED'
  | 'SYNTHETIC_TEST';

export type LocationEvidenceType =
  | 'USER_GPS_POSITION'
  | 'OBSERVED_EVIDENCE_LOCATION'
  | 'ESTIMATED_ZONE'
  | 'NETWORK_PROVIDED_COORDINATES'
  | 'UNAVAILABLE';

export interface AnomalyFactor {
  name: string;
  weight: number;
  contribution: number;
  observedValue: string;
  expectedBaseline: string;
  explanation: string;
}

export interface AnomalyAssessment {
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'ESTIMATED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: AnomalyFactor[];
  summary: string;
}

export interface RogueCellIndicator {
  id: string;
  indicator: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
  timestamp: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RogueCellAssessment {
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | 'ESTIMATED';
  heading: string; // "Potential rogue-cell indicators detected" or "No anomalous rogue-cell indicators detected"
  indicators: RogueCellIndicator[];
  reasons: string[];
  timestamp: number;
  summary: string;
}

export interface BasebandTelemetryState {
  rat: 'LTE' | 'NR' | 'WCDMA' | 'GSM' | 'UNAVAILABLE';
  mcc: number | null;
  mnc: number | null;
  tacOrLac: number | null;
  cidOrEci: number | null;
  pci: number | null;
  arfcnOrEarfcn: number | null;
  signalStrengthDbm: number | null;
  asu: number | null;
  registeredState: 'REGISTERED_HOME' | 'REGISTERED_ROAMING' | 'SEARCHING' | 'DENIED' | 'UNAVAILABLE';
  roamingState: 'HOME' | 'ROAMING' | 'UNAVAILABLE';
  dataConnectionState: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'SUSPENDED' | 'UNAVAILABLE';
  timestamp: number;
  status: 'LIVE' | 'UNAVAILABLE' | 'TEST';
  statusReason: string;
}

export interface CellEvidenceItem {
  id: string;
  source: string; // e.g. "Android TelephonyManager" | "OpenCellID BACKUP" | "Isolated Test Provider"
  sourceType: TelemetrySourceType; // 'NATIVE_ANDROID' | 'OPENCELLID_BACKUP' | 'TEST'
  timestamp: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'ESTIMATED';
  networkType: 'GSM' | 'UMTS' | 'LTE' | 'NR' | 'UNKNOWN';
  mcc?: number;
  mnc?: number;
  lacOrTac?: number;
  cid?: number;
  pci?: number;
  signalDbm?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  isLive: boolean;
  isSynthetic: boolean;
  operator?: string;
  rangeMeters?: number;
  dataAgeSeconds?: number;
  servingState?: 'SERVING' | 'NEIGHBOR' | 'OBSERVED';
  explanation?: string;
  anomalyScore?: number;
}

export interface HardwareTelemetryChannel {
  status: CapabilityAccessState;
  label: string;
  source: string;
  details: string;
  limitations: string;
  isLive: boolean;
}

export interface HardwareTelemetryState {
  cellular: HardwareTelemetryChannel;
  ble: HardwareTelemetryChannel;
  location: HardwareTelemetryChannel;
  nativeRf: HardwareTelemetryChannel;
}

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
  sourceType?: TelemetrySourceType;
  locationAccuracyMeters?: number;
  locationConfidence?: LocationConfidence;
  locationEvidenceType?: LocationEvidenceType;
  freshness?: EvidenceFreshness;
  mcc?: number;
  mnc?: number;
  pci?: number;
  operator?: string;
  risk: SignalRisk;
  explanation: string;
  observedAtEpochMs: number;
  runtimeBacked: boolean;
  isTestEvidence?: boolean;
  isSynthetic?: boolean;
  isLive?: boolean;
  classification?: SignalClassification;
  verificationStatus?: SignalVerificationStatus;
  firstObservedAtEpochMs: number;
  observationCount: number;
  minRssiDbm?: number;
  maxRssiDbm?: number;
  rssiTrendDbm?: number;
  persistenceSeconds: number;
  anomalyScore: number;
  anomalyAssessment?: AnomalyAssessment;
  locationConsistency: string;
}

export interface SignalRadarSnapshot {
  scanning: boolean;
  radarState: RadarState;
  capabilityState: CapabilityState;
  capabilityStateMessage: string;
  signals: SignalRadarItem[];
  baseband: BasebandTelemetryState;
  rogueCellAssessment: RogueCellAssessment;
  hardwareTelemetry: HardwareTelemetryState;
  bleCount: number;
  cellularCount: number;
  networkCount: number;
  anomalyCount: number;
  anomalyAssessment: AnomalyAssessment;
  anomalyScore: number;
  startedAtEpochMs: number;
  lastUpdatedEpochMs: number;
  freshness: EvidenceFreshness;
  isTestMode: boolean;
  error?: string | null;
}

export interface DeviceLocationState {
  hasFix: boolean;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  coordinateLabel: string;
  isLiveGps: boolean;
  confidence: LocationConfidence;
  freshness: EvidenceFreshness;
  permissionState: GeolocationPermissionState;
  timestamp: number;
}

export interface NetworkObservation {
  available: boolean;
  transports: string[];
  validated: boolean;
  vpnTransport: boolean;
  dnsServers: string[];
  dnsReachable: boolean;
  dnsSecure: boolean;
  interfaceName?: string | null;
  blocked: boolean;
  httpsProbeLatencyMs?: number | null;
  httpsProbeTls?: string;
  httpsProbeStatusCode?: number | null;
  freshness?: EvidenceFreshness;
  timestamp?: number;
}

export interface ThreatSnapshot {
  timestamp: number;
  freshness: EvidenceFreshness;
  overallScore: number;
  location: DeviceLocationState;
  radar: SignalRadarSnapshot;
  vpn: VpnEvidenceState;
  network: NetworkObservation;
  evidences: CapabilityEvidence[];
  threats: ThreatItem[];
  activeThreatCount: number;
  auditCompletedAt: number | null;
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

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  state?: string;
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
  | 'telemetry'
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
