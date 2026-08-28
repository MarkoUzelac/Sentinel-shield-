package com.example.data

import kotlin.math.abs

data class FinderState(val rssiDbm: Int?, val direction: Direction, val confidence: Float)
enum class Direction { CLOSER, FARTHER, STABLE, UNKNOWN }

object PhysicalFinder {
  fun compare(previousRssi: Int?, currentRssi: Int?): FinderState {
    if (previousRssi == null || currentRssi == null) return FinderState(currentRssi, Direction.UNKNOWN, 0f)
    val delta = currentRssi - previousRssi
    val confidence = (abs(delta) / 10f).coerceIn(0f, 1f)
    val direction = when {
      delta >= 3 -> Direction.CLOSER
      delta <= -3 -> Direction.FARTHER
      else -> Direction.STABLE
    }
    return FinderState(currentRssi, direction, confidence)
  }
}
