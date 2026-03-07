import { ScanResult, SecurityCheck } from "./mockData";

const CHECK_TEMPLATES = [
  {
    id: "evil-twin", name: "Evil Twin Detection", icon: "Copy", checkType: "simulated" as const,
    passStatus: "No duplicate SSIDs detected", failStatus: "Duplicate SSID with mismatched BSSID found",
    passExplanation: "We scanned for networks with the same name but different hardware identifiers. No suspicious duplicates were found, which means this network is likely genuine.",
    failExplanation: "We detected another network broadcasting the same name but from different hardware. This is a common attack where hackers create a fake copy of a real network to intercept your data.",
  },
  {
    id: "arp-spoof", name: "ARP Spoofing Analysis", icon: "Network", checkType: "simulated" as const,
    passStatus: "ARP tables consistent", failStatus: "ARP anomalies detected — possible MITM",
    passExplanation: "The network's address resolution tables are consistent and show no signs of manipulation. Your traffic is being routed to the correct destinations.",
    failExplanation: "We found inconsistencies in the ARP tables that suggest someone may be intercepting traffic between you and the router. This is a man-in-the-middle attack indicator.",
  },
  {
    id: "ssl-cert", name: "SSL Certificate Validation", icon: "Lock", checkType: "live" as const,
    passStatus: "HTTPS connections verified — no SSL stripping detected", failStatus: "HTTPS connections failing — possible SSL interception",
    passExplanation: "All tested HTTPS connections are using valid certificates from trusted authorities. Your encrypted connections appear to be secure and untampered.",
    failExplanation: "We detected attempts to downgrade your secure HTTPS connections to unencrypted HTTP. This technique, known as SSL stripping, could expose your passwords and personal data.",
  },
  {
    id: "dns-hijack", name: "DNS Hijacking Check", icon: "Globe", checkType: "live" as const,
    passStatus: "DNS responses consistent across providers", failStatus: "DNS responses inconsistent — possible redirection detected",
    passExplanation: "DNS queries are returning expected results from legitimate resolvers. Websites you visit will load from their real servers, not impostor pages.",
    failExplanation: "DNS responses are being redirected to unexpected servers. This means when you type a website address, you could be sent to a fake version designed to steal your credentials.",
  },
  {
    id: "rogue-dhcp", name: "Captive Portal / Rogue DHCP", icon: "Server", checkType: "live" as const,
    passStatus: "No captive portal or rogue DHCP detected", failStatus: "Captive portal or network interception detected",
    passExplanation: "Only one DHCP server is operating on this network, which is the expected configuration. Your device received a legitimate IP address assignment.",
    failExplanation: "Multiple DHCP servers are active on this network, which is abnormal. An unauthorised server could assign you a malicious gateway, routing all your traffic through an attacker's device.",
  },
];

const NETWORK_NAMES = [
  "Cafe_FreeWifi", "Airport_Lounge", "Hotel_Guest", "StarBucks_WiFi",
  "PublicLibrary", "CoWork_5G", "Mall_Connect", "UniCampus_Open",
];
const ENCRYPTIONS = ["WPA2", "WPA3", "WPA2/WPA3", "Open", "WEP"];
const CHANNELS = [1, 6, 11, 36, 44, 48, 149, 153];

function randomMac() {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
  ).join(":");
}

function randomIp() {
  return `192.168.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 254) + 1}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export type DemoForce = "random" | "red" | "amber" | "green";

export function generateForcedResult(force: DemoForce): ScanResult {
  let numFails: number;
  let scoreMin: number;
  let scoreMax: number;

  switch (force) {
    case "red":
      numFails = randBetween(3, 4);
      scoreMin = 15; scoreMax = 35;
      break;
    case "amber":
      numFails = randBetween(1, 2);
      scoreMin = 45; scoreMax = 65;
      break;
    case "green":
      numFails = 0;
      scoreMin = 80; scoreMax = 95;
      break;
    default:
      return generateRandomResult();
  }

  const failIndices = new Set<number>();
  while (failIndices.size < numFails) {
    failIndices.add(Math.floor(Math.random() * 5));
  }

  const checks: SecurityCheck[] = CHECK_TEMPLATES.map((t, i) => {
    const passed = !failIndices.has(i);
    return {
      id: t.id, name: t.name, icon: t.icon, passed,
      status: passed ? t.passStatus : t.failStatus,
      explanation: passed ? t.passExplanation : t.failExplanation,
      checkType: t.checkType,
    };
  });

  const trustScore = randBetween(scoreMin, scoreMax);
  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";
  const encryption = numFails >= 3 ? "Open" : pick(ENCRYPTIONS.slice(0, 3));

  return {
    networkName: pick(NETWORK_NAMES),
    networkType: "Wi-Fi",
    ssidNote: "",
    bssid: randomMac(),
    channel: pick(CHANNELS),
    signalStrength: -(randBetween(30, 80)),
    encryption,
    gatewayIp: randomIp(),
    publicIp: null,
    trustScore, trustLabel, checks,
    isDemo: true,
  };
}

function generateRandomResult(): ScanResult {
  const numFails = Math.floor(Math.random() * 5);
  const failIndices = new Set<number>();
  while (failIndices.size < numFails) {
    failIndices.add(Math.floor(Math.random() * 5));
  }

  const checks: SecurityCheck[] = CHECK_TEMPLATES.map((t, i) => {
    const passed = !failIndices.has(i);
    return {
      id: t.id, name: t.name, icon: t.icon, passed,
      status: passed ? t.passStatus : t.failStatus,
      explanation: passed ? t.passExplanation : t.failExplanation,
      checkType: t.checkType,
    };
  });

  const baseScore = 100 - numFails * 18;
  const trustScore = Math.max(5, Math.min(100, baseScore + randBetween(-5, 5)));
  const trustLabel = trustScore <= 40 ? "High Risk" : trustScore <= 70 ? "Use Caution" : "Trusted";
  const encryption = numFails >= 3 ? "Open" : pick(ENCRYPTIONS);

  return {
    networkName: pick(NETWORK_NAMES),
    networkType: "Wi-Fi",
    ssidNote: "",
    bssid: randomMac(),
    channel: pick(CHANNELS),
    signalStrength: -(randBetween(30, 80)),
    encryption,
    gatewayIp: randomIp(),
    publicIp: null,
    trustScore, trustLabel, checks,
    isDemo: true,
  };
}
