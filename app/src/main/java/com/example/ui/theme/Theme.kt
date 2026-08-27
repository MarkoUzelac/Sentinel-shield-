package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val SentinelDarkColorScheme = darkColorScheme(
    primary = CyberCyan,
    onPrimary = DarkBackground,
    primaryContainer = DarkCard,
    onPrimaryContainer = CyberCyan,
    secondary = CyberGreen,
    onSecondary = DarkBackground,
    secondaryContainer = DarkCard,
    onSecondaryContainer = CyberGreen,
    tertiary = CyberPurple,
    onTertiary = DarkBackground,
    background = DarkBackground,
    onBackground = TextPrimary,
    surface = DarkSurface,
    onSurface = TextPrimary,
    surfaceVariant = DarkCard,
    onSurfaceVariant = TextSecondary,
    outline = DarkCardBorder,
    error = CyberRed,
    onError = TextPrimary
)

@Composable
fun SentinelShieldTheme(
    darkTheme: Boolean = true, // Default to sleek cyber dark theme
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = SentinelDarkColorScheme,
        typography = Typography,
        content = content
    )
}

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    SentinelShieldTheme(darkTheme = true, content = content)
}
