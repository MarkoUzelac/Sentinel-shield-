package com.example.data.model

/** Evidence state used by every security module and the Shield dashboard. */
enum class CapabilityStatus { VERIFIED, UNVERIFIED, UNAVAILABLE }

enum class CapabilityId {
    VPN_TRANSPORT, VPN_HANDSHAKE, RADAR_TELEPHONY, CALL_MMI,
    PHISHING_PROTECTION, AD_TELEMETRY_FILTER, REALTIME_SHIELD,
    AI_THREAT_ANALYSIS, DARK_WEB_LOOKUP, NETWORK_AUDIT, LEGAL_GUIDANCE
}

/** Provenance attached to every observation so UI cannot confuse source availability with verification. */
data class EvidenceProvenance(
    val source: String,
    val collectedAtEpochMs: Long = System.currentTimeMillis(),
    val runtimeBacked: Boolean,
    val verificationRule: String
)

data class CapabilityEvidence(
    val id: CapabilityId,
    val title: String,
    val status: CapabilityStatus,
    val source: String,
    val details: String,
    val lastCheckedEpochMs: Long = System.currentTimeMillis(),
    val provenance: EvidenceProvenance? = null
)

data class RadarObservation(val permissionGranted: Boolean, val cellRecordCount: Int, val telephonyAvailable: Boolean)
data class CallSecurityObservation(val telephonyAvailable: Boolean, val mmiResultVerified: Boolean = false)

object CapabilityEvidenceEngine {
    private fun evidence(id: CapabilityId, title: String, status: CapabilityStatus, source: String, details: String, runtimeBacked: Boolean, rule: String): CapabilityEvidence {
        val now = System.currentTimeMillis()
        return CapabilityEvidence(id, title, status, source, details, now, EvidenceProvenance(source, now, runtimeBacked, rule))
    }

    fun vpnTransport(provisioned: Boolean, connected: Boolean) = when {
        connected -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.VERIFIED, "WireGuardTunnelController", "Tunel je povezan kroz stvarni WireGuard backend.", true, "CONNECTED state is reachable only after transport lifecycle verification")
        provisioned -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.UNVERIFIED, "WireGuardProfileStore", "Profil postoji, ali transport nije verificirano povezan.", true, "Profile existence is not connection proof")
        else -> evidence(CapabilityId.VPN_TRANSPORT, "WireGuard transport", CapabilityStatus.UNAVAILABLE, "WireGuardProfileStore", "Nije učitan stvarni WireGuard profil.", true, "No provisioned profile")
    }

    fun vpnHandshake(connected: Boolean, handshakeVerified: Boolean, handshakeEpochMs: Long? = null) = when {
        handshakeVerified && handshakeEpochMs != null -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.VERIFIED, "WireGuard peer statistics", "Peer handshake je potvrđen svježim runtime podatkom.", true, "Fresh post-start peer handshake")
        connected -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.UNVERIFIED, "WireGuard peer statistics", "Tunel je aktivan, ali nema potvrđenog svježeg handshake dokaza.", true, "Connected without current handshake evidence")
        else -> evidence(CapabilityId.VPN_HANDSHAKE, "Handshake verification", CapabilityStatus.UNAVAILABLE, "WireGuard peer statistics", "Handshake se može verificirati tek nakon aktivnog tunela.", true, "Tunnel is inactive")
    }

    fun radar(o: RadarObservation) = when {
        !o.telephonyAvailable -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNAVAILABLE, "Android TelephonyManager", "Uređaj nema dostupnu telephony funkcionalnost.", true, "Telephony feature unavailable")
        !o.permissionGranted -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNAVAILABLE, "Android permission", "ACCESS_FINE_LOCATION nije dodijeljen.", true, "Required permission missing")
        else -> evidence(CapabilityId.RADAR_TELEPHONY, "Telephony radar", CapabilityStatus.UNVERIFIED, "TelephonyManager.allCellInfo", "Dostupna je stvarna ćelijska evidencija (${o.cellRecordCount} zapisa), ali ona sama ne dokazuje IMSI catcher.", true, "Cell observation is not IMSI-catcher proof")
    }

    fun callSecurity(o: CallSecurityObservation) = when {
        !o.telephonyAvailable -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.UNAVAILABLE, "Android telephony capability", "Telephony funkcionalnost nije dostupna.", true, "Telephony unavailable")
        o.mmiResultVerified -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.VERIFIED, "Operator MMI result", "Operator je vratio provjerljiv MMI rezultat.", true, "Explicit operator result verification")
        else -> evidence(CapabilityId.CALL_MMI, "Call & MMI audit", CapabilityStatus.UNVERIFIED, "Android ACTION_DIAL", "Sentinel može otvoriti operatorski MMI kod, ali rezultat nije sam verificirao.", true, "Dial intent is not result verification")
    }

    fun localSetting(id: CapabilityId, title: String, enabled: Boolean, source: String, detailsWhenEnabled: String) = evidence(id, title, if (enabled) CapabilityStatus.UNVERIFIED else CapabilityStatus.UNAVAILABLE, source, if (enabled) detailsWhenEnabled else "Lokalna zaštitna opcija je isključena.", true, "Local setting does not prove protection effectiveness")
}
