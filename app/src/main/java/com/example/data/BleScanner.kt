package com.example.data

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

class BleScanner(private val context: Context) {
  private val adapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
  private val scanner: BluetoothLeScanner? get() = adapter?.bluetoothLeScanner

  fun start(callback: (ScanResult) -> Unit): Boolean {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) return false
    val ble = scanner ?: return false
    ble.startScan(object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) { callback(result) }
    })
    return true
  }
}
