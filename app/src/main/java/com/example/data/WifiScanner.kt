package com.example.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.core.content.ContextCompat

class WifiScanner(private val context: Context) {
  private val wifi = context.applicationContext.getSystemService(WifiManager::class.java)

  fun scan(): List<android.net.wifi.ScanResult> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return emptyList()
    if (!wifi.isWifiEnabled) return emptyList()
    wifi.startScan()
    return wifi.scanResults
  }
}
