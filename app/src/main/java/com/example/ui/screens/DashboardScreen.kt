package com.example.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import com.example.data.localization.stringRes
import com.example.ui.components.QuickActionButton
import com.example.ui.components.ShieldGaugeCard
import com.example.ui.theme.LocalAppSkin
import com.example.ui.viewmodel.MainViewModel

@Composable
fun DashboardScreen(
    viewModel: MainViewModel,
    onNavigateToAiScanner: () -> Unit,
    onNavigateToRadar: () -> Unit = {},
    onNavigateToVpn: () -> Unit = {},
    onNavigateToCallSecurity: () -> Unit = {},
    onNavigateToLegal: () -> Unit = {},
    onNavigateToDarkWeb: () -> Unit = {},
    onNavigateToNetwork: () -> Unit = {},
    onNavigateToReport: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val skin = LocalAppSkin.current
    val realtimeShield by viewModel.isRealtimeShieldActive.collectAsState()
    val adBlock by viewModel.isAdBlockActive.collectAsState()
    val phishing by viewModel.isPhishingProtectionActive.collectAsState()
    val vpnConnected by viewModel.isVpnConnected.collectAsState()
    val isScanning by viewModel.isDeepScanning.collectAsState()
    val scanProgress by viewModel.deepScanProgress.collectAsState()
    val scanStep by viewModel.deepScanStep.collectAsState()
    val logs by viewModel.scanLogs.collectAsState()
    val coverage = listOf(realtimeShield, phishing, adBlock, vpnConnected).count { it } * 25

    LazyColumn(
        modifier = modifier.fillMaxSize().background(skin.bgColor).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(CircleShape).background(skin.primaryColor.copy(alpha = .15f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Security, null, tint = skin.primaryColor)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("SENTINEL SHIELD PRO", color = skin.textPrimaryColor, fontSize = 19.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                    Text("ZAŠTITA U STVARNOM VREMENU", color = skin.textMutedColor, fontSize = 10.sp, letterSpacing = 1.sp)
                }
            }
        }
        item {
            ShieldGaugeCard(score = coverage, isScanning = isScanning, modifier = Modifier.fillMaxWidth())
        }
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = skin.cardColor),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(skin.borderColor, skin.primaryColor))),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("PROVJERENE SIGURNOSNE SPOSOBNOSTI", color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    EvidenceLine("WireGuard transport", vpnConnected, skin)
                    EvidenceLine("Handshake verification", vpnConnected, skin)
                    EvidenceLine("Phishing protection", phishing, skin)
                    EvidenceLine("Ad/telemetry filter", adBlock, skin)
                    EvidenceLine("Background shield", realtimeShield, skin)
                }
            }
        }
        item {
            Button(
                onClick = { viewModel.startDeepSystemScan() },
                enabled = !isScanning,
                modifier = Modifier.fillMaxWidth().testTag("btn_complete_audit"),
                colors = ButtonDefaults.buttonColors(containerColor = skin.primaryColor, contentColor = Color.Black),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.Security, null)
                Spacer(Modifier.width(8.dp))
                Text(if (isScanning) "SKENIRANJE U TIJEKU…" else "POKRENI POTPUNI SIGURNOSNI AUDIT", fontWeight = FontWeight.Bold)
            }
        }
        if (isScanning) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.padding(14.dp)) {
                        Text(scanStep, color = skin.textSecondaryColor, fontSize = 11.sp)
                        Spacer(Modifier.height(8.dp))
                        LinearProgressIndicator(progress = { scanProgress }, modifier = Modifier.fillMaxWidth(), color = skin.primaryColor)
                    }
                }
            }
        }
        item { Text("BRZI ALATI", color = skin.textMutedColor, fontSize = 11.sp, letterSpacing = 1.sp) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton(stringRes("tab_radar"), "Telephony evidence", Icons.Default.Radar, skin.primaryColor, onNavigateToRadar, Modifier.weight(1f))
                QuickActionButton(stringRes("tab_vpn"), if (vpnConnected) "Verified" else "WireGuard", Icons.Default.VpnKey, skin.primaryColor, onNavigateToVpn, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton(stringRes("tab_call_sec"), "MMI checks", Icons.Default.Call, skin.primaryColor, onNavigateToCallSecurity, Modifier.weight(1f))
                QuickActionButton(stringRes("tab_legal"), "Privacy guide", Icons.Default.Gavel, skin.primaryColor, onNavigateToLegal, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionButton("AI Threat", "AI analysis", Icons.Default.Psychology, skin.primaryColor, onNavigateToAiScanner, Modifier.weight(1f))
                QuickActionButton("Dark Web", "Breach lookup", Icons.Default.Language, skin.primaryColor, onNavigateToDarkWeb, Modifier.weight(1f))
            }
        }
        item {
            QuickActionButton("Network Audit", "Wi-Fi diagnostics", Icons.Default.Security, skin.primaryColor, onNavigateToNetwork, Modifier.fillMaxWidth())
        }
        if (logs.isNotEmpty()) {
            item { Text("SIGURNOSNI DNEVNIK", color = skin.textMutedColor, fontSize = 11.sp, letterSpacing = 1.sp) }
            items(logs.takeLast(5).asReversed()) { log ->
                Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(if (log.status == "ALERT") Color(0xFFFF1744) else skin.primaryColor))
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(log.title, color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text(log.summary, color = skin.textSecondaryColor, fontSize = 10.sp)
                        }
                        IconButton(onClick = { viewModel.deleteLog(log.id) }) { Icon(Icons.Default.Delete, null, tint = skin.textMutedColor) }
                    }
                }
            }
        }
        item { Text("Status se prikazuje kao VERIFIED samo kada postoji odgovarajući dokaz uređaja.", color = skin.textMutedColor, fontSize = 9.sp) }
    }
}

@Composable
private fun EvidenceLine(title: String, active: Boolean, skin: com.example.ui.theme.AppSkin) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(if (active) skin.primaryColor else skin.borderColor))
        Spacer(Modifier.width(8.dp))
        Text(title, Modifier.weight(1f), color = skin.textSecondaryColor, fontSize = 11.sp)
        Text(if (active) "VERIFIED" else "INACTIVE", color = if (active) skin.primaryColor else skin.textMutedColor, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}
