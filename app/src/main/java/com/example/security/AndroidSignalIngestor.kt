package com.example.security

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import android.telephony.CellInfo
import android.telephony.TelephonyManager
import android.location.Location
import android.location.LocationManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult as BleScanResult
import androidx.core.content.ContextCompat
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow

/**
 * Real Android signal ingestion. Missing permissions/capabilities produce UNAVAILABLE
 * observations; no synthetic values are generated.
 */
class AndroidSignalIngestor(
  private val context: Context,
  private val clock: EvidenceClock = SystemEvidenceClock,
) {
  private val locationManager = context.getSystemService(LocationManager::class.java)
  private val telephonyManager = context.getSystemService(TelephonyManager::class.java)
  private val connectivityManager = context.getSystemService(ConnectivityManager::class.java)
  private val wifiManager = context.applicationContext.getSystemService(WifiManager::class.java)
  private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()

  fun collectSnapshot(): Flow<ThreatSnapshot> = flow {
    val now = clock.nowEpochMs()
    val observations = buildList {
      addAll(gps(now))
      addAll(cellular(now))
      addAll(wifi(now))
      // BLE requires an asynchronous scanner lifecycle; collectBle() is exposed separately.
      addAll(connectivity(now))
      add(vpnObservation(now))
    }
    emit(ThreatSnapshot(generatedAtEpochMs = now, observations = observations))
  }

  fun collectBle(): Flow<SecurityObservation> = callbackFlow {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || bluetoothAdapter == null) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "bluetooth=unsupported"))
      close()
      awaitClose { }
      return@callbackFlow
    }

    val hasScanPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    if (!hasScanPermission || !bluetoothAdapter.isEnabled) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "permission_or_adapter=unavailable"))
      close()
      awaitClose { }
      return@callbackFlow
    }

    val scanner: BluetoothLeScanner = bluetoothAdapter.bluetoothLeScanner
    if (scanner == null) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "scanner=unavailable"))
      close()
      awaitClose { }
      return@callbackFlow
    }

    val callback = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: BleScanResult) {
        trySend(result.toObservation(clock.nowEpochMs()))
      }

      override fun onScanFailed(errorCode: Int) {
        trySend(unavailable("ble-scan-failed", ObservationKind.BLE, "error_code=$errorCode"))
        close()
      }
    }
    scanner.startScan(callback)
    awaitClose { scanner.stopScan(callback) }
  }

  @SuppressLint("MissingPermission")
  private fun gps(now: Long): List<SecurityObservation> {
    val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!granted) return listOf(unavailable("gps-unavailable", ObservationKind.GPS, "permission=denied"))

    val providers = locationManager?.getProviders(true).orEmpty()
    val location = providers.asSequence().mapNotNull { provider ->
      runCatching { locationManager?.getLastKnownLocation(provider) }.getOrNull()
    }.maxByOrNull(Location::getTime)
      ?: return listOf(unavailable("gps-unavailable", ObservationKind.GPS, "location=unavailable"))

    return listOf(
      SecurityObservation(
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
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && location.hasBearing()) put("bearing_deg", location.bearing.toString())
        },
      ),
    )
  }

  @SuppressLint("MissingPermission")
  private fun cellular(now: Long): List<SecurityObservation> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "location_permission=denied"))
    }
    val cells: List<CellInfo> = runCatching { telephonyManager?.allCellInfo.orEmpty() }.getOrDefault(emptyList())
    if (cells.isEmpty()) return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "cell_info=unavailable"))
    return cells.mapIndexed { index, cell ->
      SecurityObservation(
        id = "cell-$now-$index",
        kind = ObservationKind.CELLULAR,
        observedAtEpochMs = now,
        source = EvidenceSource.LOCAL_ANDROID,
        payload = mapOf(
          "registered" to cell.isRegistered.toString(),
          "identity_class" to cell.cellIdentity.javaClass.simpleName,
          "signal_class" to cell.cellSignalStrength.javaClass.simpleName,
        ),
      )
    }
  }

  @SuppressLint("MissingPermission")
  private fun wifi(now: Long): List<SecurityObservation> {
    if (!wifiManager.isWifiEnabled) {
      return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "wifi=disabled"))
    }
    val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!granted) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "location_permission=denied"))

    val results: List<ScanResult> = runCatching { wifiManager.scanResults.orEmpty() }.getOrDefault(emptyList())
    if (results.isEmpty()) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "scan_results=unavailable"))
    return results.mapIndexed { index, scan ->
      SecurityObservation(
        id = "wifi-$now-$index",
        kind = ObservationKind.WIFI,
        observedAtEpochMs = now,
        source = EvidenceSource.LOCAL_ANDROID,
        payload = buildMap {
          put("ssid", scan.SSID.ifBlank { "Hidden SSID" })
          put("bssid", scan.BSSID)
          put("frequency_mhz", scan.frequency.toString())
          put("rssi_dbm", scan.level.toString())
          put("capabilities", scan.capabilities)
          put("timestamp_us", scan.timestamp.toString())
        },
      )
    }
  }

  private fun connectivity(now: Long): List<SecurityObservation> {
    val network = connectivityManager.activeNetwork
      ?: return listOf(unavailable("network-unavailable", ObservationKind.NETWORK, "active_network=unavailable"))
    val caps = connectivityManager.getNetworkCapabilities(network)
      ?: return listOf(unavailable("network-unavailable", ObservationKind.NETWORK, "capabilities=unavailable"))
    val transport = when {
      caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "VPN"
      else -> "OTHER"
    }
    return listOf(
      SecurityObservation(
        id = "network-$now",
        kind = ObservationKind.NETWORK,
        observedAtEpochMs = now,
        source = EvidenceSource.LOCAL_ANDROID,
        payload = mapOf(
          "transport" to transport,
          "validated" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED).toString(),
          "internet" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).toString(),
        ),
      ),
    )
  }

  private fun vpnObservation(now: Long): SecurityObservation {
    val network = connectivityManager.activeNetwork ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "active_network=unavailable")
    val caps = connectivityManager.getNetworkCapabilities(network) ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "capabilities=unavailable")
    val active = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
    return SecurityObservation(
      id = "vpn-$now",
      kind = ObservationKind.VPN,
      observedAtEpochMs = now,
      source = EvidenceSource.LOCAL_ANDROID,
      payload = mapOf("active_transport" to active.toString()),
    )
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
      put("manufacturer_data_bytes", scanRecord?.manufacturerSpecificData?.let { data -> data.size().toString() } ?: "0")
    },
  )
}

fun Flow<SecurityObservation>.toThreatSnapshots(
  clock: EvidenceClock = SystemEvidenceClock,
): Flow<ThreatSnapshot> = flow {
  collect { observation ->
    emit(ThreatSnapshot(generatedAtEpochMs = clock.nowEpochMs(), observations = listOf(observation)))
  }
}
