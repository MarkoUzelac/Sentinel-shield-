package com.example.data.model

/**
 * Evidence state used by every security module and the Shield dashboard.
 * VERIFIED is reserved for a capability backed by a concrete device/runtime signal.
 */
enum class CapabilityStatus {
    VERIFIED,
    UNVERIFIED,
    UNAVAILABLE
}

enum class CapabilityId {
    VPN_TRANSPORT,
    VPN_HANDSHAKE,
    RADAR_TELEPHONY,
    CALL_MMI,
    PHISHING_PROTECTION,
    AD_TELEMETRY_FILTER,
    REALTIME_SHIELD,
    AI_THREAT_ANALYSIS,
    DARK_WEB_LOOKUP,
    NETWORK_AUDIT,
    LEGAL_GUIDANCE
}

data class CapabilityEvidence(
    val id: CapabilityId,
    val title: String,
    val status: CapabilityStatus,
    val source: String,
    val details: String,
    val lastCheckedEpochMs: Long = System.currentTimeMillis()
)

data class RadarObservation(
    val permissionGranted: Boolean,
    val cellRecordCount: Int,
    val telephonyAvailable: Boolean
)

data class CallSecurityObservation(
    val telephonyAvailable: Boolean,
    val mmiResultVerified: Boolean = false
)

object CapabilityEvidenceEngine {
    fun vpnTransport(provisioned: Boolean, connected: Boolean): CapabilityEvidence =
        when {
            connected -> CapabilityEvidence(
                CapabilityId.VPN_TRANSPORT,
                "WireGuard transport",
                CapabilityStatus.VERIFIED,
                "WireGuardTunnelController",
                "Tunel je prijavljen kao povezan kroz stvarni WireGuard backend."
            )
            provisioned -> CapabilityEvidence(
                CapabilityId.VPN_TRANSPORT,
                "WireGuard transport",
                CapabilityStatus.UNVERIFIED,
                "WireGuardProfileStore",
                "Profil postoji, ali transport trenutačno nije verificirano povezan."
            )
            else -> CapabilityEvidence(
                CapabilityId.VPN_TRANSPORT,
                "WireGuard transport",
                CapabilityStatus.UNAVAILABLE,
                "WireGuardProfileStore",
                "Nije učitan stvarni WireGuard profil."
            )
        }

    fun vpnHandshake(connected: Boolean, handshakeVerified: Boolean): CapabilityEvidence =
        if (handshakeVerified) {
            CapabilityEvidence(
                CapabilityId.VPN_HANDSHAKE,
                "Handshake verification",
                CapabilityStatus.VERIFIED,
                "WireGuard peer statistics",
                "Peer handshake je potvrđen svježim runtime podatkom."
            )
        } else if (connected) {
            CapabilityEvidence(
                CapabilityId.VPN_HANDSHAKE,
                "Handshake verification",
                CapabilityStatus.UNVERIFIED,
                "WireGuard peer statistics",
                "Tunel je aktivan, ali nema potvrđenog svježeg handshake dokaza."
            )
        } else {
            CapabilityEvidence(
                CapabilityId.VPN_HANDSHAKE,
                "Handshake verification",
                CapabilityStatus.UNAVAILABLE,
                "WireGuard peer statistics",
                "Handshake se može verificirati tek nakon aktivnog WireGuard tunela."
            )
        }

    fun radar(observation: RadarObservation): CapabilityEvidence = when {
        !observation.telephonyAvailable -> CapabilityEvidence(
            CapabilityId.RADAR_TELEPHONY,
            "Telephony radar",
            CapabilityStatus.UNAVAILABLE,
            "Android TelephonyManager",
            "Uređaj ne prijavljuje dostupnu telephony funkcionalnost."
        )
        !observation.permissionGranted -> CapabilityEvidence(
            CapabilityId.RADAR_TELEPHONY,
            "Telephony radar",
            CapabilityStatus.UNAVAILABLE,
            "Android permission",
            "ACCESS_FINE_LOCATION nije dodijeljen; nema sigurnog pristupa ćelijskoj evidenciji."
        )
        else -> CapabilityEvidence(
            CapabilityId.RADAR_TELEPHONY,
            "Telephony radar",
            CapabilityStatus.UNVERIFIED,
            "TelephonyManager.allCellInfo",
            "Dostupna je stvarna ćelijska evidencija (${observation.cellRecordCount} zapisa), ali sama po sebi ne dokazuje IMSI catcher."
        )
    }

    fun callSecurity(observation: CallSecurityObservation): CapabilityEvidence = when {
        !observation.telephonyAvailable -> CapabilityEvidence(
            CapabilityId.CALL_MMI,
            "Call & MMI audit",
            CapabilityStatus.UNAVAILABLE,
            "Android telephony capability",
            "Uređaj ne prijavljuje telephony funkcionalnost potrebnu za MMI provjeru."
        )
        observation.mmiResultVerified -> CapabilityEvidence(
            CapabilityId.CALL_MMI,
            "Call & MMI audit",
            CapabilityStatus.VERIFIED,
            "Operator MMI result",
            "Operator je vratio provjerljiv MMI rezultat."
        )
        else -> CapabilityEvidence(
            CapabilityId.CALL_MMI,
            "Call & MMI audit",
            CapabilityStatus.UNVERIFIED,
            "Android ACTION_DIAL",
            "Sentinel može otvoriti operatorski MMI kod, ali ne može sam tvrditi da je rezultat verificiran."
        )
    }

    fun localSetting(
        id: CapabilityId,
        title: String,
        enabled: Boolean,
        source: String,
        detailsWhenEnabled: String
    ): CapabilityEvidence = CapabilityEvidence(
        id = id,
        title = title,
        status = if (enabled) CapabilityStatus.UNVERIFIED else CapabilityStatus.UNAVAILABLE,
        source = source,
        details = if (enabled) detailsWhenEnabled else "Lokalna zaštitna opcija je isključena."
    )
}
