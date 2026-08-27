package com.example

import android.app.Activity
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.CapabilityEvidence
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.ui.components.CapabilityModuleHeader
import com.example.ui.screens.AiScannerScreen
import com.example.ui.screens.CallSecurityScreen
import com.example.ui.screens.DarkWebMonitorScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.ImsiRadarScreen
import com.example.ui.screens.LegalProtectionScreen
import com.example.ui.screens.NetworkSpeedScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.SubscriptionScreen
import com.example.ui.screens.VpnManagerScreen
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.SentinelShieldTheme
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    private val vpnConsentLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) viewModel.onVpnConsentGranted() else viewModel.onVpnConsentDenied()
    }

    private val wireGuardProfileLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching {
                contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                    ?: error("Could not read selected WireGuard profile")
            }.onSuccess { text -> viewModel.importWireGuardProfile(text) }
                .onFailure { viewModel.reportVpnError(it.message ?: "Could not import WireGuard profile") }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        lifecycleScope.launch { viewModel.vpnConsentRequest.collect(vpnConsentLauncher::launch) }
        setContent {
            SentinelShieldTheme {
                SentinelShieldApp(
                    viewModel = viewModel,
                    onImportWireGuardProfile = { wireGuardProfileLauncher.launch(arrayOf("application/octet-stream", "text/plain", "*/*")) }
                )
            }
        }
    }
}

enum class SentinelTab(val title: String, val icon: ImageVector, val tag: String) {
    SHIELD("Shield", Icons.Default.Security, "tab_nav_shield"),
    RADAR("Radar", Icons.Default.Security, "tab_nav_radar"),
    VPN("VPN", Icons.Default.Security, "tab_nav_vpn"),
    CALLS("Call Sec", Icons.Default.Security, "tab_nav_call_sec"),
    LEGAL("Legal", Icons.Default.Security, "tab_nav_legal"),
    VAULT("Vault", Icons.Default.Star, "tab_nav_vault")
}

private enum class SecondaryScreen { AI, NETWORK, DARK_WEB, SUBSCRIPTION, SETTINGS, HELP }

private enum class DrawerDestination { SUBSCRIPTION, SETTINGS, HELP }

