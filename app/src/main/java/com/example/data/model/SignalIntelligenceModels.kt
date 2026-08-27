package com.example.data.model

enum class ObservationSource { GPS, CELLULAR, OPENCELLID, BLE, NETWORK, VPN }

enum class ObservationKind { DEVICE_LOCATION, CELL, CELL_LOCATION, BLE_SIGNAL, NETWORK_STATE, VPN_STATE }

enum class ThreatRisk { NORMAL, WATCH, SUSPICIOUS, HIGH }

enum class EvidenceState { VERIFIED, UNVERIFIED, UNAVAILABLE }

data class SignalObservation(
    val id: String,
    val source: ObservationSource,
    val kind: ObservationKind,
    val observedAtEpochMs: Long,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracyMeters: Double? = null,
    val rssiDbm: Int? = null,
    val technology: String? = null,
    val cellId: Long? = null,
    val areaCode: Int? = null,
    val mcc: Int? = null,
    val mnc: Int? = null,
    val distanceMeters: Double? = null,
    val evidenceState: EvidenceState = EvidenceState.UNVERIFIED,
    val details: String? = null
)

data class ThreatFinding(
    val id: String,
    val risk: ThreatRisk,
    val score: Int,
    val title: String,
    val explanation: String,
    val observationIds: List<String>,
    val evidenceState: EvidenceState = EvidenceState.UNVERIFIED,
    val generatedAtEpochMs: Long
)

data class ThreatSnapshot(
    val generatedAtEpochMs: Long = 0L,
    val score: Int = 0,
    val risk: ThreatRisk = ThreatRisk.NORMAL,
    val findings: List<ThreatFinding> = emptyList(),
    val observations: List<SignalObservation> = emptyList()
)
