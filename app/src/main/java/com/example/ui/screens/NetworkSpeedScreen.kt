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
                text = "Measure network throughput and audit Wi-Fi router encryption & DNS security.",
                fontSize = 13.sp,
                color = TextSecondary
            )
        }

        // Circular Speedometer Card
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
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(180.dp)
                    ) {
                        Canvas(modifier = Modifier.size(170.dp)) {
                            val strokeWidth = 14.dp.toPx()
                            drawArc(
                                color = DarkSurface,
                                startAngle = 135f,
                                sweepAngle = 270f,
                                useCenter = false,
                                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                            )
                            val sweepFraction = if (result != null) (result!!.downloadMbps / 300.0).toFloat().coerceIn(0.1f, 1f) else 0.6f
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
                                text = if (result != null) "%.1f".format(result!!.downloadMbps) else "184.5",
                                fontSize = 36.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            Text(
                                text = "DOWNLOAD Mbps",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = CyberGreen,
                                letterSpacing = 1.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.runSpeedAndSecurityAudit() },
                        enabled = !isTesting,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = CyberGreen,
                            contentColor = DarkBackground
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("btn_run_speed_test")
                    ) {
                        if (isTesting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = DarkBackground,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Auditing Wi-Fi Sockets...", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Run Speed & Security Audit", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Live Network Metrics Grid
        item {
            val res = result ?: NetworkSpeedResult(16.4, 184.5, 42.8, 2.1, "Sentinel_Secure_5G", "WPA3-Personal", true, "185.220.101.44")
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard(title = "Ping Latency", value = "${res.pingMs} ms", subtitle = "Jitter ${res.jitterMs}ms", color = CyberCyan, modifier = Modifier.weight(1f))
                MetricCard(title = "Upload Speed", value = "${res.uploadMbps} Mbps", subtitle = "Bandwidth OK", color = CyberGreen, modifier = Modifier.weight(1f))
            }
        }

        // Wi-Fi Security Audit Panel
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
            val res = result ?: NetworkSpeedResult(16.4, 184.5, 42.8, 2.1, "Sentinel_Secure_5G", "WPA3-Personal", true, "185.220.101.44")
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    AuditItemRow(
                        icon = Icons.Default.Router,
                        title = "Wi-Fi Network SSID",
                        value = res.wifiSsid,
                        isSecure = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    AuditItemRow(
                        icon = Icons.Default.Lock,
                        title = "Router Encryption",
                        value = res.securityEncryption,
                        isSecure = true
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    AuditItemRow(
                        icon = Icons.Default.Shield,
                        title = "DNS Leak Protection",
                        value = if (res.isDnsSecure) "Secured (No Leak)" else "DNS Vulnerable",
                        isSecure = res.isDnsSecure
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    AuditItemRow(
                        icon = Icons.Default.Wifi,
                        title = "Public IP Address",
                        value = res.publicIp,
                        isSecure = true
                    )
                }
            }
        }
    }
}

@Composable
fun MetricCard(
    title: String,
    value: String,
    subtitle: String,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, fontSize = 12.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = subtitle, fontSize = 11.sp, color = TextMuted)
        }
    }
}

@Composable
fun AuditItemRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String,
    isSecure: Boolean
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(if (isSecure) CyberGreen.copy(alpha = 0.15f) else CyberOrange.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = if (isSecure) CyberGreen else CyberOrange,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, fontSize = 12.sp, color = TextSecondary)
            Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        }
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = if (isSecure) CyberGreen else CyberOrange,
            modifier = Modifier.size(18.dp)
        )
    }
}
