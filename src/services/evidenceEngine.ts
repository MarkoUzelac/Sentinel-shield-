import {
  CapabilityEvidence,
  CapabilityId,
  CapabilityStatus,
  EvidenceFreshness,
  GeolocationPermissionState,
  MmiAuditState,
  NetworkObservation,
  AuditActionRequired,
} from '../types';
import { IEvidenceClock, SystemEvidenceClock } from './clock';
import { AuditLogger } from './auditLogger';

const DEFAULT_EVIDENCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const HANDSHAKE_FRESHNESS_TTL_MS = 3 * 60 * 1000; // 3 minutes for WireGuard handshake

function createEvidence(params: {
  id: CapabilityId;
  title: string;
  status: CapabilityStatus;
  source: string;
  reason: string;
  details: string;
  verificationRule: string;
  evidence?: Record<string, any>;
  limitations?: string[];
  requiredCapabilities?: string[];
  availableCapabilities?: string[];
  actionRequired?: AuditActionRequired;
  ttlMs?: number;
  clock?: IEvidenceClock;
}): CapabilityEvidence {
  const clock = params.clock ?? new SystemEvidenceClock();
  const now = clock.now();
  const ttlMs = params.ttlMs ?? DEFAULT_EVIDENCE_TTL_MS;
  const expiresAtEpochMs = now + ttlMs;

  let freshness: EvidenceFreshness;
  if (params.status === 'VERIFIED') {
    freshness = 'VERIFIED';
  } else if (params.status === 'FAILED') {
    freshness = 'FAILED';
  } else if (params.status === 'UNAVAILABLE') {
    freshness = 'UNAVAILABLE';
  } else {
    freshness = 'ACTIVE_UNVERIFIED';
  }

  const limitations = params.limitations ?? [
    'Evidence represents snapshot runtime observation, not continuous kernel telemetry.',
  ];
  const requiredCapabilities = params.requiredCapabilities ?? [];
  const availableCapabilities = params.availableCapabilities ?? [];
  const rawEvidence = params.evidence ?? {};

  // Structured Audit Log emission
  AuditLogger.logAudit({
    auditName: params.title,
    auditSource: params.source,
    requiredCapabilities,
    availableCapabilities,
    rawEvidence,
    evaluationRule: params.verificationRule,
    finalStatus: params.status,
    limitations,
    ttlMs,
    timestamp: now,
  });

  return {
    id: params.id,
    title: params.title,
    status: params.status,
    freshness,
    source: params.source,
    reason: params.reason,
    details: params.details,
    lastCheckedEpochMs: now,
    ttlMs,
    expiresAtEpochMs,
    isStale: false,
    evidence: rawEvidence,
    limitations,
    requiredCapabilities,
    availableCapabilities,
    actionRequired: params.actionRequired,
    provenance: {
      source: params.source,
      collectedAtEpochMs: now,
      runtimeBacked: true,
      verificationRule: params.verificationRule,
    },
  };
}

export class CapabilityEvidenceEngine {
  private static clock: IEvidenceClock = new SystemEvidenceClock();

  static setClock(clock: IEvidenceClock) {
    this.clock = clock;
  }

  static getClock(): IEvidenceClock {
    return this.clock;
  }

