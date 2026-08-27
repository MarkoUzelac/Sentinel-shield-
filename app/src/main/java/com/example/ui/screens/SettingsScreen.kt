package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.localization.AppLanguage
import com.example.data.localization.LocaleManager
import com.example.ui.theme.AppSkin
import com.example.ui.theme.LocalAppSkin
import com.example.ui.theme.SkinManager

@Composable
fun SettingsScreen(modifier: Modifier = Modifier) {
    val skin = LocalAppSkin.current
    val currentLanguage by LocaleManager.currentLanguage.collectAsState()
    val currentSkin by SkinManager.currentSkin.collectAsState()
    val languages = AppLanguage.values().toList()
    LazyColumn(modifier.fillMaxSize().background(skin.bgColor).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text(LocaleManager.getString("settings_title", currentLanguage), color = skin.textPrimaryColor, fontSize = 22.sp) }
        item { Text("SENTINEL SHIELD • PRO UI", color = skin.textMutedColor, fontSize = 11.sp) }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Language, null, tint = skin.primaryColor)
                        Spacer(Modifier.padding(4.dp))
                        Text("Jezik Sučelja", color = skin.textPrimaryColor, fontSize = 15.sp)
                    }
                    Spacer(Modifier.height(8.dp))
                    languages.forEach { lang ->
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(if (lang == currentLanguage) skin.primaryColor.copy(alpha = .15f) else Color.Transparent).clickable { LocaleManager.setLanguage(lang) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${lang.flag} ${lang.displayName}", color = skin.textPrimaryColor, fontSize = 13.sp)
                            if (lang == currentLanguage) Icon(Icons.Default.Check, null, tint = skin.primaryColor)
                        }
                    }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Visual Skins & Themes", color = skin.textPrimaryColor, fontSize = 15.sp)
                    Spacer(Modifier.height(8.dp))
                    AppSkin.values().forEach { candidate ->
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { SkinManager.setSkin(candidate) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(candidate.icon, fontSize = 20.sp)
                                Spacer(Modifier.padding(4.dp))
                                Column { Text(candidate.displayName, color = skin.textPrimaryColor, fontSize = 13.sp); Text(if (candidate.isDark) "Tamni način" else "Svijetli način", color = skin.textMutedColor, fontSize = 10.sp) }
                            }
                            if (candidate == currentSkin) Icon(Icons.Default.Check, null, tint = candidate.primaryColor)
                        }
                    }
                }
            }
        }
    }
}
