package com.example.vpn

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Minimal transport boundary used by the VPN controller.
 *
 * This class deliberately performs endpoint reachability only. Reachability is NOT a WireGuard
 * handshake, so callers must not use [isReachable] as proof of an encrypted tunnel. A production
 * implementation must inject a real WireGuard backend and report its handshake timestamp.
 */
class WireGuardTransport {
    suspend fun isReachable(host: String, port: Int, timeoutMs: Int = 3000): Boolean = withContext(Dispatchers.IO) {
        runCatching {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host, port), timeoutMs)
            }
            true
        }.getOrDefault(false)
    }
}
