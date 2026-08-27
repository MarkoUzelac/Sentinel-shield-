package com.example.data

import com.example.data.model.EvidenceState
import com.example.data.model.ObservationKind
import com.example.data.model.ObservationSource
import com.example.data.model.SignalObservation
import com.example.data.model.ThreatRisk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SignalIntelligenceEngineTest {
    @Test
    fun correlatedNetworkAndVpnDegradationProducesSuspiciousFinding() {
        val engine = SignalIntelligenceEngine(now = { 10_000L })
        val snapshot = engine.analyze(
            listOf(
                SignalObservation(
                    id = "network",
                    source = ObservationSource.NETWORK,
                    kind = ObservationKind.NETWORK_STATE,
                    observedAtEpochMs = 9_500L,
                    details = "network changed"
                ),
                SignalObservation(
                    id = "vpn",
                    source = ObservationSource.VPN,
                    kind = ObservationKind.VPN_STATE,
                    observedAtEpochMs = 9_700L,
                    evidenceState = EvidenceState.UNVERIFIED,
                    details = "handshake stale"
                )
            )
        )

        assertEquals(ThreatRisk.SUSPICIOUS, snapshot.risk)
        assertEquals(50, snapshot.score)
        assertTrue(snapshot.findings.any { it.id == "network_vpn_degradation" })
    }

    @Test
    fun rapidCellTransitionIsDetectedInsideCorrelationWindow() {
        val engine = SignalIntelligenceEngine(now = { 20_000L })
        val snapshot = engine.analyze(
            listOf(
                cell("a", 1_000L, 111L),
                cell("b", 7_000L, 222L)
            )
        )

        assertTrue(snapshot.findings.any { it.id == "rapid_cell_transition" })
        assertEquals(20, snapshot.score)
    }

    @Test
    fun staleObservationOutsideCorrelationWindowIsIgnored() {
        val engine = SignalIntelligenceEngine(now = { 100_000L }, correlationWindowMs = 30_000L)
        val snapshot = engine.analyze(
            listOf(
                cell("old", 10_000L, 10L),
                cell("old2", 11_000L, 20L)
            )
        )

        assertEquals(ThreatRisk.NORMAL, snapshot.risk)
        assertEquals(0, snapshot.score)
        assertTrue(snapshot.findings.isEmpty())
    }

    @Test
    fun cellLocationMismatchIsHeuristicAndUnverified() {
        val engine = SignalIntelligenceEngine(now = { 30_000L })
        val snapshot = engine.analyze(
            listOf(
                SignalObservation(
                    id = "gps",
                    source = ObservationSource.GPS,
                    kind = ObservationKind.DEVICE_LOCATION,
                    observedAtEpochMs = 29_000L,
                    latitude = 45.815,
                    longitude = 15.982,
                    accuracyMeters = 10.0
                ),
                SignalObservation(
                    id = "tower",
                    source = ObservationSource.OPENCELLID,
                    kind = ObservationKind.CELL_LOCATION,
                    observedAtEpochMs = 29_500L,
                    latitude = 46.05,
                    longitude = 14.5,
                    accuracyMeters = 500.0
                )
            )
        )

        val finding = snapshot.findings.first { it.id == "cell_location_mismatch" }
        assertEquals(ThreatRisk.WATCH, finding.risk)
        assertEquals(EvidenceState.UNVERIFIED, finding.evidenceState)
    }

    private fun cell(id: String, time: Long, cellId: Long) = SignalObservation(
        id = id,
        source = ObservationSource.CELLULAR,
        kind = ObservationKind.CELL,
        observedAtEpochMs = time,
        cellId = cellId,
        details = "LTE"
    )
}
