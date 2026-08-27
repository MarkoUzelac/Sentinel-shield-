package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.CapabilityEvidence
import com.example.data.model.CapabilityStatus
import com.example.ui.theme.LocalAppSkin

@Composable
fun CapabilityEvidenceCard(
    evidence: CapabilityEvidence,
    modifier: Modifier = Modifier
) {
    val skin = LocalAppSkin.current
    val accent = when (evidence.status) {
        CapabilityStatus.VERIFIED -> skin.primaryColor
        CapabilityStatus.UNVERIFIED -> Color(0xFFFFB300)
        CapabilityStatus.UNAVAILABLE -> skin.textMutedColor
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(skin.cardColor)
            .border(1.dp, accent.copy(alpha = .5f), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(9.dp).clip(CircleShape).background(accent))
            Text(evidence.title, modifier = Modifier.weight(1f), color = skin.textPrimaryColor, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Text(evidence.status.name, color = accent, fontSize = 9.sp, fontWeight = FontWeight.Black)
        }
        Text("Izvor: ${evidence.source}", color = skin.textMutedColor, fontSize = 9.sp, modifier = Modifier.padding(top = 5.dp))
        Text(evidence.details, color = skin.textSecondaryColor, fontSize = 10.sp, modifier = Modifier.padding(top = 4.dp))
    }
}
