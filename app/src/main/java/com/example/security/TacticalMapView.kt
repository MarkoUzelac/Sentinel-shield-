package com.example.security

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import kotlin.math.max

@Composable
fun TacticalMapView(points: List<TacticalMapPoint>, modifier: Modifier = Modifier) {
  val located = points.filter { it.latitude != null && it.longitude != null }
  Column(
    modifier = modifier
      .background(MaterialTheme.colorScheme.surface)
      .padding(12.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp),
  ) {
    Text("TACTICAL MAP", style = MaterialTheme.typography.titleMedium)
    Box(Modifier.fillMaxSize()) {
      Canvas(Modifier.fillMaxSize()) {
        if (located.isEmpty()) return@Canvas
        val minLat = located.minOf { it.latitude!! }
        val maxLat = located.maxOf { it.latitude!! }
        val minLon = located.minOf { it.longitude!! }
        val maxLon = located.maxOf { it.longitude!! }
        val latRange = max(maxLat - minLat, 0.000001)
        val lonRange = max(maxLon - minLon, 0.000001)

        located.forEach { point ->
          val x = ((point.longitude!! - minLon) / lonRange * size.width).toFloat()
          val y = ((maxLat - point.latitude!!) / latRange * size.height).toFloat()
          drawCircle(
            color = Color.Unspecified,
            radius = 10f,
            center = Offset(x, y),
          )
        }
      }
      if (located.isEmpty()) {
        Text("LOCATION EVIDENCE UNAVAILABLE")
      }
    }
  }
}
