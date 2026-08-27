package com.example.data.localization

import androidx.compose.runtime.staticCompositionLocalOf
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class AppLanguage(val code: String, val displayName: String, val flag: String) {
    SYSTEM("auto", "Auto (System)", "🌐"),
    HR("hr", "Hrvatski", "🇭🇷"),
    EN("en", "English", "🇬🇧"),
    DE("de", "Deutsch", "🇩🇪"),
    ES("es", "Español", "🇪🇸"),
    FR("fr", "Français", "🇫🇷"),
    IT("it", "Italiano", "🇮🇹")
}

object LocaleManager {
    private val _currentLanguage = MutableStateFlow(AppLanguage.SYSTEM)
    val currentLanguage: StateFlow<AppLanguage> = _currentLanguage

    fun setLanguage(language: AppLanguage) { _currentLanguage.value = language }

    fun getString(key: String, lang: AppLanguage = _currentLanguage.value): String {
        val actual = if (lang == AppLanguage.SYSTEM) AppLanguage.HR else lang
        return translations[actual]?.get(key) ?: translations[AppLanguage.EN]?.get(key) ?: key
    }

    private val translations = mapOf(
        AppLanguage.HR to mapOf(
            "tab_shield" to "Štit",
            "tab_radar" to "Radar & IMSI",
            "tab_vpn" to "VPN Tunel",
            "tab_call_sec" to "Pozivi & MMI",
            "tab_legal" to "Prava & Zakon",
            "tab_vault" to "Vault & Teme",
            "call_sec_title" to "NADZOR PRISLUŠKIVANJA I PREUSMJERAVANJA",
            "call_sec_subtitle" to "Provjeri preusmjeravanje poziva putem operatorskih MMI provjera.",
            "legal_title" to "TKO ME SMIJE PRATITI?",
            "legal_subtitle" to "Vodič kroz privatnost, nadzor i zakonska ograničenja.",
            "settings_title" to "Postavke Aplikacije"
        ),
        AppLanguage.EN to mapOf(
            "tab_shield" to "Shield",
            "tab_radar" to "Radar & IMSI",
            "tab_vpn" to "VPN Tunnel",
            "tab_call_sec" to "Calls & MMI",
            "tab_legal" to "Legal Rights",
            "tab_vault" to "Vault & Skins",
            "call_sec_title" to "WIRETAP & CALL REDIRECTION AUDIT",
            "call_sec_subtitle" to "Check carrier call-forwarding status using standard MMI checks.",
            "legal_title" to "WHO HAS THE RIGHT TO TRACK ME?",
            "legal_subtitle" to "Privacy, surveillance and legal-limit guidance.",
            "settings_title" to "Application Settings"
        ),
        AppLanguage.DE to mapOf("tab_shield" to "Schild", "tab_radar" to "Radar & IMSI", "tab_vpn" to "VPN Tunnel", "tab_call_sec" to "Anrufe & MMI", "tab_legal" to "Rechte", "tab_vault" to "Vault & Skins"),
        AppLanguage.ES to mapOf("tab_shield" to "Escudo", "tab_radar" to "Radar e IMSI", "tab_vpn" to "Túnel VPN", "tab_call_sec" to "Llamadas", "tab_legal" to "Derechos", "tab_vault" to "Vault"),
        AppLanguage.FR to mapOf("tab_shield" to "Bouclier", "tab_radar" to "Radar & IMSI", "tab_vpn" to "Tunnel VPN", "tab_call_sec" to "Appels", "tab_legal" to "Droits", "tab_vault" to "Vault"),
        AppLanguage.IT to mapOf("tab_shield" to "Scudo", "tab_radar" to "Radar & IMSI", "tab_vpn" to "Tunnel VPN", "tab_call_sec" to "Chiamate", "tab_legal" to "Diritti", "tab_vault" to "Vault")
    )
}

val LocalAppLanguage = staticCompositionLocalOf { AppLanguage.HR }

fun stringRes(key: String): String = LocaleManager.getString(key, LocalAppLanguage.current)
