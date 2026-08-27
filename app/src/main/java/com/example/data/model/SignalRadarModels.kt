package com.example.data.model

enum class SignalKind { BLE, CELLULAR, WIFI_NETWORK, VPN_NETWORK }
enum class SignalRisk { INFO, LOW, MEDIUM, HIGH, CRITICAL }

data class SignalRadarItem(
    val id: String,
    val kind: SignalKind,
    val label: String,
    val technology: String,
    val rssiDbm: Int? = null,
    val estimatedDistanceMeters: Double? = null,
    val cellId: Long? = null,
    val areaCode: Int? = null,
    val signalLevel: Int? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val bearingDegrees: Double? = null,
    val locationSource: String? = null,
    val locationAccuracyMeters: Double? = null,
    val mcc: Int? = null,
    val mnc: Int? = null,
    val risk: SignalRisk = SignalRisk.INFO,
    val explanation: String,
    val observedAtEpochMs: Long = System.currentTimeMillis(),
    val runtimeBacked: Boolean = true
)

data class SignalRadarSnapshot(
    val scanning: Boolean = false,
    val signals: List<SignalRadarItem> = emptyList(),
    val bleCount: Int = 0,
    val cellularCount: Int = 0,
    val networkCount: Int = 0,
    val anomalyCount: Int = 0,
    val startedAtEpochMs: Long = 0L,
    val lastUpdatedEpochMs: Long = 0L,
    val error: String? = null
) {
    val totalCount: Int get() = signals.size
}
