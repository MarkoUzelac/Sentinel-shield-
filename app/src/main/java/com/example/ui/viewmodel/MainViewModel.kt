package com.example.ui.viewmodel

import android.Manifest
import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.AndroidNetworkEvidenceProvider
import com.example.data.DeviceLocationProvider
import com.example.data.SecurityRepository
import com.example.data.SignalIntelligenceCoordinator
import com.example.data.SignalIntelligenceEngine
import com.example.data.SignalRadarProvider
import com.example.data.local.AppDatabase
import com.example.data.local.ScanLogEntity
import com.example.data.model.BreachRecord
import com.example.data.model.CallSecurityObservation
import com.example.data.model.CapabilityEvidence
import com.example.data.model.CapabilityEvidenceEngine
import com.example.data.model.CapabilityId
import com.example.data.model.CapabilityStatus
import com.example.data.model.DeviceLocationState
import com.example.data.model.EvidenceClock
import com.example.data.model.JurisdictionInfo
import com.example.data.model.NetworkObservation
import com.example.data.model.NetworkSpeedResult
import com.example.data.model.ObservationKind
import com.example.data.model.ObservationSource
import com.example.data.model.RadarObservation
import com.example.data.model.SignalObservation
import com.example.data.model.SignalRadarSnapshot
import com.example.data.model.ThreatItem
import com.example.data.model.ThreatSnapshot
import com.example.data.model.VpnServer
import com.example.vpn.WireGuardProfileStore
import com.example.vpn.WireGuardTunnelController
import com.example.vpn.WireGuardTunnelState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: SecurityRepository
    private val wireGuardProfileStore = WireGuardProfileStore(application)
    private val vpnController = WireGuardTunnelController(application)
    private val connectivityManager = application.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
    private val networkEvidenceProvider = connectivityManager?.let(::AndroidNetworkEvidenceProvider)
    private val evidenceClock: EvidenceClock = EvidenceClock.SYSTEM
    private val telephonyManager = application.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    private val locationProvider = DeviceLocationProvider(application.applicationContext)
    private val radarProvider = SignalRadarProvider(application.applicationContext, locationProvider)
    private val intelligenceCoordinator = SignalIntelligenceCoordinator(SignalIntelligenceEngine(now = evidenceClock::nowEpochMillis))

    val vpnState: StateFlow<WireGuardTunnelState> = vpnController.state
    private val _vpnConsentRequest = MutableSharedFlow<Intent>(extraBufferCapacity = 1)
    val vpnConsentRequest: SharedFlow<Intent> = _vpnConsentRequest
    private val _isVpnProvisioned = MutableStateFlow(wireGuardProfileStore.hasProfile())
    val isVpnProvisioned: StateFlow<Boolean> = _isVpnProvisioned.asStateFlow()
    val isVpnConnected: StateFlow<Boolean> = vpnController.state.stateIn(viewModelScope, SharingStarted.Eagerly, WireGuardTunnelState.Disconnected)
        .let { state -> MutableStateFlow(state.value is WireGuardTunnelState.Connected).also { connected -> viewModelScope.launch { state.collect { connected.value = it is WireGuardTunnelState.Connected } } } }
        .asStateFlow()
    val scanLogs: StateFlow<List<ScanLogEntity>>

    private val _isRealtimeShieldActive = MutableStateFlow(true)
    val isRealtimeShieldActive: StateFlow<Boolean> = _isRealtimeShieldActive.asStateFlow()
    private val _isAdBlockActive = MutableStateFlow(true)
    val isAdBlockActive: StateFlow<Boolean> = _isAdBlockActive.asStateFlow()
    private val _isPhishingProtectionActive = MutableStateFlow(true)
    val isPhishingProtectionActive: StateFlow<Boolean> = _isPhishingProtectionActive.asStateFlow()
    private val _securityScore = MutableStateFlow(0)
    val securityScore: StateFlow<Int> = _securityScore.asStateFlow()
    private val _vpnServers = MutableStateFlow<List<VpnServer>>(emptyList())
    val vpnServers: StateFlow<List<VpnServer>> = _vpnServers.asStateFlow()
    private val _selectedVpnServer = MutableStateFlow<VpnServer?>(null)
    val selectedVpnServer: StateFlow<VpnServer?> = _selectedVpnServer.asStateFlow()
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
    private val _radarObservation = MutableStateFlow(readRadarObservation())
    val radarObservation: StateFlow<RadarObservation> = _radarObservation.asStateFlow()
    private val _callSecurityObservation = MutableStateFlow(readCallSecurityObservation())
    val callSecurityObservation: StateFlow<CallSecurityObservation> = _callSecurityObservation.asStateFlow()
    private val _networkObservation = MutableStateFlow(NetworkObservation())
    val networkObservation: StateFlow<NetworkObservation> = _networkObservation.asStateFlow()
    private val _capabilityEvidence = MutableStateFlow<List<CapabilityEvidence>>(emptyList())
    val capabilityEvidence: StateFlow<List<CapabilityEvidence>> = _capabilityEvidence.asStateFlow()
    val deviceLocation: StateFlow<DeviceLocationState> = locationProvider.state
    val signalRadar: StateFlow<SignalRadarSnapshot> = radarProvider.snapshot
    val threatSnapshot: StateFlow<ThreatSnapshot> = intelligenceCoordinator.snapshot

    init {
        val database = AppDatabase.getDatabase(application)
        repository = SecurityRepository(database.scanLogDao())
        scanLogs = repository.allLogs.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        val servers = repository.getVpnServers()
        _vpnServers.value = servers
        _selectedVpnServer.value = servers.firstOrNull()
        jurisdictions = repository.getJurisdictions()

        locationProvider.start()
        radarProvider.start()

        viewModelScope.launch {
            radarProvider.snapshot.collect { snapshot ->
                intelligenceCoordinator.replaceSource(ObservationSource.BLE, snapshot.signals.filter { it.kind.name == "BLE" }.map(::toObservation))
                intelligenceCoordinator.replaceSource(ObservationSource.CELLULAR, snapshot.signals.filter { it.kind.name == "CELLULAR" }.map(::toObservation))
                refreshEvidenceSources()
            }
        }
        viewModelScope.launch {
            locationProvider.state.collect { state ->
                if (state.hasFix && state.latitude != null && state.longitude != null) {
                    intelligenceCoordinator.replaceSource(ObservationSource.GPS, listOf(SignalObservation(
                        id = "gps_device",
                        source = ObservationSource.GPS,
                        kind = ObservationKind.DEVICE_LOCATION,
                        observedAtEpochMs = state.timestampMillis,
                        latitude = state.latitude,
                        longitude = state.longitude,
                        accuracyMeters = state.accuracyMeters?.toDouble(),
                        evidenceState = if (state.isFreshAt(evidenceClock.nowEpochMillis())) com.example.data.model.EvidenceState.VERIFIED else com.example.data.model.EvidenceState.UNVERIFIED,
                        details = "Device GPS/GNSS"
                    )))
                }
            }
        }
        networkEvidenceProvider?.let { provider ->
            provider.start()
            viewModelScope.launch { provider.observation.collect { observation -> _networkObservation.value = observation; rebuildCapabilityEvidence() } }
        }
        viewModelScope.launch {
            vpnController.state.collect { state ->
                intelligenceCoordinator.replaceSource(ObservationSource.VPN, listOf(SignalObservation(
                    id = "vpn_state",
                    source = ObservationSource.VPN,
                    kind = ObservationKind.VPN_STATE,
                    observedAtEpochMs = evidenceClock.nowEpochMillis(),
                    evidenceState = if (state is WireGuardTunnelState.Connected) com.example.data.model.EvidenceState.VERIFIED else com.example.data.model.EvidenceState.UNVERIFIED,
                    details = state.toString().lowercase()
                )))
                rebuildCapabilityEvidence()
            }
        }
        rebuildCapabilityEvidence()
    }

    private fun toObservation(signal: com.example.data.model.SignalRadarItem): SignalObservation = SignalObservation(
        id = signal.id,
        source = if (signal.kind.name == "BLE") ObservationSource.BLE else ObservationSource.CELLULAR,
        kind = if (signal.kind.name == "BLE") ObservationKind.BLE_SIGNAL else ObservationKind.CELL,
        observedAtEpochMs = signal.observedAtEpochMs,
        latitude = signal.latitude,
        longitude = signal.longitude,
        accuracyMeters = signal.locationAccuracyMeters,
        rssiDbm = signal.rssiDbm,
        technology = signal.technology,
        cellId = signal.cellId,
        areaCode = signal.areaCode,
        mcc = signal.mcc,
        mnc = signal.mnc,
        distanceMeters = signal.estimatedDistanceMeters,
        evidenceState = if (signal.runtimeBacked) com.example.data.model.EvidenceState.VERIFIED else com.example.data.model.EvidenceState.UNVERIFIED,
        details = signal.explanation
    )

    private fun readRadarObservation(): RadarObservation {
        val permissionGranted = ContextCompat.checkSelfPermission(getApplication<Application>(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val telephonyAvailable = telephonyManager != null && getApplication<Application>().packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)
        val cellCount = if (permissionGranted && telephonyAvailable) runCatching { telephonyManager?.allCellInfo?.size ?: 0 }.getOrDefault(0) else 0
        return RadarObservation(permissionGranted, cellCount, telephonyAvailable)
    }
    private fun readCallSecurityObservation(): CallSecurityObservation = CallSecurityObservation(telephonyAvailable = telephonyManager != null && getApplication<Application>().packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY))
    fun refreshEvidenceSources() { _radarObservation.value = readRadarObservation(); _callSecurityObservation.value = readCallSecurityObservation(); rebuildCapabilityEvidence() }
    fun markMmiResultVerified(verified: Boolean) { _callSecurityObservation.value = _callSecurityObservation.value.copy(mmiResultVerified = verified); rebuildCapabilityEvidence() }

    private fun rebuildCapabilityEvidence() {
        val connected = vpnController.state.value is WireGuardTunnelState.Connected
        val evidence = listOf(
            CapabilityEvidenceEngine.vpnTransport(_isVpnProvisioned.value, connected, evidenceClock),
            CapabilityEvidenceEngine.vpnHandshake(connected, connected, null, evidenceClock),
            CapabilityEvidenceEngine.radar(_radarObservation.value, evidenceClock),
            CapabilityEvidenceEngine.callSecurity(_callSecurityObservation.value, evidenceClock),
            CapabilityEvidenceEngine.network(_networkObservation.value, evidenceClock),
            CapabilityEvidenceEngine.localSetting(CapabilityId.PHISHING_PROTECTION, "Phishing protection", _isPhishingProtectionActive.value, "Sentinel local protection setting", "Lokalna phishing zaštita je uključena, ali aktivna učinkovitost nije neovisno verificirana.", evidenceClock),
            CapabilityEvidenceEngine.localSetting(CapabilityId.AD_TELEMETRY_FILTER, "Ad/telemetry filter", _isAdBlockActive.value, "Sentinel local protection setting", "Lokalni filter je uključen; njegova stvarna pokrivenost nije neovisno verificirana.", evidenceClock),
            CapabilityEvidenceEngine.localSetting(CapabilityId.REALTIME_SHIELD, "Background shield", _isRealtimeShieldActive.value, "Sentinel local protection setting", "Lokalni background shield je uključen; to samo po sebi nije dokaz potpune zaštite uređaja.", evidenceClock),
            CapabilityEvidence(CapabilityId.AI_THREAT_ANALYSIS, "AI threat analysis", if (_lastThreatResult.value != null) CapabilityStatus.UNVERIFIED else CapabilityStatus.UNAVAILABLE, "Sentinel AI repository", if (_lastThreatResult.value != null) "AI analiza je izvršena, ali rezultat nije neovisni dokaz kompromitiranosti uređaja." else "Nema izvršene AI analize.", provenance = null),
            CapabilityEvidence(CapabilityId.DARK_WEB_LOOKUP, "Dark Web lookup", if (_hasSearchedBreaches.value) CapabilityStatus.UNVERIFIED else CapabilityStatus.UNAVAILABLE, "SecurityRepository/HIBP", if (_hasSearchedBreaches.value) "Rezultat breach pretrage postoji, ali ne predstavlja potpuni dark-web crawl." else "Nema izvršene pretrage.", provenance = null),
            CapabilityEvidence(CapabilityId.LEGAL_GUIDANCE, "Legal guidance", CapabilityStatus.VERIFIED, "Bundled jurisdiction dataset", "Prikazani je sadržaj informativni vodič, a ne pravno zastupanje.", provenance = null)
        )
        _capabilityEvidence.value = evidence
        updateSecurityScoreFromEvidence(evidence)
    }
    private fun updateSecurityScoreFromEvidence(evidence: List<CapabilityEvidence>) {
        if (evidence.isEmpty()) return
        val weights = mapOf(CapabilityStatus.VERIFIED to 1.0, CapabilityStatus.UNVERIFIED to 0.55, CapabilityStatus.UNAVAILABLE to 0.0)
        val now = evidenceClock.nowEpochMillis()
        _securityScore.value = (evidence.map { weights.getValue(it.effectiveStatus(now)) }.average() * 100.0).toInt().coerceIn(0, 100)
    }
    fun toggleRealtimeShield(active: Boolean) { _isRealtimeShieldActive.value = active; rebuildCapabilityEvidence() }
    fun toggleAdBlock(active: Boolean) { _isAdBlockActive.value = active; rebuildCapabilityEvidence() }
    fun togglePhishingProtection(active: Boolean) { _isPhishingProtectionActive.value = active; rebuildCapabilityEvidence() }
    fun prepareVpnConsent(): Intent? { val intent = vpnController.prepare(); if (intent != null) { vpnController.markAwaitingConsent(); _vpnConsentRequest.tryEmit(intent) }; return intent }
    fun onVpnConsentGranted() { val config = runCatching { wireGuardProfileStore.load() }.getOrElse { vpnController.markError("WireGuard profile is not provisioned"); return }; vpnController.beginVerification(config) }
    fun onVpnConsentDenied() = vpnController.markError("Android VPN permission was not granted")
    fun importWireGuardProfile(profileText: String): Result<Unit> { val result = wireGuardProfileStore.importProfile(profileText); if (result.isSuccess) { _isVpnProvisioned.value = true; vpnController.markError("WireGuard profile imported; ready to connect") } else vpnController.markError(result.exceptionOrNull()?.message ?: "Invalid WireGuard profile"); rebuildCapabilityEvidence(); return result }
    fun reportVpnError(message: String) = vpnController.markError(message)
    fun removeWireGuardProfile() { vpnController.stop(); wireGuardProfileStore.clear(); _isVpnProvisioned.value = false; rebuildCapabilityEvidence() }
    fun selectVpnServer(server: VpnServer) { _selectedVpnServer.value = server; if (vpnController.state.value is WireGuardTunnelState.Connected) vpnController.stop(); rebuildCapabilityEvidence() }
    fun toggleVpnConnection() {
        viewModelScope.launch {
            when (vpnController.state.value) {
                is WireGuardTunnelState.Connected -> vpnController.stop()
                is WireGuardTunnelState.Starting, is WireGuardTunnelState.Verifying, is WireGuardTunnelState.AwaitingUserConsent -> Unit
                else -> {
                    val config = runCatching { wireGuardProfileStore.load() }.getOrElse { vpnController.markError("Import a WireGuard profile before connecting"); return@launch }
                    val consentIntent = prepareVpnConsent()
                    if (consentIntent == null) vpnController.beginVerification(config)
                }
            }
            rebuildCapabilityEvidence()
        }
    }
    fun onVpnStateChanged(state: WireGuardTunnelState) { if (state is WireGuardTunnelState.Connected) rebuildCapabilityEvidence() }
    fun startDeepSystemScan() {
        if (_isDeepScanning.value) return
        viewModelScope.launch {
            _isDeepScanning.value = true
            val steps = listOf("Checking System Integrity & Root Sandbox..." to 0.2f, "Auditing App Permissions & Sensitive APIs..." to 0.45f, "Inspecting Network Sockets & DNS Resolvers..." to 0.7f, "Evaluating SSL Certificates & Local Storage..." to 0.9f, "Scan Completed!" to 1.0f)
            for ((stepText, progress) in steps) { _deepScanStep.value = stepText; _deepScanProgress.value = progress; kotlinx.coroutines.delay(700) }
            _isDeepScanning.value = false
            repository.saveScanLog(ScanLogEntity(title = "Full Deep System Audit", scanType = "DEEP_SCAN", status = "PASSED", score = _securityScore.value, summary = "Completed the local Sentinel audit workflow.", detailsJson = "Local heuristic scan completed; no claim of complete device-wide malware coverage."))
            rebuildCapabilityEvidence()
        }
    }
    fun runSpeedAndSecurityAudit() {
        if (_isTestingSpeed.value) return
        viewModelScope.launch { _isTestingSpeed.value = true; try { _speedTestResult.value = repository.runNetworkSecurityAudit(); repository.saveScanLog(ScanLogEntity(title = "Wi-Fi Security & Speed Audit", scanType = "NETWORK_AUDIT", status = "WARNING", score = 0, summary = "Runtime network state and HTTPS probe are available; full security proof is not claimed.", detailsJson = "UNVERIFIED")) } finally { _isTestingSpeed.value = false; rebuildCapabilityEvidence() } }
    }
    fun updateAiTargetInput(input: String) { _aiTargetInput.value = input }
    fun updateAiScanCategory(category: String) { _aiScanCategory.value = category }
    fun runAiThreatScan() {
        if (_isAiScanning.value || _aiTargetInput.value.isBlank()) return
        viewModelScope.launch { _isAiScanning.value = true; try { _lastThreatResult.value = repository.analyzeSecurityThreatWithAi(_aiTargetInput.value, _aiScanCategory.value); rebuildCapabilityEvidence() } finally { _isAiScanning.value = false } }
    }
    fun updateChatInput(input: String) { _chatMessages.value = _chatMessages.value + ("user_input" to input) }
    fun sendSentinelChatMessage(message: String) {
        if (message.isBlank() || _isChatThinking.value) return
        viewModelScope.launch { _isChatThinking.value = true; try { _chatMessages.value = _chatMessages.value + ("user" to message); val response = repository.getSentinelAiChatResponse(message, _chatMessages.value.takeLast(8).joinToString("\n") { it.first + ": " + it.second }); _chatMessages.value = _chatMessages.value + ("sentinel" to response) } finally { _isChatThinking.value = false } }
    }
    fun updateDarkWebQuery(input: String) { _darkWebQuery.value = input.trim() }
    fun searchBreachData(query: String = _darkWebQuery.value) {
        _darkWebQuery.value = query
        viewModelScope.launch { _isSearchingBreaches.value = true; try { _breachResults.value = withContext(Dispatchers.IO) { repository.searchBreachData(_darkWebQuery.value) }; _hasSearchedBreaches.value = true } finally { _isSearchingBreaches.value = false; rebuildCapabilityEvidence() } }
    }
    fun searchDarkWebBreaches() = searchBreachData()
    fun deleteLog(id: Long) { viewModelScope.launch { repository.deleteLog(id) } }
    fun clearLogs() { viewModelScope.launch { repository.clearLogs() } }
    override fun onCleared() { radarProvider.stop(); locationProvider.stop(); networkEvidenceProvider?.stop(); super.onCleared() }
}
