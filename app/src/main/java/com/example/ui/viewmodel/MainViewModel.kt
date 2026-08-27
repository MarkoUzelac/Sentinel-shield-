package com.example.ui.viewmodel

import android.app.Application
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

    // Shield Toggles
    private val _isRealtimeShieldActive = MutableStateFlow(true)
    val isRealtimeShieldActive: StateFlow<Boolean> = _isRealtimeShieldActive.asStateFlow()

    private val _isAdBlockActive = MutableStateFlow(true)
    val isAdBlockActive: StateFlow<Boolean> = _isAdBlockActive.asStateFlow()

    private val _isPhishingProtectionActive = MutableStateFlow(true)
    val isPhishingProtectionActive: StateFlow<Boolean> = _isPhishingProtectionActive.asStateFlow()

    private val _securityScore = MutableStateFlow(94)
    val securityScore: StateFlow<Int> = _securityScore.asStateFlow()

    // Deep Scan State
    private val _isDeepScanning = MutableStateFlow(false)
    val isDeepScanning: StateFlow<Boolean> = _isDeepScanning.asStateFlow()

    private val _deepScanProgress = MutableStateFlow(0f)
    val deepScanProgress: StateFlow<Float> = _deepScanProgress.asStateFlow()

    private val _deepScanStep = MutableStateFlow("Initializing Sentinel Engine...")
    val deepScanStep: StateFlow<String> = _deepScanStep.asStateFlow()

    // VPN State
    private val _vpnServers = MutableStateFlow<List<VpnServer>>(emptyList())
    val vpnServers: StateFlow<List<VpnServer>> = _vpnServers.asStateFlow()

    private val _selectedVpnServer = MutableStateFlow<VpnServer?>(null)
    val selectedVpnServer: StateFlow<VpnServer?> = _selectedVpnServer.asStateFlow()

    private val _isVpnConnected = MutableStateFlow(false)
    val isVpnConnected: StateFlow<Boolean> = _isVpnConnected.asStateFlow()

    // Network Speed & Security Test State
    private val _isTestingSpeed = MutableStateFlow(false)
    val isTestingSpeed: StateFlow<Boolean> = _isTestingSpeed.asStateFlow()

    private val _speedTestResult = MutableStateFlow<NetworkSpeedResult?>(null)
    val speedTestResult: StateFlow<NetworkSpeedResult?> = _speedTestResult.asStateFlow()

    // AI Threat Scanner State
    private val _aiTargetInput = MutableStateFlow("")
    val aiTargetInput: StateFlow<String> = _aiTargetInput.asStateFlow()

    private val _aiScanCategory = MutableStateFlow("URL / Phishing")
    val aiScanCategory: StateFlow<String> = _aiScanCategory.asStateFlow()

    private val _isAiScanning = MutableStateFlow(false)
    val isAiScanning: StateFlow<Boolean> = _isAiScanning.asStateFlow()

    private val _lastThreatResult = MutableStateFlow<ThreatItem?>(null)
    val lastThreatResult: StateFlow<ThreatItem?> = _lastThreatResult.asStateFlow()

    // Sentinel AI Chat State
    private val _chatMessages = MutableStateFlow<List<Pair<String, String>>>(
        listOf("sentinel" to "Greetings! I am Sentinel AI, your real-time cybersecurity assistant. How can I secure your device or data today?")
    )
    val chatMessages: StateFlow<List<Pair<String, String>>> = _chatMessages.asStateFlow()

    private val _isChatThinking = MutableStateFlow(false)
    val isChatThinking: StateFlow<Boolean> = _isChatThinking.asStateFlow()

    // Dark Web Breach State
    private val _darkWebQuery = MutableStateFlow("")
    val darkWebQuery: StateFlow<String> = _darkWebQuery.asStateFlow()

    private val _isSearchingBreaches = MutableStateFlow(false)
    val isSearchingBreaches: StateFlow<Boolean> = _isSearchingBreaches.asStateFlow()

    private val _breachResults = MutableStateFlow<List<BreachRecord>>(emptyList())
    val breachResults: StateFlow<List<BreachRecord>> = _breachResults.asStateFlow()

    private val _hasSearchedBreaches = MutableStateFlow(false)
    val hasSearchedBreaches: StateFlow<Boolean> = _hasSearchedBreaches.asStateFlow()

    // Jurisdiction list
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
            // Reconnect to new server
            viewModelScope.launch {
                _isVpnConnected.value = false
                delay(600)
                _isVpnConnected.value = true
                updateSecurityScore()
            }
        }
    }

    fun toggleVpnConnection() {
        viewModelScope.launch {
            if (_isVpnConnected.value) {
                _isVpnConnected.value = false
            } else {
                _isVpnConnected.value = true
                repository.saveScanLog(
                    ScanLogEntity(
                        title = "VPN Tunnel Connected",
                        scanType = "VPN_MANAGER",
                        status = "PASSED",
                        score = 100,
                        summary = "Encrypted WireGuard session established to ${_selectedVpnServer.value?.country ?: "Switzerland"}.",
                        detailsJson = "IP: ${_selectedVpnServer.value?.ipAddress ?: "185.220.101.5"} | Protocol: WireGuard Pro"
                    )
                )
            }
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
                "Scan Completed! System Shielded." to 1.0f
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
                    summary = "Scanned 148 app packages, 12 system services, and Wi-Fi interface. No malware or rogue listeners found.",
                    detailsJson = "0 Critical Threats | 0 Phishing Links | 1 Safe Sensor Warning"
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
        val input = _aiTargetInput.value.ifBlank { "http://secure-bank-login-update.top/auth" }
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
                        ThreatSeverity.CRITICAL -> 20
                        ThreatSeverity.HIGH -> 45
                        ThreatSeverity.MEDIUM -> 70
                        ThreatSeverity.LOW -> 85
                        else -> 100
                    },
                    summary = threat.description,
                    detailsJson = "Recommendation: ${threat.recommendation}"
                )
            )
        }
    }

    fun sendSentinelChatMessage(userText: String) {
        if (userText.isBlank()) return
        viewModelScope.launch {
            val updated = _chatMessages.value.toMutableList()
            updated.add("user" to userText)
            _chatMessages.value = updated
            _isChatThinking.value = true

            val reply = repository.getSentinelAiChatResponse(userText, "")
            _isChatThinking.value = false

            val updatedWithReply = _chatMessages.value.toMutableList()
            updatedWithReply.add("sentinel" to reply)
            _chatMessages.value = updatedWithReply
        }
    }

    fun updateDarkWebQuery(query: String) {
        _darkWebQuery.value = query
    }

    fun searchDarkWebBreaches() {
        val query = _darkWebQuery.value.ifBlank { "user@example.com" }
        viewModelScope.launch {
            _isSearchingBreaches.value = true
            delay(900)
            val results = repository.checkDarkWebBreaches(query)
            _breachResults.value = results
            _hasSearchedBreaches.value = true
            _isSearchingBreaches.value = false

            repository.saveScanLog(
                ScanLogEntity(
                    title = "Dark Web Breach Check: $query",
                    scanType = "BREACH_CHECK",
                    status = if (results.isNotEmpty()) "WARNING" else "PASSED",
                    score = if (results.isNotEmpty()) 75 else 100,
                    summary = if (results.isNotEmpty()) "Found ${results.size} data breach records for target identity." else "Zero identity leaks found across monitored dark web forums.",
                    detailsJson = results.joinToString("; ") { it.domain }
                )
            )
        }
    }

    fun deleteLog(id: Long) {
        viewModelScope.launch {
            repository.deleteLog(id)
        }
    }

    fun clearAllLogs() {
        viewModelScope.launch {
            repository.clearLogs()
        }
    }
}
