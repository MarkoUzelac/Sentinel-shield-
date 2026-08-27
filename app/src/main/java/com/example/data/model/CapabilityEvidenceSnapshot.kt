package com.example.data.model

/** Immutable read-model for the single Capability / Evidence source of truth. */
data class CapabilityEvidenceSnapshot private constructor(
    val items: List<CapabilityEvidence>,
    private val byId: Map<CapabilityId, CapabilityEvidence>,
    private val nowEpochMs: () -> Long
) {
    fun get(id: CapabilityId): CapabilityEvidence? = byId[id]

    fun statusOf(id: CapabilityId): CapabilityStatus =
        byId[id]?.effectiveStatus(nowEpochMs()) ?: CapabilityStatus.UNAVAILABLE

    fun effective(id: CapabilityId): CapabilityEvidence? = byId[id]?.let {
        it.copy(status = it.effectiveStatus(nowEpochMs()))
    }

    companion object {
        fun from(items: List<CapabilityEvidence>, nowEpochMs: () -> Long = System::currentTimeMillis): CapabilityEvidenceSnapshot {
            val duplicateIds = items.groupingBy { it.id }.eachCount().filterValues { it > 1 }.keys
            require(duplicateIds.isEmpty()) { "Capability evidence contains duplicate IDs: ${duplicateIds.joinToString()}" }
            return CapabilityEvidenceSnapshot(items.toList(), items.associateBy { it.id }, nowEpochMs)
        }
    }
}
