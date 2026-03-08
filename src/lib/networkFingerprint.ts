/**
 * Network Fingerprinting System
 *
 * Creates a unique fingerprint for each network based on observable characteristics.
 * Stores fingerprints in localStorage and detects when a known network's fingerprint changes,
 * which could indicate an evil twin or compromised access point.
 */

export interface NetworkFingerprint {
  id: string; // hash of key properties
  ssid: string;
  publicIp: string | null;
  dnsConsistent: boolean | null;
  sslValid: boolean | null;
  tlsVersion: string | null;
  ispOrg: string | null;
  asn: string | null;
  exitCity: string | null;
  firstSeen: number;
  lastSeen: number;
  scanCount: number;
  trustScores: number[]; // last 5 scores
}

export interface FingerprintComparison {
  isKnownNetwork: boolean;
  fingerprintChanged: boolean;
  changes: string[];
  previousFingerprint: NetworkFingerprint | null;
  riskLevel: "none" | "low" | "medium" | "high";
  message: string;
}

const STORAGE_KEY = "nettrust_fingerprints";
const MAX_FINGERPRINTS = 100;
const MAX_SCORES = 10;

function loadFingerprints(): Record<string, NetworkFingerprint> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveFingerprints(fps: Record<string, NetworkFingerprint>): void {
  try {
    // Prune old entries if too many
    const entries = Object.entries(fps);
    if (entries.length > MAX_FINGERPRINTS) {
      entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      fps = Object.fromEntries(entries.slice(0, MAX_FINGERPRINTS));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fps));
  } catch {}
}

function generateFingerprintId(ssid: string, publicIp: string | null, ispOrg: string | null): string {
  // Create a stable ID from network-identifying properties
  const raw = `${ssid}::${ispOrg || "unknown"}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

export function createFingerprint(
  ssid: string,
  publicIp: string | null,
  checks: { id: string; passed: boolean | null; evidence?: Record<string, string> }[],
  ipReputation?: { org?: string; asn?: string; city?: string } | null,
  trustScore?: number,
): NetworkFingerprint {
  const dnsCheck = checks.find(c => c.id === "dns-hijack");
  const sslCheck = checks.find(c => c.id === "ssl-cert");
  const tlsCheck = checks.find(c => c.id === "tls-version");

  let tlsVersion: string | null = null;
  if (tlsCheck?.evidence?.["TLS Version"]) {
    tlsVersion = tlsCheck.evidence["TLS Version"];
  }

  const ispOrg = ipReputation?.org || null;
  const id = generateFingerprintId(ssid, publicIp, ispOrg);

  return {
    id,
    ssid,
    publicIp,
    dnsConsistent: dnsCheck?.passed ?? null,
    sslValid: sslCheck?.passed ?? null,
    tlsVersion,
    ispOrg,
    asn: ipReputation?.asn || null,
    exitCity: ipReputation?.city || null,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    scanCount: 1,
    trustScores: trustScore != null ? [trustScore] : [],
  };
}

export function compareAndStoreFingerprint(newFp: NetworkFingerprint): FingerprintComparison {
  const fps = loadFingerprints();
  const existing = fps[newFp.id];

  if (!existing) {
    // New network - store it
    fps[newFp.id] = newFp;
    saveFingerprints(fps);
    return {
      isKnownNetwork: false,
      fingerprintChanged: false,
      changes: [],
      previousFingerprint: null,
      riskLevel: "none",
      message: "First time on this network. Fingerprint saved.",
    };
  }

  // Known network - compare
  const changes: string[] = [];

  if (existing.publicIp && newFp.publicIp && existing.publicIp !== newFp.publicIp) {
    changes.push(`Public IP changed: ${existing.publicIp} → ${newFp.publicIp}`);
  }

  if (existing.ispOrg && newFp.ispOrg && existing.ispOrg !== newFp.ispOrg) {
    changes.push(`ISP changed: ${existing.ispOrg} → ${newFp.ispOrg}`);
  }

  if (existing.asn && newFp.asn && existing.asn !== newFp.asn) {
    changes.push(`ASN changed: ${existing.asn} → ${newFp.asn}`);
  }

  if (existing.exitCity && newFp.exitCity && existing.exitCity !== newFp.exitCity) {
    changes.push(`Exit location changed: ${existing.exitCity} → ${newFp.exitCity}`);
  }

  if (existing.dnsConsistent === true && newFp.dnsConsistent === false) {
    changes.push("DNS was consistent before, now showing hijacking signs");
  }

  if (existing.sslValid === true && newFp.sslValid === false) {
    changes.push("SSL was valid before, now failing validation");
  }

  if (existing.tlsVersion && newFp.tlsVersion && existing.tlsVersion !== newFp.tlsVersion) {
    changes.push(`TLS version changed: ${existing.tlsVersion} → ${newFp.tlsVersion}`);
  }

  // Calculate average previous trust score
  const avgPrevScore = existing.trustScores.length > 0
    ? existing.trustScores.reduce((a, b) => a + b, 0) / existing.trustScores.length
    : null;
  const currentScore = newFp.trustScores[0];
  if (avgPrevScore != null && currentScore != null && avgPrevScore - currentScore > 25) {
    changes.push(`Trust score dropped significantly: avg ${Math.round(avgPrevScore)} → ${currentScore}`);
  }

  // Determine risk level
  let riskLevel: FingerprintComparison["riskLevel"] = "none";
  if (changes.length > 0) {
    const hasCriticalChange = changes.some(c =>
      c.includes("DNS") || c.includes("SSL") || c.includes("ISP changed") || c.includes("ASN changed")
    );
    if (hasCriticalChange) {
      riskLevel = "high";
    } else if (changes.length >= 2) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }
  }

  // Update stored fingerprint
  const updatedScores = [...(newFp.trustScores), ...existing.trustScores].slice(0, MAX_SCORES);
  fps[newFp.id] = {
    ...newFp,
    firstSeen: existing.firstSeen,
    lastSeen: Date.now(),
    scanCount: existing.scanCount + 1,
    trustScores: updatedScores,
  };
  saveFingerprints(fps);

  const fingerprintChanged = changes.length > 0;

  let message: string;
  if (!fingerprintChanged) {
    message = `Network matches previous fingerprint. Scanned ${existing.scanCount + 1} times since ${new Date(existing.firstSeen).toLocaleDateString()}.`;
  } else if (riskLevel === "high") {
    message = "This network looks different from before. It may have been compromised or replaced with a rogue access point.";
  } else if (riskLevel === "medium") {
    message = "Some network characteristics have changed since your last visit. Proceed with caution.";
  } else {
    message = "Minor network changes detected. This could be normal infrastructure updates.";
  }

  return {
    isKnownNetwork: true,
    fingerprintChanged,
    changes,
    previousFingerprint: existing,
    riskLevel,
    message,
  };
}

export function getStoredFingerprints(): NetworkFingerprint[] {
  const fps = loadFingerprints();
  return Object.values(fps).sort((a, b) => b.lastSeen - a.lastSeen);
}

export function clearFingerprints(): void {
  localStorage.removeItem(STORAGE_KEY);
}
