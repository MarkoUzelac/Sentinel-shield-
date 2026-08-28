package com.example.security

import android.content.Context
import androidx.room.Database
import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "security_observations")
data class ObservationEntity(
  @PrimaryKey val id: String,
  val kind: String,
  val observedAtEpochMs: Long,
  val source: String,
  val payloadJson: String,
)

@Dao
interface ObservationDao {
  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(observations: List<ObservationEntity>)

  @Query("SELECT * FROM security_observations ORDER BY observedAtEpochMs DESC LIMIT :limit")
  suspend fun latest(limit: Int): List<ObservationEntity>
}

class ObservationConverters {
  fun mapToJson(value: Map<String, String>): String =
    value.entries.joinToString("&") { "${escape(it.key)}=${escape(it.value)}" }

  fun jsonToMap(value: String): Map<String, String> =
    if (value.isBlank()) emptyMap() else value.split('&').associate { part ->
      val pieces = part.split('=', limit = 2)
      unescape(pieces[0]) to unescape(pieces.getOrElse(1) { "" })
    }

  private fun escape(value: String) = java.net.URLEncoder.encode(value, Charsets.UTF_8.name())
  private fun unescape(value: String) = java.net.URLDecoder.decode(value, Charsets.UTF_8.name())
}

@Database(entities = [ObservationEntity::class], version = 1, exportSchema = false)
abstract class SentinelDatabase : RoomDatabase() {
  abstract fun observationDao(): ObservationDao

  companion object {
    @Volatile private var INSTANCE: SentinelDatabase? = null

    fun get(context: Context): SentinelDatabase = INSTANCE ?: synchronized(this) {
      INSTANCE ?: Room.databaseBuilder(
        context.applicationContext,
        SentinelDatabase::class.java,
        "sentinel-shield.db",
      ).build().also { INSTANCE = it }
    }
  }
}

class ObservationHistory(private val dao: ObservationDao) {
  private val converters = ObservationConverters()

  suspend fun append(observations: List<SecurityObservation>) {
    if (observations.isEmpty()) return
    dao.insertAll(observations.map { observation ->
      ObservationEntity(
        id = observation.id,
        kind = observation.kind.name,
        observedAtEpochMs = observation.observedAtEpochMs,
        source = observation.source.name,
        payloadJson = converters.mapToJson(observation.payload),
      )
    })
  }

  suspend fun latest(limit: Int = 500): List<ObservationEntity> = dao.latest(limit.coerceIn(1, 5000))
}
