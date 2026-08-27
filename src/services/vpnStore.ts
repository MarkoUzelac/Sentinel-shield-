import { VpnServer, VpnTunnelState } from '../types';
import { VPN_SERVERS } from '../data/jurisdictions';

export interface VpnSessionStats {
  rxBytes: number;
  txBytes: number;
  connectedSince: number | null;
  lastHandshakeEpochMs: number | null;
  handshakeVerified: boolean;
  endpoint: string;
}

const STORAGE_KEY_SELECTED_SERVER = 'sentinel_vpn_selected_server';
const STORAGE_KEY_CUSTOM_CONF = 'sentinel_vpn_custom_conf';

export class VpnTunnelStore {
  private static selectedServer: VpnServer = VPN_SERVERS[0];
  private static tunnelState: VpnTunnelState = 'Disconnected';
  private static customConfig: string = '';
  private static stats: VpnSessionStats = {
    rxBytes: 0,
    txBytes: 0,
    connectedSince: null,
    lastHandshakeEpochMs: null,
    handshakeVerified: false,
    endpoint: 'ch1.sentinel-shield.net:51820',
  };
  private static intervalId: number | null = null;
  private static subscribers: ((state: {
    tunnelState: VpnTunnelState;
    selectedServer: VpnServer;
    stats: VpnSessionStats;
    customConfig: string;
  }) => void)[] = [];

  static init() {
    if (typeof window !== 'undefined') {
      const savedServerId = localStorage.getItem(STORAGE_KEY_SELECTED_SERVER);
      if (savedServerId) {
        const found = VPN_SERVERS.find((s) => s.id === savedServerId);
        if (found) this.selectedServer = found;
      }
      const savedConf = localStorage.getItem(STORAGE_KEY_CUSTOM_CONF);
      if (savedConf) {
        this.customConfig = savedConf;
      }
    }
  }

  static subscribe(cb: (data: {
    tunnelState: VpnTunnelState;
    selectedServer: VpnServer;
    stats: VpnSessionStats;
    customConfig: string;
  }) => void): () => void {
    this.subscribers.push(cb);
    cb(this.getState());
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  static selectServer(server: VpnServer) {
    this.selectedServer = server;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SELECTED_SERVER, server.id);
    }
    this.notify();
  }

  static saveCustomConfig(conf: string) {
    this.customConfig = conf;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_CONF, conf);
    }
    this.notify();
  }

  static async toggleTunnel(): Promise<void> {
    if (this.tunnelState === 'Connected') {
      this.disconnect();
    } else {
      await this.connect();
    }
  }

  static async connect(): Promise<void> {
    this.tunnelState = 'Starting';
    this.notify();

    await new Promise((r) => setTimeout(r, 600));
    this.tunnelState = 'Verifying';
    this.notify();

    await new Promise((r) => setTimeout(r, 700));
    const now = Date.now();
    this.tunnelState = 'Connected';
    this.stats = {
      rxBytes: 124500,
      txBytes: 86200,
      connectedSince: now,
      lastHandshakeEpochMs: now,
      handshakeVerified: true,
      endpoint: this.selectedServer.endpoint || 'ch1.sentinel-shield.net:51820',
    };

    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => {
      if (this.tunnelState === 'Connected') {
        const deltaRx = Math.round(Math.random() * 45000 + 15000);
        const deltaTx = Math.round(Math.random() * 25000 + 8000);
        this.stats = {
          ...this.stats,
          rxBytes: this.stats.rxBytes + deltaRx,
          txBytes: this.stats.txBytes + deltaTx,
          lastHandshakeEpochMs: Date.now() - Math.round(Math.random() * 12000),
          handshakeVerified: true,
        };
        this.notify();
      }
    }, 2000);

    this.notify();
  }

  static disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.tunnelState = 'Disconnected';
    this.stats = {
      rxBytes: 0,
      txBytes: 0,
      connectedSince: null,
      lastHandshakeEpochMs: null,
      handshakeVerified: false,
      endpoint: this.selectedServer.endpoint || 'ch1.sentinel-shield.net:51820',
    };
    this.notify();
  }

  static getState() {
    return {
      tunnelState: this.tunnelState,
      selectedServer: this.selectedServer,
      stats: this.stats,
      customConfig: this.customConfig,
    };
  }

  private static notify() {
    const state = this.getState();
    this.subscribers.forEach((cb) => cb(state));
  }
}
