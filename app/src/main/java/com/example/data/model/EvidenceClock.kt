package com.example.data.model

/**
 * Single time source for evidence creation and freshness checks.
 * Production uses wall-clock time; tests can inject a deterministic clock.
 */
fun interface EvidenceClock {
    fun nowEpochMillis(): Long

    companion object {
        val SYSTEM: EvidenceClock = EvidenceClock { System.currentTimeMillis() }
    }
}
