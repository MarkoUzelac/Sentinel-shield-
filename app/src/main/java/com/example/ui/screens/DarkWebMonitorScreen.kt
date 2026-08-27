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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.BreachRecord
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.CyberOrange
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.DarkSurface
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel

@Composable
fun DarkWebMonitorScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    val query by viewModel.darkWebQuery.collectAsState()
    val isSearching by viewModel.isSearchingBreaches.collectAsState()
    val breachResults by viewModel.breachResults.collectAsState()
    val hasSearched by viewModel.hasSearchedBreaches.collectAsState()

    LazyColumn(modifier = modifier.fillMaxSize().background(DarkBackground).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("BREACH INTELLIGENCE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp)
            Spacer(Modifier.height(4.dp))
            Text("Provjera koristi stvarni HIBP provider kada je konfiguriran. Bez providera nema sintetičkih rezultata.", fontSize = 13.sp, color = CyberOrange)
        }
        item {
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DarkCardBorder))) {
                Column(Modifier.padding(16.dp)) {
                    Text("IDENTITY", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = query,
                        onValueChange = viewModel::updateDarkWebQuery,
                        placeholder = { Text("Enter email address", color = TextMuted, fontSize = 13.sp) },
                        modifier = Modifier.fillMaxWidth().testTag("input_darkweb_query"),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = CyberCyan, unfocusedBorderColor = DarkCardBorder, focusedContainerColor = DarkSurface, unfocusedContainerColor = DarkSurface, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.searchDarkWebBreaches() }, enabled = !isSearching && query.isNotBlank(), modifier = Modifier.fillMaxWidth().height(48.dp).testTag("btn_search_darkweb"), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = CyberOrange, contentColor = DarkBackground)) {
                        if (isSearching) {
                            CircularProgressIndicator(Modifier.size(20.dp), color = DarkBackground, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text("Provjera u tijeku…", fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.Search, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Provjeri breach podatke", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        if (hasSearched) {
            item { Text("RESULTS (${breachResults.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted, letterSpacing = 1.sp) }
            if (breachResults.isEmpty()) {
                item {
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = DarkCard)) {
                        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, null, tint = CyberOrange, modifier = Modifier.size(32.dp))
                            Spacer(Modifier.width(16.dp))
                            Column {
                                Text("Nema breach zapisa", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Provider nije vratio zapis ili nije konfiguriran. Rezultat se ne interpretira kao dokaz potpune sigurnosti.", fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                    }
                }
            } else {
                items(breachResults, key = { it.id }) { breach -> BreachRecordCard(breach) }
            }
        }
    }
}

@Composable
fun BreachRecordCard(breach: BreachRecord) {
    Card(modifier = Modifier.fillMaxWidth().testTag("breach_card_${breach.id}"), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = DarkCard), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(CyberOrange.copy(alpha = .5f)))) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.clip(RoundedCornerShape(6.dp)).background(CyberOrange.copy(alpha = .2f)).padding(horizontal = 8.dp, vertical = 4.dp)) { Text("HIBP / UNVERIFIED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = CyberOrange) }
                Spacer(Modifier.width(10.dp))
                Text(breach.breachDate, fontSize = 11.sp, color = TextMuted)
            }
            Spacer(Modifier.height(10.dp))
            Text(breach.domain, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(4.dp))
            Text(breach.description, fontSize = 13.sp, color = TextSecondary)
            Spacer(Modifier.height(12.dp))
            Text("Data: ${breach.compromisedFields.joinToString(", ")}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = CyberOrange)
        }
    }
}
