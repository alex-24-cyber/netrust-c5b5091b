import { RealCheckResult, IPReputationData, ScanLogEntry, ConnectionInfo } from "./networkChecks";

export interface SecurityCheck {
  id: string;
  name: string;
  icon: string;
  passed: boolean | null; // null = timed out / inconclusive
  status: string;
  explanation: string;
  checkType: "live";
  evidence?: Record<string, string>;
}

export interface ScanResult {
  networkName: string;
  networkType: string;
  ssidNote: string;
  publicIp: string | null;
  webrtcLocalIp?: string;
  ipReputation?: IPReputationData;
  connectionInfo?: ConnectionInfo;
  trustScore: number;
  trustLabel: string;
  checks: SecurityCheck[];
  scanLog?: ScanLogEntry[];
}

const REAL_CHECK_NAMES: Record<string, { name: string; icon: string }> = {
  "ssl-cert": { name: "SSL Certificate Validation", icon: "Lock" },
  "dns-hijack": { name: "DNS Hijacking Check", icon: "Globe" },
  "rogue-dhcp": { name: "Captive Portal / Rogue DHCP", icon: "Server" },
  "webrtc-leak": { name: "WebRTC Local IP Leak Detection", icon: "Video" },
  "content-inject": { name: "Content Injection Detection", icon: "Code" },
  "ip-reputation": { name: "Public IP Reputation", icon: "Fingerprint" },
  "latency-anomaly": { name: "Latency Anomaly Detection", icon: "Timer" },
  "tls-version": { name: "TLS Version Analysis", icon: "ShieldCheck" },
  "bandwidth-throttle": { name: "Bandwidth Throttle Detection", icon: "Gauge" },
  "http2-support": { name: "Protocol Downgrade Detection", icon: "Layers" },
};

function realCheckToSecurityCheck(rc: RealCheckResult): SecurityCheck {
  const meta = REAL_CHECK_NAMES[rc.id] || { name: rc.id, icon: "Shield" };
  return {
    id: rc.id,
    name: meta.name,
    icon: meta.icon,
    passed: rc.passed,
    status: rc.status,
    explanation: rc.explanation,
    checkType: "live",
    evidence: rc.evidence,
  };
}

function calculateScore(checks: SecurityCheck[]): { trustScore: number; trustLabel: string } {
  const perCheck = checks.length > 0 ? 100 / checks.length : 14;
  let score = 0;
  for (const c of checks) {
    if (c.passed === true) score += perCheck;
    else if (c.passed === null) score += perCheck / 2;
  }
  const j = Math.floor(Math.random() * 7) - 3; // ±3
  const trustScore = Math.max(0, Math.min(100, Math.round(score + j)));
  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";
  return { trustScore, trustLabel };
}

export function buildScanResult(
  realResults: RealCheckResult[],
  connectionInfo: ConnectionInfo,
  publicIp: string | null,
  webrtcLeakedIp?: string,
  ipReputation?: IPReputationData,
  scanLog?: ScanLogEntry[],
): ScanResult {
  const liveChecks = realResults.map(realCheckToSecurityCheck);

  const checks = ["ssl-cert", "dns-hijack", "rogue-dhcp", "webrtc-leak", "content-inject", "ip-reputation", "latency-anomaly", "tls-version", "bandwidth-throttle", "http2-support"]
    .map((id) => liveChecks.find((c) => c.id === id)!)
    .filter(Boolean);

  const { trustScore, trustLabel } = calculateScore(checks);

  return {
    networkName: "Current Network",
    networkType: connectionInfo.type,
    ssidNote: connectionInfo.ssidNote,
    publicIp,
    webrtcLocalIp: webrtcLeakedIp,
    ipReputation,
    connectionInfo,
    trustScore,
    trustLabel,
    checks,
    scanLog,
  };
}
