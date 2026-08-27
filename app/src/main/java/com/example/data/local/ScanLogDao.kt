package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ScanLogDao {
    @Query("SELECT * FROM scan_logs ORDER BY timestamp DESC")
    fun getAllLogs(): Flow<List<ScanLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: ScanLogEntity)

    @Query("DELETE FROM scan_logs WHERE id = :id")
    suspend fun deleteLogById(id: Long)

    @Query("DELETE FROM scan_logs")
    suspend fun clearAllLogs()
}
