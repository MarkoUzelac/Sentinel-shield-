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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.screens.AiScannerScreen
import com.example.ui.screens.CallSecurityScreen
import com.example.ui.screens.DarkWebMonitorScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.ImsiRadarScreen
import com.example.ui.screens.LegalProtectionScreen
import com.example.ui.screens.NetworkSpeedScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.VpnManagerScreen
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.SentinelShieldTheme
import com.example.ui.theme.TextMuted
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
    RADAR("Radar", Icons.Default.Radar, "tab_nav_radar"),
    VPN("VPN", Icons.Default.VpnKey, "tab_nav_vpn"),
    CALLS("Call Sec", Icons.Default.Call, "tab_nav_call_sec"),
    LEGAL("Legal", Icons.Default.Gavel, "tab_nav_legal"),
    VAULT("Vault", Icons.Default.Star, "tab_nav_vault")
}

private enum class SecondaryScreen { AI, NETWORK, DARK_WEB }

@Composable
fun SentinelShieldApp(viewModel: MainViewModel, onImportWireGuardProfile: () -> Unit = {}) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var secondary by remember { mutableStateOf<SecondaryScreen?>(null) }
    val tabs = SentinelTab.values()

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
            if (secondary != null) {
                Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { secondary = null }) { Icon(Icons.Default.ArrowBack, contentDescription = "Natrag", tint = CyberGreen) }
                    Spacer(Modifier.width(4.dp))
                    Text("SENTINEL SHIELD", color = CyberGreen, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }
            Box(Modifier.weight(1f)) {
                when {
                    secondary == SecondaryScreen.AI -> AiScannerScreen(viewModel)
                    secondary == SecondaryScreen.NETWORK -> NetworkSpeedScreen(viewModel)
                    secondary == SecondaryScreen.DARK_WEB -> DarkWebMonitorScreen(viewModel)
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
                        1 -> ImsiRadarScreen()
                        2 -> VpnManagerScreen(viewModel, onImportWireGuardProfile)
                        3 -> CallSecurityScreen()
                        4 -> LegalProtectionScreen()
                        5 -> SettingsScreen()
                    }
                }
            }
        }
    }
}
