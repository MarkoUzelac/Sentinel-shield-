package com.example

import com.example.data.model.EvidenceClock
import com.example.data.model.SignalIntelligenceEngine
import com.example.data.model.SignalKind
import com.example.data.model.SignalRadarItem
import com.example.data.model.SignalRisk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SignalIntelligenceEngineTest {
    @Test
    fun `persistent BLE signal accumulates deterministic history`() {
        var now = 1_000L
        val engine = SignalIntelligenceEngine(EvidenceClock { now })
        val item = SignalRadarItem(
            id = "ble_test",
            kind = SignalKind.BLE,
            label = "BLE-test",
            technology = "Bluetooth LE",
            rssiDbm = -44,
            explanation = "test"
        )
        val history = SignalIntelligenceEngine.ObservationHistory(
            firstSeenEpochMs = 1_000L,
            lastSeenEpochMs = 1_000L,
            observationCount = 4,
            minRssiDbm = -60,
            maxRssiDbm = -44,
            previousRssiDbm = -60
        )

        now = 21_000L
        val assessment = engine.assess(item, history, null, null)

        assertEquals(20L, assessment.persistenceSeconds)
        assertEquals(16, assessment.rssiTrendDbm)
        assertTrue(assessment.anomalyScore >= 20)
        assertTrue(assessment.risk == SignalRisk.LOW || assessment.risk == SignalRisk.MEDIUM)
    }

    @Test
    fun `tower location inconsistency is surfaced as anomaly not proof of attack`() {
        val engine = SignalIntelligenceEngine(EvidenceClock { 10_000L })
        val item = SignalRadarItem(
            id = "cell_test",
            kind = SignalKind.CELLULAR,
            label = "Nearby cell",
            technology = "4G LTE",
            rssiDbm = -65,
            latitude = 50.0,
            longitude = 20.0,
            locationSource = "OpenCellID",
            locationAccuracyMeters = 500.0,
            explanation = "test"
        )
        val assessment = engine.assess(item, null, 45.0, 15.0)

        assertEquals(SignalIntelligenceEngine.LocationConsistency.INCONSISTENT, assessment.locationConsistency)
        assertTrue(assessment.anomalyScore >= 20)
        assertTrue(assessment.risk != SignalRisk.CRITICAL)
    }
}
