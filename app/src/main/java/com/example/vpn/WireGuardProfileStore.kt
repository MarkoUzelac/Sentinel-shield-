package com.example.vpn

import android.content.Context
import com.wireguard.config.Config
import java.io.File

/** Stores the user's WireGuard profile only inside app-private storage. */
class WireGuardProfileStore(context: Context) {
    private val profileFile = File(context.filesDir, PROFILE_FILE_NAME)

    @Synchronized
    fun load(): Config {
        require(profileFile.isFile && profileFile.length() > 0) {
            "WireGuard profile is not provisioned"
        }
        return profileFile.inputStream().bufferedReader().use(Config::parse)
    }

    @Synchronized
    fun importProfile(profileText: String): Result<Unit> = runCatching {
        require(profileText.isNotBlank()) { "WireGuard profile is empty" }
        val parsed = profileText.reader().use(Config::parse)
        require(parsed.getPeers().isNotEmpty()) { "WireGuard profile must contain at least one peer" }

        val tempFile = File(profileFile.parentFile, "$PROFILE_FILE_NAME.tmp")
        tempFile.writeText(profileText, Charsets.UTF_8)
        check(tempFile.renameTo(profileFile)) { "Could not atomically store WireGuard profile" }
        parsed
        Unit
    }

    @Synchronized
    fun clear() {
        profileFile.delete()
    }

    @Synchronized
    fun hasProfile(): Boolean = profileFile.isFile && profileFile.length() > 0

    companion object {
        const val PROFILE_FILE_NAME = "wireguard.conf"
    }
}
