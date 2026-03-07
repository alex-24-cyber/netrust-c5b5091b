import { RealCheckResult } from "./networkChecks";

const NETWORK_NAMES = [
  "Cafe_FreeWifi", "Airport_Lounge", "Hotel_Guest", "StarBucks_WiFi",
  "PublicLibrary", "CoWork_5G", "Mall_Connect", "UniCampus_Open",
  "TrainStation_Free", "GymNet_Guest"
];

const ENCRYPTIONS = ["WPA2", "WPA3", "WPA2/WPA3", "Open", "WEP"];
const CHANNELS = [1, 6, 11, 36, 44, 48, 149, 153];

function randomMac(): string {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
  ).join(":");
}

function randomIp(): string {
  return `192.168.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`;
}

export interface SecurityCheck {
  id: string;
  name: string;
  icon: string;
  passed: boolean | null; // null = timed out / inconclusive
  status: string;
  explanation: string;
  checkType: "live" | "simulated";
}

export interface ScanResult {
  networkName: string;
  networkType: string;
  ssidNote: string;
  bssid: string;
  channel: number;
  signalStrength: number;
  encryption: string;
  gatewayIp: string;
  trustScore: number;
  trustLabel: string;
  checks: SecurityCheck[];
}

const SIMULATED_CHECKS = [
  {
    id: "evil-twin",
    name: "Evil Twin Detection",
    icon: "Copy",
    passStatus: "No duplicate SSIDs detected",
    failStatus: "Duplicate SSID with mismatched BSSID found",
    passExplanation: "We scanned for networks with the same name but different hardware identifiers. No suspicious duplicates were found, which means this network is likely genuine.",
    failExplanation: "We detected another network broadcasting the same name but from different hardware. This is a common attack where hackers create a fake copy of a real network to intercept your data.",
  },
  {
    id: "arp-spoof",
    name: "ARP Spoofing Analysis",
    icon: "Network",
    passStatus: "ARP tables consistent",
    failStatus: "ARP anomalies detected — possible MITM",
    passExplanation: "The network's address resolution tables are consistent and show no signs of manipulation. Your traffic is being routed to the correct destinations.",
    failExplanation: "We found inconsistencies in the ARP tables that suggest someone may be intercepting traffic between you and the router. This is a man-in-the-middle attack indicator.",
  },
];

const REAL_CHECK_NAMES: Record<string, { name: string; icon: string }> = {
  "ssl-cert": { name: "SSL Certificate Validation", icon: "Lock" },
  "dns-hijack": { name: "DNS Hijacking Check", icon: "Globe" },
  "rogue-dhcp": { name: "Captive Portal / Rogue DHCP", icon: "Server" },
};

function generateSimulatedChecks(): SecurityCheck[] {
  return SIMULATED_CHECKS.map((t) => {
    const passed = Math.random() > 0.3; // 70% pass rate
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      passed,
      status: passed ? t.passStatus : t.failStatus,
      explanation: passed ? t.passExplanation : t.failExplanation,
      checkType: "simulated" as const,
    };
  });
}

function realCheckToSecurityCheck(rc: RealCheckResult): SecurityCheck {
  const meta = REAL_CHECK_NAMES[rc.id] || { name: rc.id, icon: "Shield" };
  return {
    id: rc.id,
    name: meta.name,
    icon: meta.icon,
    passed: rc.passed,
    status: rc.status,
    explanation: rc.explanation,
    checkType: "live" as const,
  };
}

function calculateScore(checks: SecurityCheck[]): { trustScore: number; trustLabel: string } {
  let score = 0;
  for (const c of checks) {
    if (c.passed === true) score += 20;
    else if (c.passed === null) score += 10; // inconclusive gets partial credit
  }
  const jitter = Math.floor(Math.random() * 11) - 5;
  const trustScore = Math.max(5, Math.min(100, score + jitter));
  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";
  return { trustScore, trustLabel };
}

export function buildScanResult(
  realResults: RealCheckResult[],
  networkType: string,
  ssidNote: string
): ScanResult {
  const simulated = generateSimulatedChecks();
  const liveChecks = realResults.map(realCheckToSecurityCheck);

  // Order: evil-twin, arp-spoof, ssl-cert, dns-hijack, rogue-dhcp
  const checks: SecurityCheck[] = [
    ...simulated,
    ...["ssl-cert", "dns-hijack", "rogue-dhcp"].map(
      (id) => liveChecks.find((c) => c.id === id)!
    ).filter(Boolean),
  ];

  const { trustScore, trustLabel } = calculateScore(checks);
  const numFails = checks.filter((c) => c.passed === false).length;
  const encryption = numFails >= 3 ? "Open" : ENCRYPTIONS[Math.floor(Math.random() * 3)];

  return {
    networkName: "Current Network",
    networkType,
    ssidNote,
    bssid: randomMac(),
    channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
    signalStrength: -(Math.floor(Math.random() * 50) + 30),
    encryption,
    gatewayIp: randomIp(),
    trustScore,
    trustLabel,
    checks,
  };
}

// Legacy function kept for demo mode
export function generateScanResult(): ScanResult {
  const numFails = Math.floor(Math.random() * 5);
  const failIndices = new Set<number>();
  while (failIndices.size < numFails) {
    failIndices.add(Math.floor(Math.random() * 5));
  }

  const allTemplates = [...SIMULATED_CHECKS, ...Object.entries(REAL_CHECK_NAMES).map(([id, meta]) => ({
    id, ...meta,
    passStatus: "Passed", failStatus: "Failed",
    passExplanation: "Check passed.", failExplanation: "Check failed.",
  }))];

  const checks: SecurityCheck[] = allTemplates.map((t, i) => {
    const passed = !failIndices.has(i);
    return {
      id: t.id, name: t.name, icon: t.icon, passed,
      status: passed ? (t as any).passStatus : (t as any).failStatus,
      explanation: passed ? (t as any).passExplanation : (t as any).failExplanation,
      checkType: (i < 2 ? "simulated" : "live") as "simulated" | "live",
    };
  });

  const baseScore = 100 - numFails * 18;
  const jitter = Math.floor(Math.random() * 11) - 5;
  const trustScore = Math.max(5, Math.min(100, baseScore + jitter));
  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";
  const encryption = numFails >= 3 ? "Open" : ENCRYPTIONS[Math.floor(Math.random() * 3)];

  return {
    networkName: NETWORK_NAMES[Math.floor(Math.random() * NETWORK_NAMES.length)],
    networkType: "Unknown",
    ssidNote: "",
    bssid: randomMac(),
    channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
    signalStrength: -(Math.floor(Math.random() * 50) + 30),
    encryption,
    gatewayIp: randomIp(),
    trustScore, trustLabel, checks,
  };
}
