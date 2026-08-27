package com.example.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.CellInfo
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.TelephonyManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CellTower
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.example.ui.theme.LocalAppSkin

private data class CellEvidence(val technology: String, val operator: String, val id: String, val signalDbm: Int, val registered: Boolean)

@SuppressLint("MissingPermission")
@Composable
fun ImsiRadarScreen(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val skin = LocalAppSkin.current
    val telephony = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
    var permissionMissing by remember { mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) }
    var cells by remember { mutableStateOf<List<CellInfo>>(emptyList()) }

    fun refresh() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissionMissing = true
            return
        }
        permissionMissing = false
        cells = telephony.allCellInfo ?: emptyList()
    }

    val evidence = cells.mapNotNull { info ->
        when (info) {
            is CellInfoLte -> CellEvidence("LTE", info.cellIdentity.operatorAlphaLong?.toString() ?: "Unknown", info.cellIdentity.ci.toString(), info.cellSignalStrength.dbm, info.isRegistered)
            is CellInfoGsm -> CellEvidence("GSM", info.cellIdentity.operatorAlphaLong?.toString() ?: "Unknown", info.cellIdentity.cid.toString(), info.cellSignalStrength.dbm, info.isRegistered)
            is CellInfoWcdma -> CellEvidence("WCDMA", info.cellIdentity.operatorAlphaLong?.toString() ?: "Unknown", info.cellIdentity.cid.toString(), info.cellSignalStrength.dbm, info.isRegistered)
            is CellInfoNr -> CellEvidence("5G NR", "Unknown", info.cellIdentity.nci.toString(), info.cellSignalStrength.dbm, info.isRegistered)
            else -> null
        }
    }

    Column(modifier.fillMaxSize().background(skin.bgColor).padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("RADAR & IMSI", color = skin.textPrimaryColor, fontSize = 18.sp)
                Text("Stvarni podaci s Telephony API-ja uređaja", color = skin.textMutedColor, fontSize = 11.sp)
            }
            Button(onClick = ::refresh, colors = ButtonDefaults.buttonColors(containerColor = skin.primaryColor, contentColor = Color.Black)) {
                Icon(Icons.Default.Refresh, null)
                Spacer(Modifier.padding(2.dp))
                Text("Skeniraj")
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(skin.borderColor, skin.primaryColor))), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(14.dp)) {
                Text("STATUS DOKAZA", color = skin.textPrimaryColor, fontSize = 14.sp)
                Spacer(Modifier.height(6.dp))
                Text("Detekcija IMSI catchera nije moguća pouzdano samo ovim API-jem. Prikazani podaci su sirova telephony evidencija.", color = skin.textSecondaryColor, fontSize = 11.sp)
                Spacer(Modifier.height(6.dp))
                Text(if (permissionMissing) "DOZVOLA POTREBNA" else "EVIDENCE: ${evidence.size} CELL INFO", color = if (permissionMissing) Color(0xFFFFB300) else skin.primaryColor, fontSize = 12.sp)
            }
        }
        if (evidence.isEmpty() && !permissionMissing) {
            Text("Nema dostupnih ćelijskih zapisa. Dodijeli lokacijsku dozvolu i ponovi skeniranje.", color = skin.textMutedColor, fontSize = 12.sp)
        }
        evidence.forEach { cell ->
            Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(if (cell.registered) skin.primaryColor else skin.borderColor)), shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CellTower, null, tint = if (cell.registered) skin.primaryColor else skin.textMutedColor)
                        Spacer(Modifier.padding(4.dp))
                        Text("${cell.technology} • ${cell.operator}", color = skin.textPrimaryColor, fontSize = 14.sp)
                        Spacer(Modifier.weight(1f))
                        Text(if (cell.registered) "REGISTERED" else "NEIGHBOR", color = skin.primaryColor, fontSize = 9.sp)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text("Cell ID: ${cell.id} • Signal: ${cell.signalDbm} dBm", color = skin.textSecondaryColor, fontSize = 11.sp)
                    Text("Zaključak: UNVERIFIED — nema dovoljno dokaza za tvrdnju o IMSI catcheru.", color = Color(0xFFFFB300), fontSize = 10.sp)
                }
            }
        }
    }
}
