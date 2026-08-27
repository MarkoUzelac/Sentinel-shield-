package com.example.data

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.example.data.model.DeviceLocationState
import com.example.data.model.SignalKind
import com.example.data.model.SignalRadarItem
import com.example.data.model.SignalRadarSnapshot
import com.example.data.model.SignalRisk
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import android.telephony.CellIdentityGsm
import android.telephony.CellIdentityLte
import android.telephony.CellIdentityNr
import android.telephony.CellIdentityWcdma
import android.telephony.CellInfo
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.TelephonyManager

/** Passive, OS-mediated radio observation. No IMSI extraction, jamming or active probing. */
class SignalRadarProvider(
    private val context: Context,
    private val locationProvider: DeviceLocationProvider,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default),
    private val openCellIdProvider: OpenCellIdProvider = OpenCellIdProvider()
) {
    private val _snapshot = MutableStateFlow(SignalRadarSnapshot())
    val snapshot: StateFlow<SignalRadarSnapshot> = _snapshot.asStateFlow()
    private val bleDevices = ConcurrentHashMap<String, SignalRadarItem>()
    private val scanner: BluetoothLeScanner? get() = bluetoothAdapter?.bluetoothLeScanner
    private val bluetoothAdapter: BluetoothAdapter? =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    private val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    private var refreshJob: Job? = null
    private var scanning = false

    private val bleCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val rssi = result.rssi
            val name = runCatching { result.device.name }.getOrNull().orEmpty().ifBlank { "BLE uređaj" }
            val stableId = stableHash(result.device.address)
            val distance = estimateDistanceMeters(rssi, result.txPower)
            bleDevices[stableId] = SignalRadarItem(
                id = "ble_$stableId",
                kind = SignalKind.BLE,
                label = "BLE-$stableId",
                technology = if (name.contains("beacon", true)) "BLE beacon" else "Bluetooth LE",
                rssiDbm = rssi,
                estimatedDistanceMeters = distance,
                risk = riskFromBle(rssi, name),
                explanation = "Pasivno očitan BLE oglas; identitet osobe ili uređaja nije utvrđen.",
                observedAtEpochMs = System.currentTimeMillis(),
                runtimeBacked = true
            )
            publish()
        }

        override fun onScanFailed(errorCode: Int) {
            _snapshot.value = _snapshot.value.copy(
                scanning = false,
                error = "BLE skeniranje nije uspjelo (kod $errorCode).",
                lastUpdatedEpochMs = System.currentTimeMillis()
            )
        }
    }

    fun start() {
        if (scanning) return
        scanning = true
        refreshJob?.cancel()
        refreshJob = scope.launch {
            while (isActive) {
                refreshCellular()
                pruneBle()
                publish()
                delay(5_000L)
            }
        }
        startBleScan()
        publish()
    }

    fun stop() {
        scanning = false
        refreshJob?.cancel()
        refreshJob = null
        runCatching { if (hasBlePermission()) scanner?.stopScan(bleCallback) }
        _snapshot.value = _snapshot.value.copy(scanning = false, lastUpdatedEpochMs = System.currentTimeMillis())
    }

    private fun startBleScan() {
        if (!hasBlePermission()) return
        if (bluetoothAdapter?.isEnabled != true) return
        runCatching { scanner?.startScan(bleCallback) }
    }

    private suspend fun refreshCellular() {
        if (!hasLocationPermission() || telephonyManager == null) return
        val records = runCatching { telephonyManager.allCellInfo.orEmpty() }.getOrDefault(emptyList())
        val deviceLocation = locationProvider.state.value
        val cells = records.mapNotNull { toCellSignal(it, deviceLocation) }
            .distinctBy { it.id }
            .take(12)
            .map { item ->
                val tower = openCellIdProvider.lookup(
                    mcc = item.mcc,
                    mnc = item.mnc,
                    areaCode = item.areaCode,
                    cellId = item.cellId,
                    radio = item.technology.toOpenCellIdRadio()
                )
                if (tower == null) item else item.copy(
                    latitude = tower.latitude,
                    longitude = tower.longitude,
                    locationSource = tower.source,
                    locationAccuracyMeters = tower.rangeMeters,
                    explanation = "Stvarna ćelija očitana kroz TelephonyManager; lokacija tornja dohvaćena iz OpenCellID-a (${tower.samples} uzoraka)."
                )
            }
        _snapshot.value = _snapshot.value.copy(cellularCount = cells.size, signals = mergeSignals(cells))
    }

    private fun toCellSignal(info: CellInfo, location: DeviceLocationState): SignalRadarItem? {
        val registered = info.isRegistered
        val dbm = info.cellSignalStrength.dbm
        val (technology, cellId, area, mcc, mnc) = when (info) {
            is CellInfoLte -> {
                val id = info.cellIdentity as CellIdentityLte
                Quad("4G LTE", id.ci.toLong(), id.tac, id.mccString?.toIntOrNull(), id.mncString?.toIntOrNull())
            }
            is CellInfoGsm -> {
                val id = info.cellIdentity as CellIdentityGsm
                Quad("2G GSM", id.cid.toLong(), id.lac, id.mccString?.toIntOrNull(), id.mncString?.toIntOrNull())
            }
            is CellInfoWcdma -> {
                val id = info.cellIdentity as CellIdentityWcdma
                Quad("3G WCDMA", id.cid.toLong(), id.lac, id.mccString?.toIntOrNull(), id.mncString?.toIntOrNull())
            }
            is CellInfoNr -> {
                if (Build.VERSION.SDK_INT < 29) return null
                val id = info.cellIdentity as CellIdentityNr
                Quad("5G NR", id.nci, id.tac, id.mccString?.toIntOrNull(), id.mncString?.toIntOrNull())
            }
            else -> return null
        }
        val risk = cellularRisk(dbm, registered)
        return SignalRadarItem(
            id = "cell_${technology}_${cellId}_${area}",
            kind = SignalKind.CELLULAR,
            label = if (registered) "Serving cell" else "Nearby cell",
            technology = technology,
            rssiDbm = dbm.takeIf { it < 0 },
            cellId = cellId,
            areaCode = area,
            signalLevel = info.cellSignalStrength.level,
            latitude = location.latitude,
            longitude = location.longitude,
            mcc = mcc,
            mnc = mnc,
            risk = risk,
            explanation = if (registered) "Stvarna registrirana ćelija očitana kroz TelephonyManager." else "Stvarna susjedna ćelija očitana kroz TelephonyManager.",
            runtimeBacked = true
        )
    }

    private fun mergeSignals(cells: List<SignalRadarItem>): List<SignalRadarItem> {
        val ble = bleDevices.values.toList()
        return (cells + ble)
            .sortedWith(compareByDescending<SignalRadarItem> { riskWeight(it.risk) }.thenByDescending { it.rssiDbm ?: -999 })
            .take(80)
    }

    private fun pruneBle() {
        val cutoff = System.currentTimeMillis() - 20_000L
        bleDevices.entries.removeIf { it.value.observedAtEpochMs < cutoff }
    }

    private fun publish() {
        val cells = _snapshot.value.signals.filter { it.kind == SignalKind.CELLULAR }
        val ble = bleDevices.values.toList()
        val merged = (cells + ble).distinctBy { it.id }
        _snapshot.value = _snapshot.value.copy(
            scanning = scanning,
            signals = merged,
            bleCount = ble.size,
            cellularCount = cells.size,
            anomalyCount = merged.count { it.risk >= SignalRisk.MEDIUM },
            lastUpdatedEpochMs = System.currentTimeMillis(),
            error = null
        )
    }

    private fun hasBlePermission(): Boolean = if (Build.VERSION.SDK_INT >= 31) {
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
    } else true

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun riskFromBle(rssi: Int, name: String): SignalRisk = when {
        name.contains("tracker", true) || name.contains("tag", true) -> SignalRisk.MEDIUM
        rssi >= -45 -> SignalRisk.LOW
        else -> SignalRisk.INFO
    }

    private fun cellularRisk(dbm: Int, registered: Boolean): SignalRisk = when {
        !registered && dbm >= -75 -> SignalRisk.LOW
        else -> SignalRisk.INFO
    }

    private fun riskWeight(risk: SignalRisk): Int = when (risk) {
        SignalRisk.CRITICAL -> 4
        SignalRisk.HIGH -> 3
        SignalRisk.MEDIUM -> 2
        SignalRisk.LOW -> 1
        SignalRisk.INFO -> 0
    }

    private fun estimateDistanceMeters(rssi: Int, txPower: Int): Double? {
        if (txPower == ScanResult.TX_POWER_NOT_PRESENT || rssi == 0) return null
        val ratio = rssi.toDouble() / txPower.toDouble()
        return if (ratio < 1.0) Math.pow(ratio, 10.0) else 0.89976 * Math.pow(ratio, 7.7095) + 0.111
    }

    private fun stableHash(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .take(6)
        .joinToString("") { "%02x".format(it) }

    private fun String.toOpenCellIdRadio(): String = when {
        contains("GSM", true) -> "GSM"
        contains("WCDMA", true) -> "UMTS"
        contains("LTE", true) -> "LTE"
        contains("NR", true) -> "NR"
        else -> ""
    }

    private data class Quad<A, B, C, D, E>(val first: A, val second: B, val third: C, val fourth: D, val fifth: E)
}
