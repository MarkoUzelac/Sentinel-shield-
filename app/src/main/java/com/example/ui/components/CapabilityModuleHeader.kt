package com.example.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.data.model.CapabilityEvidence

@Composable
fun CapabilityModuleHeader(
    evidence: CapabilityEvidence?,
    modifier: Modifier = Modifier
) {
    if (evidence == null) return
    Column(modifier = modifier) {
        CapabilityEvidenceCard(evidence)
        Spacer(Modifier.height(8.dp))
    }
}
