package com.example.vpn

import android.content.Context
import com.wireguard.config.Config
import java.io.File

/**
 * Loads a real WireGuard profile from the app-private storage sandbox.
 *
 * The profile is deliberately not committed to Git: it contains the device private key and the
 * server peer configuration. A provisioning layer can populate this file after authentication.
 */
class WireGuardProfileStore(context: Context) {
    private val profileFile = File(context.filesDir, PROFILE_FILE_NAME)

    @Synchronized
    fun load(): Config {
        require(profileFile.isFile) {
            "WireGuard profile is not provisioned"
        }
        profileFile.inputStream().bufferedReader().use { reader ->
            return Config.parse(reader)
        }
    }

    @Synchronized
    fun hasProfile(): Boolean = profileFile.isFile && profileFile.length() > 0

    companion object {
        const val PROFILE_FILE_NAME = "wireguard.conf"
    }
}
