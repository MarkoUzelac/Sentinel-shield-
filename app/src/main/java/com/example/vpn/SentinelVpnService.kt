package com.example.vpn

import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log

/**
 * Android VPN lifecycle boundary.
 *
 * This service creates the platform TUN interface but does not claim a WireGuard tunnel is live.
 * A real WireGuard transport must provide a successful handshake/health check before the UI can
 * expose a verified CONNECTED state.
 */
class SentinelVpnService : VpnService() {
    private var tunnelInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> stopTunnel()
            ACTION_START -> startTunnel()
        }
        return START_NOT_STICKY
    }

    private fun startTunnel() {
        if (tunnelInterface != null) return

        try {
            val builder = Builder()
                .setSession("Sentinel Shield")
                .setBlocking(true)
                .addAddress("10.77.0.2", 32)
                .addRoute("0.0.0.0", 0)
                .addDnsServer("1.1.1.1")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setMetered(false)
            }

            tunnelInterface = builder.establish()
            if (tunnelInterface == null) {
                Log.w(TAG, "VPN interface could not be established")
                stopSelf()
            }
        } catch (e: Exception) {
            Log.e(TAG, "VPN interface startup failed", e)
            tunnelInterface?.close()
            tunnelInterface = null
            stopSelf()
        }
    }

    private fun stopTunnel() {
        tunnelInterface?.close()
        tunnelInterface = null
        stopSelf()
    }

    override fun onDestroy() {
        tunnelInterface?.close()
        tunnelInterface = null
        super.onDestroy()
    }

    companion object {
        const val ACTION_START = "com.example.sentinelshield.vpn.START"
        const val ACTION_STOP = "com.example.sentinelshield.vpn.STOP"
        private const val TAG = "SentinelVpnService"
    }
}
