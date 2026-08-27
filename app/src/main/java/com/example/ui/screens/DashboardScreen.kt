package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.ScanLogEntity
import com.example.ui.components.QuickActionButton
import com.example.ui.components.ShieldGaugeCard
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.CyberOrange
import com.example.ui.theme.CyberRed
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: MainViewModel,
    onNavigateToAiScanner: () -> Unit,
    onNavigateToNetwork: () -> Unit,
    onNavigateToVpn: () -> Unit,
    onNavigateToDarkWeb: () -> Unit,
    modifier: Modifier = Modifier
) {
    val score by viewModel.securityScore.collectAsState()
    val isScanning by viewModel.isDeepScanning.collectAsState()
    val scanProgress by viewModel.deepScanProgress.collectAsState()
    val scanStep by viewModel.deepScanStep.collectAsState()

    val isRealtimeShieldActive by viewModel.isRealtimeShieldActive.collectAsState()
    val isAdBlockActive by viewModel.isAdBlockActive.collectAsState()
    val isPhishingProtectionActive by viewModel.isPhishingProtectionActive.collectAsState()
    val isVpnConnected by viewModel.isVpnConnected.collectAsState()
    val selectedServer by viewModel.selectedVpnServer.collectAsState()
    val logs by viewModel.scanLogs.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            // App Title Header Banner
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(CyberCyan.copy(alpha = 0.2f))
                        .border(1.dp, CyberCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = null,
                        tint = CyberCyan,
                        modifier = Modifier.size(24.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = "SENTINEL SHIELD PRO",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Real-Time Protection • v2.6 Premium",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }
        }

        // Shield Gauge Arc Card
        item {
            ShieldGaugeCard(score = score, isScanning = isScanning)
        }

        // Deep System Audit Scan Trigger Bar
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("deep_scan_card"),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.linearGradient(listOf(DarkCardBorder, CyberCyan.copy(alpha = 0.5f)))
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Full Deep System Audit",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (isScanning) scanStep else "Scan installed packages, network interfaces & privacy settings",
                                fontSize = 12.sp,
                                color = if (isScanning) CyberCyan else TextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Button(
                            onClick = { viewModel.startDeepSystemScan() },
                            enabled = !isScanning,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = CyberCyan,
                                contentColor = DarkBackground
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.testTag("btn_run_deep_scan")
                        ) {
                            Text(
                                text = if (isScanning) "Scanning..." else "Run Scan",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (isScanning) {
                        Spacer(modifier = Modifier.height(12.dp))
                        LinearProgressIndicator(
                            progress = { scanProgress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = CyberCyan,
                            trackColor = DarkSurface
                        )
                    }
                }
            }
        }

        // Quick Action Grid (2 columns)
        item {
            Text(
                text = "QUICK DEFENSE TOOLS",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp)
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionButton(
                    title = "AI Scanner",
                    subtitle = "Phishing & URL",
                    icon = Icons.Default.Psychology,
                    accentColor = CyberCyan,
                    onClick = onNavigateToAiScanner,
                    modifier = Modifier.weight(1f)
                )
                QuickActionButton(
                    title = "Wi-Fi & Speed",
                    subtitle = "Network Audit",
                    icon = Icons.Default.Wifi,
                    accentColor = CyberGreen,
                    onClick = onNavigateToNetwork,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickActionButton(
                    title = "VPN Tunnel",
                    subtitle = if (isVpnConnected) selectedServer?.country ?: "Connected" else "Encrypted IP",
                    icon = Icons.Default.VpnKey,
                    accentColor = if (isVpnConnected) CyberGreen else CyberCyan,
                    onClick = onNavigateToVpn,
                    modifier = Modifier.weight(1f)
                )
                QuickActionButton(
                    title = "Dark Web",
                    subtitle = "Breach Monitor",
                    icon = Icons.Default.Language,
                    accentColor = CyberOrange,
                    onClick = onNavigateToDarkWeb,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // Live Security Shield Controls
        item {
            Text(
                text = "REAL-TIME PROTECTION CONTROL",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(start = 4.dp, top = 8.dp)
            )
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    ShieldSwitchRow(
                        title = "Real-Time System Guard",
                        subtitle = "Monitor background app activities & permissions",
                        checked = isRealtimeShieldActive,
                        onCheckedChange = { viewModel.toggleRealtimeShield(it) },
                        testTag = "switch_realtime_guard"
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    ShieldSwitchRow(
                        title = "Anti-Phishing & Malicious Web Filter",
                        subtitle = "Block rogue domains & credential stealing scripts",
                        checked = isPhishingProtectionActive,
                        onCheckedChange = { viewModel.togglePhishingProtection(it) },
                        testTag = "switch_phishing_protection"
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    ShieldSwitchRow(
                        title = "AdBlock Pro & Telemetry Blocker",
                        subtitle = "Prevent third-party ad trackers & analytics leaks",
                        checked = isAdBlockActive,
                        onCheckedChange = { viewModel.toggleAdBlock(it) },
                        testTag = "switch_adblock_pro"
                    )
                }
            }
        }

        // Room DB Security Logs Feed
        item {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
            ) {
                Text(
                    text = "SECURITY AUDIT LOGS (${logs.size})",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted,
                    letterSpacing = 1.sp,
                    modifier = Modifier.weight(1f)
                )
                if (logs.isNotEmpty()) {
                    IconButton(
                        onClick = { viewModel.clearAllLogs() },
                        modifier = Modifier.size(24.dp).testTag("btn_clear_logs")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Clear Audit History",
                            tint = TextMuted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }

        if (logs.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(DarkCard)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No Audit Logs Yet",
                            fontSize = 14.sp,
                            color = TextSecondary
                        )
                        Text(
                            text = "Run a Deep Scan or Network Audit to log events here.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
            }
        } else {
            items(logs, key = { it.id }) { log ->
                ScanLogItemCard(log = log, onDelete = { viewModel.deleteLog(log.id) })
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun ShieldSwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    testTag: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                text = subtitle,
                fontSize = 11.sp,
                color = TextSecondary
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = DarkBackground,
                checkedTrackColor = CyberCyan,
                uncheckedThumbColor = TextMuted,
                uncheckedTrackColor = DarkSurface
            ),
            modifier = Modifier.testTag(testTag)
        )
    }
}

@Composable
fun ScanLogItemCard(
    log: ScanLogEntity,
    onDelete: () -> Unit
) {
    val statusColor = when (log.status) {
        "PASSED" -> CyberGreen
        "WARNING" -> CyberOrange
        else -> CyberRed
    }

    val dateFormat = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("log_item_${log.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder)
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = log.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = dateFormat.format(Date(log.timestamp)),
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = log.summary,
                fontSize = 12.sp,
                color = TextSecondary
            )
        }
    }
}
