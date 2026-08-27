package com.example.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class AppSkin(
    val id: String,
    val displayName: String,
    val icon: String,
    val isDark: Boolean,
    val primaryColor: Color,
    val bgColor: Color,
    val surfaceColor: Color,
    val cardColor: Color,
    val borderColor: Color,
    val textPrimaryColor: Color,
    val textSecondaryColor: Color,
    val textMutedColor: Color,
    val accentSecondary: Color
) {
    PHOSPHOR_MATRIX("phosphor", "Phosphor Matrix (CRT)", "🟢", true, Color(0xFF4AF626), Color(0xFF000000), Color(0xFF050E05), Color(0xFF091609), Color(0xFF1B3D1B), Color(0xFFE2F5E2), Color(0xFF8BB58B), Color(0xFF4B7D4B), Color(0xFF00FFCC)),
    CYBER_CYAN_PRO("cyber_cyan", "Cyber Cyan (Tron Pro)", "⚡", true, Color(0xFF00F0FF), Color(0xFF070B14), Color(0xFF0D1527), Color(0xFF131F37), Color(0xFF1E2F52), Color(0xFFF0F4F8), Color(0xFF94A3B8), Color(0xFF64748B), Color(0xFF00E676)),
    STEALTH_MIDNIGHT("stealth_midnight", "Stealth Midnight (OLED)", "🌑", true, Color(0xFFFF3366), Color(0xFF000000), Color(0xFF0A0A0C), Color(0xFF141418), Color(0xFF282832), Color(0xFFFFFFFF), Color(0xFFA0A0B0), Color(0xFF606070), Color(0xFF9D4EDD)),
    SOLAR_AMBER("solar_amber", "Solar Tactical Amber", "🟠", true, Color(0xFFFFB300), Color(0xFF0C0A04), Color(0xFF181408), Color(0xFF241E0D), Color(0xFF443818), Color(0xFFFFF3E0), Color(0xFFFFCC80), Color(0xFFBCAAA4), Color(0xFFFF7043)),
    TITANIUM_LIGHT("titanium_light", "Titanium Clean (Light Mode)", "☀️", false, Color(0xFF0066CC), Color(0xFFF4F6F9), Color(0xFFFFFFFF), Color(0xFFFFFFFF), Color(0xFFD0D7DE), Color(0xFF1E293B), Color(0xFF475569), Color(0xFF94A3B8), Color(0xFF059669))
}

object SkinManager {
    private val _currentSkin = MutableStateFlow(AppSkin.PHOSPHOR_MATRIX)
    val currentSkin: StateFlow<AppSkin> = _currentSkin

    fun setSkin(skin: AppSkin) { _currentSkin.value = skin }

    fun getColorScheme(skin: AppSkin): ColorScheme = if (skin.isDark) {
        darkColorScheme(
            primary = skin.primaryColor,
            onPrimary = Color.Black,
            primaryContainer = skin.cardColor,
            onPrimaryContainer = skin.primaryColor,
            secondary = skin.accentSecondary,
            onSecondary = Color.Black,
            secondaryContainer = skin.cardColor,
            onSecondaryContainer = skin.accentSecondary,
            background = skin.bgColor,
            onBackground = skin.textPrimaryColor,
            surface = skin.surfaceColor,
            onSurface = skin.textPrimaryColor,
            surfaceVariant = skin.cardColor,
            onSurfaceVariant = skin.textSecondaryColor,
            outline = skin.borderColor,
            error = Color(0xFFFF1744),
            onError = Color.White
        )
    } else {
        lightColorScheme(
            primary = skin.primaryColor,
            onPrimary = Color.White,
            primaryContainer = Color(0xFFE2E8F0),
            onPrimaryContainer = skin.primaryColor,
            secondary = skin.accentSecondary,
            onSecondary = Color.White,
            secondaryContainer = Color(0xFFDCFCE7),
            onSecondaryContainer = skin.accentSecondary,
            background = skin.bgColor,
            onBackground = skin.textPrimaryColor,
            surface = skin.surfaceColor,
            onSurface = skin.textPrimaryColor,
            surfaceVariant = skin.cardColor,
            onSurfaceVariant = skin.textSecondaryColor,
            outline = skin.borderColor,
            error = Color(0xFFDC2626),
            onError = Color.White
        )
    }
}

val LocalAppSkin = staticCompositionLocalOf { AppSkin.PHOSPHOR_MATRIX }

@Composable
fun rememberAppSkin(): AppSkin = SkinManager.currentSkin.value
