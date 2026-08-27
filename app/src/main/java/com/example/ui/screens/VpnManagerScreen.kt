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
fun VpnManagerScreen(
    viewModel: MainViewModel,
    onImportWireGuardProfile: () -> Unit,
    modifier: Modifier = Modifier
) {
    val vpnState by viewModel.vpnState.collectAsState()
    val isProvisioned by viewModel.isVpnProvisioned.collectAsState()
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val evidenceSnapshot = remember(evidence) { CapabilityEvidenceSnapshot.from(evidence) }
    val transportEvidence = evidenceSnapshot.effective(CapabilityId.VPN_TRANSPORT)
    val handshakeEvidence = evidenceSnapshot.effective(CapabilityId.VPN_HANDSHAKE)

    val isConnected = vpnState is WireGuardTunnelState.Connected
    val isBusy = vpnState is WireGuardTunnelState.Starting ||
        vpnState is WireGuardTunnelState.Verifying ||
        vpnState is WireGuardTunnelState.AwaitingUserConsent

    Column(
        modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("VPN TUNNEL", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary, letterSpacing = 1.1.sp)
        Text("Automatska zaštita · stvarno stanje i provjereni handshake", fontSize = 11.sp, color = TextMuted)

        transportEvidence?.let { CapabilityEvidenceCard(evidence = it) }
        handshakeEvidence?.let { CapabilityEvidenceCard(evidence = it) }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = DarkCard),
            border = CardDefaults.outlinedCardBorder().copy(
                brush = Brush.linearGradient(listOf(DarkCardBorder, if (isConnected) CyberGreen else CyberCyan))
            )
        ) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(92.dp)
                        .clip(CircleShape)
                        .background(if (isConnected) CyberGreen.copy(alpha = .18f) else CyberCyan.copy(alpha = .12f))
                        .border(2.dp, if (isConnected) CyberGreen else CyberCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.VpnKey, null, tint = if (isConnected) CyberGreen else CyberCyan, modifier = Modifier.size(46.dp))
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    text = when (vpnState) {
                        is WireGuardTunnelState.Connected -> "TUNEL VERIFICIRAN"
                        is WireGuardTunnelState.Starting -> "POKRETANJE TUNELA"
                        is WireGuardTunnelState.Verifying -> "PROVJERA HANDSHAKEA"
                        is WireGuardTunnelState.AwaitingUserConsent -> "ČEKANJE DOZVOLE"
                        is WireGuardTunnelState.Error -> "VPN NIJE DOSTUPAN"
                        WireGuardTunnelState.Disconnected -> "VPN NIJE POVEZAN"
                    },
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isConnected) CyberGreen else TextPrimary,
                    letterSpacing = 1.sp
                )
                Spacer(Modifier.height(5.dp))
                Text(
                    text = when (val state = vpnState) {
                        is WireGuardTunnelState.Connected -> "WireGuard transport je aktivan. Handshake: ${state.latestHandshakeEpochSeconds}"
                        is WireGuardTunnelState.Starting -> "Pokreće se stvarni WireGuard userspace backend."
                        is WireGuardTunnelState.Verifying -> "Čeka se svježi peer handshake prije potvrde zaštite."
                        is WireGuardTunnelState.AwaitingUserConsent -> "Potrebno je odobriti Android VPN dozvolu."
                        is WireGuardTunnelState.Error -> state.message
                        WireGuardTunnelState.Disconnected -> if (isProvisioned) "VPN profil je spreman za automatsko pokretanje." else "Managed VPN profil nije konfiguriran na ovom uređaju."
                    },
                    fontSize = 12.sp,
                    color = TextSecondary
                )
                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = viewModel::toggleVpnConnection,
                    enabled = !isBusy && (isProvisioned || isConnected),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isConnected) CyberGreen else CyberCyan,
                        contentColor = DarkBackground
                    )
                ) {
                    if (isBusy) {
                        CircularProgressIndicator(Modifier.size(18.dp), color = DarkBackground, strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(
                        text = when {
                            isConnected -> "ISKLJUČI VPN"
                            isBusy -> "POKRETANJE…"
                            else -> "POKRENI VPN"
                        },
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            VpnSpecCard("PROTOKOL", "WireGuard", Icons.Default.Lock, Modifier.weight(1f))
            VpnSpecCard(
                "STATUS",
                when {
                    isConnected -> "VERIFIED"
                    !isProvisioned -> "UNAVAILABLE"
                    else -> "UNVERIFIED"
                },
                Icons.Default.Public,
                Modifier.weight(1f)
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = DarkCard),
            border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(DarkCardBorder))
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("AUTOMATSKI VPN", color = CyberGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Glavni tok nema ručni .conf korak. Aplikacija koristi managed profil kada je stvarno konfiguriran. Ako endpoint nije dostupan, prikazuje UNAVAILABLE umjesto lažnog 'Protected' statusa.",
                    color = TextSecondary,
                    fontSize = 10.sp,
                    lineHeight = 15.sp
                )
            }
        }
    }
}

@Composable
fun VpnSpecCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = CardDefaults.outlinedCardBorder().copy(brush = SolidColor(DarkCardBorder))
    ) {
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
