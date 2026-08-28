package com.example

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.security.RadarContact
import com.example.security.TacticalMapPoint

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
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
      StatusCard("RADAR", contacts.size.toString(), Modifier.weight(1f))
      StatusCard("MAP", mapPoints.size.toString(), Modifier.weight(1f))
    }
    Card(modifier = Modifier.fillMaxSize()) {
      Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Security evidence", style = MaterialTheme.typography.titleMedium)
        if (contacts.isEmpty() && mapPoints.isEmpty()) {
          Text("No verified external contacts or map points available.")
          Text("The application does not fabricate telemetry.")
        } else {
          Text("Radar contacts: ${contacts.size}")
          Text("Evidence-backed map points: ${mapPoints.size}")
        }
      }
    }
  }
}

@Composable
private fun StatusCard(title: String, value: String, modifier: Modifier = Modifier) {
  Card(modifier = modifier) {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
      Text(title, style = MaterialTheme.typography.labelLarge)
      Text(value, style = MaterialTheme.typography.headlineSmall)
    }
  }
}
