package com.example.security

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult as BleScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow

/** Real Android provider ingestion. No synthetic telemetry is generated. */
class AndroidSignalIngestor(
  private val context: Context,
  private val clock: EvidenceClock = SystemEvidenceClock,
) {
  private val locationManager = context.getSystemService(LocationManager::class.java)
  private val telephonyManager = context.getSystemService(android.telephony.TelephonyManager::class.java)
  private val connectivityManager = context.getSystemService(ConnectivityManager::class.java)
  private val wifiManager = context.applicationContext.getSystemService(WifiManager::class.java)
  private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()

  fun collectSnapshot(): Flow<ThreatSnapshot> = flow {
    val observations = buildList {
      add(gps())
      addAll(cellular())
      addAll(wifi())
      add(network())
      add(vpn())
    }
    emit(ThreatSnapshot(clock.nowEpochMs(), observations = observations))
  }

  fun collectBle(): Flow<SecurityObservation> = callbackFlow {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || bluetoothAdapter == null) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "bluetooth=unsupported"))
      close()
      return@callbackFlow
    }

    val permissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    if (!permissionGranted || !bluetoothAdapter.isEnabled) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "permission_or_adapter=unavailable"))
      close()
      return@callbackFlow
    }

    val scanner: BluetoothLeScanner? = bluetoothAdapter.bluetoothLeScanner
    if (scanner == null) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "scanner=unavailable"))
      close()
      return@callbackFlow
    }

    val callback = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: BleScanResult) {
        trySend(result.toObservation(clock.nowEpochMs()))
      }

      override fun onBatchScanResults(results: MutableList<BleScanResult>) {
        results.forEach { trySend(it.toObservation(clock.nowEpochMs())) }
      }

      override fun onScanFailed(errorCode: Int) {
        trySend(unavailable("ble-scan-failed", ObservationKind.BLE, "error_code=$errorCode"))
        close()
      }
    }

    runCatching { scanner.startScan(callback) }
      .onFailure {
        trySend(unavailable("ble-scan-failed", ObservationKind.BLE, "start_scan_failed=true"))
        close(it)
      }
    awaitClose { runCatching { scanner.stopScan(callback) } }
  }

  @SuppressLint("MissingPermission")
  private fun gps(): SecurityObservation {
    val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!granted) return unavailable("gps-unavailable", ObservationKind.GPS, "permission=denied")

    val providers = locationManager?.getProviders(true).orEmpty()
    val location = providers.asSequence()
      .mapNotNull { provider -> runCatching { locationManager?.getLastKnownLocation(provider) }.getOrNull() }
      .maxByOrNull(Location::getTime)
      ?: return unavailable("gps-unavailable", ObservationKind.GPS, "location=unavailable")

    return SecurityObservation(
      id = "gps-${location.time}",
      kind = ObservationKind.GPS,
      observedAtEpochMs = location.time,
      source = EvidenceSource.LOCAL_ANDROID,
      payload = buildMap {
        put("latitude", location.latitude.toString())
        put("longitude", location.longitude.toString())
        put("accuracy_m", location.accuracy.toString())
        put("provider", location.provider.orEmpty())
        if (location.hasAltitude()) put("altitude_m", location.altitude.toString())
        if (location.hasSpeed()) put("speed_mps", location.speed.toString())
        if (location.hasBearing()) put("bearing_deg", location.bearing.toString())
      },
    )
  }

  @SuppressLint("MissingPermission")
  private fun cellular(): List<SecurityObservation> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "location_permission=denied"))
    }

    val cells = runCatching { telephonyManager?.allCellInfo.orEmpty() }.getOrDefault(emptyList())
    if (cells.isEmpty()) return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "cell_info=unavailable"))

    return cells.mapIndexed { index, cell ->
      SecurityObservation(
        id = "cell-${cell.hashCode()}-$index",
        kind = ObservationKind.CELLULAR,
        observedAtEpochMs = clock.nowEpochMs(),
        source = EvidenceSource.LOCAL_ANDROID,
        payload = buildMap {
          put("registered", cell.isRegistered.toString())
          put("identity_class", cell.cellIdentity.javaClass.simpleName)
          put("signal_class", cell.cellSignalStrength.javaClass.simpleName)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) put("timestamp_ns", cell.timestampMillis.toString())
        },
      )
    }
  }

  @SuppressLint("MissingPermission")
  private fun wifi(): List<SecurityObservation> {
    if (wifiManager == null || !wifiManager.isWifiEnabled) {
      return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "wifi=disabled_or_unavailable"))
    }
    val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!granted) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "location_permission=denied"))

    val results: List<ScanResult> = runCatching { wifiManager.scanResults.orEmpty() }.getOrDefault(emptyList())
    if (results.isEmpty()) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "scan_results=unavailable"))

    return results.mapIndexed { index, scan ->
      SecurityObservation(
        id = "wifi-${scan.BSSID}-$index",
        kind = ObservationKind.WIFI,
        observedAtEpochMs = clock.nowEpochMs(),
        source = EvidenceSource.LOCAL_ANDROID,
        payload = mapOf(
          "ssid" to scan.SSID.ifBlank { "Hidden SSID" },
          "bssid" to scan.BSSID,
          "frequency_mhz" to scan.frequency.toString(),
          "rssi_dbm" to scan.level.toString(),
          "capabilities" to scan.capabilities,
          "timestamp_us" to scan.timestamp.toString(),
        ),
      )
    }
  }

  private fun network(): SecurityObservation {
    val network = connectivityManager.activeNetwork
      ?: return unavailable("network-unavailable", ObservationKind.NETWORK, "active_network=unavailable")
    val caps = connectivityManager.getNetworkCapabilities(network)
      ?: return unavailable("network-unavailable", ObservationKind.NETWORK, "capabilities=unavailable")
    return SecurityObservation(
      id = "network-${clock.nowEpochMs()}",
      kind = ObservationKind.NETWORK,
      observedAtEpochMs = clock.nowEpochMs(),
      source = EvidenceSource.LOCAL_ANDROID,
      payload = mapOf(
        "transport" to transport(caps),
        "validated" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED).toString(),
        "internet" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).toString(),
        "metered" to (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)).toString(),
      ),
    )
  }

  private fun vpn(): SecurityObservation {
    val network = connectivityManager.activeNetwork
      ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "active_network=unavailable")
    val caps = connectivityManager.getNetworkCapabilities(network)
      ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "capabilities=unavailable")
    return SecurityObservation(
      id = "vpn-${clock.nowEpochMs()}",
      kind = ObservationKind.VPN,
      observedAtEpochMs = clock.nowEpochMs(),
      source = EvidenceSource.LOCAL_ANDROID,
      payload = mapOf("active_transport" to caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN).toString()),
    )
  }

  private fun transport(caps: NetworkCapabilities): String = when {
    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
    caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "VPN"
    else -> "OTHER"
  }

  private fun unavailable(id: String, kind: ObservationKind, reason: String) =
    SecurityObservation(
      id = id,
      kind = kind,
      observedAtEpochMs = clock.nowEpochMs(),
      source = EvidenceSource.UNAVAILABLE,
      payload = mapOf("reason" to reason),
    )

  @SuppressLint("MissingPermission")
  private fun BleScanResult.toObservation(now: Long): SecurityObservation = SecurityObservation(
    id = "ble-${device.address}-$now",
    kind = ObservationKind.BLE,
    observedAtEpochMs = now,
    source = EvidenceSource.LOCAL_ANDROID,
    payload = buildMap {
      put("address", device.address)
      put("name", device.name.orEmpty())
      put("rssi_dbm", rssi.toString())
      put("data_status", "advertisement_observed")
      put("service_uuid_count", scanRecord?.serviceUuids?.size?.toString() ?: "0")
      put("manufacturer_data_count", scanRecord?.manufacturerSpecificData?.size()?.toString() ?: "0")
    },
  )
}