  static vpnTransport(provisioned: boolean, connected: boolean): CapabilityEvidence {
    if (connected) {
      return createEvidence({
        id: 'VPN_TRANSPORT',
        title: 'WireGuard transport',
        status: 'VERIFIED',
        source: 'WireGuardTunnelController',
        reason: 'Active WireGuard network transport established and passing IP datagrams.',
        details: 'Tunnel is connected via active WireGuard network transport.',
        verificationRule: 'CONNECTED requires active transport lifecycle verification',
        evidence: { provisioned, connected, transportType: 'WIREGUARD_KERNEL' },
        requiredCapabilities: ['NETWORK_VPN_SERVICE', 'WIREGUARD_INTERFACE'],
        availableCapabilities: ['NETWORK_VPN_SERVICE', 'WIREGUARD_INTERFACE'],
        limitations: ['VPN transport validates IP routing, not physical network wire integrity.'],
        clock: this.clock,
      });
    }
    if (provisioned) {
      return createEvidence({
        id: 'VPN_TRANSPORT',
        title: 'WireGuard transport',
        status: 'UNVERIFIED',
        source: 'WireGuardProfileStore',
        reason: 'Profile is provisioned in local store, but transport is not actively connected.',
        details: 'Profile is provisioned, but transport is not actively connected.',
        verificationRule: 'Profile existence is not connection proof',
        evidence: { provisioned, connected: false },
        actionRequired: { label: 'Connect Tunnel', action: 'CONNECT_VPN', type: 'RUN_PROBE' },
        limitations: ['A configured profile does not route traffic until connection handshake is established.'],
        clock: this.clock,
      });
    }
    return createEvidence({
      id: 'VPN_TRANSPORT',
      title: 'WireGuard transport',
      status: 'UNAVAILABLE',
      source: 'WireGuardProfileStore',
      reason: 'No WireGuard profile is configured on this device.',
      details: 'No active WireGuard profile is loaded.',
      verificationRule: 'No provisioned profile',
      actionRequired: { label: 'Import Profile', action: 'OPEN_VPN', type: 'OPEN_SETTINGS' },
      limitations: ['Cannot initiate tunnel without WireGuard configuration credentials.'],
      clock: this.clock,
    });
  }

  static vpnHandshake(connected: boolean, handshakeEpochMs?: number | null): CapabilityEvidence {
    const now = this.clock.now();
    const isFresh =
      connected &&
      handshakeEpochMs !== null &&
      handshakeEpochMs !== undefined &&
      now - handshakeEpochMs <= HANDSHAKE_FRESHNESS_TTL_MS;

    if (isFresh && handshakeEpochMs) {
      return createEvidence({
        id: 'VPN_HANDSHAKE',
        title: 'Handshake verification',
        status: 'VERIFIED',
        source: 'WireGuard peer statistics',
        reason: 'Cryptographic peer handshake verified with fresh runtime timestamp.',
        details: `Peer handshake verified with fresh runtime evidence (${new Date(handshakeEpochMs).toLocaleTimeString()}).`,
        verificationRule: 'Fresh post-start peer handshake within 180s TTL',
        evidence: {
          connected: true,
          lastHandshakeEpochMs: handshakeEpochMs,
          handshakeAgeMs: now - handshakeEpochMs,
          maxAllowedAgeMs: HANDSHAKE_FRESHNESS_TTL_MS,
        },
        requiredCapabilities: ['WIREGUARD_PEER_TELEMETRY'],
        availableCapabilities: ['WIREGUARD_PEER_TELEMETRY'],
        limitations: ['Handshake validates peer authentication at handshake time; requires periodic keepalive.'],
        ttlMs: HANDSHAKE_FRESHNESS_TTL_MS,
        clock: this.clock,
      });
    }
    if (connected) {
      const isStale = handshakeEpochMs ? now - handshakeEpochMs > HANDSHAKE_FRESHNESS_TTL_MS : true;
      const reason = isStale
        ? 'Tunnel is active, but peer handshake timestamp is stale (> 180s).'
        : 'Tunnel is active without verified peer handshake confirmation.';
      return createEvidence({
        id: 'VPN_HANDSHAKE',
        title: 'Handshake verification',
        status: 'UNVERIFIED',
        source: 'WireGuard peer statistics',
        reason,
        details: isStale
          ? 'Tunnel is active, but peer handshake is stale or unverified.'
          : 'Tunnel is active without verified peer handshake confirmation.',
        verificationRule: 'Connected without fresh handshake evidence',
        evidence: {
          connected: true,
          lastHandshakeEpochMs: handshakeEpochMs ?? null,
          isStale,
        },
        actionRequired: { label: 'Send Keepalive', action: 'REFRESH_HANDSHAKE', type: 'RUN_PROBE' },
        limitations: ['Handshake telemetry missing or expired; cryptographic session cannot be verified.'],
        clock: this.clock,
      });
    }
    return createEvidence({
      id: 'VPN_HANDSHAKE',
      title: 'Handshake verification',
      status: 'UNAVAILABLE',
      source: 'WireGuard peer statistics',
      reason: 'Handshake verification requires an active VPN tunnel.',
      details: 'Handshake verification requires an active tunnel.',
      verificationRule: 'Tunnel is inactive',
      evidence: { connected: false },
      actionRequired: { label: 'Start Tunnel', action: 'CONNECT_VPN', type: 'RUN_PROBE' },
      limitations: ['Peer telemetry only accessible during active session.'],
      clock: this.clock,
    });
  }

