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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.localization.stringRes
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.ui.components.CapabilityEvidenceCard
import com.example.ui.components.QuickActionButton
import com.example.ui.components.ShieldGaugeCard
import com.example.ui.theme.LocalAppSkin
import com.example.ui.viewmodel.MainViewModel

@Composable
fun DashboardScreen(viewModel: MainViewModel, onNavigateToAiScanner: () -> Unit, onNavigateToRadar: () -> Unit = {}, onNavigateToVpn: () -> Unit = {}, onNavigateToCallSecurity: () -> Unit = {}, onNavigateToLegal: () -> Unit = {}, onNavigateToDarkWeb: () -> Unit = {}, onNavigateToNetwork: () -> Unit = {}, onNavigateToReport: () -> Unit = {}, modifier: Modifier = Modifier) {
    val skin = LocalAppSkin.current
    val isScanning by viewModel.isDeepScanning.collectAsState()
    val scanProgress by viewModel.deepScanProgress.collectAsState()
    val scanStep by viewModel.deepScanStep.collectAsState()
    val logs by viewModel.scanLogs.collectAsState()
    val securityScore by viewModel.securityScore.collectAsState()
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val evidenceSnapshot = remember(evidence) { CapabilityEvidenceSnapshot.from(evidence) }

    LazyColumn(modifier = modifier.fillMaxSize().background(skin.bgColor).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(44.dp).then(androidx.compose.ui.draw.clip(CircleShape)).background(skin.primaryColor.copy(alpha = .15f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Security, null, tint = skin.primaryColor) }; Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text(text = "SENTINEL SHIELD PRO", color = skin.textPrimaryColor, fontSize = 19.sp, fontWeight = FontWeight.Black, letterSpacing = 1.sp); Text(text = "JEDINSTVENI MODEL DOKAZA", color = skin.textMutedColor, fontSize = 10.sp, letterSpacing = 1.sp) } } }
        item { ShieldGaugeCard(score = securityScore, isScanning = isScanning, modifier = Modifier.fillMaxWidth()) }
        item { Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(skin.borderColor, skin.primaryColor))), shape = RoundedCornerShape(16.dp)) { Column(Modifier.padding(16.dp)) { Text(text = "CAPABILITY / EVIDENCE STATUS", color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold); Spacer(Modifier.height(8.dp)); Text(text = "VERIFIED = konkretan runtime dokaz · UNVERIFIED = postoji podatak, ali nije dovoljan za sigurnosni zaključak · UNAVAILABLE = izvor trenutno nije dostupan.", color = skin.textMutedColor, fontSize = 9.sp) } } }
        items(evidenceSnapshot.items.filter { it.id in setOf(CapabilityId.VPN_TRANSPORT, CapabilityId.VPN_HANDSHAKE, CapabilityId.RADAR_TELEPHONY, CapabilityId.CALL_MMI, CapabilityId.PHISHING_PROTECTION, CapabilityId.AD_TELEMETRY_FILTER, CapabilityId.REALTIME_SHIELD) }, key = { it.id.name }) { evidenceItem -> CapabilityEvidenceCard(evidence = evidenceItem) }
        item { Button(onClick = { viewModel.startDeepSystemScan() }, enabled = !isScanning, modifier = Modifier.fillMaxWidth().testTag("btn_complete_audit"), colors = ButtonDefaults.buttonColors(containerColor = skin.primaryColor, contentColor = Color.Black), shape = RoundedCornerShape(14.dp)) { Icon(Icons.Default.Security, contentDescription = null); Spacer(Modifier.width(8.dp)); Text(text = if (isScanning) "SKENIRANJE U TIJEKU…" else "POKRENI POTPUNI SIGURNOSNI AUDIT", fontWeight = FontWeight.Bold) } }
        if (isScanning) item { Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(14.dp)) { Column(Modifier.padding(14.dp)) { Text(text = scanStep, color = skin.textSecondaryColor, fontSize = 11.sp); Spacer(Modifier.height(8.dp)); LinearProgressIndicator(progress = { scanProgress }, modifier = Modifier.fillMaxWidth(), color = skin.primaryColor) } } }
        item { Text(text = "BRZI ALATI", color = skin.textMutedColor, fontSize = 11.sp, letterSpacing = 1.sp) }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { QuickActionButton(stringRes("tab_radar"), evidenceSnapshot.statusOf(CapabilityId.RADAR_TELEPHONY).name, Icons.Default.Radar, skin.primaryColor, onNavigateToRadar, Modifier.weight(1f)); QuickActionButton(stringRes("tab_vpn"), evidenceSnapshot.statusOf(CapabilityId.VPN_HANDSHAKE).name, Icons.Default.VpnKey, skin.primaryColor, onNavigateToVpn, Modifier.weight(1f)) } }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { QuickActionButton(stringRes("tab_call_sec"), evidenceSnapshot.statusOf(CapabilityId.CALL_MMI).name, Icons.Default.Call, skin.primaryColor, onNavigateToCallSecurity, Modifier.weight(1f)); QuickActionButton(stringRes("tab_legal"), evidenceSnapshot.statusOf(CapabilityId.LEGAL_GUIDANCE).name, Icons.Default.Gavel, skin.primaryColor, onNavigateToLegal, Modifier.weight(1f)) } }
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) { QuickActionButton("AI Threat", evidenceSnapshot.statusOf(CapabilityId.AI_THREAT_ANALYSIS).name, Icons.Default.Psychology, skin.primaryColor, onNavigateToAiScanner, Modifier.weight(1f)); QuickActionButton("Dark Web", evidenceSnapshot.statusOf(CapabilityId.DARK_WEB_LOOKUP).name, Icons.Default.Language, skin.primaryColor, onNavigateToDarkWeb, Modifier.weight(1f)) } }
        item { QuickActionButton("Network Audit", evidenceSnapshot.statusOf(CapabilityId.NETWORK_AUDIT).name, Icons.Default.Security, skin.primaryColor, onNavigateToNetwork, Modifier.fillMaxWidth()) }
        if (logs.isNotEmpty()) {
            item { Text(text = "SIGURNOSNI DNEVNIK", color = skin.textMutedColor, fontSize = 11.sp, letterSpacing = 1.sp) }
            items(logs.takeLast(5).asReversed(), key = { it.id }) { log -> Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) { Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(8.dp).then(androidx.compose.ui.draw.clip(CircleShape)).background(if (log.status == "ALERT") Color(0xFFFF1744) else skin.primaryColor)); Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) { Text(text = log.title, color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold); Text(text = log.summary, color = skin.textSecondaryColor, fontSize = 10.sp) }; IconButton(onClick = { viewModel.deleteLog(log.id) }) { Icon(Icons.Default.Delete, contentDescription = null, tint = skin.textMutedColor) } } } }
        }
        item { Text(text = "Svi statusi dolaze iz jednog Capability / Evidence modela; UI ne pretpostavlja da je zaštita verificirana.", color = skin.textMutedColor, fontSize = 9.sp) }
    }
}
