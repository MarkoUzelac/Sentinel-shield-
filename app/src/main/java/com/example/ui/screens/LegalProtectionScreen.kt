package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Gavel
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.localization.stringRes
import com.example.ui.theme.LocalAppSkin

@Composable
fun LegalProtectionScreen(modifier: Modifier = Modifier) {
    val skin = LocalAppSkin.current
    val context = androidx.compose.ui.platform.LocalContext.current
    val sources = listOf(
        "Ustav RH — čl. 35–37" to "https://narodne-novine.nn.hr/clanci/sluzbeni/1998_01_8_121.html",
        "GDPR — Uredba (EU) 2016/679" to "https://eur-lex.europa.eu/legal-content/HR/ALL/?uri=celex%3A32016R0679",
        "Zakon o kaznenom postupku — čl. 332" to "https://narodne-novine.nn.hr/clanci/sluzbeni/2011_10_121_2386.html"
    )
    Column(modifier.fillMaxSize().background(skin.bgColor).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(stringRes("legal_title"), color = skin.textPrimaryColor, fontSize = 18.sp)
        Text(stringRes("legal_subtitle"), color = skin.textSecondaryColor, fontSize = 12.sp)
        Card(colors = CardDefaults.cardColors(containerColor = skin.cardColor), border = CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(skin.primaryColor)), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(16.dp)) {
                Icon(Icons.Default.Gavel, null, tint = skin.primaryColor)
                Spacer(Modifier.height(8.dp))
                Text("Privatnost i tajnost komunikacija", color = skin.textPrimaryColor, fontSize = 15.sp)
                Spacer(Modifier.height(6.dp))
                Text("Ustav RH štiti osobni i obiteljski život te tajnost komunikacija; ograničenja se mogu propisati zakonom. Posebne dokazne radnje nadzora komunikacija provode se pod zakonskim uvjetima i odgovarajućim nalogom.", color = skin.textSecondaryColor, fontSize = 11.sp)
            }
        }
        sources.forEach { (title, url) ->
            Button(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }, colors = ButtonDefaults.buttonColors(containerColor = skin.cardColor, contentColor = skin.primaryColor), modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.OpenInBrowser, null)
                Spacer(Modifier.padding(3.dp))
                Text(title, color = skin.primaryColor, fontSize = 12.sp)
            }
        }
        Text("Informativni sadržaj nije zamjena za pravni savjet. Tekst treba provjeriti prema važećim propisima.", color = Color(0xFFFFB300), fontSize = 10.sp)
    }
}
