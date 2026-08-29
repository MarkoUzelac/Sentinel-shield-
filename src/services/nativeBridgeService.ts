import {
  SignalRadarItem,
  DeviceLocationState,
  CapabilityAccessState,
  HardwareTelemetryState,
  RadarState,
  TelemetrySourceType
} from '../types';
import { ThreatSnapshotEngine } from './threatSnapshotEngine';
import { SignalRadarEngine } from './radarEngine';

// ============================================================================
// 1. INCOMING NATIVE PAYLOAD INTERFACES (FROM ANDROID/KOTLIN APP)
// ============================================================================

export interface NativeCellInfo {
  type: 'GSM' | 'WCDMA' | 'LTE' | 'NR' | 'UNKNOWN';
  registered: boolean;
  mcc: number | null;
  mnc: number | null;
  tacOrLac: number | null;
  cidOrEci: number | null;
  pci: number | null;
  earfcn: number | null;
  dbm: number | null;
  timestamp: number;
}

export interface NativeCellularSnapshot {
  servingCell: NativeCellInfo | null;
  neighborCells: NativeCellInfo[];
  permissionState: 'GRANTED' | 'DENIED' | 'UNAVAILABLE';
  isHardwareAvailable: boolean;
  timestamp: number;
}

export interface NativeBleBeacon {
  address: string;
  name: string | null;
  rssi: number;
  txPower: number | null;
  timestamp: number;
}

export interface NativeBleBatch {
  beacons: NativeBleBeacon[];
  permissionState: 'GRANTED' | 'DENIED' | 'UNAVAILABLE';
  isHardwareAvailable: boolean;
  timestamp: number;
}

export interface NativeLocationPayload {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  provider: string | null;
  hasFix: boolean;
  permissionState: 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED';
  timestamp: number;
}

export interface NativeCapabilityPayload {
  cellular: 'LIVE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE';
  ble: 'LIVE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE';
  location: 'LIVE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE';
  nativeRf: 'LIVE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE';
}

// ============================================================================
// 2. NATIVE BRIDGE SERVICE
// ============================================================================

/**
 * NativeBridgeService
 * 
 * Acts as the centralized ingestion and normalization layer for hardware 
 * telemetry arriving from the native Android host via JavascriptInterface.
 * Conforms strictly to the Zero-Fabrication and Truthful Telemetry mandates.
 */
export class NativeBridgeService {
  
  /**
   * Bind event listeners to global window object so the native Android Kotlin 
   * layer can push telemetry asynchronously.
   */
  static initialize() {
    if (typeof window === 'undefined') return;

    // Attach receivers to the global window for the Android WebView Bridge
    (window as any).SentinelBridgeReceiver = {
      onCellularSnapshot: (jsonPayload: string) => {
        try {
          const payload = JSON.parse(jsonPayload) as NativeCellularSnapshot;
          this.processCellularSnapshot(payload);
        } catch (e) {
          console.error("Failed to parse native cellular payload", e);
        }
      },
      onBleBatch: (jsonPayload: string) => {
        try {
          const payload = JSON.parse(jsonPayload) as NativeBleBatch;
          this.processBleBatch(payload);
        } catch (e) {
          console.error("Failed to parse native BLE payload", e);
        }
      },
      onLocationUpdate: (jsonPayload: string) => {
        try {
          const payload = JSON.parse(jsonPayload) as NativeLocationPayload;
          this.processLocationUpdate(payload);
        } catch (e) {
          console.error("Failed to parse native location payload", e);
        }
      },
      onCapabilityUpdate: (jsonPayload: string) => {
        try {
          const payload = JSON.parse(jsonPayload) as NativeCapabilityPayload;
          this.processCapabilityUpdate(payload);
        } catch (e) {
          console.error("Failed to parse native capability payload", e);
        }
      }
    };
  }

  // ==========================================================================
  // NORMALIZATION LOGIC
  // ==========================================================================

