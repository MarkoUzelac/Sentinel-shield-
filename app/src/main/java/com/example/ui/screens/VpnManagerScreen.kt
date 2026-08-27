package com.example.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material.icons.filled.VpnKey
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.ui.components.CapabilityEvidenceCard
import com.example.ui.components.VpnServerCard
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.CyberOrange
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel
import com.example.vpn.WireGuardTunnelState

@Composable
fun VpnManagerScreen(viewModel: MainViewModel, onImportWireGuardProfile: () -> Unit, modifier: Modifier = Modifier) {
    val servers by viewModel.vpnServers.collectAsState()
    val selectedServer by viewModel.selectedVpnServer.collectAsState()
    val vpnState by viewModel.vpnState.collectAsState()
    val isProvisioned by viewModel.isVpnProvisioned.collectAsState()
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val evidenceSnapshot = remember(evidence) { CapabilityEvidenceSnapshot.from(evidence) }
    val transportEvidence = evidenceSnapshot.effective(CapabilityId.VPN_TRANSPORT)
    val handshakeEvidence = evidenceSnapshot.effective(CapabilityId.VPN_HANDSHAKE)
    val isConnected = vpnState is WireGuardTunnelState.Connected
    val isStarting = vpnState is WireGuardTunnelState.Starting || vpnState is WireGuardTunnelState.AwaitingUserConsent || vpnState is WireGuardTunnelState.Verifying

    LazyColumn(modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text(text = "WIREGUARD VPN LIFECYCLE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
            Spacer(Modifier.height(4.dp))
            Text(text = "Povezan tunel prikazuje se tek nakon odgovarajuće provjere handshakea.", fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(8.dp))
            transportEvidence?.let { evidenceItem -> CapabilityEvidenceCard(evidence = evidenceItem) }
            Spacer(Modifier.height(8.dp))
            handshakeEvidence?.let { evidenceItem -> CapabilityEvidenceCard(evidence = evidenceItem) }
            Spacer(Modifier.height(4.dp))
            Text(text = if (isProvisioned) "REAL PROFILE PROVISIONED" else "PROFILE NOT PROVISIONED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = if (isProvisioned) CyberGreen else TextMuted, letterSpacing = 1.sp)
        }

        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkCardBorder, CyberOrange.copy(alpha = .55f))))) {
                Column(Modifier.fillMaxWidth().padding(18.dp)) {
                    Text(text = "PROVISION REAL VPN", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
                    Spacer(Modifier.height(6.dp))
                    Text(text = "Uvezi WireGuard .conf profil. Privatni ključ ostaje u privatnoj pohrani aplikacije.", fontSize = 12.sp, color = TextSecondary)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(onClick = onImportWireGuardProfile, colors = ButtonDefaults.buttonColors(containerColor = CyberOrange), modifier = Modifier.weight(1f).height(46.dp), shape = RoundedCornerShape(12.dp)) {
                            Icon(Icons.Default.UploadFile, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text(text = "Import .conf", fontWeight = FontWeight.Bold)
                        }
                        if (isProvisioned) {
                            Button(onClick = viewModel::removeWireGuardProfile, colors = ButtonDefaults.buttonColors(containerColor = DarkCardBorder), modifier = Modifier.height(46.dp), shape = RoundedCornerShape(12.dp)) {
                                Icon(Icons.Default.Delete, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text(text = "Remove", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkCardBorder, if (isConnected) CyberGreen else CyberCyan)))) {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(90.dp).clip(CircleShape).background(if (isConnected) CyberGreen.copy(alpha = .2f) else CyberCyan.copy(alpha = .15f)).border(2.dp, if (isConnected) CyberGreen else CyberCyan, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.VpnKey, contentDescription = null, tint = if (isConnected) CyberGreen else CyberCyan, modifier = Modifier.size(44.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        text = when (vpnState) {
                            is WireGuardTunnelState.Connected -> "TUNNEL VERIFIED"
                            is WireGuardTunnelState.Starting -> "STARTING TUNNEL"
                            is WireGuardTunnelState.Verifying -> "VERIFYING HANDSHAKE"
                            is WireGuardTunnelState.AwaitingUserConsent -> "AWAITING VPN CONSENT"
                            is WireGuardTunnelState.Error -> "TUNNEL ERROR"
                            WireGuardTunnelState.Disconnected -> "DISCONNECTED"
                        },
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isConnected) CyberGreen else TextSecondary,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = when (val state = vpnState) {
                            is WireGuardTunnelState.Connected -> "Encrypted transport verified. Handshake: ${state.latestHandshakeEpochSeconds}"
                            is WireGuardTunnelState.Error -> state.message
                            is WireGuardTunnelState.AwaitingUserConsent -> "Approve Android VPN permission to continue."
                            is WireGuardTunnelState.Starting -> "Starting the official WireGuard userspace backend."
                            is WireGuardTunnelState.Verifying -> "Waiting for a recent peer handshake (attempt ${state.attempt}/20)."
                            WireGuardTunnelState.Disconnected -> if (isProvisioned) "Ready to start the provisioned WireGuard profile." else "Import a real WireGuard profile before connecting."
                        },
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(onClick = viewModel::toggleVpnConnection, enabled = !isStarting && isProvisioned, colors = ButtonDefaults.buttonColors(containerColor = if (isConnected) CyberGreen else CyberCyan), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        if (isStarting) {
                            CircularProgressIndicator(Modifier.size(18.dp), color = DarkBackground, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(text = if (isConnected) "Disconnect VPN" else "Start Verified VPN", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                VpnSpecCard("Protocol", selectedServer?.protocol ?: "WireGuard", Icons.Default.Lock, Modifier.weight(1f))
                VpnSpecCard("Endpoint", if (selectedServer?.ipAddress.isNullOrBlank()) "Not provisioned" else "Metadata only", Icons.Default.Public, Modifier.weight(1f))
            }
        }
        item { Text(text = "SERVER LOCATIONS (${servers.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp) }
        items(servers, key = { it.id }) { server ->
            VpnServerCard(server, selectedServer?.id == server.id, isConnected && selectedServer?.id == server.id, onSelect = { viewModel.selectVpnServer(server) })
        }
    }
}

@Composable
fun VpnSpecCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(DarkCardBorder))) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = CyberCyan, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(text = title, fontSize = 10.sp, color = TextMuted)
                Text(text = value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }
    }
}
