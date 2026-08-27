package com.example.data

import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import com.example.data.model.NetworkObservation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Reactive, device-backed network observation provider. */
class AndroidNetworkEvidenceProvider(
    private val connectivityManager: ConnectivityManager
) {
    private val _observation = MutableStateFlow(NetworkObservation())
    val observation: StateFlow<NetworkObservation> = _observation.asStateFlow()

    private data class NetworkSnapshot(
        var capabilities: NetworkCapabilities? = null,
        var linkProperties: LinkProperties? = null,
        var blocked: Boolean = false
    )

    private val snapshots = mutableMapOf<Network, NetworkSnapshot>()
    private var activeDefaultNetwork: Network? = null
    private var started = false

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            synchronized(snapshots) { snapshots.getOrPut(network) { NetworkSnapshot() } }
            recomputeDefaultNetwork(network)
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            synchronized(snapshots) {
                snapshots.getOrPut(network) { NetworkSnapshot() }.capabilities = capabilities
            }
            recomputeDefaultNetwork(network)
        }

        override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
            synchronized(snapshots) {
                snapshots.getOrPut(network) { NetworkSnapshot() }.linkProperties = linkProperties
            }
            recomputeDefaultNetwork(network)
        }

        override fun onBlockedStatusChanged(network: Network, blocked: Boolean) {
            synchronized(snapshots) {
                snapshots.getOrPut(network) { NetworkSnapshot() }.blocked = blocked
            }
            if (network == activeDefaultNetwork) publish(network)
        }

        override fun onLost(network: Network) {
            synchronized(snapshots) { snapshots.remove(network) }
            if (network == activeDefaultNetwork) {
                activeDefaultNetwork = null
                _observation.value = NetworkObservation()
            }
        }
    }

    @Synchronized
    fun start() {
        if (started) return
        connectivityManager.registerDefaultNetworkCallback(callback)
        started = true
    }

    @Synchronized
    fun stop() {
        if (!started) return
        runCatching { connectivityManager.unregisterNetworkCallback(callback) }
        synchronized(snapshots) { snapshots.clear() }
        activeDefaultNetwork = null
        started = false
        _observation.value = NetworkObservation()
    }

    private fun recomputeDefaultNetwork(candidate: Network) {
        // registerDefaultNetworkCallback delivers events only for the current default network.
        activeDefaultNetwork = candidate
        publish(candidate)
    }

    private fun publish(network: Network) {
        val snapshot = synchronized(snapshots) { snapshots[network] } ?: return
        val capabilities = snapshot.capabilities ?: return
        val linkProperties = snapshot.linkProperties

        val transports = buildSet {
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) add("WIFI")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) add("CELLULAR")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) add("VPN")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) add("ETHERNET")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)) add("BLUETOOTH")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_USB)) add("USB")
            if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_LOWPAN)) add("LOWPAN")
        }

        val dnsServers = linkProperties?.dnsServers?.mapNotNull { it.hostAddress }.orEmpty()
        _observation.value = NetworkObservation(
            available = true,
            transports = transports,
            validated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
            vpnTransport = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN),
            dnsServers = dnsServers,
            interfaceName = linkProperties?.interfaceName,
            blocked = snapshot.blocked
        )
    }
}
