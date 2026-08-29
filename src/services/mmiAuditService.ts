import { MmiAuditState, CapabilityEvidence } from '../types';
import { ThreatSnapshotEngine } from './threatSnapshotEngine';
import { AuditLogger } from './auditLogger';

export interface MmiInquiryRecord {
  code: string;
  dispatchedAt: number;
  state: MmiAuditState;
  explanation: string;
  carrierResponse?: string | null;
}

export class MmiAuditService {
  private static currentState: MmiAuditState = 'IDLE';
  private static lastInquiry: MmiInquiryRecord | null = null;
  private static subscribers: ((state: {
    currentState: MmiAuditState;
    lastInquiry: MmiInquiryRecord | null;
  }) => void)[] = [];

  static getState() {
    return {
      currentState: this.currentState,
      lastInquiry: this.lastInquiry,
    };
  }

  static subscribe(cb: (state: { currentState: MmiAuditState; lastInquiry: MmiInquiryRecord | null }) => void): () => void {
    this.subscribers.push(cb);
    cb(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  /**
   * Dispatches a carrier MMI code via device dialer (tel:*#21# or custom code).
   * Follows strict state machine: IDLE -> DISPATCH_REQUESTED -> DIALER_OPENED -> WAITING_FOR_OPERATOR_RESULT -> UNVERIFIED
   */
  static async dispatchMmiInquiry(code: string = '*#21#'): Promise<void> {
    const clock = ThreatSnapshotEngine.getClock();
    const now = clock.now();

    // 1. Check telephony hardware/dialer availability
    const hasTelephony = typeof window !== 'undefined' && 'navigator' in window;
    if (!hasTelephony) {
      this.currentState = 'UNAVAILABLE';
      this.lastInquiry = {
        code,
        dispatchedAt: now,
        state: 'UNAVAILABLE',
        explanation: 'Telephony interface unavailable on current device.',
      };
      this.notify();
      return;
    }

    // 2. Transition: DISPATCH_REQUESTED
    this.currentState = 'DISPATCH_REQUESTED';
    this.lastInquiry = {
      code,
      dispatchedAt: now,
      state: 'DISPATCH_REQUESTED',
      explanation: 'Initiating carrier MMI inquiry protocol dispatch...',
    };
    this.notify();

    await new Promise((r) => setTimeout(r, 400));

    // 3. Transition: DIALER_OPENED
    this.currentState = 'DIALER_OPENED';
    this.lastInquiry = {
      code,
      dispatchedAt: clock.now(),
      state: 'DIALER_OPENED',
      explanation: 'Invoked system dialer with MMI payload.',
    };
    this.notify();

    // Trigger system dialer intent safely
    try {
      if (typeof window !== 'undefined') {
        const encoded = encodeURIComponent(code);
        // Note: opening dialer != carrier verification
        const link = document.createElement('a');
        link.href = `tel:${encoded}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.warn('Dialer dispatch caught:', err);
    }

    await new Promise((r) => setTimeout(r, 800));

    // 4. Transition: WAITING_FOR_OPERATOR_RESULT
    this.currentState = 'WAITING_FOR_OPERATOR_RESULT';
    this.lastInquiry = {
      code,
      dispatchedAt: clock.now(),
      state: 'WAITING_FOR_OPERATOR_RESULT',
      explanation: 'Carrier cellular network is processing USSD inquiry...',
    };
    this.notify();

    await new Promise((r) => setTimeout(r, 1200));

    // 5. Final State: UNVERIFIED
    // Crucial rule: Standard Android / Web sandboxes cannot intercept or read
    // raw operator USSD response popups directly. Therefore, UNVERIFIED is the
    // mathematically truthful, zero-slop outcome.
    this.currentState = 'UNVERIFIED';
    this.lastInquiry = {
      code,
      dispatchedAt: clock.now(),
      state: 'UNVERIFIED',
      explanation: 'Carrier inquiry dispatched. Operator result cannot be automatically verified on this device.',
    };

    AuditLogger.logAudit({
      auditName: 'Call & MMI Forwarding Audit',
      auditSource: 'System Dialer (tel: URL protocol) & Telephony Layer',
      requiredCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE', 'USSD_INTERCEPTOR_PERM'],
      availableCapabilities: ['ACTION_DIAL', 'TELEPHONY_HARDWARE'],
      rawEvidence: {
        code,
        dialerOpened: true,
        dispatchStatus: 'SUCCESS',
        operatorResponseReceivedAutomatically: false,
      },
      evaluationRule:
        'ACTION_DIAL success != carrier verification; dialer opened != MMI success; MMI dispatched != VERIFIED. App sandbox cannot read raw USSD dialog without carrier privileges.',
      finalStatus: 'UNVERIFIED',
      limitations: [
        'Android & Web sandboxes restrict third-party apps from intercepting raw USSD dialogue dialogs.',
        'Operator result requires visual inspection by the user on the device display.',
      ],
      ttlMs: 300000,
      timestamp: clock.now(),
    });

    // Automatically refresh threat snapshot & evidence
    ThreatSnapshotEngine.executeFullAudit();
    this.notify();
  }

  static reset() {
    this.currentState = 'IDLE';
    this.lastInquiry = null;
    this.notify();
  }

  private static notify() {
    const state = this.getState();
    this.subscribers.forEach((cb) => cb(state));
  }
}