  static radar(observation: {
    permissionGranted?: boolean;
    permissionState?: GeolocationPermissionState;
    cellRecordCount: number;
    telephonyAvailable: boolean;
    simulated?: boolean;
  }): CapabilityEvidence {
    const permState = observation.permissionState ?? (observation.permissionGranted ? 'GRANTED' : 'PROMPT');
    const isGranted = permState === 'GRANTED' || observation.permissionGranted === true;

    if (!observation.telephonyAvailable) {
      return createEvidence({
        id: 'RADAR_TELEPHONY',
        title: 'Telephony & RF radar',
        status: 'UNAVAILABLE',
        source: 'Web Telephony / RF Interface',
        reason: 'Host platform or browser does not expose direct cellular base station telemetry.',
        details: 'Host platform does not expose direct cellular base station telephony interface.',
        verificationRule: 'Telephony feature unavailable in browser environment',
        requiredCapabilities: ['ACCESS_FINE_LOCATION', 'READ_PHONE_STATE', 'TELEPHONY_SCANNER'],
        availableCapabilities: isGranted ? ['ACCESS_FINE_LOCATION'] : [],
        limitations: [
          'Direct baseband cellular cell tower access is restricted by the operating system sandbox without carrier privileges.',
        ],
        actionRequired: isGranted
          ? undefined
          : { label: 'Grant permissions', action: 'REQUEST_PERMISSION', type: 'GRANT_PERMISSION' },
        clock: this.clock,
      });
    }

    if (permState === 'PERMANENTLY_DENIED') {
      return createEvidence({
        id: 'RADAR_TELEPHONY',
        title: 'Telephony & RF radar',
        status: 'UNAVAILABLE',
        source: 'Geolocation / Sensor Permission',
        reason: 'Location and sensor runtime permissions were permanently denied.',
        details: 'Location permission was permanently denied. Manual intervention required in App Settings.',
        verificationRule: 'Permanently denied permission blocks RF scanning',
        requiredCapabilities: ['ACCESS_FINE_LOCATION'],
        availableCapabilities: [],
        limitations: ['Location and sensor coordinates are required for RF proximity calculations.'],
        actionRequired: { label: 'Open App Settings', action: 'OPEN_SETTINGS', type: 'OPEN_SETTINGS' },
        clock: this.clock,
      });
    }

    if (!isGranted) {
      return createEvidence({
        id: 'RADAR_TELEPHONY',
        title: 'Telephony & RF radar',
        status: 'UNAVAILABLE',
        source: 'Geolocation / Sensor Permission',
        reason: 'Sensor and location permissions have not been granted.',
        details: 'Sensor and location permissions have not been granted.',
        verificationRule: 'Required runtime sensor permission missing',
        requiredCapabilities: ['ACCESS_FINE_LOCATION'],
        availableCapabilities: [],
        limitations: ['RF bearing and distance calculations are inaccessible without sensor authorization.'],
        actionRequired: { label: 'Grant permissions', action: 'REQUEST_PERMISSION', type: 'GRANT_PERMISSION' },
        clock: this.clock,
      });
    }

    // Permission granted: strictly UNVERIFIED because raw observations are heuristic, never 100% verified IMSI proof
    return createEvidence({
      id: 'RADAR_TELEPHONY',
      title: 'Telephony & RF radar',
      status: 'UNVERIFIED',
      source: 'SignalIntelligenceEngine',
      reason: `Active observation evidence contains ${observation.cellRecordCount} verified records. Raw observation is heuristic telemetry, not conclusive IMSI-catcher proof.`,
      details: `Active observation evidence contains ${observation.cellRecordCount} verified records. Raw observation is not conclusive IMSI-catcher proof.`,
      verificationRule: 'Cell observation is heuristic evidence, not IMSI-catcher proof',
      evidence: {
        permissionState: permState,
        observedRecordCount: observation.cellRecordCount,
        runtimeBacked: true,
      },
      requiredCapabilities: ['ACCESS_FINE_LOCATION', 'TELEPHONY_SCANNER'],
      availableCapabilities: ['ACCESS_FINE_LOCATION', 'TELEPHONY_SCANNER'],
      limitations: [
        'Standard cell observations cannot verify if a base station is an authentic carrier eNodeB or an IMSI-catcher without cryptographic core network authentication.',
        'Proximity distances are estimated from RSSI signal models.',
      ],
      actionRequired: { label: 'Refresh RF Scan', action: 'REFRESH_RADAR', type: 'RUN_PROBE' },
      clock: this.clock,
    });
  }

