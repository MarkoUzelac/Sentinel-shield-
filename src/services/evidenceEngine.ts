import { CapabilityEvidence, CapabilityId, CapabilityStatus, NetworkObservation } from '../types';

const DEFAULT_EVIDENCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createEvidence(
  id: CapabilityId,
  title: string,
  status: CapabilityStatus,
  source: string,
  details: string,
  verificationRule: string
): CapabilityEvidence {
  const now = Date.now();
  return {
    id,
    title,
    status,
    source,
    details,
    lastCheckedEpochMs: now,
    provenance: {
      source,
      collectedAtEpochMs: now,
      runtimeBacked: true,
      verificationRule,
    },
    expiresAtEpochMs: now + DEFAULT_EVIDENCE_TTL_MS,
  };
}

export const CapabilityEvidenceEngine = {
  vpnTransport(provisioned: boolean, connected: boolean): CapabilityEvidence {
    if (connected) {
      return createEvidence(
        'VPN_TRANSPORT',
        'WireGuard transport',
        'VERIFIED',
        'WireGuardTunnelController',
        'Tunel je povezan kroz stvarni WireGuard backend.',
        'CONNECTED requires transport lifecycle verification'
      );
    }
    if (provisioned) {
      return createEvidence(
        'VPN_TRANSPORT',
        'WireGuard transport',
        'UNVERIFIED',
        'WireGuardProfileStore',
        'Profil postoji, ali transport nije verificirano povezan.',
        'Profile existence is not connection proof'
      );
    }
    return createEvidence(
      'VPN_TRANSPORT',
      'WireGuard transport',
      'UNAVAILABLE',
      'WireGuardProfileStore',
      'Nije učitan stvarni WireGuard profil.',
      'No provisioned profile'
    );
  },

  vpnHandshake(connected: boolean, handshakeVerified: boolean, handshakeEpochMs?: number | null): CapabilityEvidence {
    if (handshakeVerified) {
      return createEvidence(
        'VPN_HANDSHAKE',
        'Handshake verification',
        'VERIFIED',
        'WireGuard peer statistics',
        `Peer handshake je potvrđen svježim runtime podatkom${handshakeEpochMs ? ` (${new Date(handshakeEpochMs).toLocaleTimeString()})` : ''}.`,
        'Fresh post-start peer handshake'
      );
    }
    if (connected) {
      return createEvidence(
        'VPN_HANDSHAKE',
        'Handshake verification',
        'UNVERIFIED',
        'WireGuard peer statistics',
        'Tunel je aktivan, ali nema potvrđenog svježeg handshake dokaza.',
        'Connected without current handshake evidence'
      );
    }
    return createEvidence(
      'VPN_HANDSHAKE',
      'Handshake verification',
      'UNAVAILABLE',
      'WireGuard peer statistics',
      'Handshake se može verificirati tek nakon aktivnog tunela.',
      'Tunnel is inactive'
    );
  },

  radar(observation: { permissionGranted: boolean; cellRecordCount: number; telephonyAvailable: boolean }): CapabilityEvidence {
    if (!observation.telephonyAvailable) {
      return createEvidence(
        'RADAR_TELEPHONY',
        'Telephony & RF radar',
        'UNAVAILABLE',
        'Web Telephony / RF Interface',
        'Uređaj nema izravno izloženo cellular sučelje.',
        'Telephony feature unavailable'
      );
    }
    if (!observation.permissionGranted) {
      return createEvidence(
        'RADAR_TELEPHONY',
        'Telephony & RF radar',
        'UNAVAILABLE',
        'Geolocation / Sensor Permission',
        'Dozvola za lokaciju i senzore nije dodijeljena.',
        'Required permission missing'
      );
    }
    return createEvidence(
      'RADAR_TELEPHONY',
      'Telephony & RF radar',
      'UNVERIFIED',
      'SignalIntelligenceEngine',
      `Dostupna je stvarna ćelijska evidencija (${observation.cellRecordCount} zapisa), ali ona sama ne dokazuje IMSI catcher.`,
      'Cell observation is not IMSI-catcher proof'
    );
  },

  callSecurity(observation: { telephonyAvailable: boolean; mmiResultVerified: boolean }): CapabilityEvidence {
    if (!observation.telephonyAvailable) {
      return createEvidence(
        'CALL_MMI',
        'Call & MMI audit',
        'UNAVAILABLE',
        'Telephony capability',
        'Telephony funkcionalnost nije dostupna.',
        'Telephony unavailable'
      );
    }
    if (observation.mmiResultVerified) {
      return createEvidence(
        'CALL_MMI',
        'Call & MMI audit',
        'VERIFIED',
        'Operator MMI result',
        'Operator je vratio provjerljiv MMI rezultat.',
        'Explicit operator result verification'
      );
    }
    return createEvidence(
      'CALL_MMI',
      'Call & MMI audit',
      'UNVERIFIED',
      'Carrier Dial Code',
      'Sentinel može otvoriti operatorski MMI kod, ali rezultat nije sam verificirao.',
      'Dial intent is not result verification'
    );
  },

  network(observation: NetworkObservation): CapabilityEvidence {
    if (!observation.available) {
      return createEvidence(
        'NETWORK_AUDIT',
        'Network audit',
        'UNAVAILABLE',
        'Network Connectivity Interface',
        'Nema dostupne zadane mreže.',
        'Default network unavailable'
      );
    }
    if (observation.blocked) {
      return createEvidence(
        'NETWORK_AUDIT',
        'Network audit',
        'UNVERIFIED',
        'Network Connectivity Interface',
        'Mreža je dostupna, ali pristup je blokiran.',
        'Network is blocked'
      );
    }
    return createEvidence(
      'NETWORK_AUDIT',
      'Network audit',
      'UNVERIFIED',
      'HTTPS Probe & Network Capabilities',
      `Transporti=${observation.transports.join(', ')}, validated=${observation.validated}, vpn=${observation.vpnTransport}, DNS=${observation.dnsServers.length}, interface=${observation.interfaceName || 'n/a'}.`,
      'Runtime network state is evidence, not complete security proof'
    );
  },

  localSetting(id: CapabilityId, title: string, enabled: boolean, source: string, detailsWhenEnabled: string): CapabilityEvidence {
    return createEvidence(
      id,
      title,
      enabled ? 'UNVERIFIED' : 'UNAVAILABLE',
      source,
      enabled ? detailsWhenEnabled : 'Lokalna zaštitna opcija je isključena.',
      'Local setting does not prove protection effectiveness'
    );
  },

  async refreshAllEvidences(): Promise<void> {
    // In a real device, this would ping actual system APIs. 
    // Here we simulate an async check delay.
    return new Promise((resolve) => setTimeout(resolve, 500));
  },

  getEvidences(): CapabilityEvidence[] {
    return [
      this.vpnTransport(false, false),
      this.vpnHandshake(false, false),
      this.radar({ permissionGranted: false, cellRecordCount: 0, telephonyAvailable: true }),
      this.callSecurity({ telephonyAvailable: true, mmiResultVerified: false }),
      this.network({ available: true, blocked: false, transports: ['WIFI'], validated: true, vpnTransport: false, dnsServers: ['1.1.1.1', '8.8.8.8'], interfaceName: 'wlan0' }),
    ];
  },

  calculateOverallScore(evidences?: CapabilityEvidence[], activeThreatCount?: number): number {
    const evList = evidences || this.getEvidences();
    const threats = activeThreatCount ?? 0;
    
    let baseScore = 65;

    evList.forEach((ev) => {
      const now = Date.now();
      const status = now >= ev.expiresAtEpochMs ? 'UNVERIFIED' : ev.status;

      if (status === 'VERIFIED') {
        baseScore += 8;
      } else if (status === 'UNVERIFIED') {
        baseScore += 2;
      } else {
        baseScore -= 2;
      }
    });

    baseScore -= threats * 12;

    return Math.max(15, Math.min(100, Math.round(baseScore)));
  },
};
