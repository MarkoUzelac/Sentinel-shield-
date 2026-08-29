import {
  BasebandTelemetryState,
  CellEvidenceItem,
  RogueCellAssessment,
  RogueCellIndicator,
  SignalRadarItem,
} from '../types';

export class RogueCellIndicatorEngine {
  /**
   * Evaluate multi-factor rogue-cell / IMSI-catcher indicators
   * Based STRICTLY on observed evidence without making false definitive claims.
   */
  static evaluate(
    signals: SignalRadarItem[],
    baseband: BasebandTelemetryState,
    isTestMode: boolean
  ): RogueCellAssessment {
    const indicators: RogueCellIndicator[] = [];
    const reasons: string[] = [];
    const now = Date.now();

    // If test mode is active and test items have anomalies, process them
    if (isTestMode) {
      const suspiciousSignals = signals.filter((s) => s.anomalyScore > 40 || s.risk === 'HIGH' || s.risk === 'MEDIUM');
      if (suspiciousSignals.length > 0) {
        indicators.push({
          id: 'ind-test-sandbox',
          indicator: 'Synthetic Test Anomaly Pattern',
          severity: 'MEDIUM',
          evidence: `Test evidence profile injected with ${suspiciousSignals.length} anomalous telemetry observation(s).`,
          timestamp: now,
          confidence: 'MEDIUM',
        });
        reasons.push('Demonstration test pattern loaded in sandbox');
      }

      const riskLevel = indicators.length > 0 ? 'MEDIUM' : 'LOW';
      return {
        risk: riskLevel,
        confidence: 'MEDIUM',
        heading: indicators.length > 0 ? 'Potential rogue-cell indicators detected (Sandbox)' : 'No anomalous rogue-cell indicators detected',
        indicators,
        reasons,
        timestamp: now,
        summary: indicators.length > 0
          ? 'Isolated sandbox records contain simulated RF heuristic triggers for pipeline validation.'
          : 'Clean baseline telemetry profile within demonstration sandbox.',
      };
    }

    // Live / Native / Browser Evaluation:
    // When in browser without live baseband, indicate no anomalous indicators or unavailable telemetry
    if (baseband.status === 'UNAVAILABLE' || signals.length === 0) {
      return {
        risk: 'LOW',
        confidence: 'LOW',
        heading: 'No anomalous rogue-cell indicators detected',
        indicators: [],
        reasons: [],
        timestamp: now,
        summary: 'No rogue-cell indicators detected in accessible telemetry. Native Android capability required for continuous baseband modem monitoring.',
      };
    }

    // 1. RAT Downgrade Check (LTE/5G -> 2G GSM)
    if (baseband.rat === 'GSM' && baseband.signalStrengthDbm && baseband.signalStrengthDbm > -65) {
      indicators.push({
        id: `ind-rat-${now}`,
        indicator: 'Suspicious 2G (GSM) Forced Connection',
        severity: 'HIGH',
        evidence: `Device attached to legacy unencrypted 2G GSM network with unusually high signal (${baseband.signalStrengthDbm} dBm).`,
        timestamp: now,
        confidence: 'MEDIUM',
      });
      reasons.push('Unexpected legacy 2G RAT attachment with strong signal');
    }

    // 2. Unrecognized or Inconsistent Cell Identity
    const servingCell = signals.find((s) => s.classification === 'SERVING_CELL');
    if (servingCell && servingCell.mcc && servingCell.mcc === 0) {
      indicators.push({
        id: `ind-mcc-${now}`,
        indicator: 'Invalid Mobile Country Code (MCC 000)',
        severity: 'HIGH',
        evidence: 'Serving base station broadcast an unallocated MCC/MNC identifier.',
        timestamp: now,
        confidence: 'HIGH',
      });
      reasons.push('Broadcasting invalid MCC/MNC parameters');
    }

    // 3. Abnormally Strong RF Power Discrepancy
    if (servingCell && servingCell.rssiDbm && servingCell.rssiDbm > -45) {
      indicators.push({
        id: `ind-rssi-${now}`,
        indicator: 'Suspiciously High RF Power',
        severity: 'MEDIUM',
        evidence: `Signal strength (${servingCell.rssiDbm} dBm) exceeds typical terrestrial base station thresholds at ground level.`,
        timestamp: now,
        confidence: 'LOW',
      });
      reasons.push('Abnormally elevated local RF signal power');
    }

    // 4. Inconsistent Location Relationship
    const inconsistentSignals = signals.filter((s) => s.locationConsistency === 'INCONSISTENT');
    if (inconsistentSignals.length > 0) {
      indicators.push({
        id: `ind-loc-${now}`,
        indicator: 'Inconsistent Tower Bearing / Distance Relationship',
        severity: 'MEDIUM',
        evidence: `${inconsistentSignals.length} tower record(s) failed geographic baseline distance checks.`,
        timestamp: now,
        confidence: 'LOW',
      });
      reasons.push('Geographic disparity between cell identity and physical location');
    }

    // Determine aggregate risk & heading
    let aggregateRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (indicators.some((i) => i.severity === 'CRITICAL')) aggregateRisk = 'CRITICAL';
    else if (indicators.some((i) => i.severity === 'HIGH')) aggregateRisk = 'HIGH';
    else if (indicators.some((i) => i.severity === 'MEDIUM')) aggregateRisk = 'MEDIUM';

    const heading = indicators.length > 0
      ? 'Potential rogue-cell indicators detected'
      : 'No anomalous rogue-cell indicators detected';

    const confidence = indicators.length > 2 ? 'MEDIUM' : 'LOW';

    return {
      risk: aggregateRisk,
      confidence,
      heading,
      indicators,
      reasons,
      timestamp: now,
      summary: indicators.length > 0
        ? `Found ${indicators.length} observable telemetry indicator(s) suggesting potential cellular anomalies. Note: This assessment is an indicator engine and does not constitute definitive hardware proof.`
        : 'All observed cellular base station telemetry conforms to expected network operational baselines.',
    };
  }
}
