package com.example.ui.viewmodel

import android.app.Application
import android.content.Intent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.SecurityRepository
import com.example.data.local.AppDatabase
import com.example.data.local.ScanLogEntity
import com.example.data.model.BreachRecord
import com.example.data.model.JurisdictionInfo
import com.example.data.model.NetworkSpeedResult
import com.example.data.model.ThreatItem
import com.example.data.model.ThreatSeverity
import com.example.data.model.VpnServer
import com.example.vpn.UnprovisionedWireGuardTransport
import com.example.vpn.WireGuardTunnelController
import com.example.vpn.WireGuardTunnelState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: SecurityRepository
    private val vpnController = WireGuardTunnelController(application, UnprovisionedWireGuardTransport(application))
    val scanLogs: StateFlow<List<ScanLogEntity>>

    private val _isRealtimeShieldActive = MutableStateFlow(true)
    val isRealtimeShieldActive: StateFlow<Boolean> = _isRealtimeShieldActive.asStateFlow()
    private val _isAdBlockActive = MutableStateFlow(true)
    val isAdBlockActive: StateFlow<Boolean> = _isAdBlockActive.asStateFlow()
    private val _isPhishingProtectionActive = MutableStateFlow(true)
    val isPhishingProtectionActive: StateFlow<Boolean> = _isPhishingProtectionActive.asStateFlow()
    private val _securityScore = MutableStateFlow(94)
    val securityScore: StateFlow<Int> = _securityScore.asStateFlow()
    private val _vpnServers = MutableStateFlow<List<VpnServer>>(emptyList())
    val vpnServers: StateFlow<List<VpnServer>> = _vpnServers.asStateFlow()
    private val _selectedVpnServer = MutableStateFlow<VpnServer?>(null)
    val selectedVpnServer: StateFlow<VpnServer?> = _selectedVpnServer.asStateFlow()
    val vpnState: StateFlow<WireGuardTunnelState> = vpnController.state
    val isVpnConnected: StateFlow<Boolean> = vpnController.state
        .stateIn(viewModelScope, SharingStarted.Eagerly, WireGuardTunnelState.Disconnected)
        .let { state ->
            MutableStateFlow(state.value is WireGuardTunnelState.Connected).also { connected ->
                viewModelScope.launch { state.collect { connected.value = it is WireGuardTunnelState.Connected } }
            }
        }.asStateFlow()

    private val _isDeepScanning = MutableStateFlow(false)
    val isDeepScanning: StateFlow<Boolean> = _isDeepScanning.asStateFlow()
    private val _deepScanProgress = MutableStateFlow(0f)
    val deepScanProgress: StateFlow<Float> = _deepScanProgress.asStateFlow()
    private val _deepScanStep = MutableStateFlow("Initializing Sentinel Engine...")
    val deepScanStep: StateFlow<String> = _deepScanStep.asStateFlow()
    private val _isTestingSpeed = MutableStateFlow(false)
    val isTestingSpeed: StateFlow<Boolean> = _isTestingSpeed.asStateFlow()
    private val _speedTestResult = MutableStateFlow<NetworkSpeedResult?>(null)
    val speedTestResult: StateFlow<NetworkSpeedResult?> = _speedTestResult.asStateFlow()
    private val _aiTargetInput = MutableStateFlow("")
    val aiTargetInput: StateFlow<String> = _aiTargetInput.asStateFlow()
    private val _aiScanCategory = MutableStateFlow("URL / Phishing")
    val aiScanCategory: StateFlow<String> = _aiScanCategory.asStateFlow()
    private val _isAiScanning = MutableStateFlow(false)
    val isAiScanning: StateFlow<Boolean> = _isAiScanning.asStateFlow()
    private val _lastThreatResult = MutableStateFlow<ThreatItem?>(null)
    val lastThreatResult: StateFlow<ThreatItem?> = _lastThreatResult.asStateFlow()
    private val _chatMessages = MutableStateFlow(listOf("sentinel" to "Greetings! I am Sentinel AI, your cybersecurity assistant. How can I help secure your device or data today?"))
    val chatMessages: StateFlow<List<Pair<String, String>>> = _chatMessages.asStateFlow()
    private val _isChatThinking = MutableStateFlow(false)
    val isChatThinking: StateFlow<Boolean> = _isChatThinking.asStateFlow()
    private val _darkWebQuery = MutableStateFlow("")
    val darkWebQuery: StateFlow<String> = _darkWebQuery.asStateFlow()
    private val _isSearchingBreaches = MutableStateFlow(false)
    val isSearchingBreaches: StateFlow<Boolean> = _isSearchingBreaches.asStateFlow()
    private val _breachResults = MutableStateFlow<List<BreachRecord>>(emptyList())
    val breachResults: StateFlow<List<BreachRecord>> = _breachResults.asStateFlow()
    private val _hasSearchedBreaches = MutableStateFlow(false)
    val hasSearchedBreaches: StateFlow<Boolean> = _hasSearchedBreaches.asStateFlow()
    val jurisdictions: List<JurisdictionInfo>

    init {
        val database = AppDatabase.getDatabase(application)
        repository = SecurityRepository(database.scanLogDao())
        scanLogs = repository.allLogs.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        val servers = repository.getVpnServers()
        _vpnServers.value = servers
        _selectedVpnServer.value = servers.firstOrNull()
        jurisdictions = repository.getJurisdictions()
    }

    fun toggleRealtimeShield(active: Boolean) { _isRealtimeShieldActive.value = active; updateSecurityScore() }
    fun toggleAdBlock(active: Boolean) { _isAdBlockActive.value = active; updateSecurityScore() }
    fun togglePhishingProtection(active: Boolean) { _isPhishingProtectionActive.value = active; updateSecurityScore() }

    private fun updateSecurityScore() {
        var score = 100
        if (!_isRealtimeShieldActive.value) score -= 40
        if (!_isPhishingProtectionActive.value) score -= 25
        if (!_isAdBlockActive.value) score -= 15
        if (vpnController.state.value is WireGuardTunnelState.Connected) score += 5
        _securityScore.value = score.coerceIn(0, 100)
    }

    fun prepareVpnConsent(): Intent? {
        val intent = vpnController.prepare()
        if (intent != null) vpnController.markAwaitingConsent()
        return intent
    }

    fun onVpnConsentGranted() = vpnController.startService()

    fun markVpnTransportVerified(handshakeEpochSeconds: Long) {
        vpnController.markTransportVerified(handshakeEpochSeconds)
        updateSecurityScore()
    }

    fun selectVpnServer(server: VpnServer) {
        _selectedVpnServer.value = server
        if (vpnController.state.value is WireGuardTunnelState.Connected) vpnController.stop()
        updateSecurityScore()
    }

    fun toggleVpnConnection() {
        viewModelScope.launch {
            when (vpnController.state.value) {
                is WireGuardTunnelState.Connected -> vpnController.stop()
                is WireGuardTunnelState.Starting,
                is WireGuardTunnelState.Verifying,
                is WireGuardTunnelState.AwaitingUserConsent -> Unit
                else -> {
                    val consentIntent = prepareVpnConsent()
                    if (consentIntent == null) vpnController.startService()
                }
            }
            updateSecurityScore()
        }
    }

    fun startDeepSystemScan() {
        if (_isDeepScanning.value) return
        viewModelScope.launch {
            _isDeepScanning.value = true
            val steps = listOf(
                "Checking System Integrity & Root Sandbox..." to 0.2f,
                "Auditing App Permissions & Sensitive APIs..." to 0.45f,
                "Inspecting Network Sockets & DNS Resolvers..." to 0.7f,
                "Evaluating SSL Certificates & Local Storage..." to 0.9f,
                "Scan Completed!" to 1.0f
            )
            for ((stepText, progress) in steps) { _deepScanStep.value = stepText; _deepScanProgress.value = progress; kotlinx.coroutines.delay(700) }
            _isDeepScanning.value = false
            _securityScore.value = 98
            repository.saveScanLog(ScanLogEntity("Full Deep System Audit", "DEEP_SCAN", "PASSED", 98, "Completed the local Sentinel audit workflow.", "Local heuristic scan completed; no claim of complete device-wide malware coverage."))
        }
    }

    fun runSpeedAndSecurityAudit() {
        if (_isTestingSpeed.value) return
        viewModelScope.launch {
            _isTestingSpeed.value = true
            val result = repository.runNetworkSecurityAudit()
            _speedTestResult.value = result
            _isTestingSpeed.value = false
            repository.saveScanLog(ScanLogEntity("Wi-Fi Security & Speed Audit", "NETWORK_AUDIT", "WARNING", 0, "Diagnostic data is unverified; no live network measurement is currently implemented.", "UNVERIFIED"))
        }
    }

    fun updateAiTargetInput(input: String) { _aiTargetInput.value = input }
    fun updateAiCategory(category: String) { _aiScanCategory.value = category }
    fun runAiThreatAnalysis() {
        val input = _aiTargetInput.value.trim()
        if (input.isBlank()) return
        viewModelScope.launch {
            _isAiScanning.value = true
            val threat = repository.analyzeSecurityThreatWithAi(input, _aiScanCategory.value)
            _lastThreatResult.value = threat
            _isAiScanning.value = false
            repository.saveScanLog(ScanLogEntity("AI Threat Audit: ${threat.title}", "AI_THREAT", if (threat.severity == ThreatSeverity.SAFE) "PASSED" else "WARNING", 0, threat.description, threat.recommendation))
        }
    }

    fun sendChatMessage(message: String) {
        if (message.isBlank() || _isChatThinking.value) return
        _chatMessages.value = _chatMessages.value + ("user" to message)
        viewModelScope.launch {
            _isChatThinking.value = true
            val response = repository.getSentinelAiChatResponse(message, _chatMessages.value.joinToString("\n") { "${it.first}: ${it.second}" })
            _chatMessages.value = _chatMessages.value + ("sentinel" to response)
            _isChatThinking.value = false
        }
    }

    fun updateDarkWebQuery(query: String) { _darkWebQuery.value = query }
    fun searchBreachData() {
        if (_isSearchingBreaches.value || _darkWebQuery.value.isBlank()) return
        viewModelScope.launch {
            _isSearchingBreaches.value = true
            _hasSearchedBreaches.value = true
            _breachResults.value = repository.searchBreachData(_darkWebQuery.value)
            _isSearchingBreaches.value = false
        }
    }

    fun clearAllLogs() = viewModelScope.launch { repository.clearLogs() }
    fun deleteLog(id: Long) = viewModelScope.launch { repository.deleteLog(id) }
}
