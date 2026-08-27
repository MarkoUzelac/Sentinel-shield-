package com.example.data.model

/**
 * Immutable read-model for the single Capability / Evidence source of truth.
 *
 * The UI consumes capabilities by CapabilityId instead of maintaining independent
 * status booleans. Missing capabilities fail closed to UNAVAILABLE.
 */
data class CapabilityEvidenceSnapshot private constructor(
    val items: List<CapabilityEvidence>,
    private val byId: Map<CapabilityId, CapabilityEvidence>
) {
    fun get(id: CapabilityId): CapabilityEvidence? = byId[id]

    fun statusOf(id: CapabilityId): CapabilityStatus =
        byId[id]?.status ?: CapabilityStatus.UNAVAILABLE

    companion object {
        fun from(items: List<CapabilityEvidence>): CapabilityEvidenceSnapshot {
            val duplicateIds = items
                .groupingBy { it.id }
                .eachCount()
                .filterValues { it > 1 }
                .keys

            require(duplicateIds.isEmpty()) {
                "Capability evidence contains duplicate IDs: ${duplicateIds.joinToString() }"
            }

            return CapabilityEvidenceSnapshot(
                items = items.toList(),
                byId = items.associateBy { it.id }
            )
        }
    }
}
