package com.example.data.model

private const val DEFAULT_EVIDENCE_TTL_MS = 5 * 60 * 1000L

enum class CapabilityStatus { VERIFIED, UNVERIFIED, UNAVAILABLE }
enum class CapabilityId { VPN_TRANSPORT, VPN_HANDSHAKE, RADAR_TELEPHONY, CALL_MMI, PHISHING_PROTECTION, AD_TELEMETRY_FILTER, REALTIME_SHIELD, AI_THREAT_ANALYSIS, DARK_WEB_LOOKUP, NETWORK_AUDIT, LEGAL_GUIDANCE }

data class EvidenceProvenance(
    val source: String,
    val collectedAtEpochMs: Long,
    val runtimeBacked: Boolean,
    val verificationRule: String
)

data class CapabilityEvidence(
    val id: CapabilityId,
    val title: String,
    val status: CapabilityStatus,
    val source: String,
    val details: String,
    val lastCheckedEpochMs: Long = EvidenceClock.SYSTEM.nowEpochMillis(),
    val provenance: EvidenceProvenance? = null,
    val expiresAtEpochMs: Long = lastCheckedEpochMs + DEFAULT_EVIDENCE_TTL_MS
) {
    fun effectiveStatus(nowEpochMs: Long): CapabilityStatus = when {
        status == CapabilityStatus.UNAVAILABLE -> CapabilityStatus.UNAVAILABLE
        nowEpochMs >= expiresAtEpochMs -> CapabilityStatus.UNVERIFIED
        else -> status
    }
}

data class RadarObservation(val permissionGranted: Boolean, val cellRecordCount: Int, val telephonyAvailable: Boolean)
data class CallSecurityObservation(val telephonyAvailable: Boolean, val mmiResultVerified: Boolean = false)
data class NetworkObservation(
    val available: Boolean = false,
    val transports: Set<String> = emptySet(),
    val validated: Boolean = false,
    val vpnTransport: Boolean = false,
    val dnsServers: List<String> = emptyList(),
    val interfaceName: String? = null,
    val blocked: Boolean = false
)

object CapabilityEvidenceEngine {
    private fun evidence(
        id: CapabilityId,
        title: String,
        status: CapabilityStatus,
        source: String,
        details: String,
        rule: String,
        clock: EvidenceClock = EvidenceClock.SYSTEM
    ): CapabilityEvidence {
        val now = clock.nowEpochMillis()
        return CapabilityEvidence(
            id = id,
            title = title,
            status = status,
            source = source,
            details = details,
            lastCheckedEpochMs = now,
            provenance = EvidenceProvenance(source, now, true, rule),
            expiresAtEpochMs = now + DEFAULT_EVIDENCE_TTL_MS
        )
    }

    fun vpnTransport(provisioned: Boolean, connected: Boolean, clock: EvidenceClock = EvidenceClock.SYSTEM) = when {
        connected -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.VERIFIED, "WireGuardTunnelController", "Tunel je povezan kroz stvarni WireGuard backend.", "CONNECTED requires transport lifecycle verification", clock)
        provisioned -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.UNVERIFIED, "WireGuardProfileStore", "Profil postoji, ali transport nije verificirano povezan.", "Profile existence is not connection proof", clock)
        else -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.UNAVAILABLE, "WireGuardProfileStore", "Nije učitan stvarni WireGuard profil.", "No provisioned profile", clock)
    }

    fun vpnHandshake(connected: Boolean, handshakeVerified: Boolean, handshakeEpochMs: Long? = null, clock: EvidenceClock = EvidenceClock.SYSTEM) = when {
        handshakeVerified -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.VERIFIED, "WireGuard peer statistics", "Peer handshake je potvrđen svježim runtime podatkom${handshakeEpochMs?.let { " (epochMs=$it)" } ?: ""}.", "Fresh post-start peer handshake", clock)
        connected -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.UNVERIFIED, "WireGuard peer statistics", "Tunel je aktivan, ali nema potvrđenog svježeg handshake dokaza.", "Connected without current handshake evidence", clock)
        else -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.UNAVAILABLE, "WireGuard peer statistics", "Handshake se može verificirati tek nakon aktivnog tunela.", "Tunnel is inactive", clock)
    }

    fun radar(o: RadarObservation, clock: EvidenceClock = EvidenceClock.SYSTEM) = when {
        !o.telephonyAvailable -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNAVAILABLE, "Android TelephonyManager", "Uređaj nema dostupnu telephony funkcionalnost.", "Telephony feature unavailable", clock)
        !o.permissionGranted -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNAVAILABLE, "Android permission", "ACCESS_FINE_LOCATION nije dodijeljen.", "Required permission missing", clock)
        else -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNVERIFIED, "TelephonyManager.allCellInfo", "Dostupna je stvarna ćelijska evidencija (${o.cellRecordCount} zapisa), ali ona sama ne dokazuje IMSI catcher.", "Cell observation is not IMSI-catcher proof", clock)
    }

    fun callSecurity(o: CallSecurityObservation, clock: EvidenceClock = EvidenceClock.SYSTEM) = when {
        !o.telephonyAvailable -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.UNAVAILABLE, "Android telephony capability", "Telephony funkcionalnost nije dostupna.", "Telephony unavailable", clock)
        o.mmiResultVerified -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.VERIFIED, "Operator MMI result", "Operator je vratio provjerljiv MMI rezultat.", "Explicit operator result verification", clock)
        else -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.UNVERIFIED, "Android ACTION_DIAL", "Sentinel može otvoriti operatorski MMI kod, ali rezultat nije sam verificirao.", "Dial intent is not result verification", clock)
    }

    fun network(o: NetworkObservation, clock: EvidenceClock = EvidenceClock.SYSTEM) = when {
        !o.available -> evidence(CapabilityId.NETWORK_AUDIT, "Network audit", CapabilityStatus.UNAVAILABLE, "Android ConnectivityManager.NetworkCallback", "Nema dostupne zadane mreže.", "Default network unavailable", clock)
        o.blocked -> evidence(CapabilityId.NETWORK_AUDIT, "Network audit", CapabilityStatus.UNVERIFIED, "Android ConnectivityManager.NetworkCallback", "Mreža je dostupna, ali pristup je blokiran.", "Network is blocked", clock)
        else -> evidence(CapabilityId.NETWORK_AUDIT, "Network audit", CapabilityStatus.UNVERIFIED, "NetworkCapabilities + LinkProperties", "Transporti=${o.transports.joinToString()}, validated=${o.validated}, vpn=${o.vpnTransport}, DNS=${o.dnsServers.size}, interface=${o.interfaceName ?: "n/a"}.", "Runtime network state is evidence, not complete security proof", clock)
    }

    fun localSetting(id: CapabilityId, title: String, enabled: Boolean, source: String, detailsWhenEnabled: String, clock: EvidenceClock = EvidenceClock.SYSTEM) = evidence(id, title, if (enabled) CapabilityStatus.UNVERIFIED else CapabilityStatus.UNAVAILABLE, source, if (enabled) detailsWhenEnabled else "Lokalna zaštitna opcija je isključena.", "Local setting does not prove protection effectiveness", clock)
}
