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

    private var started = false

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            publish(network, null, null)
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            publish(network, capabilities, null)
        }

        override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
            publish(network, null, linkProperties)
        }

        override fun onBlockedStatusChanged(network: Network, blocked: Boolean) {
            val current = _observation.value
            _observation.value = current.copy(blocked = blocked)
        }

        override fun onLost(network: Network) {
            if (_observation.value.available) {
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
        started = false
        _observation.value = NetworkObservation()
    }

    private fun publish(
        network: Network,
        capabilitiesOverride: NetworkCapabilities?,
        linkPropertiesOverride: LinkProperties?
    ) {
        val capabilities = capabilitiesOverride ?: runCatching {
            connectivityManager.getNetworkCapabilities(network)
        }.getOrNull() ?: return
        val linkProperties = linkPropertiesOverride ?: runCatching {
            connectivityManager.getLinkProperties(network)
        }.getOrNull()

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
            blocked = _observation.value.blocked
        )
    }
}
