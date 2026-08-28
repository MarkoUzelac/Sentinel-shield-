package com.example.security

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

@Composable
fun RadarView(contacts: List<RadarContact>, modifier: Modifier = Modifier) {
  Column(
    modifier = modifier
      .background(MaterialTheme.colorScheme.surface)
      .padding(12.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    Text("RADAR", style = MaterialTheme.typography.titleMedium)
    Canvas(Modifier.fillMaxSize()) {
      val center = Offset(size.width / 2f, size.height / 2f)
      val radius = min(size.width, size.height) * 0.4f
      drawCircle(color = Color.Unspecified, radius = radius, center = center)
      contacts.take(64).forEachIndexed { index, contact ->
        val angle = (index.toDouble() / maxOf(contacts.size, 1)) * Math.PI * 2.0
        val distanceFactor = when (contact.evidence) {
          EvidenceState.VERIFIED -> 0.45f
          EvidenceState.STALE -> 0.75f
          EvidenceState.ESTIMATED -> 0.62f
          EvidenceState.UNVERIFIED -> 0.85f
          EvidenceState.UNAVAILABLE -> 1.0f
        }
        drawCircle(
          color = Color.Unspecified,
          radius = 8f,
          center = Offset(
            (center.x + cos(angle) * radius * distanceFactor).toFloat(),
            (center.y + sin(angle) * radius * distanceFactor).toFloat(),
          ),
        )
      }
    }
  }
}
