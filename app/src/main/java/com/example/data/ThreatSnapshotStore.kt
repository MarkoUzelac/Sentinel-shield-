package com.example.data

import com.example.data.model.DeviceLocationState
import com.example.data.model.EvidenceState
import com.example.data.model.NetworkObservation
import com.example.data.model.ObservationKind
import com.example.data.model.ObservationSource
import com.example.data.model.SignalKind
import com.example.data.model.SignalObservation
import com.example.data.model.SignalRadarSnapshot
import com.example.data.model.ThreatSnapshot
import com.example.vpn.WireGuardTunnelState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Shared, UI-facing threat snapshot. Screens consume the same correlation result. */
object ThreatSnapshotStore {
    private val _snapshot = MutableStateFlow(ThreatSnapshot())
    val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()

    fun publish(snapshot: ThreatSnapshot) {
        _snapshot.value = snapshot
    }
}

fun MainViewModel.publishSignalIntelligence(
    location: DeviceLocationState,
    radar: SignalRadarSnapshot,
    nowEpochMs: Long = System.currentTimeMillis()
): ThreatSnapshot {
    val observations = buildList {
        if (location.hasFix) {
            add(
                SignalObservation(
                    id = "gps-device",
                    source = ObservationSource.GPS,
                    kind = ObservationKind.DEVICE_LOCATION,
                    observedAtEpochMs = location.timestampMillis.takeIf { it > 0 } ?: nowEpochMs,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracyMeters = location.accuracyMeters,
                    evidenceState = if (location.isFresh) EvidenceState.VERIFIED else EvidenceState.UNVERIFIED,
                    details = location.provider
                )
            )
        }

        radar.signals.forEach { signal ->
            val source = when (signal.kind) {
                SignalKind.BLE -> ObservationSource.BLE
                SignalKind.CELLULAR -> ObservationSource.CELLULAR
                SignalKind.WIFI_NETWORK, SignalKind.VPN_NETWORK -> ObservationSource.NETWORK
            }
            val kind = when (signal.kind) {
                SignalKind.BLE -> ObservationKind.BLE_SIGNAL
                SignalKind.CELLULAR -> ObservationKind.CELL
                SignalKind.WIFI_NETWORK, SignalKind.VPN_NETWORK -> ObservationKind.NETWORK_STATE
            }
            add(
                SignalObservation(
                    id = signal.id,
                    source = source,
                    kind = kind,
                    observedAtEpochMs = signal.observedAtEpochMs,
                    latitude = signal.latitude,
                    longitude = signal.longitude,
                    accuracyMeters = signal.locationAccuracyMeters,
                    rssiDbm = signal.rssiDbm,
                    technology = signal.technology,
                    cellId = signal.cellId,
                    areaCode = signal.areaCode,
                    mcc = signal.mcc,
                    mnc = signal.mnc,
                    distanceMeters = signal.estimatedDistanceMeters,
                    evidenceState = if (signal.locationSource != null) EvidenceState.VERIFIED else EvidenceState.UNVERIFIED,
                    details = buildString {
                        append(signal.explanation)
                        signal.locationSource?.let { append(" | locationSource=$it") }
                    }
                )
            )

            if (signal.kind == SignalKind.CELLULAR && signal.locationSource != null && signal.latitude != null && signal.longitude != null) {
                add(
                    SignalObservation(
                        id = "${signal.id}:location",
                        source = ObservationSource.OPENCELLID,
                        kind = ObservationKind.CELL_LOCATION,
                        observedAtEpochMs = signal.observedAtEpochMs,
                        latitude = signal.latitude,
                        longitude = signal.longitude,
                        accuracyMeters = signal.locationAccuracyMeters,
                        cellId = signal.cellId,
                        areaCode = signal.areaCode,
                        mcc = signal.mcc,
                        mnc = signal.mnc,
                        evidenceState = EvidenceState.VERIFIED,
                        details = "Provider=${signal.locationSource}"
                    )
                )
            }
        }

        val network = networkObservation.value
        add(
            SignalObservation(
                id = "network-state",
                source = ObservationSource.NETWORK,
                kind = ObservationKind.NETWORK_STATE,
                observedAtEpochMs = nowEpochMs,
                evidenceState = if (network.available) EvidenceState.VERIFIED else EvidenceState.UNAVAILABLE,
                details = "available=${network.available};validated=${network.validated};vpn=${network.vpnTransport};blocked=${network.blocked};transports=${network.transports.joinToString(",")};dns=${network.dnsServers.joinToString(",")}"
            )
        )

        val vpnObservation = when (val state = vpnState.value) {
            is WireGuardTunnelState.Connected -> {
                SignalObservation(
                    id = "vpn-state",
                    source = ObservationSource.VPN,
                    kind = ObservationKind.VPN_STATE,
                    observedAtEpochMs = nowEpochMs,
                    evidenceState = EvidenceState.VERIFIED,
                    details = "connected;handshake=${state.latestHandshakeEpochSeconds}"
                )
            }
            WireGuardTunnelState.Disconnected -> SignalObservation("vpn-state", ObservationSource.VPN, ObservationKind.VPN_STATE, nowEpochMs, evidenceState = EvidenceState.UNAVAILABLE, details = "down")
            WireGuardTunnelState.AwaitingUserConsent -> SignalObservation("vpn-state", ObservationSource.VPN, ObservationKind.VPN_STATE, nowEpochMs, details = "unverified;awaiting_consent")
            WireGuardTunnelState.Starting -> SignalObservation("vpn-state", ObservationSource.VPN, ObservationKind.VPN_STATE, nowEpochMs, details = "unverified;starting")
            is WireGuardTunnelState.Verifying -> SignalObservation("vpn-state", ObservationSource.VPN, ObservationKind.VPN_STATE, nowEpochMs, details = "unverified;verifying")
            is WireGuardTunnelState.Error -> SignalObservation("vpn-state", ObservationSource.VPN, ObservationKind.VPN_STATE, nowEpochMs, evidenceState = EvidenceState.UNVERIFIED, details = "unverified;error=${state.message}")
        }
        add(vpnObservation)
    }

    val snapshot = SignalIntelligenceEngine(now = { nowEpochMs }).analyze(observations)
    ThreatSnapshotStore.publish(snapshot)
    return snapshot
}
