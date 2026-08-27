package com.example.data.model

/** Live hardware-derived location of this device. */
data class DeviceLocationState(
    val hasFix: Boolean = false,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracyMeters: Float? = null,
    val altitudeMeters: Double? = null,
    val speedKmh: Float? = null,
    val bearingDegrees: Float? = null,
    val satelliteCount: Int = 0,
    val provider: String = "UNAVAILABLE",
    val timestampMillis: Long = 0L,
    val errorMessage: String? = null
) {
    /** Clock-injectable freshness check used by the evidence pipeline and deterministic tests. */
    fun isFreshAt(nowEpochMillis: Long, freshnessWindowMillis: Long = 15_000L): Boolean =
        hasFix && timestampMillis > 0L &&
            nowEpochMillis >= timestampMillis &&
            nowEpochMillis - timestampMillis <= freshnessWindowMillis

    /** Convenience property for UI-only callers that do not own an EvidenceClock. */
    val isFresh: Boolean
        get() = isFreshAt(System.currentTimeMillis())

    val coordinateLabel: String
        get() = if (latitude != null && longitude != null) {
            "%.6f, %.6f".format(java.util.Locale.US, latitude, longitude)
        } else "UNAVAILABLE"
}
