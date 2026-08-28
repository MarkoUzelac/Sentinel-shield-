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
import android.telephony.*
import androidx.core.content.ContextCompat
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow

class AndroidSignalIngestor(private val context: Context, private val clock: EvidenceClock = SystemEvidenceClock) {
  private val locationManager = context.getSystemService(LocationManager::class.java)
  private val telephonyManager = context.getSystemService(TelephonyManager::class.java)
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
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "bluetooth=unsupported")); close(); return@callbackFlow
    }
    val permission = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    if (!permission || !bluetoothAdapter.isEnabled) {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "permission_or_adapter=unavailable")); close(); return@callbackFlow
    }
    val scanner: BluetoothLeScanner = bluetoothAdapter.bluetoothLeScanner ?: run {
      trySend(unavailable("ble-unavailable", ObservationKind.BLE, "scanner=unavailable")); close(); return@callbackFlow
    }
    val callback = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: BleScanResult) { trySend(result.toObservation(clock.nowEpochMs())) }
      override fun onBatchScanResults(results: MutableList<BleScanResult>) { results.forEach { trySend(it.toObservation(clock.nowEpochMs())) } }
      override fun onScanFailed(errorCode: Int) { trySend(unavailable("ble-scan-failed", ObservationKind.BLE, "error_code=$errorCode")); close() }
    }
    runCatching { scanner.startScan(callback) }.onFailure { trySend(unavailable("ble-scan-failed", ObservationKind.BLE, "start_scan_failed=true")); close(it) }
    awaitClose { runCatching { scanner.stopScan(callback) } }
  }

  @SuppressLint("MissingPermission") private fun gps(): SecurityObservation {
    val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    if (!granted) return unavailable("gps-unavailable", ObservationKind.GPS, "permission=denied")
    val location = locationManager?.getProviders(true).orEmpty().asSequence().mapNotNull { p -> runCatching { locationManager?.getLastKnownLocation(p) }.getOrNull() }.maxByOrNull(Location::getTime)
      ?: return unavailable("gps-unavailable", ObservationKind.GPS, "location=unavailable")
    return SecurityObservation("gps-${location.time}", ObservationKind.GPS, location.time, EvidenceSource.LOCAL_ANDROID, buildMap {
      put("latitude", location.latitude.toString()); put("longitude", location.longitude.toString()); put("accuracy_m", location.accuracy.toString()); put("provider", location.provider.orEmpty())
      if (location.hasAltitude()) put("altitude_m", location.altitude.toString())
      if (location.hasSpeed()) put("speed_mps", location.speed.toString())
      if (location.hasBearing()) put("bearing_deg", location.bearing.toString())
    })
  }

  @SuppressLint("MissingPermission") private fun cellular(): List<SecurityObservation> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "location_permission=denied"))
    val cells = runCatching { telephonyManager?.allCellInfo.orEmpty() }.getOrDefault(emptyList())
    if (cells.isEmpty()) return listOf(unavailable("cellular-unavailable", ObservationKind.CELLULAR, "cell_info=unavailable"))
    return cells.mapIndexed { index, cell -> SecurityObservation("cell-${cell.hashCode()}-$index", ObservationKind.CELLULAR, clock.nowEpochMs(), EvidenceSource.LOCAL_ANDROID, cellIdentityPayload(cell) + mapOf("registered" to cell.isRegistered.toString(), "identity_class" to cell.cellIdentity.javaClass.simpleName, "signal_class" to cell.cellSignalStrength.javaClass.simpleName)) }
  }

  @SuppressLint("MissingPermission") private fun wifi(): List<SecurityObservation> {
    if (wifiManager == null || !wifiManager.isWifiEnabled) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "wifi=disabled_or_unavailable"))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "location_permission=denied"))
    val results = runCatching { wifiManager.scanResults.orEmpty() }.getOrDefault(emptyList())
    if (results.isEmpty()) return listOf(unavailable("wifi-unavailable", ObservationKind.WIFI, "scan_results=unavailable"))
    return results.mapIndexed { index, scan -> SecurityObservation("wifi-${scan.BSSID}-$index", ObservationKind.WIFI, clock.nowEpochMs(), EvidenceSource.LOCAL_ANDROID, mapOf("ssid" to scan.SSID.ifBlank { "Hidden SSID" }, "bssid" to scan.BSSID, "frequency_mhz" to scan.frequency.toString(), "rssi_dbm" to scan.level.toString(), "capabilities" to scan.capabilities, "timestamp_us" to scan.timestamp.toString())) }
  }

  private fun network(): SecurityObservation {
    val network = connectivityManager.activeNetwork ?: return unavailable("network-unavailable", ObservationKind.NETWORK, "active_network=unavailable")
    val caps = connectivityManager.getNetworkCapabilities(network) ?: return unavailable("network-unavailable", ObservationKind.NETWORK, "capabilities=unavailable")
    return SecurityObservation("network-${clock.nowEpochMs()}", ObservationKind.NETWORK, clock.nowEpochMs(), EvidenceSource.LOCAL_ANDROID, mapOf("transport" to transport(caps), "validated" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED).toString(), "internet" to caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).toString()))
  }

  private fun vpn(): SecurityObservation {
    val network = connectivityManager.activeNetwork ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "active_network=unavailable")
    val caps = connectivityManager.getNetworkCapabilities(network) ?: return unavailable("vpn-unavailable", ObservationKind.VPN, "capabilities=unavailable")
    return SecurityObservation("vpn-${clock.nowEpochMs()}", ObservationKind.VPN, clock.nowEpochMs(), EvidenceSource.LOCAL_ANDROID, mapOf("active_transport" to caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN).toString()))
  }

  private fun transport(c: NetworkCapabilities) = when { c.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "VPN"; c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"; c.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR"; c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ETHERNET"; else -> "OTHER" }
  private fun unavailable(id: String, kind: ObservationKind, reason: String) = SecurityObservation(id, kind, clock.nowEpochMs(), EvidenceSource.UNAVAILABLE, mapOf("reason" to reason))

  private fun cellIdentityPayload(cell: CellInfo): Map<String, String> = buildMap {
    when (cell) {
      is CellInfoLte -> { put("radio","LTE"); put("mcc",cell.cellIdentity.mccString.orEmpty()); put("mnc",cell.cellIdentity.mncString.orEmpty()); put("tac",cell.cellIdentity.tac.toString()); put("ci",cell.cellIdentity.ci.toString()); put("pci",cell.cellIdentity.pci.toString()); put("earfcn",cell.cellIdentity.earfcn.toString()); put("rsrp_dbm",cell.cellSignalStrength.rsrp.toString()); put("rsrq_db",cell.cellSignalStrength.rsrq.toString()); put("rssnr_db",cell.cellSignalStrength.rssnr.toString()) }
      is CellInfoNr -> { put("radio","NR"); val i=cell.cellIdentity; val s=cell.cellSignalStrength; if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && i is CellIdentityNr && s is CellSignalStrengthNr) { put("mcc",i.mccString.orEmpty()); put("mnc",i.mncString.orEmpty()); put("tac",i.tac.toString()); put("nci",i.nci.toString()); put("pci",i.pci.toString()); put("nrarfcn",i.nrarfcn.toString()); put("ss_rsrp_dbm",s.ssRsrp.toString()); put("ss_rsrq_db",s.ssRsrq.toString()); put("ss_sinr_db",s.ssSinr.toString()) } }
      is CellInfoGsm -> { put("radio","GSM"); put("mcc",cell.cellIdentity.mccString.orEmpty()); put("mnc",cell.cellIdentity.mncString.orEmpty()); put("lac",cell.cellIdentity.lac.toString()); put("cid",cell.cellIdentity.cid.toString()); put("psc",cell.cellIdentity.psc.toString()); put("arfcn",cell.cellIdentity.arfcn.toString()); put("rssi_dbm",cell.cellSignalStrength.rssi.toString()); put("ber",cell.cellSignalStrength.bitErrorRate.toString()) }
      is CellInfoWcdma -> { put("radio","WCDMA"); put("mcc",cell.cellIdentity.mccString.orEmpty()); put("mnc",cell.cellIdentity.mncString.orEmpty()); put("lac",cell.cellIdentity.lac.toString()); put("cid",cell.cellIdentity.cid.toString()); put("psc",cell.cellIdentity.psc.toString()); put("uarfcn",cell.cellIdentity.uarfcn.toString()); put("rscp_dbm",cell.cellSignalStrength.dbm.toString()) }
      is CellInfoCdma -> { put("radio","CDMA"); put("basestation_id",cell.cellIdentity.basestationId.toString()); put("network_id",cell.cellIdentity.networkId.toString()); put("system_id",cell.cellIdentity.systemId.toString()); put("dbm",cell.cellSignalStrength.dbm.toString()) }
      is CellInfoTdscdma -> { put("radio","TD-SCDMA"); put("mcc",cell.cellIdentity.mccString.orEmpty()); put("mnc",cell.cellIdentity.mncString.orEmpty()); put("lac",cell.cellIdentity.lac.toString()); put("cid",cell.cellIdentity.cid.toString()); put("cpid",cell.cellIdentity.cpid.toString()); put("uarfcn",cell.cellIdentity.uarfcn.toString()); put("rscp_dbm",cell.cellSignalStrength.dbm.toString()) }
    }
  }

  @SuppressLint("MissingPermission") private fun BleScanResult.toObservation(now: Long) = SecurityObservation("ble-${device.address}-$now", ObservationKind.BLE, now, EvidenceSource.LOCAL_ANDROID, buildMap { put("address",device.address); put("name",device.name.orEmpty()); put("rssi_dbm",rssi.toString()); put("data_status","advertisement_observed"); put("service_uuid_count",scanRecord?.serviceUuids?.size?.toString() ?: "0"); put("manufacturer_data_count",scanRecord?.manufacturerSpecificData?.size()?.toString() ?: "0") })
}
