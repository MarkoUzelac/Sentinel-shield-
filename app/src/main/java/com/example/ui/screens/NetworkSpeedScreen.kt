package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Router
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Wifi
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
fun NetworkSpeedScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val isTesting by viewModel.isTestingSpeed.collectAsState()
    val result by viewModel.speedTestResult.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "WI-FI SECURITY & SPEED AUDIT",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Network diagnostics are currently simulated in this build.",
                fontSize = 13.sp,
                color = CyberOrange
            )
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("speed_gauge_card"),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.linearGradient(listOf(DarkCardBorder, CyberGreen.copy(alpha = 0.5f)))
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(180.dp)) {
                        Canvas(modifier = Modifier.size(170.dp)) {
                            val strokeWidth = 14.dp.toPx()
                            drawArc(
                                color = DarkSurface,
                                startAngle = 135f,
                                sweepAngle = 270f,
                                useCenter = false,
                                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                            )
                            val sweepFraction = if (result != null) {
                                (result!!.downloadMbps / 300.0).toFloat().coerceIn(0.1f, 1f)
                            } else 0.1f
                            drawArc(
                                brush = Brush.sweepGradient(listOf(CyberCyan, CyberGreen)),
                                startAngle = 135f,
                                sweepAngle = 270f * sweepFraction,
                                useCenter = false,
                                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = result?.downloadMbps?.let { "%.1f".format(it) } ?: "—",
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = if (result != null) "SIMULATED DOWNLOAD Mbps" else "NO VERIFIED RESULT",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (result != null) CyberOrange else TextMuted,
                                letterSpacing = 1.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { viewModel.runSpeedAndSecurityAudit() },
                        enabled = !isTesting,
                        colors = ButtonDefaults.buttonColors(containerColor = CyberGreen, contentColor = DarkBackground),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("btn_run_speed_test")
                    ) {
                        if (isTesting) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = DarkBackground, strokeWidth = 2.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Running diagnostics...", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Run Network Diagnostic", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        item {
            if (result == null) {
                Text(
                    text = "Run the diagnostic to display test output. Until then, no network metric is treated as verified.",
                    fontSize = 12.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
            } else {
                val res = result!!
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MetricCard(title = "Ping Latency", value = "${res.pingMs} ms", subtitle = "Simulated", color = CyberCyan, modifier = Modifier.weight(1f))
                    MetricCard(title = "Upload Speed", value = "${res.uploadMbps} Mbps", subtitle = "Simulated", color = CyberGreen, modifier = Modifier.weight(1f))
                }
            }
        }

        item {
            Text(
                text = "WI-FI SECURITY DIAGNOSTICS",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = TextMuted,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        item {
            if (result == null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("No verified Wi-Fi diagnostic available", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("The current repository uses a deterministic simulation rather than querying the active interface.", fontSize = 12.sp, color = TextSecondary)
                    }
                }
            } else {
                val res = result!!
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        AuditItemRow(Icons.Default.Router, "Wi-Fi Network SSID", res.wifiSsid, CyberCyan)
                        AuditItemRow(Icons.Default.Lock, "Encryption", res.securityEncryption, CyberGreen)
                        AuditItemRow(Icons.Default.Shield, "DNS Security", if (res.isDnsSecure) "PASS (simulated)" else "WARNING (simulated)", if (res.isDnsSecure) CyberGreen else CyberOrange)
                    }
                }
            }
        }
    }
}
