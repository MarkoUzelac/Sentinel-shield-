package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.ThreatAlertCard
import com.example.ui.theme.CyberCyan
import com.example.ui.theme.DarkBackground
import com.example.ui.theme.DarkCard
import com.example.ui.theme.DarkCardBorder
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.viewmodel.MainViewModel

@Composable
fun AiScannerScreen(viewModel: MainViewModel, modifier: Modifier = Modifier) {
    var selectedTab by remember { mutableStateOf(0) }
    Column(modifier = modifier.fillMaxSize().background(DarkBackground)) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = DarkCard,
            contentColor = CyberCyan,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]), color = CyberCyan)
            }
        ) {
            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = {
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.Psychology, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("AI Threat Audit", fontWeight = FontWeight.Bold) }
            }, modifier = Modifier.testTag("tab_ai_threat_audit"))
            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = {
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.AutoAwesome, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Sentinel AI Advisor", fontWeight = FontWeight.Bold) }
            }, modifier = Modifier.testTag("tab_sentinel_ai_chat"))
        }
        if (selectedTab == 0) ThreatScannerTab(viewModel) else SentinelAiChatTab(viewModel)
    }
}

@Composable
fun ThreatScannerTab(viewModel: MainViewModel) {
    val input by viewModel.aiTargetInput.collectAsState()
    val category by viewModel.aiScanCategory.collectAsState()
    val isScanning by viewModel.isAiScanning.collectAsState()
    val threatResult by viewModel.lastThreatResult.collectAsState()
    val categories = listOf("URL / Phishing", "SMS / Email Text", "Sideload APK", "Weak Credentials", "App Permissions")

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Text("GEMINI THREAT AUDIT ENGINE", 12.sp, FontWeight.Bold, TextMuted, letterSpacing = 1.sp); Spacer(Modifier.height(4.dp)); Text("Analyze URLs, phishing messages, file signatures, or permission requests using Gemini AI models.", 13.sp, color = TextSecondary) }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.take(3).forEach { cat ->
                    val selected = category == cat
                    Box(Modifier.clip(RoundedCornerShape(20.dp)).background(if (selected) CyberCyan.copy(alpha = .2f) else DarkCard).border(1.dp, if (selected) CyberCyan else DarkCardBorder, RoundedCornerShape(20.dp)).clickable { viewModel.updateAiScanCategory(cat) }.padding(horizontal = 12.dp, vertical = 6.dp)) {
                        Text(cat, 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, color = if (selected) CyberCyan else TextSecondary)
                    }
                }
            }
        }
        item {
            OutlinedTextField(value = input, onValueChange = viewModel::updateAiTargetInput, placeholder = { Text("Paste URL, SMS text, or IP address", color = TextMuted, fontSize = 13.sp) }, modifier = Modifier.fillMaxWidth().testTag("input_ai_target"), maxLines = 4, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = CyberCyan, unfocusedBorderColor = DarkCardBorder, focusedContainerColor = DarkCard, unfocusedContainerColor = DarkCard, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary), shape = RoundedCornerShape(14.dp))
        }
        item {
            Button(onClick = viewModel::runAiThreatScan, enabled = !isScanning && input.isNotBlank(), modifier = Modifier.fillMaxWidth().height(50.dp).testTag("btn_run_ai_analysis"), shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = CyberCyan, contentColor = DarkBackground)) {
                if (isScanning) { CircularProgressIndicator(Modifier.size(22.dp), color = DarkBackground, strokeWidth = 2.dp); Spacer(Modifier.width(10.dp)); Text("Analyzing with Gemini AI...", fontWeight = FontWeight.Bold) }
                else { Icon(Icons.Default.Search, null); Spacer(Modifier.width(8.dp)); Text("Analyze Threat", fontWeight = FontWeight.Bold, fontSize = 16.sp) }
            }
        }
        if (threatResult != null) { item { Text("AUDIT RESULT", 12.sp, FontWeight.Bold, TextMuted, letterSpacing = 1.sp) }; item { ThreatAlertCard(threat = threatResult!!) } }
    }
}

@Composable
fun SentinelAiChatTab(viewModel: MainViewModel) {
    val messages by viewModel.chatMessages.collectAsState()
    val isThinking by viewModel.isChatThinking.collectAsState()
    var userText by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(messages) { (sender, msg) ->
                val isUser = sender == "user"
                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
                    Box(Modifier.clip(RoundedCornerShape(16.dp)).background(if (isUser) CyberCyan.copy(alpha = .2f) else DarkCard).border(1.dp, if (isUser) CyberCyan.copy(alpha = .5f) else DarkCardBorder, RoundedCornerShape(16.dp)).padding(14.dp).widthIn(max = 280.dp)) { Text(msg, 14.sp, color = TextPrimary) }
                }
            }
            if (isThinking) item { Box(Modifier.clip(RoundedCornerShape(16.dp)).background(DarkCard).padding(12.dp)) { Text("Sentinel AI is thinking...", 13.sp, color = CyberCyan) } }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = userText, onValueChange = { userText = it }, placeholder = { Text("Ask Sentinel AI security advice...", color = TextMuted, fontSize = 13.sp) }, modifier = Modifier.weight(1f).testTag("input_sentinel_chat"), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = CyberCyan, unfocusedBorderColor = DarkCardBorder, focusedContainerColor = DarkCard, unfocusedContainerColor = DarkCard, focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary), shape = RoundedCornerShape(24.dp), maxLines = 3)
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = { if (userText.isNotBlank()) { viewModel.sendSentinelChatMessage(userText); userText = "" } }, modifier = Modifier.size(48.dp).clip(CircleShape).background(CyberCyan).testTag("btn_send_sentinel_chat")) { Icon(Icons.Default.Send, "Send", tint = DarkBackground) }
        }
    }
}
