package com.example.data

import android.content.Context
import com.example.data.model.SignalObservation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.Instant

class SignalIntelligenceCoordinator(context: Context) {
  private val ble = BleScanner(context)
  private val wifi = WifiScanner(context)
  private val cellular = CellularScanner(context)
  private val _observations = MutableStateFlow<List<SignalObservation>>(emptyList())
  val observations: StateFlow<List<SignalObservation>> = _observations.asStateFlow()

  fun snapshot(): ThreatSnapshot = ThreatSnapshot.from(_observations.value, Instant.now())

  fun record(observation: SignalObservation) {
    _observations.value = (_observations.value + observation).takeLast(1000)
  }

  fun hasBleCapability(): Boolean = ble.start { result ->
    record(SignalObservation(
      source = com.example.data.model.SignalSource.BLE,
      id = runCatching { result.device.address }.getOrNull(),
      name = runCatching { result.device.name }.getOrNull(),
      manufacturer = null,
      rssiDbm = result.rssi,
      latitude = null,
      longitude = null,
      accuracyMeters = null,
      timestamp = Instant.now(),
      status = com.example.data.model.EvidenceStatus.VERIFIED,
      provenance = "Android BluetoothLeScanner"
    ))
  }

  fun wifiScan() = wifi.scan()
  fun cellularCells() = cellular.cells()
}
