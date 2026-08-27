package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PhoneForwarded
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.localization.stringRes
import com.example.ui.theme.LocalAppSkin
import androidx.compose.foundation.shape.RoundedCornerShape

private data class MmiCode(val code: String, val title: String, val description: String, val destructive: Boolean = false)

@Composable
fun CallSecurityScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val skin = LocalAppSkin.current
    var micMonitor by remember { mutableStateOf(false) }
    var smsProtection by remember { mutableStateOf(true) }
    var silentSmsAlert by remember { mutableStateOf(false) }
    val codes = listOf(
        MmiCode("*#21#", "Bezuvjetno preusmjeravanje", "Operatorska MMI provjera statusa preusmjeravanja."),
        MmiCode("*#62#", "Preusmjeravanje kad nisi dostupan", "Provjerava odredište za slučaj nedostupnog uređaja."),
        MmiCode("*#67#", "Preusmjeravanje kad je zauzeto", "Provjerava odredište kada je linija zauzeta."),
        MmiCode("*#61#", "Preusmjeravanje kad se ne javiš", "Provjerava odredište nakon isteka zvonjenja."),
        MmiCode("##002#", "Poništi preusmjeravanja", "Otvara dialer s operatorskim reset kodom; operator i uređaj određuju rezultat.", true)
    )
    LazyColumn(modifier.fillMaxSize().background(skin.bgColor).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text(stringRes("call_sec_title"), fontSize = 14.sp, color = skin.textMutedColor)
            Spacer(Modifier.height(4.dp))
            Text(stringRes("call_sec_subtitle"), fontSize = 13.sp, color = skin.textSecondaryColor)
        }
        items(codes) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(skin.borderColor, if (item.destructive) Color(0xFFFF1744) else skin.primaryColor))), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (item.destructive) Icons.Default.Cancel else Icons.Default.PhoneForwarded, null, tint = if (item.destructive) Color(0xFFFF1744) else skin.primaryColor)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(item.title, color = skin.textPrimaryColor, fontSize = 14.sp)
                            Text(item.code, color = skin.primaryColor, fontSize = 12.sp)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(item.description, color = skin.textSecondaryColor, fontSize = 11.sp)
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${item.code}"))) }, colors = ButtonDefaults.buttonColors(containerColor = if (item.destructive) Color(0xFFFF1744) else skin.primaryColor, contentColor = Color.Black)) {
                        Icon(Icons.Default.Call, null)
                        Spacer(Modifier.width(6.dp))
                        Text("Otvori broj", fontSize = 12.sp)
                    }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(skin.borderColor)), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("Zaštitni senzori", color = skin.textPrimaryColor, fontSize = 15.sp)
                    Spacer(Modifier.height(8.dp))
                    Toggle("Nadzor korištenja mikrofona", micMonitor, { micMonitor = it }, skin)
                    Toggle("SMS / OTP upozorenja", smsProtection, { smsProtection = it }, skin)
                    Toggle("Upozorenje na tihi SMS", silentSmsAlert, { silentSmsAlert = it }, skin)
                    Spacer(Modifier.height(6.dp))
                    Text("Ove kontrole mijenjaju samo lokalne Sentinel postavke; ne jamče otkrivanje skrivene prislušne opreme.", color = skin.textMutedColor, fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
private fun Toggle(title: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit, skin: com.example.ui.theme.AppSkin) {
    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Security, null, tint = skin.primaryColor)
        Spacer(Modifier.width(10.dp))
        Text(title, Modifier.weight(1f), color = skin.textPrimaryColor, fontSize = 13.sp)
        Switch(checked = checked, onCheckedChange = onCheckedChange, colors = SwitchDefaults.colors(checkedThumbColor = Color.Black, checkedTrackColor = skin.primaryColor))
    }
}
