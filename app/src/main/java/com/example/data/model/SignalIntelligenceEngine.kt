package com.example.data.model

import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Pure, deterministic correlation layer for passive radio/network observations.
 * It produces a heuristic anomaly score; it never claims IMSI-catcher detection as fact.
 */
class SignalIntelligenceEngine(
    private val clock: EvidenceClock = EvidenceClock.SYSTEM,
    private val staleAfterMs: Long = 20_000L
) {
    data class ObservationHistory(
        val firstSeenEpochMs: Long,
        val lastSeenEpochMs: Long,
        val observationCount: Int,
        val minRssiDbm: Int?,
        val maxRssiDbm: Int?,
        val previousRssiDbm: Int?
    )

    data class Assessment(
        val anomalyScore: Int,
        val risk: SignalRisk,
        val persistenceSeconds: Long,
        val rssiTrendDbm: Int?,
        val locationConsistency: LocationConsistency
    )

    enum class LocationConsistency { NOT_APPLICABLE, CONSISTENT, INCONSISTENT, UNKNOWN }

    fun assess(
        item: SignalRadarItem,
        history: ObservationHistory?,
        deviceLatitude: Double?,
        deviceLongitude: Double?
    ): Assessment {
        val now = clock.nowEpochMillis()
        val persistence = history?.let { ((now - it.firstSeenEpochMs).coerceAtLeast(0L)) / 1000L } ?: 0L
        val trend = if (history?.previousRssiDbm != null && item.rssiDbm != null) {
            item.rssiDbm - history.previousRssiDbm
        } else null

        var score = when (item.kind) {
            SignalKind.BLE -> bleScore(item)
            SignalKind.CELLULAR -> cellularScore(item)
            SignalKind.WIFI_NETWORK -> 10
            SignalKind.VPN_NETWORK -> 0
        }

        if (persistence >= 15) score += 5
        if (persistence >= 60) score += 5
        if (trend != null && abs(trend) >= 12) score += 5

        val consistency = locationConsistency(item, deviceLatitude, deviceLongitude)
        if (consistency == LocationConsistency.INCONSISTENT) score += 20

        if (history != null && now - history.lastSeenEpochMs > staleAfterMs) score = 0

        val normalized = score.coerceIn(0, 100)
        return Assessment(
            anomalyScore = normalized,
            risk = riskForScore(normalized),
            persistenceSeconds = persistence,
            rssiTrendDbm = trend,
            locationConsistency = consistency
        )
    }

    private fun bleScore(item: SignalRadarItem): Int {
        var score = when {
            item.rssiDbm == null -> 0
            item.rssiDbm >= -45 -> 12
            item.rssiDbm >= -65 -> 7
            else -> 2
        }
        val text = "${item.label} ${item.technology}".lowercase()
        if ("tracker" in text || "tag" in text || "beacon" in text) score += 15
        return score
    }

    private fun cellularScore(item: SignalRadarItem): Int {
        var score = if (item.rssiDbm != null && item.rssiDbm >= -75) 8 else 2
        if (item.locationSource == "OpenCellID") score += 0
        if (item.locationSource.isNullOrBlank()) score += 2
        return score
    }

    private fun riskForScore(score: Int): SignalRisk = when {
        score >= 75 -> SignalRisk.CRITICAL
        score >= 50 -> SignalRisk.HIGH
        score >= 25 -> SignalRisk.MEDIUM
        score >= 10 -> SignalRisk.LOW
        else -> SignalRisk.INFO
    }

    private fun locationConsistency(
        item: SignalRadarItem,
        deviceLatitude: Double?,
        deviceLongitude: Double?
    ): LocationConsistency {
        if (item.kind != SignalKind.CELLULAR || item.latitude == null || item.longitude == null) {
            return LocationConsistency.NOT_APPLICABLE
        }
        if (deviceLatitude == null || deviceLongitude == null) return LocationConsistency.UNKNOWN

        // Coarse sanity check only; it is not a physical propagation model.
        val latDelta = abs(item.latitude - deviceLatitude)
        val lonDelta = abs(item.longitude - deviceLongitude)
        val rangeKm = item.locationAccuracyMeters?.div(1000.0)
        if (rangeKm == null) return LocationConsistency.UNKNOWN
        val coarseKm = ((latDelta + lonDelta) * 111.0)
        return if (coarseKm <= rangeKm.coerceAtLeast(1.0) * 2.5) {
            LocationConsistency.CONSISTENT
        } else {
            LocationConsistency.INCONSISTENT
        }
    }
}