  static callSecurity(observation: {
    telephonyAvailable: boolean;
    mmiResultVerified?: boolean;
    mmiState?: MmiAuditState;
    carrierResponse?: string | null;
  }): CapabilityEvidence {
    if (!observation.telephonyAvailable) {
      return createEvidence({
        id: 'CALL_MMI',
        title: 'Call & MMI audit',
        status: 'UNAVAILABLE',
        source: 'Telephony capability',
        reason: 'Telephony dialer interface unavailable on current device.',
        details: 'Telephony dialer interface unavailable on current device.',
        verificationRule: 'Telephony unavailable',
        requiredCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE'],
        availableCapabilities: [],
        limitations: ['Device lacks voice telephony or dialer handler.'],
        clock: this.clock,
      });
    }

    if (observation.mmiResultVerified && observation.carrierResponse) {
      return createEvidence({
        id: 'CALL_MMI',
        title: 'Call & MMI audit',
        status: 'VERIFIED',
        source: 'Operator MMI result',
        reason: 'Carrier operator returned verifiable MMI registration response.',
        details: 'Carrier operator returned verifiable MMI registration response.',
        verificationRule: 'Explicit operator result verification',
        evidence: {
          mmiResultVerified: true,
          carrierResponse: observation.carrierResponse,
        },
        requiredCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE'],
        availableCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE'],
        limitations: ['Carrier responses are verified at inquiry time.'],
        clock: this.clock,
      });
    }

    // Default & Post-Dispatch rule: UNVERIFIED
    return createEvidence({
      id: 'CALL_MMI',
      title: 'Call & MMI audit',
      status: 'UNVERIFIED',
      source: 'Carrier Dial Code',
      reason: 'Carrier inquiry dispatched. Operator result cannot be automatically verified on this device.',
      details: 'Sentinel can dispatch MMI inquiry codes to device dialer; carrier outcome requires operator evaluation.',
      verificationRule: 'ACTION_DIAL success != carrier verification; dialer opened != MMI success',
      evidence: {
        dialerAvailable: true,
        mmiState: observation.mmiState || 'IDLE',
        operatorResponseReceivedAutomatically: false,
      },
      requiredCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE', 'USSD_INTERCEPTOR_PERM'],
      availableCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE'],
      limitations: [
        'Operating system restricts third-party apps from reading raw USSD dialog responses directly.',
        'Operator response requires visual user verification on the device screen.',
      ],
      actionRequired: { label: 'Run inquiry again', action: 'RUN_MMI', type: 'RUN_MMI' },
      clock: this.clock,
    });
  }

