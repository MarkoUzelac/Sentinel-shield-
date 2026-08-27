package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.DeviceLocationState
import com.example.data.model.SignalKind
import com.example.data.model.SignalRadarItem
import com.example.ui.theme.LocalAppSkin
import kotlin.math.min

/** Premium tactical radar visualization using only runtime-backed observations. */
@Composable
fun TacticalRadarMap(
    location: DeviceLocationState,
    signals: List<SignalRadarItem>,
    modifier: Modifier = Modifier
) {
    val skin = LocalAppSkin.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(330.dp)
            .background(skin.cardColor, RoundedCornerShape(24.dp)),
        contentAlignment = Alignment.TopStart
    ) {
        Canvas(Modifier.matchParentSize()) {
            val center = Offset(size.width / 2f, size.height / 2f + 8f)
            val radius = min(size.width, size.height) * .34f

            drawCircle(skin.primaryColor.copy(alpha = .06f), radius)
            drawCircle(skin.primaryColor.copy(alpha = .04f), radius * .68f)
            drawCircle(skin.primaryColor.copy(alpha = .03f), radius * .36f)
            drawCircle(skin.primaryColor.copy(alpha = .18f), radius, style = Stroke(1.2f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f))))
            drawCircle(skin.primaryColor.copy(alpha = .12f), radius * .68f, style = Stroke(1f))
            drawCircle(skin.primaryColor.copy(alpha = .10f), radius * .36f, style = Stroke(1f))

            for (fraction in listOf(.25f, .5f, .75f, 1f)) {
                drawLine(skin.primaryColor.copy(alpha = .06f), Offset(center.x - radius * fraction, center.y), Offset(center.x + radius * fraction, center.y), 1f)
                drawLine(skin.primaryColor.copy(alpha = .06f), Offset(center.x, center.y - radius * fraction), Offset(center.x, center.y + radius * fraction), 1f)
            }

            if (location.hasFix) {
                val accuracy = (location.accuracyMeters ?: 20f).coerceIn(5f, 250f)
                val accuracyPx = (accuracy / 250f) * radius
                drawCircle(skin.primaryColor.copy(alpha = .10f), accuracyPx)
                drawCircle(skin.primaryColor.copy(alpha = .75f), 6f)
                drawCircle(skin.primaryColor.copy(alpha = .25f), 12f, style = Stroke(1.5f))
            }

            signals.take(20).forEachIndexed { index, signal ->
                val ring = when (signal.kind) {
                    SignalKind.BLE -> (signal.estimatedDistanceMeters?.toFloat() ?: 8f).coerceIn(4f, 80f)
                    SignalKind.CELLULAR -> 70f + (index % 3) * 20f
                    SignalKind.WIFI_NETWORK, SignalKind.VPN_NETWORK -> 55f
                }
                val px = center.x + ((index % 5) - 2) * 26f
                val py = center.y + ((index / 5) - 1) * 28f
                val scale = (ring / 80f).coerceIn(.25f, 1f)
                when (signal.kind) {
                    SignalKind.BLE -> {
                        drawCircle(skin.accentSecondary.copy(alpha = .12f), 10f + scale * 6f, Offset(px, py))
                        drawCircle(skin.accentSecondary, 4f, Offset(px, py))
                    }
                    SignalKind.CELLULAR -> {
                        drawCircle(skin.primaryColor.copy(alpha = .12f), 5f, Offset(px, py))
                        drawCircle(skin.primaryColor, 3f, Offset(px, py))
                    }
                    else -> drawCircle(skin.textSecondaryColor, 3f, Offset(px, py))
                }
            }
        }

        Text(
            text = if (location.hasFix) "LIVE · ${location.coordinateLabel}" else "LIVE · LOKACIJA NIJE DOSTUPNA",
            color = skin.textPrimaryColor,
            fontSize = 11.sp,
            modifier = Modifier.align(Alignment.TopStart)
        )
        Text(
            text = "RUNTIME SIGNAL RADAR · bez sintetičkih koordinata",
            color = skin.textMutedColor,
            fontSize = 9.sp,
            modifier = Modifier.align(Alignment.BottomStart)
        )
    }
}
