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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
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
        modifier = modifier.fillMaxSize().background(DarkBackground).padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier.size(40.dp).clip(CircleShape).background(CyberCyan.copy(alpha = 0.2f)).border(1.dp, CyberCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Security, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text("SENTINEL SHIELD PRO", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary, letterSpacing = 1.sp)
                    Text("Production security baseline • v1.0", fontSize = 12.sp, color = TextSecondary)
                }
            }
        }

        item { ShieldGaugeCard(score = score, isScanning = isScanning) }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().testTag("deep_scan_card"),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkCardBorder, CyberCyan.copy(alpha = 0.5f))))
            ) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Local Security Audit", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(
                                if (isScanning) scanStep else "Run local diagnostics; results are not a full malware scan.",
                                fontSize = 12.sp,
                                color = if (isScanning) CyberCyan else TextSecondary
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Button(
                            onClick = { viewModel.startDeepSystemScan() },
                            enabled = !isScanning,
                            colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = DarkBackground),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.testTag("btn_run_deep_scan")
                        ) {
                            Text(if (isScanning) "Scanning..." else "Run Scan", fontWeight = FontWeight.Bold)
                        }
                    }
                    if (isScanning) {
                        Spacer(modifier = Modifier.height(12.dp))
                        LinearProgressIndicator(
                            progress = { scanProgress },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                            color = CyberCyan,
                            trackColor = DarkSurface
                        )
                    }
                }
            }
        }

        item {
            Text("QUICK DEFENSE TOOLS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp, modifier = Modifier.padding(start = 4.dp, top = 4.dp))
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickActionButton("AI Scanner", "Phishing & URL", Icons.Default.Psychology, CyberCyan, onNavigateToAiScanner, Modifier.weight(1f))
                QuickActionButton("Wi-Fi & Speed", "Diagnostic", Icons.Default.Wifi, CyberGreen, onNavigateToNetwork, Modifier.weight(1f))
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickActionButton("VPN Tunnel", if (isVpnConnected) selectedServer?.country ?: "Connected" else "Not connected", Icons.Default.VpnKey, if (isVpnConnected) CyberGreen else CyberCyan, onNavigateToVpn, Modifier.weight(1f))
                QuickActionButton("Breach Monitor", "Unverified demo", Icons.Default.Language, CyberOrange, onNavigateToDarkWeb, Modifier.weight(1f))
            }
        }

        item {
            Text("LOCAL PROTECTION CONTROLS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp, modifier = Modifier.padding(start = 4.dp, top = 8.dp))
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    ShieldSwitchRow("Local Guard State", "UI control only until a background enforcement service is wired", isRealtimeShieldActive, { viewModel.toggleRealtimeShield(it) }, "switch_realtime_guard")
                    Spacer(modifier = Modifier.height(12.dp))
                    ShieldSwitchRow("Phishing Protection", "Local heuristic/AI analysis for submitted targets", isPhishingProtectionActive, { viewModel.togglePhishingProtection(it) }, "switch_phishing_protection")
                    Spacer(modifier = Modifier.height(12.dp))
                    ShieldSwitchRow("Telemetry Blocker", "Configuration state; network filtering is not implemented here", isAdBlockActive, { viewModel.toggleAdBlock(it) }, "switch_adblock_pro")
                }
            }
        }

        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text("SECURITY AUDIT LOGS (${logs.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp, modifier = Modifier.weight(1f))
                if (logs.isNotEmpty()) {
                    IconButton(onClick = { viewModel.clearAllLogs() }, modifier = Modifier.size(24.dp).testTag("btn_clear_logs")) {
                        Icon(Icons.Default.Delete, contentDescription = "Clear Audit History", tint = TextMuted, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        if (logs.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(DarkCard).padding(24.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = TextMuted, modifier = Modifier.size(32.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("No Audit Logs Yet", fontSize = 14.sp, color = TextSecondary)
                        Text("Run a local audit to log events here.", fontSize = 12.sp, color = TextMuted)
                    }
                }
            }
        } else {
            items(logs, key = { it.id }) { log -> ScanLogItemCard(log = log, onDelete = { viewModel.deleteLog(log.id) }) }
        }
        item { Spacer(modifier = Modifier.height(24.dp)) }
    }
}

@Composable
fun ShieldSwitchRow(title: String, subtitle: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit, testTag: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(subtitle, fontSize = 11.sp, color = TextSecondary)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(checkedThumbColor = DarkBackground, checkedTrackColor = CyberCyan, uncheckedThumbColor = TextMuted, uncheckedTrackColor = DarkSurface),
            modifier = Modifier.testTag(testTag)
        )
    }
}

@Composable
fun ScanLogItemCard(log: ScanLogEntity, onDelete: () -> Unit) {
    val statusColor = when (log.status) {
        "PASSED" -> CyberGreen
        "WARNING" -> CyberOrange
        else -> CyberRed
    }
    val dateFormat = remember { SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault()) }
    Card(
        modifier = Modifier.fillMaxWidth().testTag("log_item_${log.id}"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(statusColor))
                Spacer(modifier = Modifier.width(8.dp))
                Text(log.title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.weight(1f))
                Text(dateFormat.format(Date(log.timestamp)), fontSize = 11.sp, color = TextMuted)
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(log.summary, fontSize = 12.sp, color = TextSecondary)
        }
    }
}
