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
    val isFresh: Boolean
        get() = hasFix && timestampMillis > 0L && System.currentTimeMillis() - timestampMillis <= 15_000L

    val coordinateLabel: String
        get() = if (latitude != null && longitude != null) {
            "%.6f, %.6f".format(java.util.Locale.US, latitude, longitude)
        } else "UNAVAILABLE"
}
