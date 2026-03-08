/**
 * WiFi Scanner API client.
 * Communicates with the local NetTrust WiFi Scanner backend server
 * to perform real OS-level WiFi scanning.
 */

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  signal: number;
  signalDbm?: number;
  frequency: string;
  security: string;
  channel: number;
  mode?: string;
  rate?: string;
}

export interface WifiScanResult {
  success: boolean;
  networks: WifiNetwork[];
  scannedAt: number;
  error?: string;
}

export interface WifiCurrentConnection {
  connected: boolean;
  ssid: string | null;
  bssid?: string | null;
  signal?: number | null;
  channel?: number | null;
  frequency?: string | null;
  security?: string | null;
  bitRate?: string | null;
  device?: string | null;
}

const SCANNER_BASE = "http://localhost:3001";

/**
 * Check if the WiFi scanner backend is running.
 */
export async function isWifiScannerAvailable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${SCANNER_BASE}/api/health`, { signal: ctrl.signal });
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Scan for nearby WiFi networks using the backend scanner.
 */
export async function scanWifiNetworks(): Promise<WifiScanResult> {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 20000);
  const res = await fetch(`${SCANNER_BASE}/api/wifi/scan`, { signal: ctrl.signal });
  return res.json();
}

/**
 * Get details about the current WiFi connection.
 */
export async function getWifiCurrentConnection(): Promise<WifiCurrentConnection> {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 5000);
  const res = await fetch(`${SCANNER_BASE}/api/wifi/current`, { signal: ctrl.signal });
  const data = await res.json();
  return data.connection;
}

/**
 * Security analysis of scanned WiFi networks.
 */
export function analyzeWifiSecurity(networks: WifiNetwork[]): {
  openNetworks: WifiNetwork[];
  weakNetworks: WifiNetwork[];
  strongNetworks: WifiNetwork[];
  evilTwinCandidates: WifiNetwork[][];
} {
  const openNetworks = networks.filter(
    (n) => n.security === "Open" || n.security === "None" || n.security === ""
  );

  const weakNetworks = networks.filter(
    (n) => n.security === "WEP" || n.security === "WPA"
  );

  const strongNetworks = networks.filter(
    (n) => n.security.includes("WPA2") || n.security.includes("WPA3")
  );

  // Detect potential evil twins — same SSID, different BSSID
  const ssidGroups = new Map<string, WifiNetwork[]>();
  for (const net of networks) {
    if (net.ssid === "<Hidden>") continue;
    const group = ssidGroups.get(net.ssid) || [];
    group.push(net);
    ssidGroups.set(net.ssid, group);
  }
  const evilTwinCandidates = [...ssidGroups.values()].filter((g) => g.length > 1);

  return { openNetworks, weakNetworks, strongNetworks, evilTwinCandidates };
}
