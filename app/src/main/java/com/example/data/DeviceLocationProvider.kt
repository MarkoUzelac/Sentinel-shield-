package com.example.data

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.GnssStatus
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import androidx.core.content.ContextCompat
import com.example.data.model.DeviceLocationState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

/** Hardware-backed device location provider. It never invents coordinates. */
class DeviceLocationProvider(private val context: Context) : LocationListener {
    private val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    private val _state = MutableStateFlow(DeviceLocationState())
    val state: StateFlow<DeviceLocationState> = _state.asStateFlow()
    private var started = false
    private var satelliteCount = 0

    private val gnssCallback = object : GnssStatus.Callback() {
        override fun onSatelliteStatusChanged(status: GnssStatus) {
            satelliteCount = status.satelliteCount
            val current = _state.value
            if (current.hasFix) _state.value = current.copy(satelliteCount = satelliteCount)
        }
    }

    fun start() {
        if (started) return
        started = true
        if (!hasLocationPermission()) {
            _state.value = DeviceLocationState(errorMessage = "Lokacijska dozvola nije odobrena.")
            return
        }
        val manager = locationManager ?: run {
            _state.value = DeviceLocationState(errorMessage = "LocationManager nije dostupan.")
            return
        }

        var requested = false
        runCatching {
            if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1_000L, 1f, this)
                requested = true
            }
        }
        runCatching {
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2_000L, 2f, this)
                requested = true
            }
        }
        runCatching { manager.registerGnssStatusCallback(gnssCallback) }

        if (!requested) {
            _state.value = DeviceLocationState(errorMessage = "Nijedan lokacijski provider nije uključen.")
        } else {
            val last = listOfNotNull(
                runCatching { manager.getLastKnownLocation(LocationManager.GPS_PROVIDER) }.getOrNull(),
                runCatching { manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) }.getOrNull()
            ).maxByOrNull { it.time }
            last?.let(::onLocationChanged)
        }
    }

    fun stop() {
        if (!started) return
        started = false
        locationManager?.let { manager ->
            runCatching { manager.removeUpdates(this) }
            runCatching { manager.unregisterGnssStatusCallback(gnssCallback) }
        }
    }

    fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    override fun onLocationChanged(location: Location) {
        _state.value = DeviceLocationState(
            hasFix = true,
            latitude = location.latitude,
            longitude = location.longitude,
            accuracyMeters = location.accuracy,
            altitudeMeters = if (location.hasAltitude()) location.altitude else null,
            speedKmh = if (location.hasSpeed()) location.speed * 3.6f else null,
            bearingDegrees = if (location.hasBearing()) location.bearing else null,
            satelliteCount = satelliteCount,
            provider = location.provider?.uppercase(Locale.US) ?: "UNKNOWN",
            timestampMillis = location.time
        )
    }

    override fun onProviderDisabled(provider: String) {
        if (provider == LocationManager.GPS_PROVIDER || provider == LocationManager.NETWORK_PROVIDER) {
            _state.value = _state.value.copy(errorMessage = "$provider je isključen.")
        }
    }

    override fun onProviderEnabled(provider: String) = Unit
    override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
}