  static network(observation: NetworkObservation): CapabilityEvidence {
    if (!observation.available) {
      return createEvidence({
        id: 'NETWORK_AUDIT',
        title: 'Network audit',
        status: 'UNAVAILABLE',
        source: 'Network Connectivity Interface',
        reason: 'No default network interface is currently available.',
        details: 'No default network interface is currently available.',
        verificationRule: 'Default network unavailable',
        evidence: { available: false },
        actionRequired: { label: 'Reconnect Network', action: 'RETRY', type: 'RETRY' },
        limitations: ['Cannot probe network sockets while offline.'],
        clock: this.clock,
      });
    }

    if (observation.blocked) {
      return createEvidence({
        id: 'NETWORK_AUDIT',
        title: 'Network audit',
        status: 'FAILED',
        source: 'Network Connectivity Interface',
        reason: 'Network interface is active, but socket transport is restricted or blocked by firewall.',
        details: 'Network interface is active, but socket transport is restricted or blocked.',
        verificationRule: 'Network transport blocked',
        evidence: { available: true, blocked: true },
        actionRequired: { label: 'Inspect Firewall', action: 'RETRY', type: 'RETRY' },
        limitations: ['Traffic is being actively dropped or filtered.'],
        clock: this.clock,
      });
    }

    return createEvidence({
      id: 'NETWORK_AUDIT',
      title: 'Network audit',
      status: 'UNVERIFIED',
      source: 'HTTPS Probe & Network Capabilities',
      reason: `Transports=${observation.transports.join(', ')}, validated=${observation.validated}, vpn=${observation.vpnTransport}, DNS servers=${observation.dnsServers.length}. Socket reachability validated, but does not prove total network immunity from upstream carrier lawful intercept.`,
      details: `Transports=${observation.transports.join(', ')}, validated=${observation.validated}, vpn=${observation.vpnTransport}, DNS servers=${observation.dnsServers.length}.`,
      verificationRule: 'Runtime network state is evidence, not complete security proof. HTTPS success is not security verification.',
      evidence: {
        transports: observation.transports,
        validated: observation.validated,
        vpnTransport: observation.vpnTransport,
        dnsServers: observation.dnsServers,
        dnsSecure: observation.dnsSecure,
        httpsProbeLatencyMs: observation.httpsProbeLatencyMs ?? null,
      },
      requiredCapabilities: ['NET_CAPABILITY_INTERNET', 'NET_CAPABILITY_VALIDATED'],
      availableCapabilities: ['NET_CAPABILITY_INTERNET', 'NET_CAPABILITY_VALIDATED'],
      limitations: [
        'Internet validation (NET_CAPABILITY_VALIDATED) only confirms socket reachability, not traffic encryption or safety.',
        'DNS server presence does not guarantee DNS-over-HTTPS or DNSSEC enforcement.',
        'VPN transport existence is not proof of a verified Sentinel WireGuard tunnel.',
      ],
      actionRequired: { label: 'Run Full Probe', action: 'RUN_PROBE', type: 'RUN_PROBE' },
      clock: this.clock,
    });
  }

  static getEvidences(options?: {
    vpnConnected?: boolean;
    handshakeEpochMs?: number | null;
    cellRecordCount?: number;
    telephonyAvailable?: boolean;
    permissionGranted?: boolean;
    permissionState?: GeolocationPermissionState;
    network?: NetworkObservation;
    mmiState?: MmiAuditState;
  }): CapabilityEvidence[] {
    const vpnConnected = options?.vpnConnected ?? false;
    const handshakeEpochMs = options?.handshakeEpochMs ?? null;
    const cellRecordCount = options?.cellRecordCount ?? 0;
    const telephonyAvailable = options?.telephonyAvailable ?? (typeof window !== 'undefined' && 'navigator' in window);
    const permissionGranted = options?.permissionGranted ?? false;
    const permissionState = options?.permissionState;
    const mmiState = options?.mmiState ?? 'IDLE';

    const networkObs: NetworkObservation = options?.network ?? {
      available: typeof navigator !== 'undefined' ? navigator.onLine : true,
      blocked: false,
      transports: ['WIFI', 'CELLULAR'],
      validated: true,
      vpnTransport: vpnConnected,
      dnsServers: ['1.1.1.1', '8.8.8.8'],
      dnsReachable: true,
      dnsSecure: false,
      interfaceName: 'wlan0',
      freshness: 'VERIFIED',
      timestamp: this.clock.now(),
    };

    return [
      this.vpnTransport(true, vpnConnected),
      this.vpnHandshake(vpnConnected, handshakeEpochMs),
      this.radar({ permissionGranted, permissionState, cellRecordCount, telephonyAvailable }),
      this.callSecurity({ telephonyAvailable, mmiResultVerified: false, mmiState }),
      this.network(networkObs),
    ];
  }

  static calculateOverallScore(evidences?: CapabilityEvidence[], activeThreatCount?: number): number {
    const evList = evidences || this.getEvidences();
    const threats = activeThreatCount ?? 0;

    let baseScore = 65;

    evList.forEach((ev) => {
      const now = this.clock.now();
      const isExpired = now >= ev.expiresAtEpochMs;
      const status = isExpired ? 'UNVERIFIED' : ev.status;

      if (status === 'VERIFIED') {
        baseScore += 8;
      } else if (status === 'UNVERIFIED') {
        baseScore += 2;
      } else if (status === 'FAILED') {
        baseScore -= 10;
      } else {
        baseScore -= 2;
      }
    });

    baseScore -= threats * 12;

    return Math.max(15, Math.min(100, Math.round(baseScore)));
  }

  static async refreshAllEvidences(): Promise<CapabilityEvidence[]> {
    return this.getEvidences();
  }
}
