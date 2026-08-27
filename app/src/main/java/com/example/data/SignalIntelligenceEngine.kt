package com.example.data

import com.example.data.model.EvidenceState
import com.example.data.model.ObservationKind
import com.example.data.model.ObservationSource
import com.example.data.model.SignalObservation
import com.example.data.model.ThreatFinding
import com.example.data.model.ThreatRisk
import com.example.data.model.ThreatSnapshot
import kotlin.math.abs
import kotlin.math.max

/** Correlates real runtime observations without turning heuristics into facts. */
class SignalIntelligenceEngine(
    private val now: () -> Long = { System.currentTimeMillis() },
    private val correlationWindowMs: Long = 30_000L
) {
    fun analyze(observations: List<SignalObservation>): ThreatSnapshot {
        val currentTime = now()
        val recent = observations
            .filter { currentTime - it.observedAtEpochMs in 0..correlationWindowMs }
            .sortedByDescending { it.observedAtEpochMs }

        val findings = buildList {
            detectCellLocationMismatch(recent)?.let(::add)
            detectNetworkVpnDegradation(recent)?.let(::add)
            detectRapidCellTransition(recent)?.let(::add)
            detectNearbySignalPersistence(recent)?.let(::add)
        }

        val score = findings.maxOfOrNull { it.score } ?: 0
        val risk = when {
            score >= 75 -> ThreatRisk.HIGH
            score >= 50 -> ThreatRisk.SUSPICIOUS
            score >= 25 -> ThreatRisk.WATCH
            else -> ThreatRisk.NORMAL
        }
        return ThreatSnapshot(
            generatedAtEpochMs = currentTime,
            score = score,
            risk = risk,
            findings = findings,
            observations = recent
        )
    }

    private fun detectCellLocationMismatch(observations: List<SignalObservation>): ThreatFinding? {
        val device = observations.firstOrNull { it.source == ObservationSource.GPS && it.kind == ObservationKind.DEVICE_LOCATION }
        val tower = observations.firstOrNull { it.source == ObservationSource.OPENCELLID && it.kind == ObservationKind.CELL_LOCATION }
        if (device?.latitude == null || device.longitude == null || tower?.latitude == null || tower.longitude == null) return null
        val meters = approxDistanceMeters(device.latitude, device.longitude, tower.latitude, tower.longitude)
        val providerRange = tower.accuracyMeters ?: return null
        if (providerRange <= 0.0 || meters <= providerRange * 2.0) return null
        return finding(
            id = "cell_location_mismatch",
            score = 35,
            risk = ThreatRisk.WATCH,
            title = "Lokacijska nepodudarnost ćelije",
            explanation = "Udaljenost između uređaja i providerom locirane ćelije prelazi očekivani raspon; rezultat je heuristički i nije dokaz prijetnje.",
            observations = listOfNotNull(device, tower)
        )
    }

    private fun detectNetworkVpnDegradation(observations: List<SignalObservation>): ThreatFinding? {
        val network = observations.firstOrNull { it.source == ObservationSource.NETWORK && it.kind == ObservationKind.NETWORK_STATE }
        val vpn = observations.firstOrNull { it.source == ObservationSource.VPN && it.kind == ObservationKind.VPN_STATE }
        if (network == null || vpn == null) return null
        val vpnDetails = vpn.details.orEmpty()
        val degraded = vpnDetails.contains("stale", true) || vpnDetails.contains("unverified", true) || vpnDetails.contains("down", true)
        if (!degraded) return null
        return finding(
            id = "network_vpn_degradation",
            score = 50,
            risk = ThreatRisk.SUSPICIOUS,
            title = "Degradacija mrežne zaštite",
            explanation = "Mrežno stanje je promijenjeno dok dokaz WireGuard zaštite nije svjež ili potvrđen.",
            observations = listOf(network, vpn)
        )
    }

    private fun detectRapidCellTransition(observations: List<SignalObservation>): ThreatFinding? {
        val cells = observations.filter { it.kind == ObservationKind.CELL && it.cellId != null }.sortedBy { it.observedAtEpochMs }
        if (cells.size < 2) return null
        val last = cells[cells.lastIndex]
        val previous = cells[cells.lastIndex - 1]
        if (last.cellId == previous.cellId) return null
        if (last.observedAtEpochMs - previous.observedAtEpochMs > 10_000L) return null
        return finding(
            id = "rapid_cell_transition",
            score = 20,
            risk = ThreatRisk.WATCH,
            title = "Brza promjena ćelije",
            explanation = "Serving/observed ćelija promijenila se u kratkom vremenskom prozoru; sama promjena nije dokaz napada.",
            observations = listOf(previous, last)
        )
    }

    private fun detectNearbySignalPersistence(observations: List<SignalObservation>): ThreatFinding? {
        val ble = observations.filter { it.source == ObservationSource.BLE && it.kind == ObservationKind.BLE_SIGNAL }
        val persistent = ble.groupBy { it.id }.entries.firstOrNull { (_, values) ->
            values.size >= 3 && values.mapNotNull { it.rssiDbm }.let { rs -> rs.isNotEmpty() && rs.maxOrNull()!! > -60 }
        } ?: return null
        return finding(
            id = "persistent_nearby_signal_${persistent.key}",
            score = 15,
            risk = ThreatRisk.WATCH,
            title = "Trajni BLE signal u blizini",
            explanation = "BLE signal je opažen više puta u kratkom prozoru. To je radio opažanje, ne identifikacija osobe ili uređaja.",
            observations = persistent.value
        )
    }

    private fun finding(
        id: String,
        score: Int,
        risk: ThreatRisk,
        title: String,
        explanation: String,
        observations: List<SignalObservation>
    ) = ThreatFinding(
        id = id,
        risk = risk,
        score = score,
        title = title,
        explanation = explanation,
        observationIds = observations.map { it.id },
        evidenceState = EvidenceState.UNVERIFIED,
        generatedAtEpochMs = now()
    )

    private fun approxDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val latScale = 111_320.0
        val lonScale = 111_320.0 * kotlin.math.cos(Math.toRadians((lat1 + lat2) / 2.0))
        val dx = (lat2 - lat1) * latScale
        val dy = (lon2 - lon1) * lonScale
        return kotlin.math.sqrt(dx * dx + dy * dy)
    }
}
