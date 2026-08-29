import { CellEvidenceItem, TelemetrySourceType } from '../types';
import { AndroidBridgeService } from './androidBridge';

export interface CellProvider {
  getName(): string;
  getSourceType(): TelemetrySourceType;
  isAvailable(): Promise<boolean>;
  getServingCell(params?: {
    mcc?: number;
    mnc?: number;
    lacOrTac?: number;
    cid?: number;
    networkType?: string;
  }): Promise<CellEvidenceItem | null>;
  getNeighborCells?(): Promise<CellEvidenceItem[]>;
}

/**
 * Priority 1: Native Android Cellular Telemetry Provider
 */
export class NativeAndroidProvider implements CellProvider {
  getName(): string {
    return 'Android TelephonyManager';
  }

  getSourceType(): TelemetrySourceType {
    return 'NATIVE_ANDROID';
  }

  async isAvailable(): Promise<boolean> {
    return AndroidBridgeService.isNativeBridgeAvailable();
  }

  async getServingCell(): Promise<CellEvidenceItem | null> {
    const payload = AndroidBridgeService.getNativeTelephonyPayload();
    if (!payload || !payload.servingCell) return null;

    const cell = payload.servingCell;
    const now = Date.now();

    return {
      id: `native-cell-${cell.cidOrEci || 'serving'}`,
      source: 'Android TelephonyManager',
      sourceType: 'NATIVE_ANDROID',
      timestamp: payload.timestamp || now,
      confidence: 'HIGH',
      networkType: cell.type === 'NR' ? 'NR' : cell.type === 'LTE' ? 'LTE' : cell.type === 'WCDMA' ? 'UMTS' : 'GSM',
      mcc: cell.mcc,
      mnc: cell.mnc,
      lacOrTac: cell.lacOrTac,
      cid: cell.cidOrEci,
      pci: cell.pci,
      signalDbm: cell.signalDbm,
      isLive: true,
      isSynthetic: false,
      operator: cell.operatorAlphaLong || 'Registered Cellular Operator',
      servingState: 'SERVING',
      explanation: 'Direct live baseband telemetry received via Android TelephonyManager API.',
      dataAgeSeconds: Math.max(0, Math.floor((now - (payload.timestamp || now)) / 1000)),
    };
  }

  async getNeighborCells(): Promise<CellEvidenceItem[]> {
    const payload = AndroidBridgeService.getNativeTelephonyPayload();
    if (!payload || !payload.neighborCells) return [];

    const now = Date.now();
    return payload.neighborCells.map((n, idx) => ({
      id: `native-neighbor-${n.cidOrEci || idx}`,
      source: 'Android TelephonyManager',
      sourceType: 'NATIVE_ANDROID',
      timestamp: payload.timestamp || now,
      confidence: 'HIGH',
      networkType: n.type === 'NR' ? 'NR' : n.type === 'LTE' ? 'LTE' : n.type === 'WCDMA' ? 'UMTS' : 'GSM',
      mcc: n.mcc,
      mnc: n.mnc,
      lacOrTac: n.lacOrTac,
      cid: n.cidOrEci,
      pci: n.pci,
      signalDbm: n.signalDbm,
      isLive: true,
      isSynthetic: false,
      servingState: 'NEIGHBOR',
      explanation: 'Neighboring cell base station broadcast telemetry from modem sweep.',
      dataAgeSeconds: 0,
    }));
  }
}

/**
 * Priority 2: OpenCellID Backup / Enrichment Provider (Backend Proxy)
 */
export class OpenCellIDBackupProvider implements CellProvider {
  getName(): string {
    return 'OpenCellID BACKUP';
  }

