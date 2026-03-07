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
  passed: boolean;
  status: string;
  explanation: string;
}

export interface ScanResult {
  networkName: string;
  bssid: string;
  channel: number;
  signalStrength: number;
  encryption: string;
  gatewayIp: string;
  trustScore: number;
  trustLabel: string;
  checks: SecurityCheck[];
}

const CHECK_TEMPLATES = [
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
  {
    id: "ssl-cert",
    name: "SSL Certificate Validation",
    icon: "Lock",
    passStatus: "HTTPS connections verified",
    failStatus: "SSL stripping attempt detected",
    passExplanation: "All tested HTTPS connections are using valid certificates from trusted authorities. Your encrypted connections appear to be secure and untampered.",
    failExplanation: "We detected attempts to downgrade your secure HTTPS connections to unencrypted HTTP. This technique, known as SSL stripping, could expose your passwords and personal data.",
  },
  {
    id: "dns-hijack",
    name: "DNS Hijacking Check",
    icon: "Globe",
    passStatus: "DNS responses match expected resolvers",
    failStatus: "DNS responses redirected to unknown servers",
    passExplanation: "DNS queries are returning expected results from legitimate resolvers. Websites you visit will load from their real servers, not impostor pages.",
    failExplanation: "DNS responses are being redirected to unexpected servers. This means when you type a website address, you could be sent to a fake version designed to steal your credentials.",
  },
  {
    id: "rogue-dhcp",
    name: "Rogue DHCP Detection",
    icon: "Server",
    passStatus: "Single authorised DHCP server found",
    failStatus: "Unauthorised DHCP server detected",
    passExplanation: "Only one DHCP server is operating on this network, which is the expected configuration. Your device received a legitimate IP address assignment.",
    failExplanation: "Multiple DHCP servers are active on this network, which is abnormal. An unauthorised server could assign you a malicious gateway, routing all your traffic through an attacker's device.",
  },
];

export function generateScanResult(): ScanResult {
  // Random number of failures (0-4, never all 5)
  const numFails = Math.floor(Math.random() * 5);
  const failIndices = new Set<number>();
  while (failIndices.size < numFails) {
    failIndices.add(Math.floor(Math.random() * 5));
  }

  const checks: SecurityCheck[] = CHECK_TEMPLATES.map((t, i) => {
    const passed = !failIndices.has(i);
    return {
      id: t.id,
      name: t.name,
      icon: t.icon,
      passed,
      status: passed ? t.passStatus : t.failStatus,
      explanation: passed ? t.passExplanation : t.failExplanation,
    };
  });

  // Score correlates with failures
  const baseScore = 100 - numFails * 18;
  const jitter = Math.floor(Math.random() * 11) - 5;
  const trustScore = Math.max(5, Math.min(100, baseScore + jitter));

  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";

  const encryption = numFails >= 3 ? "Open" : ENCRYPTIONS[Math.floor(Math.random() * 3)];

  return {
    networkName: NETWORK_NAMES[Math.floor(Math.random() * NETWORK_NAMES.length)],
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
