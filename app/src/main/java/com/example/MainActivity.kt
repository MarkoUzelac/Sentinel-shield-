package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.ui.screens.AiScannerScreen
import com.example.ui.screens.DarkWebMonitorScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.JurisdictionScreen
import com.example.ui.screens.NetworkSpeedScreen
import com.example.ui.screens.SubscriptionScreen
import com.example.ui.screens.VpnManagerScreen
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.SentinelShieldTheme
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SentinelShieldTheme {
                SentinelShieldApp(viewModel = viewModel)
            }
        }
    }
}

enum class SentinelTab(val title: String, val icon: ImageVector, val tag: String) {
    DASHBOARD("Shield", Icons.Default.Security, "tab_nav_shield"),
    AI_SCANNER("AI Threat", Icons.Default.Psychology, "tab_nav_ai"),
    NETWORK("Network", Icons.Default.Wifi, "tab_nav_network"),
    VPN("VPN", Icons.Default.VpnKey, "tab_nav_vpn"),
    DARK_WEB("Dark Web", Icons.Default.Language, "tab_nav_darkweb"),
    VAULT("Vault", Icons.Default.Star, "tab_nav_vault")
}

@Composable
fun SentinelShieldApp(viewModel: MainViewModel) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = SentinelTab.values()

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar(
                containerColor = DarkCard,
                contentColor = CyberCyan,
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .testTag("bottom_navigation_bar")
            ) {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.title
                            )
                        },
                        label = {
                            Text(
                                text = tab.title,
                                fontSize = 11.sp,
                                fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = CyberCyan,
                            selectedTextColor = CyberCyan,
                            indicatorColor = CyberCyan.copy(alpha = 0.15f),
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted
                        ),
                        modifier = Modifier.testTag(tab.tag)
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkBackground)
                .padding(innerPadding)
        ) {
            when (selectedTab) {
                0 -> DashboardScreen(
                    viewModel = viewModel,
                    onNavigateToAiScanner = { selectedTab = 1 },
                    onNavigateToNetwork = { selectedTab = 2 },
                    onNavigateToVpn = { selectedTab = 3 },
                    onNavigateToDarkWeb = { selectedTab = 4 }
                )
                1 -> AiScannerScreen(viewModel = viewModel)
                2 -> NetworkSpeedScreen(viewModel = viewModel)
                3 -> VpnManagerScreen(viewModel = viewModel)
                4 -> DarkWebMonitorScreen(viewModel = viewModel)
                5 -> SubscriptionScreen(viewModel = viewModel)
            }
        }
    }
}
