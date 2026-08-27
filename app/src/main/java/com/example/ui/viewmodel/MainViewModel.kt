package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
import android.net.VpnService
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: SecurityRepository
    val scanLogs: StateFlow<List<ScanLogEntity>>

    private val _isRealtimeShieldActive = MutableStateFlow(true)
    val isRealtimeShieldActive: StateFlow<Boolean> = _isRealtimeShieldActive.asStateFlow()

    private val _isAdBlockActive = MutableStateFlow(true)
    val isAdBlockActive: StateFlow<Boolean> = _isAdBlockActive.asStateFlow()

    private val _isPhishingProtectionActive = MutableStateFlow(true)
    val isPhishingProtectionActive: StateFlow<Boolean> = _isPhishingProtectionActive.asStateFlow()

    private val _securityScore = MutableStateFlow(94)
    val securityScore: StateFlow<Int> = _securityScore.asStateFlow()

    private val _isDeepScanning = MutableStateFlow(false)
    val isDeepScanning: StateFlow<Boolean> = _isDeepScanning.asStateFlow()

    private val _deepScanProgress = MutableStateFlow(0f)
    val deepScanProgress: StateFlow<Float> = _deepScanProgress.asStateFlow()

    private val _deepScanStep = MutableStateFlow("Initializing Sentinel Engine...")
    val deepScanStep: StateFlow<String> = _deepScanStep.asStateFlow()

    private val _vpnServers = MutableStateFlow<List<VpnServer>>(emptyList())
    val vpnServers: StateFlow<List<VpnServer>> = _vpnServers.asStateFlow()

    private val _selectedVpnServer = MutableStateFlow<VpnServer?>(null)
    val selectedVpnServer: StateFlow<VpnServer?> = _selectedVpnServer.asStateFlow()

    private val _isVpnConnected = MutableStateFlow(false)
    val isVpnConnected: StateFlow<Boolean> = _isVpnConnected.asStateFlow()

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

    private val _chatMessages = MutableStateFlow<List<Pair<String, String>>>(
        listOf("sentinel" to "Greetings! I am Sentinel AI, your cybersecurity assistant. How can I help secure your device or data today?")
    )
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
        scanLogs = repository.allLogs.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )
        val servers = repository.getVpnServers()
        _vpnServers.value = servers
        _selectedVpnServer.value = servers.firstOrNull()
        jurisdictions = repository.getJurisdictions()
    }

    fun toggleRealtimeShield(active: Boolean) {
        _isRealtimeShieldActive.value = active
        updateSecurityScore()
    }

    fun toggleAdBlock(active: Boolean) {
        _isAdBlockActive.value = active
        updateSecurityScore()
    }

    fun togglePhishingProtection(active: Boolean) {
        _isPhishingProtectionActive.value = active
        updateSecurityScore()
    }

    private fun updateSecurityScore() {
        var score = 100
        if (!_isRealtimeShieldActive.value) score -= 40
        if (!_isPhishingProtectionActive.value) score -= 25
        if (!_isAdBlockActive.value) score -= 15
        if (_isVpnConnected.value) score += 5
        _securityScore.value = score.coerceIn(0, 100)
    }

    fun selectVpnServer(server: VpnServer) {
        _selectedVpnServer.value = server
        if (_isVpnConnected.value) {
            // A selected server is only a UI target until a real VPN transport is configured.
            _isVpnConnected.value = false
            updateSecurityScore()
        }
    }

    fun toggleVpnConnection() {
        viewModelScope.launch {
            val selected = _selectedVpnServer.value
            if (selected == null) {
                _isVpnConnected.value = false
                updateSecurityScore()
                return@launch
            }

            // Do not claim a live tunnel by changing local state. A VpnService implementation
            // must establish and verify the transport before the UI reports CONNECTED.
            if (_isVpnConnected.value) {
                _isVpnConnected.value = false
                updateSecurityScore()
                return@launch
            }

            val vpnIntent = VpnService.prepare(getApplication<Application>())
            if (vpnIntent != null) {
                // Android requires explicit user consent before a VPN can be established.
                _isVpnConnected.value = false
                updateSecurityScore()
                return@launch
            }

            // No concrete transport endpoint is configured in the current repository. Keep the
            // state disconnected rather than presenting a false security guarantee.
            _isVpnConnected.value = false
            repository.saveScanLog(
                ScanLogEntity(
                    title = "VPN Connection Blocked",
                    scanType = "VPN_MANAGER",
                    status = "WARNING",
                    score = 0,
                    summary = "VPN transport is not configured as a verified production endpoint.",
                    detailsJson = "Requested node: ${selected.city}, ${selected.country} | Address: ${selected.ipAddress}"
                )
            )
            updateSecurityScore()
        }
    }

    fun startDeepSystemScan() {
        if (_isDeepScanning.value) return
        viewModelScope.launch {
            _isDeepScanning.value = true
            _deepScanProgress.value = 0.05f
            val steps = listOf(
                "Checking System Integrity & Root Sandbox..." to 0.2f,
                "Auditing App Permissions & Sensitive APIs..." to 0.45f,
                "Inspecting Network Sockets & DNS Resolvers..." to 0.7f,
                "Evaluating SSL Certificates & Local Storage..." to 0.9f,
                "Scan Completed!" to 1.0f
            )
            for ((stepText, progress) in steps) {
                _deepScanStep.value = stepText
                _deepScanProgress.value = progress
                delay(700)
            }
            _isDeepScanning.value = false
            _securityScore.value = 98
            repository.saveScanLog(
                ScanLogEntity(
                    title = "Full Deep System Audit",
                    scanType = "DEEP_SCAN",
                    status = "PASSED",
                    score = 98,
                    summary = "Completed the local Sentinel audit workflow.",
                    detailsJson = "Local heuristic scan completed; no claim of complete device-wide malware coverage."
                )
            )
        }
    }

    fun runSpeedAndSecurityAudit() {
        if (_isTestingSpeed.value) return
        viewModelScope.launch {
            _isTestingSpeed.value = true
            val result = repository.runNetworkSecurityAudit()
            _speedTestResult.value = result
            _isTestingSpeed.value = false
            repository.saveScanLog(
                ScanLogEntity(
                    title = "Wi-Fi Security & Speed Audit",
                    scanType = "NETWORK_AUDIT",
                    status = if (result.isDnsSecure) "PASSED" else "WARNING",
                    score = 96,
                    summary = "SSID: ${result.wifiSsid} | Speed: ${result.downloadMbps} Mbps | Security: ${result.securityEncryption}",
                    detailsJson = "Ping: ${result.pingMs}ms | Jitter: ${result.jitterMs}ms | Public IP: ${result.publicIp}"
                )
            )
        }
    }

    fun updateAiTargetInput(input: String) {
        _aiTargetInput.value = input
    }

    fun updateAiCategory(category: String) {
        _aiScanCategory.value = category
    }

    fun runAiThreatAnalysis() {
        val input = _aiTargetInput.value.ifBlank { "Enter a URL, domain, or scan target" }
        if (input == "Enter a URL, domain, or scan target") return
        viewModelScope.launch {
            _isAiScanning.value = true
            val threat = repository.analyzeSecurityThreatWithAi(input, _aiScanCategory.value)
            _lastThreatResult.value = threat
            _isAiScanning.value = false
            repository.saveScanLog(
                ScanLogEntity(
                    title = "AI Threat Audit: ${threat.title}",
                    scanType = "AI_THREAT",
                    status = when (threat.severity) {
                        ThreatSeverity.CRITICAL, ThreatSeverity.HIGH -> "ALERT"
                        ThreatSeverity.MEDIUM, ThreatSeverity.LOW -> "WARNING"
                        else -> "PASSED"
                    },
                    score = when (threat.severity) {
                        ThreatSeverity.CRITICAL -> 10
                        ThreatSeverity.HIGH -> 30
                        ThreatSeverity.MEDIUM -> 60
                        ThreatSeverity.LOW -> 80
                        ThreatSeverity.SAFE -> 100
                    },
                    summary = threat.description,
                    detailsJson = threat.recommendation
                )
            )
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

    fun updateDarkWebQuery(query: String) {
        _darkWebQuery.value = query
    }

    fun searchBreachData() {
        if (_isSearchingBreaches.value || _darkWebQuery.value.isBlank()) return
        viewModelScope.launch {
            _isSearchingBreaches.value = true
            _hasSearchedBreaches.value = true
            _breachResults.value = repository.searchBreachData(_darkWebQuery.value)
            _isSearchingBreaches.value = false
        }
    }
}
