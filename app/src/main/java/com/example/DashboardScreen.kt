package com.example

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.security.RadarContact
import com.example.security.RadarView
import com.example.security.TacticalMapPoint
import com.example.security.TacticalMapView

@Composable
fun DashboardScreen(
  contacts: List<RadarContact>,
  mapPoints: List<TacticalMapPoint>,
  modifier: Modifier = Modifier,
) {
  Column(
    modifier = modifier.fillMaxSize(),
    verticalArrangement = Arrangement.spacedBy(12.dp),
  ) {
    Text("SITUATIONAL AWARENESS", style = MaterialTheme.typography.titleLarge)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      RadarView(contacts, Modifier.weight(1f).height(300.dp))
      TacticalMapView(mapPoints, Modifier.weight(1f).height(300.dp))
    }
  }
}