  getSourceType(): TelemetrySourceType {
    return 'OPENCELLID_BACKUP';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/cell/status');
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.configured);
      }
    } catch {
      // Offline or network failure
    }
    return false;
  }

  async getServingCell(params?: {
    mcc?: number;
    mnc?: number;
    lacOrTac?: number;
    cid?: number;
    networkType?: string;
  }): Promise<CellEvidenceItem | null> {
    if (!params || !params.mcc || !params.cid) return null;

    try {
      const query = new URLSearchParams({
        mcc: String(params.mcc),
        mnc: String(params.mnc || 1),
        lac: String(params.lacOrTac || 0),
        cid: String(params.cid),
        radio: String(params.networkType || 'LTE'),
      });

      const res = await fetch(`/api/cell/lookup?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          const d = json.data;
          const now = Date.now();
          return {
            id: `opencellid-${d.mcc}-${d.cellid}`,
            source: 'OpenCellID BACKUP',
            sourceType: 'OPENCELLID_BACKUP',
            timestamp: d.lookupTimestamp || now,
            confidence: d.confidence || 'MEDIUM',
            networkType: d.radio === 'NR' ? 'NR' : d.radio === 'LTE' ? 'LTE' : d.radio === 'UMTS' ? 'UMTS' : 'GSM',
            mcc: d.mcc,
            mnc: d.mnc,
            lacOrTac: d.lac,
            cid: d.cellid,
            latitude: d.latitude,
            longitude: d.longitude,
            accuracy: d.rangeMeters,
            rangeMeters: d.rangeMeters,
            isLive: false,
            isSynthetic: false,
            operator: `PLMN ${d.mcc}-${d.mnc}`,
            servingState: 'OBSERVED',
            explanation: 'Enrichment coordinates retrieved from OpenCellID public tower database via secure server proxy.',
            dataAgeSeconds: 0,
          };
        }
      }
    } catch (err) {
      console.warn('OpenCellID lookup failed:', err);
    }
    return null;
  }
}

/**
 * Priority 3: Test Provider (Explicitly Enabled Sandbox Only)
 */
export class TestProvider implements CellProvider {
  getName(): string {
    return 'TEST DATA (SANDBOX)';
  }

  getSourceType(): TelemetrySourceType {
    return 'TEST';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getServingCell(params?: {
    mcc?: number;
    mnc?: number;
    lacOrTac?: number;
    cid?: number;
    networkType?: string;
  }): Promise<CellEvidenceItem> {
    const now = Date.now();
    return {
      id: 'test-cell-serving',
      source: 'TEST DATA',
      sourceType: 'TEST',
      timestamp: now,
      confidence: 'ESTIMATED',
      networkType: (params?.networkType as any) || 'LTE',
      mcc: params?.mcc ?? 219,
      mnc: params?.mnc ?? 1,
      lacOrTac: params?.lacOrTac ?? 1205,
      cid: params?.cid ?? 49102,
      pci: 142,
      signalDbm: -78,
      latitude: 45.8155,
      longitude: 15.9812,
      accuracy: 50,
      rangeMeters: 450,
      isLive: false,
      isSynthetic: true,
      operator: 'Demonstration Test Carrier',
      servingState: 'SERVING',
      explanation: 'Synthetic test record generated for pipeline verification.',
      dataAgeSeconds: 0,
      anomalyScore: 5,
    };
  }

  getTestRecords(baseLat?: number | null, baseLng?: number | null): CellEvidenceItem[] {
    const now = Date.now();
    const lat = baseLat ?? 45.815;
    const lng = baseLng ?? 15.9819;

    return [
      {
        id: 'test-serving-01',
        source: 'TEST DATA',
        sourceType: 'TEST',
        timestamp: now,
        confidence: 'ESTIMATED',
        networkType: 'LTE',
        mcc: 219,
        mnc: 1,
        lacOrTac: 1205,
        cid: 49102,
        pci: 142,
        signalDbm: -78,
        latitude: lat + 0.0014,
        longitude: lng - 0.0016,
        accuracy: 45,
        rangeMeters: 420,
        isLive: false,
        isSynthetic: true,
        operator: 'Test Serving Base Station',
        servingState: 'SERVING',
        explanation: 'Primary serving-cell test record loaded in sandbox.',
        dataAgeSeconds: 0,
        anomalyScore: 4,
      },
      {
        id: 'test-neighbor-02',
        source: 'TEST DATA',
        sourceType: 'TEST',
        timestamp: now - 60000,
        confidence: 'ESTIMATED',
        networkType: 'LTE',
        mcc: 219,
        mnc: 1,
        lacOrTac: 1205,
        cid: 49103,
        pci: 148,
        signalDbm: -92,
        latitude: lat - 0.0022,
        longitude: lng + 0.0025,
        accuracy: 80,
        rangeMeters: 750,
        isLive: false,
        isSynthetic: true,
        operator: 'Test Neighbor Base Station',
        servingState: 'NEIGHBOR',
        explanation: 'Adjacent neighbor tower record for handover baseline.',
        dataAgeSeconds: 60,
        anomalyScore: 8,
      },
    ];
  }
}

/**
 * Central Cell Provider Manager
 */
export class CellProviderManager {
  private static nativeProvider = new NativeAndroidProvider();
  private static openCellIdProvider = new OpenCellIDBackupProvider();
  private static testProvider = new TestProvider();

  /**
   * Get serving cell following strict provider priority:
   * 1. Native Android cellular telemetry
   * 2. OpenCellID backup / enrichment
   * 3. TEST DATA (only if isTestMode = true)
   */
  static async resolveServingCell(
    isTestMode: boolean,
    lookupParams?: { mcc?: number; mnc?: number; lacOrTac?: number; cid?: number; networkType?: string }
  ): Promise<{ cell: CellEvidenceItem | null; activeProvider: string; sourceType: TelemetrySourceType }> {
    // 1. Check Native Android Bridge
    if (await this.nativeProvider.isAvailable()) {
      const nativeCell = await this.nativeProvider.getServingCell();
      if (nativeCell) {
        return {
          cell: nativeCell,
          activeProvider: 'Android TelephonyManager',
          sourceType: 'NATIVE_ANDROID',
        };
      }
    }

    // 2. Check OpenCellID Backup lookup if parameters provided
    if (lookupParams && lookupParams.mcc && lookupParams.cid) {
      const openCellIdResult = await this.openCellIdProvider.getServingCell(lookupParams);
      if (openCellIdResult) {
        return {
          cell: openCellIdResult,
          activeProvider: 'OpenCellID BACKUP',
          sourceType: 'OPENCELLID_BACKUP',
        };
      }
    }

    // 3. Test Data ONLY if isTestMode is explicitly enabled
    if (isTestMode) {
      const testCell = await this.testProvider.getServingCell(lookupParams);
      return {
        cell: testCell,
        activeProvider: 'TEST DATA (SANDBOX)',
        sourceType: 'TEST',
      };
    }

    return {
      cell: null,
      activeProvider: 'None (Browser Environment)',
      sourceType: 'NATIVE_ANDROID',
    };
  }

  /**
   * Lookup cell in OpenCellID database via secure backend proxy
   */
  static async lookupOpenCellId(
    mcc: number,
    mnc: number,
    lacOrTac: number,
    cid: number,
    networkType: string = 'LTE'
  ): Promise<CellEvidenceItem | null> {
    return this.openCellIdProvider.getServingCell({ mcc, mnc, lacOrTac, cid, networkType });
  }

  static getTestProvider(): TestProvider {
    return this.testProvider;
  }
}
