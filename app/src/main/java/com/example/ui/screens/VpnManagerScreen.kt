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
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.VpnKey
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.VpnServerCard
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.CyberGreen
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel
import com.example.vpn.WireGuardTunnelState

@Composable
fun VpnManagerScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val servers by viewModel.vpnServers.collectAsState()
    val selectedServer by viewModel.selectedVpnServer.collectAsState()
    val vpnState by viewModel.vpnState.collectAsState()
    val isConnected = vpnState is WireGuardTunnelState.Connected
    val isStarting = vpnState is WireGuardTunnelState.Starting || vpnState is WireGuardTunnelState.AwaitingUserConsent

    LazyColumn(
        modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("WIREGUARD VPN LIFECYCLE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
            Spacer(Modifier.height(4.dp))
            Text("Tunnel state is reported as connected only after transport verification.", fontSize = 13.sp, color = TextSecondary)
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth().testTag("vpn_status_card"),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(DarkCardBorder, if (isConnected) CyberGreen else CyberCyan)))
            ) {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier.size(90.dp).clip(CircleShape)
                            .background(if (isConnected) CyberGreen.copy(alpha = .2f) else CyberCyan.copy(alpha = .15f))
                            .border(2.dp, if (isConnected) CyberGreen else CyberCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.VpnKey, null, tint = if (isConnected) CyberGreen else CyberCyan, modifier = Modifier.size(44.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text(
                        when (vpnState) {
                            is WireGuardTunnelState.Connected -> "TUNNEL VERIFIED"
                            is WireGuardTunnelState.Starting -> "STARTING TUNNEL"
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
                        when (val state = vpnState) {
                            is WireGuardTunnelState.Connected -> "Verified encrypted transport is active."
                            is WireGuardTunnelState.Error -> state.message
                            is WireGuardTunnelState.AwaitingUserConsent -> "Approve Android VPN permission to continue."
                            is WireGuardTunnelState.Starting -> "Platform VPN service started; WireGuard handshake still required."
                            WireGuardTunnelState.Disconnected -> "No verified VPN transport is active."
                        },
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(
                        onClick = { viewModel.toggleVpnConnection() },
                        enabled = !isStarting,
                        colors = ButtonDefaults.buttonColors(containerColor = if (isConnected) CyberGreen else CyberCyan, contentColor = DarkBackground),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(50.dp).testTag("btn_toggle_vpn")
                    ) {
                        Text(if (isConnected) "Disconnect VPN" else "Start VPN Lifecycle", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
            }
        }

        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                VpnSpecCard("Protocol", selectedServer?.protocol ?: "WireGuard", Icons.Default.Lock, Modifier.weight(1f))
                VpnSpecCard("Endpoint", if (selectedServer?.ipAddress.isNullOrBlank()) "Not provisioned" else "Provisioned", Icons.Default.Public, Modifier.weight(1f))
            }
        }

        item { Text("SERVER LOCATIONS (${servers.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp, modifier = Modifier.padding(top = 8.dp)) }

        items(servers, key = { it.id }) { server ->
            VpnServerCard(server = server, isSelected = selectedServer?.id == server.id, isConnected = isConnected && selectedServer?.id == server.id, onSelect = { viewModel.selectVpnServer(server) })
        }
    }
}

@Composable
fun VpnSpecCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = CyberCyan, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Column {
                Text(title, fontSize = 10.sp, color = TextMuted)
                Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }
    }
}
