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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
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

    LazyColumnCompat(
        modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("NETWORK SECURITY & LATENCY AUDIT", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
        Text(
            "Stvarni HTTPS probe + runtime podaci iz ConnectivityManagera. Mjerenje dostupnosti nije dokaz potpune mrežne sigurnosti.",
            fontSize = 13.sp,
            color = TextSecondary
        )

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
                        val fraction = if (result != null) 0.35f else 0.1f
                        drawArc(Brush.sweepGradient(listOf(CyberCyan, CyberGreen)), 135f, 270f * fraction, false, style = Stroke(strokeWidth, cap = StrokeCap.Round))
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(result?.pingMs?.let { "%.0f".format(it) } ?: "—", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(if (result != null) "HTTPS RTT ms" else "NO RESULT", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = if (result != null) CyberGreen else TextMuted, letterSpacing = 1.sp)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = viewModel::runSpeedAndSecurityAudit,
                    enabled = !isTesting,
                    colors = ButtonDefaults.buttonColors(containerColor = CyberGreen, contentColor = DarkBackground),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    if (isTesting) {
                        CircularProgressIndicator(Modifier.size(20.dp), color = DarkBackground, strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("Pokretanje probe…", fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Pokreni mrežni audit", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            result?.let { res ->
                NetworkMetricCard("HTTPS RTT", "%.0f ms".format(res.pingMs), "Stvarno mjerenje", CyberCyan, Modifier.weight(1f))
                NetworkMetricCard("DNS", if (observation.dnsServers.isEmpty()) "—" else "${observation.dnsServers.size}", "DNS poslužitelji", CyberGreen, Modifier.weight(1f))
            } ?: run {
                NetworkMetricCard("Transport", observation.transports.ifEmpty { setOf("—") }.joinToString(), "Runtime", CyberCyan, Modifier.weight(1f))
                NetworkMetricCard("VPN", if (observation.vpnTransport) "ACTIVE" else "NOT DETECTED", "Runtime", CyberGreen, Modifier.weight(1f))
            }
        }

        Text("RUNTIME NETWORK EVIDENCE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
        NetworkEvidenceCard(observation = observation, result = result)
    }
}

@Composable
private fun NetworkMetricCard(title: String, value: String, subtitle: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))) {
        Column(Modifier.padding(14.dp)) {
            Text(title, fontSize = 10.sp, color = TextMuted)
            Spacer(Modifier.height(4.dp))
            Text(value, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text(subtitle, fontSize = 9.sp, color = color)
        }
    }
}

@Composable
private fun NetworkEvidenceCard(observation: com.example.data.model.NetworkObservation, result: NetworkSpeedResult?) {
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
            Text("Status: UNVERIFIED — runtime mrežna evidencija ne dokazuje potpunu sigurnost mreže.", fontSize = 11.sp, color = CyberOrange)
        }
    }
}

@Composable
private fun EvidenceRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(label, fontSize = 10.sp, color = TextMuted)
            Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
    }
}

@Composable
private fun <T> LazyColumnCompat(
    modifier: Modifier,
    verticalArrangement: Arrangement.Vertical,
    content: @Composable ColumnScopeCompat.() -> Unit
) {
    androidx.compose.foundation.lazy.LazyColumn(modifier = modifier, verticalArrangement = verticalArrangement) {
        item(content = { content(ColumnScopeCompat()) })
    }
}

private class ColumnScopeCompat
