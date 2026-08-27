package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.ui.components.CapabilityEvidenceCard
import com.example.ui.theme.LocalAppSkin
import com.example.ui.viewmodel.MainViewModel

@Composable
fun ImsiRadarScreen(
    viewModel: MainViewModel,
    modifier: Modifier = Modifier
) {
    val skin = LocalAppSkin.current
    val evidence by viewModel.capabilityEvidence.collectAsState()
    val evidenceSnapshot = remember(evidence) { CapabilityEvidenceSnapshot.from(evidence) }
    val radarEvidence = evidenceSnapshot.get(CapabilityId.RADAR_TELEPHONY)
    val observation by viewModel.radarObservation.collectAsState()

    Column(
        modifier.fillMaxSize().background(skin.bgColor).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("RADAR & IMSI", color = skin.textPrimaryColor, fontSize = 18.sp)
        Text("Telephony evidencija iz centralnog Capability / Evidence modela", color = skin.textMutedColor, fontSize = 11.sp)
        if (radarEvidence != null) CapabilityEvidenceCard(radarEvidence)

        Button(
            onClick = { viewModel.refreshEvidenceSources() },
            colors = ButtonDefaults.buttonColors(containerColor = skin.primaryColor, contentColor = Color.Black)
        ) {
            Text("OSVJEŽI STVARNI TELEPHONY DOKAZ")
        }
        Spacer(Modifier.height(2.dp))
        Text("Ćelijski zapisi: ${observation.cellRecordCount} • Lokacijska dozvola: ${if (observation.permissionGranted) "DA" else "NE"}", color = skin.textSecondaryColor, fontSize = 11.sp)
        Text(
            "IMSI catcher detekcija ostaje UNVERIFIED: Android Telephony API daje evidenciju ćelija, ali ne potvrđuje sam identitet ili zlonamjernost bazne stanice.",
            color = skin.textMutedColor,
            fontSize = 10.sp
        )
    }
}
