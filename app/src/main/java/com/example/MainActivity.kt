package com.example

import android.Manifest
import android.content.Context
import android.net.ConnectivityManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.example.security.AndroidSignalIngestor
import com.example.security.AndroidSignalRepository
import com.example.security.OpenCellIdEnricher
import com.example.security.ObservationHistory
import com.example.security.SentinelDatabase
import com.example.security.ThreatSnapshotProjector

class MainActivity : ComponentActivity() {
  private lateinit var repository: AndroidSignalRepository

  private val requestPermissions = registerForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions(),
  ) { repository.start(lifecycleScope) }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val database = SentinelDatabase.get(this)
    val connectivity = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    repository = AndroidSignalRepository(
      ingestor = AndroidSignalIngestor(this),
      history = ObservationHistory(database.observationDao()),
      enricher = OpenCellIdEnricher(),
      connectivityManager = connectivity,
    )

    setContent {
      val snapshot by repository.snapshot.collectAsState()
      val running by repository.running.collectAsState()
      val radarContacts = ThreatSnapshotProjector.radar(snapshot, System.currentTimeMillis())
      val mapPoints = ThreatSnapshotProjector.tacticalMap(snapshot)

      MaterialTheme {
        Column(
          Modifier.fillMaxSize().padding(24.dp),
          horizontalAlignment = Alignment.CenterHorizontally,
          verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        ) {
          Text("SENTINEL SHIELD", style = MaterialTheme.typography.headlineMedium)
          Text(if (running) "LIVE EVIDENCE INGEST" else "INGEST STOPPED")
          Text("Observations: ${snapshot.observations.size}")
          Text("Radar contacts: ${radarContacts.size}")
          Text("Map points: ${mapPoints.size}")
          Text("Highest threat: ${snapshot.highestThreatScore}/100")
          snapshot.observations.groupingBy { it.kind }.eachCount().forEach { (kind, count) ->
            Text("$kind: $count")
          }
          snapshot.observations.filter { it.kind.name == "CELLULAR" }.take(3).forEach { observation ->
            Text("CELL ${observation.payload["radio"].orEmpty()} ${observation.payload["mcc"].orEmpty()}/${observation.payload["mnc"].orEmpty()} id=${observation.payload["cid"] ?: observation.payload["ci"] ?: "unavailable"}")
          }
          Button(onClick = { startIngest() }) {
            Text(if (running) "REFRESH INGEST" else "START SENSOR INGEST")
          }
          DisposableEffect(Unit) {
            onDispose { repository.stop() }
          }
        }
      }
    }

    startIngest()
  }

  private fun startIngest() {
    requestPermissions.launch(
      arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
      ),
    )
  }
}
