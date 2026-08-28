package com.example.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.CellInfo
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat

class CellularScanner(private val context: Context) {
  private val telephony = context.getSystemService(TelephonyManager::class.java)

  fun cells(): List<CellInfo> {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return emptyList()
    return runCatching { telephony.allCellInfo.orEmpty() }.getOrDefault(emptyList())
  }
}
