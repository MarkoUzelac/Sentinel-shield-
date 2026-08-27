package com.example.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.example.data.DeviceLocationProvider
import com.example.data.SignalRadarProvider
import com.example.data.model.SignalRadarItem
import com.example.data.model.SignalRisk
import com.example.data.model.ThreatRisk
import com.example.ui.components.CapabilityEvidenceCard
import com.example.ui.components.TacticalRadarMap
import com.example.ui.theme.LocalAppSkin
import com.example.ui.viewmodel.MainViewModel

@Composable
fun ImsiRadarScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val skin = LocalAppSkin.current
    val context = LocalContext.current
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val radarEvidence = remember(evidence) { evidence.firstOrNull { it.id.name == "RADAR_TELEPHONY" } }
    val locationProvider = remember(context) { DeviceLocationProvider(context.applicationContext) }
    val radarProvider = remember(context) { SignalRadarProvider(context.applicationContext, locationProvider) }
    val location by locationProvider.state.collectAsState()
    val radar by radarProvider.snapshot.collectAsState()
    val threat by viewModel.threatSnapshot.collectAsState()
    var permissionRequested by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) {
        locationProvider.start()
        radarProvider.start()
    }

    DisposableEffect(Unit) {
        locationProvider.start()
        radarProvider.start()
        onDispose {
            radarProvider.stop()
            locationProvider.stop()
        }
    }

    fun requestSensors() {
        val permissions = buildList {
            add(Manifest.permission.ACCESS_FINE_LOCATION)
            add(Manifest.permission.ACCESS_COARSE_LOCATION)
            if (Build.VERSION.SDK_INT >= 31) {
                add(Manifest.permission.BLUETOOTH_SCAN)
                add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        }
        permissionRequested = true
        permissionLauncher.launch(permissions.toTypedArray())
    }

    fun openMaps() {
        val lat = location.latitude ?: return
        val lon = location.longitude ?: return
        val uri = Uri.parse("geo:$lat,$lon?q=$lat,$lon")
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri).apply { setPackage("com.google.android.apps.maps") })
        }.getOrElse {
            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize().background(skin.bgColor).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text("RADAR & TAKTIČKA MAPA", color = skin.textPrimaryColor, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text("Pasivna telemetrija stvarnog hardvera uređaja", color = skin.textMutedColor, fontSize = 11.sp)
                }
                Icon(Icons.Default.Radar, contentDescription = null, tint = skin.primaryColor)
            }
        }

        item { radarEvidence?.let { CapabilityEvidenceCard(it) } }
        item { TacticalRadarMap(location = location, signals = radar.signals) }

        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = skin.cardColor)) {
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text("UREĐAJ", color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text(
                                text = if (location.hasFix && location.isFresh) "GPS LIVE" else "LOKACIJA UNAVAILABLE",
                                color = if (location.hasFix && location.isFresh) skin.primaryColor else skin.textMutedColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(location.coordinateLabel, color = skin.textSecondaryColor, fontSize = 11.sp)
                            location.accuracyMeters?.let { Text("Točnost ±${it.toInt()} m", color = skin.textMutedColor, fontSize = 10.sp) }
                            Text("Provider: ${location.provider} · Sateliti: ${location.satelliteCount}", color = skin.textMutedColor, fontSize = 10.sp)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("${radar.totalCount}", color = skin.primaryColor, fontSize = 26.sp, fontWeight = FontWeight.Black)
                            Text("OPAŽANJA", color = skin.textMutedColor, fontSize = 9.sp)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = ::requestSensors, colors = ButtonDefaults.buttonColors(containerColor = skin.primaryColor, contentColor = Color.Black), modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Refresh, null)
                            Spacer(Modifier.width(5.dp))
                            Text(if (permissionRequested) "PONOVI" else "AKTIVIRAJ RADAR")
                        }
                        Button(onClick = ::openMaps, enabled = location.hasFix && location.isFresh, colors = ButtonDefaults.buttonColors(containerColor = skin.cardColor, contentColor = skin.primaryColor), modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.LocationOn, null)
                            Spacer(Modifier.width(5.dp))
                            Text("GOOGLE MAPS")
                        }
                    }
                }
            }
        }

        item {
            ThreatSummaryCard(
                score = threat.score,
                risk = threat.risk,
                findings = threat.findings.map { "${it.title} · ${it.evidenceState.name}" }.take(3),
                skin = skin
            )
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                RadarMetric("BLE", radar.bleCount.toString(), skin.primaryColor, Modifier.weight(1f))
                RadarMetric("CELL", radar.cellularCount.toString(), skin.primaryColor, Modifier.weight(1f))
                RadarMetric("ANOMALIJE", radar.anomalyCount.toString(), skin.primaryColor, Modifier.weight(1f))
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = skin.cardColor)) {
                Column(Modifier.padding(15.dp)) {
                    Text("OGRANIČENJA DETEKCIJE", color = skin.textPrimaryColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(5.dp))
                    Text("Android može dati stvarne Bluetooth LE i ćelijske telemetrijske zapise, ali aplikacija ne može dobiti IMSI identitet okolnih telefona, fizički utišati baznu stanicu ili pouzdano odrediti GPS koordinatu tuđeg uređaja bez dodatnog izvora. IMSI-catcher procjena zato ostaje heuristička i UNVERIFIED.", color = skin.textMutedColor, fontSize = 10.sp, lineHeight = 15.sp)
                }
            }
        }

        items(radar.signals.take(30), key = { it.id }) { signal -> SignalRow(signal, skin) }
    }
}

