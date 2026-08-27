package com.example.vpn

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor

/**
 * Platform VPN lifecycle boundary.
 *
 * This service deliberately does not claim a production WireGuard connection by itself.
 * A real WireGuard backend must be injected/started by the transport layer and only then
 * should the state machine transition to Connected.
 */
class SentinelVpnService : VpnService() {
    private var tunnelInterface: ParcelFileDescriptor? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> stopTunnel()
            ACTION_START -> startTunnel(intent)
        }
        return START_STICKY
    }

    private fun startTunnel(intent: Intent) {
        if (tunnelInterface != null) return

        val builder = Builder()
            .setSession("Sentinel Shield")
            .setBlocking(true)
            .addAddress("10.77.0.2", 32)
            .addRoute("0.0.0.0", 0)
            .addDnsServer("1.1.1.1")

        tunnelInterface = builder.establish()

        // The TUN interface existing is not sufficient proof of a functioning WireGuard peer.
        // The repository/UI must remain disconnected until a real transport handshake is verified.
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
    }
}
