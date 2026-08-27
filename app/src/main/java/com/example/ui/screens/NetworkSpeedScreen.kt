package com.example.ui.screens

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Router
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.NetworkObservation
import com.example.data.model.NetworkSpeedResult
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.CyberOrange
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel

@Composable
fun NetworkSpeedScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val isTesting by viewModel.isTestingSpeed.collectAsState()
    val result by viewModel.speedTestResult.collectAsState()
    val observation by viewModel.networkObservation.collectAsState()

    LazyColumn(
        modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(text = "NETWORK SECURITY & LATENCY AUDIT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
            Spacer(Modifier.height(4.dp))
            Text(text = "Stvarni HTTPS probe + runtime podaci iz ConnectivityManagera. Mjerenje dostupnosti nije dokaz potpune mrežne sigurnosti.", fontSize = 13.sp, color = TextSecondary)
        }
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkCardBorder, CyberGreen.copy(alpha = 0.5f))))
            ) {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(180.dp)) {
                        Canvas(Modifier.size(170.dp)) {
                            val strokeWidth = 14.dp.toPx()
                            drawArc(DarkSurface, 135f, 270f, false, style = Stroke(strokeWidth, cap = StrokeCap.Round))
                            val fraction = when {
                                result == null -> 0.1f
                                result!!.pingMs < 0 -> 0.05f
                                else -> (1.0 - (result!!.pingMs / 1000.0)).toFloat().coerceIn(0.1f, 1f)
                            }
                            drawArc(Brush.sweepGradient(listOf(CyberCyan, CyberGreen)), 135f, 270f * fraction, false, style = Stroke(strokeWidth, cap = StrokeCap.Round))
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = result?.pingMs?.takeIf { it >= 0 }?.let { "%.0f".format(it) } ?: "—", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(text = if (result != null && result!!.pingMs >= 0) "HTTPS RTT ms" else "NO RESULT", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = if (result != null) CyberGreen else TextMuted, letterSpacing = 1.sp)
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = viewModel::runSpeedAndSecurityAudit, enabled = !isTesting, colors = ButtonDefaults.buttonColors(containerColor = CyberGreen, contentColor = DarkBackground), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(48.dp)) {
                        if (isTesting) {
                            CircularProgressIndicator(Modifier.size(20.dp), color = DarkBackground, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text(text = "Pokretanje probe…", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text(text = "Pokreni mrežni audit", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NetworkMetricCard("Transport", observation.transports.ifEmpty { setOf("N/A") }.joinToString(), "Runtime", CyberCyan, Modifier.weight(1f))
                NetworkMetricCard("VPN", if (observation.vpnTransport) "ACTIVE" else "NOT DETECTED", "Runtime", CyberGreen, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NetworkMetricCard("HTTPS RTT", result?.pingMs?.takeIf { it >= 0 }?.let { "%.0f ms".format(it) } ?: "—", "Stvarno mjerenje", CyberCyan, Modifier.weight(1f))
                NetworkMetricCard("DNS", if (observation.dnsServers.isEmpty()) "N/A" else observation.dnsServers.size.toString(), "Poslužitelji", CyberGreen, Modifier.weight(1f))
            }
        }
        item { Text(text = "RUNTIME NETWORK EVIDENCE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp) }
        item { NetworkEvidenceCard(observation, result) }
    }
}

@Composable
private fun NetworkMetricCard(title: String, value: String, subtitle: String, accent: Color, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))) {
        Column(Modifier.padding(14.dp)) {
            Text(text = title, fontSize = 10.sp, color = TextMuted)
            Spacer(Modifier.height(4.dp))
            Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(text = subtitle, fontSize = 9.sp, color = accent)
        }
    }
}

@Composable
private fun NetworkEvidenceCard(observation: NetworkObservation, result: NetworkSpeedResult?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            EvidenceRow(Icons.Default.Router, "Transporti", observation.transports.ifEmpty { setOf("N/A") }.joinToString())
            EvidenceRow(Icons.Default.Shield, "Validated", observation.validated.toString())
            EvidenceRow(Icons.Default.Shield, "VPN transport", observation.vpnTransport.toString())
            EvidenceRow(Icons.Default.Router, "Sučelje", observation.interfaceName ?: "N/A")
            EvidenceRow(Icons.Default.Lock, "DNS", observation.dnsServers.ifEmpty { listOf("N/A") }.joinToString())
            EvidenceRow(Icons.Default.Shield, "HTTPS probe", if (result != null && result.pingMs >= 0) "PASS (reachability)" else "NOT RUN")
            Text(text = "Status: UNVERIFIED — runtime mrežna evidencija ne dokazuje potpunu sigurnost mreže.", fontSize = 11.sp, color = CyberOrange)
        }
    }
}

@Composable
private fun EvidenceRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(text = label, fontSize = 10.sp, color = TextMuted)
            Text(text = value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
    }
}