@Composable
private fun ThreatSummaryCard(score: Int, risk: ThreatRisk, findings: List<String>, skin: com.example.ui.theme.AppSkin) {
    val label = when (risk) {
        ThreatRisk.NORMAL -> "NORMAL"
        ThreatRisk.WATCH -> "WATCH"
        ThreatRisk.SUSPICIOUS -> "SUSPICIOUS"
        ThreatRisk.HIGH -> "HIGH RISK"
    }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = skin.cardColor)) {
        Column(Modifier.padding(15.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text("SIGNAL INTELLIGENCE", color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(label, color = skin.primaryColor, fontSize = 18.sp, fontWeight = FontWeight.Black)
                }
                Text("$score/100", color = skin.primaryColor, fontSize = 21.sp, fontWeight = FontWeight.Black)
            }
            findings.forEach { finding -> Spacer(Modifier.height(4.dp)); Text("• $finding", color = skin.textMutedColor, fontSize = 9.sp) }
            if (findings.isEmpty()) { Spacer(Modifier.height(4.dp)); Text("Nema koreliranih anomalija u trenutnom vremenskom prozoru.", color = skin.textMutedColor, fontSize = 9.sp) }
        }
    }
}

@Composable
private fun RadarMetric(title: String, value: String, accent: Color, modifier: Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Column(Modifier.padding(10.dp)) {
            Text(title, fontSize = 9.sp, color = Color.LightGray)
            Text(value, fontSize = 17.sp, color = accent, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SignalRow(signal: SignalRadarItem, skin: com.example.ui.theme.AppSkin) {
    val riskLabel = when (signal.risk) {
        SignalRisk.INFO -> "INFO"
        SignalRisk.LOW -> "LOW"
        SignalRisk.MEDIUM -> "MEDIUM"
        SignalRisk.HIGH -> "HIGH"
        SignalRisk.CRITICAL -> "CRITICAL"
    }
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = skin.cardColor)) {
        Column(Modifier.padding(13.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(signal.label, color = skin.textPrimaryColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Text(riskLabel, color = skin.primaryColor, fontSize = 9.sp, fontWeight = FontWeight.Bold)
            }
            Text("${signal.kind} · ${signal.technology}", color = skin.textMutedColor, fontSize = 10.sp)
            signal.rssiDbm?.let { Text("RSSI ${it} dBm", color = skin.textSecondaryColor, fontSize = 10.sp) }
            signal.estimatedDistanceMeters?.let { Text("Procjena udaljenosti ≈ ${"%.1f".format(it)} m", color = skin.textSecondaryColor, fontSize = 10.sp) }
            signal.cellId?.let { Text("Cell ID $it · Area ${signal.areaCode ?: -1}", color = skin.textMutedColor, fontSize = 9.sp) }
            signal.locationSource?.let { Text("Lokacija: $it", color = skin.primaryColor, fontSize = 9.sp) }
            Text(signal.explanation, color = skin.textMutedColor, fontSize = 9.sp, lineHeight = 13.sp)
        }
    }
}
