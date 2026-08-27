package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scan_logs")
data class ScanLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val scanType: String, // "DEEP_SCAN", "NETWORK_AUDIT", "AI_THREAT", "BREACH_CHECK"
    val status: String,   // "PASSED", "WARNING", "ALERT"
    val score: Int,       // 0 - 100
    val summary: String,
    val detailsJson: String,
    val timestamp: Long = System.currentTimeMillis()
)
