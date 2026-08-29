/**
 * Injectable Evidence Clock for deterministic testing and runtime timestamping.
 */
export interface IEvidenceClock {
  now(): number;
}

export class SystemEvidenceClock implements IEvidenceClock {
  now(): number {
    return Date.now();
  }
}

export class SettableEvidenceClock implements IEvidenceClock {
  private currentEpochMs: number;

  constructor(initialEpochMs: number = Date.now()) {
    this.currentEpochMs = initialEpochMs;
  }

  now(): number {
    return this.currentEpochMs;
  }

  set(epochMs: number): void {
    this.currentEpochMs = epochMs;
  }

  advance(ms: number): void {
    this.currentEpochMs += ms;
  }
}
