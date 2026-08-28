package com.example.security

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

@Composable
fun RadarView(contacts: List<RadarContact>, modifier: Modifier = Modifier) {
  Column(modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
    Text("RADAR", style = MaterialTheme.typography.titleMedium)
    Canvas(Modifier.fillMaxSize()) {
      val center = Offset(size.width / 2f, size.height / 2f)
      val radius = min(size.width, size.height) * 0.38f
      drawCircle(color = MaterialTheme.colorScheme.outline, radius = radius, center = center, style = androidx.compose.ui.graphics.drawscope.Stroke(2f))
      contacts.take(64).forEachIndexed { index, contact ->
        val angle = index.toDouble() / maxOf(contacts.size, 1) * Math.PI * 2.0
        val factor = when (contact.evidence) {
          EvidenceState.VERIFIED -> 0.45f
          EvidenceState.STALE -> 0.75f
          EvidenceState.ESTIMATED -> 0.62f
          EvidenceState.UNVERIFIED -> 0.85f
          EvidenceState.UNAVAILABLE -> 1f
        }
        drawCircle(
          color = MaterialTheme.colorScheme.primary,
          radius = 6f,
          center = Offset((center.x + cos(angle) * radius * factor).toFloat(), (center.y + sin(angle) * radius * factor).toFloat()),
        )
      }
    }
  }
}
