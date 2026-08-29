import { BasebandTelemetryState, GeolocationPermissionState } from '../types';

/**
 * Android Telephony Bridge Definition
 * Handles communication with native Android TelephonyManager/CellInfo APIs
 * when loaded inside a native Android WebView or Cordova/Capacitor/React Native container.
 */

export interface NativeCellInfo {
  registered: boolean;
  type: 'GSM' | 'WCDMA' | 'LTE' | 'NR';
  mcc: number;
  mnc: number;
  lacOrTac: number;
  cidOrEci: number;
  pci?: number;
  earfcnOrArfcn?: number;
  signalDbm?: number;
  asu?: number;
  timingAdvance?: number;
  operatorAlphaLong?: string;
  roaming?: boolean;
  dataState?: 'CONNECTED' | 'DISCONNECTED' | 'SUSPENDED';
}

export interface NativeTelephonyPayload {
  servingCell?: NativeCellInfo;
  neighborCells?: NativeCellInfo[];
  permissionState: 'GRANTED' | 'DENIED' | 'NOT_REQUESTED' | 'RESTRICTED' | 'UNAVAILABLE';
  isHardwareAvailable: boolean;
  timestamp: number;
}

declare global {
  interface Window {
    AndroidTelephony?: {
      getTelephonySnapshot?: () => string; // returns JSON string of NativeTelephonyPayload
      requestTelephonyPermission?: () => void;
      isNativeBridgePresent?: () => boolean;
    };
    SentinelNative?: {
      getCellularInfo?: () => string;
      getBasebandData?: () => string;
    };
  }
}

export class AndroidBridgeService {
  /**
   * Check whether native Android Telephony bridge is physically active in window
   */
  static isNativeBridgeAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window.AndroidTelephony && typeof window.AndroidTelephony.getTelephonySnapshot === 'function') ||
      (window.SentinelNative && typeof window.SentinelNative.getCellularInfo === 'function')
    );
  }

  /**
   * Request telephony runtime permission from Android host
   */
  static requestTelephonyPermission(): void {
    if (typeof window !== 'undefined' && window.AndroidTelephony?.requestTelephonyPermission) {
      try {
        window.AndroidTelephony.requestTelephonyPermission();
      } catch (err) {
        console.warn('Native permission request invocation error:', err);
      }
    }
  }

  /**
   * Read raw cellular payload from native bridge if present
   */
  static getNativeTelephonyPayload(): NativeTelephonyPayload | null {
    if (!this.isNativeBridgeAvailable()) return null;

    try {
      if (window.AndroidTelephony?.getTelephonySnapshot) {
        const raw = window.AndroidTelephony.getTelephonySnapshot();
        if (raw) return JSON.parse(raw);
      }
      if (window.SentinelNative?.getCellularInfo) {
        const raw = window.SentinelNative.getCellularInfo();
        if (raw) return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse native Android telephony payload:', err);
    }
    return null;
  }

  /**
   * Return normalized BasebandTelemetryState
   */
  static getBasebandState(isTestMode: boolean, testBaseband?: Partial<BasebandTelemetryState>): BasebandTelemetryState {
    if (isTestMode && testBaseband) {
      return {
        rat: testBaseband.rat || 'LTE',
        mcc: testBaseband.mcc ?? 219,
        mnc: testBaseband.mnc ?? 1,
        tacOrLac: testBaseband.tacOrLac ?? 1205,
        cidOrEci: testBaseband.cidOrEci ?? 49102,
        pci: testBaseband.pci ?? 142,
        arfcnOrEarfcn: testBaseband.arfcnOrEarfcn ?? 6300,
        signalStrengthDbm: testBaseband.signalStrengthDbm ?? -78,
        asu: testBaseband.asu ?? 62,
        registeredState: testBaseband.registeredState || 'REGISTERED_HOME',
        roamingState: testBaseband.roamingState || 'HOME',
        dataConnectionState: testBaseband.dataConnectionState || 'CONNECTED',
        timestamp: Date.now(),
        status: 'TEST',
        statusReason: 'Synthetic baseband test record loaded in sandbox.',
      };
    }

    const native = this.getNativeTelephonyPayload();
    if (native && native.servingCell) {
      const cell = native.servingCell;
      return {
        rat: cell.type === 'NR' ? 'NR' : cell.type === 'LTE' ? 'LTE' : cell.type === 'WCDMA' ? 'WCDMA' : 'GSM',
        mcc: cell.mcc || null,
        mnc: cell.mnc || null,
        tacOrLac: cell.lacOrTac || null,
        cidOrEci: cell.cidOrEci || null,
        pci: cell.pci ?? null,
        arfcnOrEarfcn: cell.earfcnOrArfcn ?? null,
        signalStrengthDbm: cell.signalDbm ?? null,
        asu: cell.asu ?? null,
        registeredState: cell.registered ? (cell.roaming ? 'REGISTERED_ROAMING' : 'REGISTERED_HOME') : 'SEARCHING',
        roamingState: cell.roaming ? 'ROAMING' : 'HOME',
        dataConnectionState: cell.dataState || 'CONNECTED',
        timestamp: native.timestamp || Date.now(),
        status: 'LIVE',
        statusReason: 'Live Android TelephonyManager baseband telemetry.',
      };
    }

    // Default Browser Environment State (Truthful Telemetry Standard)
    return {
      rat: 'UNAVAILABLE',
      mcc: null,
      mnc: null,
      tacOrLac: null,
      cidOrEci: null,
      pci: null,
      arfcnOrEarfcn: null,
      signalStrengthDbm: null,
      asu: null,
      registeredState: 'UNAVAILABLE',
      roamingState: 'UNAVAILABLE',
      dataConnectionState: 'UNAVAILABLE',
      timestamp: Date.now(),
      status: 'UNAVAILABLE',
      statusReason: 'Browser security model does not expose raw cellular baseband telemetry.',
    };
  }
}
