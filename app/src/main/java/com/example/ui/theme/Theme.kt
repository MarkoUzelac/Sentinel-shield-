package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.example.data.localization.AppLanguage
import com.example.data.localization.LocalAppLanguage
import com.example.data.localization.LocaleManager

@Composable
fun SentinelShieldTheme(
    appLanguage: AppLanguage? = null,
    content: @Composable () -> Unit
) {
    val currentSkin by SkinManager.currentSkin.collectAsState()
    val currentLang = appLanguage ?: LocaleManager.currentLanguage.collectAsState().value
    CompositionLocalProvider(
        LocalAppSkin provides currentSkin,
        LocalAppLanguage provides currentLang
    ) {
        MaterialTheme(
            colorScheme = SkinManager.getColorScheme(currentSkin),
            typography = Typography,
            content = content
        )
    }
}

@Composable
fun MyApplicationTheme(content: @Composable () -> Unit) = SentinelShieldTheme(content = content)