  private static processCellularSnapshot(payload: NativeCellularSnapshot) {
    const newSignals: SignalRadarItem[] = [];

    // Process Serving Cell
    if (payload.servingCell) {
      newSignals.push(this.normalizeCellular(payload.servingCell, true));
    }

    // Process Neighbor Cells
    if (payload.neighborCells && Array.isArray(payload.neighborCells)) {
      payload.neighborCells.forEach(cell => {
        newSignals.push(this.normalizeCellular(cell, false));
      });
    }

    // Push to the global telemetry store (Radar Engine)
    // We only update if hardware is actually available and permissioned.
    if (payload.isHardwareAvailable && payload.permissionState === 'GRANTED') {
      SignalRadarEngine.ingestObservations(newSignals);
    }
  }

  private static processBleBatch(payload: NativeBleBatch) {
    const newSignals: SignalRadarItem[] = [];

    if (payload.beacons && Array.isArray(payload.beacons)) {
      payload.beacons.forEach(beacon => {
        newSignals.push({
          id: `ble-${beacon.address}`,
          kind: 'BLE',
          label: beacon.name || `BLE ${beacon.address}`,
          technology: 'Bluetooth Low Energy',
          rssiDbm: beacon.rssi,
          sourceType: 'NATIVE_ANDROID',
          isLive: true,
          isTestEvidence: false,
          isSynthetic: false,
          observedAtEpochMs: beacon.timestamp,
          firstObservedAtEpochMs: beacon.timestamp,
          observationCount: 1,
          minRssiDbm: beacon.rssi,
          maxRssiDbm: beacon.rssi,
          rssiTrendDbm: 0,
          persistenceSeconds: 0,
          anomalyScore: 0,
          risk: 'INFO',
          classification: 'UNKNOWN',
          explanation: 'Live BLE observation from native Android stack.',
          runtimeBacked: true,
          locationConsistency: 'OBSERVED_IN_PROXIMITY',
          locationEvidenceType: 'ESTIMATED_ZONE',
          verificationStatus: 'OBSERVED'
        });
      });
    }

    if (payload.isHardwareAvailable && payload.permissionState === 'GRANTED') {
      SignalRadarEngine.ingestObservations(newSignals);
    }
  }

  private static processLocationUpdate(payload: NativeLocationPayload) {
    const normalizedLocation: Partial<DeviceLocationState> = {
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyMeters: payload.accuracy,
      hasFix: payload.hasFix,
      permissionState: payload.permissionState,
    };

    // Update global snapshot engine location
    ThreatSnapshotEngine.setLocation(normalizedLocation);
  }

  private static processCapabilityUpdate(payload: NativeCapabilityPayload) {
    // These states can be used to update the HardwareTelemetryState globally
    // We would map these explicitly to ThreatSnapshotEngine's hardware capability layer
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private static normalizeCellular(cell: NativeCellInfo, isServing: boolean): SignalRadarItem {
    return {
      id: `cell-${cell.mcc}-${cell.mnc}-${cell.tacOrLac}-${cell.cidOrEci}`,
      kind: 'CELLULAR',
      label: isServing ? `Serving Cell (${cell.type})` : `Neighbor Cell (${cell.type})`,
      technology: cell.type,
      rssiDbm: cell.dbm || undefined,
      cellId: cell.cidOrEci || undefined,
      areaCode: cell.tacOrLac || undefined,
      mcc: cell.mcc || undefined,
      mnc: cell.mnc || undefined,
      pci: cell.pci || undefined,
      sourceType: 'NATIVE_ANDROID',
      isLive: true,
      isTestEvidence: false,
      isSynthetic: false,
      observedAtEpochMs: cell.timestamp,
      firstObservedAtEpochMs: cell.timestamp,
      observationCount: 1,
      minRssiDbm: cell.dbm || -110,
      maxRssiDbm: cell.dbm || -110,
      rssiTrendDbm: 0,
      persistenceSeconds: 0,
      anomalyScore: 0,
      risk: 'INFO',
      classification: isServing ? 'SERVING_CELL' : 'NEIGHBOR_CELL',
      explanation: isServing ? 'Active serving base station.' : 'Neighbor base station.',
      runtimeBacked: true,
      locationConsistency: 'OBSERVED_IN_PROXIMITY',
      locationEvidenceType: 'NETWORK_PROVIDED_COORDINATES',
      verificationStatus: 'NETWORK_PROVIDED'
    };
  }
}