@Composable
fun SentinelShieldApp(viewModel: MainViewModel, onImportWireGuardProfile: () -> Unit = {}) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var secondary by remember { mutableStateOf<SecondaryScreen?>(null) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val drawerScope = rememberCoroutineScope()
    val tabs = SentinelTab.values()
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val evidenceSnapshot = remember(evidence) { CapabilityEvidenceSnapshot.from(evidence) }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                modifier = Modifier.widthIn(max = 330.dp),
                drawerContainerColor = DarkBackground,
                drawerContentColor = TextPrimary,
                windowInsets = WindowInsets(0, 0, 0, 0)
            ) {
                SentinelSideMenu(
                    secondary = secondary,
                    onDestination = { destination ->
                        drawerScope.launch { drawerState.close() }
                        secondary = when (destination) {
                            DrawerDestination.SUBSCRIPTION -> SecondaryScreen.SUBSCRIPTION
                            DrawerDestination.SETTINGS -> SecondaryScreen.SETTINGS
                            DrawerDestination.HELP -> SecondaryScreen.HELP
                        }
                    }
                )
            }
        }
    ) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            bottomBar = {
                NavigationBar(
                    containerColor = DarkCard,
                    contentColor = CyberGreen,
                    modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars).testTag("bottom_navigation_bar")
                ) {
                    tabs.forEachIndexed { index, tab ->
                        NavigationBarItem(
                            selected = secondary == null && selectedTab == index,
                            onClick = { secondary = null; selectedTab = index },
                            icon = { Icon(tab.icon, contentDescription = tab.title) },
                            label = { Text(tab.title, fontSize = 10.sp, fontWeight = if (secondary == null && selectedTab == index) FontWeight.Bold else FontWeight.Normal) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = CyberGreen,
                                selectedTextColor = CyberGreen,
                                indicatorColor = CyberGreen.copy(alpha = .15f),
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted
                            ),
                            modifier = Modifier.testTag(tab.tag)
                        )
                    }
                }
            }
        ) { innerPadding ->
            Column(Modifier.fillMaxSize().background(DarkBackground).padding(innerPadding)) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .background(DarkBackground)
                        .padding(horizontal = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (secondary != null) {
                        IconButton(
                            onClick = { secondary = null },
                            modifier = Modifier.testTag("header_back")
                        ) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Natrag", tint = CyberGreen)
                        }
                    } else {
                        IconButton(
                            onClick = { drawerScope.launch { drawerState.open() } },
                            modifier = Modifier.testTag("open_side_menu")
                        ) {
                            Icon(Icons.Default.Menu, contentDescription = "Otvori bočni izbornik", tint = CyberGreen)
                        }
                    }
                    Spacer(Modifier.width(4.dp))
                    Column(Modifier.weight(1f)) {
                        Text("SENTINEL SHIELD", color = CyberGreen, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, fontSize = 15.sp)
                        if (secondary == null) {
                            Text("Zaštita u stvarnom vremenu", color = TextMuted, fontSize = 10.sp, letterSpacing = .8.sp)
                        }
                    }
                }

                Box(Modifier.weight(1f)) {
                    when {
                        secondary == SecondaryScreen.AI -> EvidenceWrappedScreen(evidenceSnapshot, CapabilityId.AI_THREAT_ANALYSIS) { AiScannerScreen(viewModel) }
                        secondary == SecondaryScreen.NETWORK -> EvidenceWrappedScreen(evidenceSnapshot, CapabilityId.NETWORK_AUDIT) { NetworkSpeedScreen(viewModel) }
                        secondary == SecondaryScreen.DARK_WEB -> EvidenceWrappedScreen(evidenceSnapshot, CapabilityId.DARK_WEB_LOOKUP) { DarkWebMonitorScreen(viewModel) }
                        secondary == SecondaryScreen.SUBSCRIPTION -> SubscriptionScreen(viewModel)
                        secondary == SecondaryScreen.SETTINGS -> SettingsScreen()
                        secondary == SecondaryScreen.HELP -> HelpSupportScreen()
                        else -> when (selectedTab) {
                            0 -> DashboardScreen(
                                viewModel = viewModel,
                                onNavigateToAiScanner = { secondary = SecondaryScreen.AI },
                                onNavigateToRadar = { secondary = null; selectedTab = 1 },
                                onNavigateToVpn = { secondary = null; selectedTab = 2 },
                                onNavigateToCallSecurity = { secondary = null; selectedTab = 3 },
                                onNavigateToLegal = { secondary = null; selectedTab = 4 },
                                onNavigateToDarkWeb = { secondary = SecondaryScreen.DARK_WEB },
                                onNavigateToNetwork = { secondary = SecondaryScreen.NETWORK }
                            )
                            1 -> ImsiRadarScreen(viewModel)
                            2 -> VpnManagerScreen(viewModel, onImportWireGuardProfile)
                            3 -> CallSecurityScreen(viewModel)
                            4 -> EvidenceWrappedScreen(evidenceSnapshot, CapabilityId.LEGAL_GUIDANCE) { LegalProtectionScreen() }
                            5 -> SettingsScreen()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SentinelSideMenu(
    secondary: SecondaryScreen?,
    onDestination: (DrawerDestination) -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 14.dp, vertical = 22.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 6.dp)) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(CyberGreen.copy(alpha = .12f))
                    .border(1.dp, CyberGreen.copy(alpha = .55f), RoundedCornerShape(14.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Security, contentDescription = null, tint = CyberGreen, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text("SENTINEL SHIELD", color = CyberGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                Text("Verzija 2.8 PRO", color = TextMuted, fontSize = 10.sp, letterSpacing = 1.sp)
            }
        }

        Spacer(Modifier.height(26.dp))
        Text("IZBORNIK", color = TextMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp, modifier = Modifier.padding(horizontal = 8.dp))
        Spacer(Modifier.height(8.dp))

        SideMenuItem(
            title = "Pretplata & Licence",
            subtitle = "Vault & Pro aktivacija",
            icon = Icons.Default.Star,
            selected = secondary == SecondaryScreen.SUBSCRIPTION,
            testTag = "drawer_subscription",
            onClick = { onDestination(DrawerDestination.SUBSCRIPTION) }
        )
        SideMenuItem(
            title = "Postavke",
            subtitle = "Jezik, izgled i aplikacija",
            icon = Icons.Default.Settings,
            selected = secondary == SecondaryScreen.SETTINGS,
            testTag = "drawer_settings",
            onClick = { onDestination(DrawerDestination.SETTINGS) }
        )
        SideMenuItem(
            title = "Pomoć & Podrška",
            subtitle = "Vodiči i sigurnosne informacije",
            icon = Icons.Default.HelpOutline,
            selected = secondary == SecondaryScreen.HELP,
            testTag = "drawer_help",
            onClick = { onDestination(DrawerDestination.HELP) }
        )

        Spacer(Modifier.weight(1f))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(DarkCard)
                .border(1.dp, DarkCardBorder, RoundedCornerShape(18.dp))
                .padding(16.dp)
        ) {
            Column {
                Text("LOCAL-FIRST SECURITY", color = CyberGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Dokazi ostaju lokalni kada izvor to dopušta. Stanje se prikazuje kroz VERIFIED / UNVERIFIED / UNAVAILABLE.",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    lineHeight = 15.sp
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text("Sentinel Shield Pro · Security Control Center", color = TextMuted, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 6.dp))
    }
}

@Composable
private fun SideMenuItem(
    title: String,
    subtitle: String,
    icon: ImageVector,
    selected: Boolean,
    testTag: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(if (selected) CyberGreen.copy(alpha = .12f) else Color.Transparent)
            .border(1.dp, if (selected) CyberGreen.copy(alpha = .55f) else DarkCardBorder, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 13.dp)
            .testTag(testTag),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (selected) CyberGreen.copy(alpha = .16f) else DarkCard),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) CyberGreen else TextSecondary, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = if (selected) CyberGreen else TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(2.dp))
            Text(subtitle, color = TextMuted, fontSize = 10.sp)
        }
        Box(
            modifier = Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(if (selected) CyberGreen else Color.Transparent)
                .border(1.dp, if (selected) CyberGreen else TextMuted.copy(alpha = .45f), CircleShape)
        )
    }
}

