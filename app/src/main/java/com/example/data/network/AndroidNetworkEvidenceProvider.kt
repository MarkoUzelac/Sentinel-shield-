package com.example.data.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import com.example.data.model.NetworkObservation
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Reactive Android network evidence provider. It never claims that connectivity equals security. */
class AndroidNetworkEvidenceProvider(context: Context) {
    private val connectivityManager = context.getSystemService(ConnectivityManager::class.java)
    private val _observation = MutableStateFlow(NetworkObservation())
    val observation: StateFlow<NetworkObservation> = _observation.asStateFlow()

    private val callback = object : ConnectivityManager.NetworkCallback() {
        private var latestCapabilities: NetworkCapabilities? = null
        private var latestLinkProperties: LinkProperties? = null
        private var blocked = false

        override fun onAvailable(network: Network) {
            publish()
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            latestCapabilities = capabilities
            publish()
        }

        override fun onLinkPropertiesChanged(network: Network, linkProperties: LinkProperties) {
            latestLinkProperties = linkProperties
            publish()
        }

        override fun onBlockedStatusChanged(network: Network, blocked: Boolean) {
            this.blocked = blocked
            publish()
        }

        override fun onLost(network: Network) {
            latestCapabilities = null
            latestLinkProperties = null
            blocked = false
            publish()
        }

        private fun publish() {
            val caps = latestCapabilities
            val links = latestLinkProperties
            val transports = buildSet {
                if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true) add("WIFI")
                if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true) add("CELLULAR")
                if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true) add("ETHERNET")
                if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true) add("VPN")
                if (caps?.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) == true) add("BLUETOOTH")
            }
            _observation.value = NetworkObservation(
                available = caps != null,
                transports = transports,
                validated = caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true,
                vpnTransport = caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true,
                dnsServers = links?.dnsServers?.mapNotNull { it.hostAddress } ?: emptyList(),
                interfaceName = links?.interfaceName,
                blocked = blocked
            )
        }
    }

    init {
        runCatching { connectivityManager?.registerDefaultNetworkCallback(callback) }
            .onFailure { _observation.value = NetworkObservation() }
    }

    fun close() {
        runCatching { connectivityManager?.unregisterNetworkCallback(callback) }
    }
}