@Composable
private fun HelpSupportScreen() {
    Column(
        Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(16.dp)
    ) {
        Text("POMOĆ & PODRŠKA", color = CyberGreen, fontSize = 18.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        Spacer(Modifier.height(6.dp))
        Text("Sentinel Shield kontrola i tumačenje sigurnosnih stanja.", color = TextSecondary, fontSize = 12.sp)
        Spacer(Modifier.height(18.dp))

        HelpCard("VERIFIED", "Dokaz je dobiven iz definiranog izvora i još je unutar razdoblja svježine.")
        HelpCard("UNVERIFIED", "Podatak postoji ili je mjeren, ali nije dovoljan za snažnu sigurnosnu tvrdnju ili je istekao.")
        HelpCard("UNAVAILABLE", "Izvor podataka nije dostupan ili nema potrebne dozvole/konfiguraciju.")
        HelpCard("VPN SIGURNOST", "Sentinel prikazuje povezani tunel tek nakon lifecycle i handshake provjere; ne predstavlja samo uključeni prekidač kao dokaz zaštite.")
    }
}

@Composable
private fun HelpCard(title: String, body: String) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(DarkCard)
            .border(1.dp, DarkCardBorder, RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(title, color = CyberGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(5.dp))
        Text(body, color = TextSecondary, fontSize = 12.sp, lineHeight = 17.sp)
    }
}

@Composable
private fun EvidenceWrappedScreen(
    evidence: CapabilityEvidenceSnapshot,
    capabilityId: CapabilityId,
    content: @Composable () -> Unit
) {
    Column(Modifier.fillMaxSize().padding(horizontal = 10.dp)) {
        CapabilityModuleHeader(evidence.get(capabilityId))
        Box(Modifier.weight(1f)) {
            content()
        }
    }
}
