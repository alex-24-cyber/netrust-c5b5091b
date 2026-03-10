import { describe, it, expect, beforeEach } from "vitest";
import {
  createFingerprint,
  compareAndStoreFingerprint,
  getStoredFingerprints,
  clearFingerprints,
} from "@/lib/networkFingerprint";

const CHECKS_ALL_PASS = [
  { id: "dns-hijack", passed: true as const, evidence: {} },
  { id: "ssl-cert", passed: true as const, evidence: {} },
  { id: "tls-version", passed: true as const, evidence: { "TLS Version": "TLS 1.3" } },
];

const IP_REP = { org: "Comcast Cable", asn: "AS7922", city: "Philadelphia" };

beforeEach(() => {
  clearFingerprints();
});

describe("createFingerprint", () => {
  it("creates fingerprint with correct fields", () => {
    const fp = createFingerprint("MyWiFi", "1.2.3.4", CHECKS_ALL_PASS, IP_REP, 85);
    expect(fp.ssid).toBe("MyWiFi");
    expect(fp.publicIp).toBe("1.2.3.4");
    expect(fp.dnsConsistent).toBe(true);
    expect(fp.sslValid).toBe(true);
    expect(fp.tlsVersion).toBe("TLS 1.3");
    expect(fp.ispOrg).toBe("Comcast Cable");
    expect(fp.asn).toBe("AS7922");
    expect(fp.exitCity).toBe("Philadelphia");
    expect(fp.trustScores).toEqual([85]);
    expect(fp.scanCount).toBe(1);
    expect(fp.id).toMatch(/^fp_/);
  });

  it("handles null/missing values gracefully", () => {
    const fp = createFingerprint("Open", null, [], null, undefined);
    expect(fp.publicIp).toBeNull();
    expect(fp.dnsConsistent).toBeNull();
    expect(fp.sslValid).toBeNull();
    expect(fp.tlsVersion).toBeNull();
    expect(fp.ispOrg).toBeNull();
    expect(fp.trustScores).toEqual([]);
  });

  it("generates same ID for same SSID + ISP", () => {
    const a = createFingerprint("MyWiFi", "1.1.1.1", [], IP_REP, 90);
    const b = createFingerprint("MyWiFi", "2.2.2.2", [], IP_REP, 80);
    expect(a.id).toBe(b.id);
  });

  it("generates different IDs for different SSIDs", () => {
    const a = createFingerprint("HomeWiFi", "1.1.1.1", [], IP_REP, 90);
    const b = createFingerprint("CoffeeShop", "1.1.1.1", [], IP_REP, 90);
    expect(a.id).not.toBe(b.id);
  });
});

describe("compareAndStoreFingerprint", () => {
  it("marks first visit as new network", () => {
    const fp = createFingerprint("NewWiFi", "1.2.3.4", CHECKS_ALL_PASS, IP_REP, 90);
    const result = compareAndStoreFingerprint(fp);
    expect(result.isKnownNetwork).toBe(false);
    expect(result.fingerprintChanged).toBe(false);
    expect(result.riskLevel).toBe("none");
    expect(result.changes).toEqual([]);
  });

  it("detects known network with no changes", () => {
    const fp1 = createFingerprint("StableWiFi", "1.2.3.4", CHECKS_ALL_PASS, IP_REP, 90);
    compareAndStoreFingerprint(fp1);

    const fp2 = createFingerprint("StableWiFi", "1.2.3.4", CHECKS_ALL_PASS, IP_REP, 88);
    const result = compareAndStoreFingerprint(fp2);
    expect(result.isKnownNetwork).toBe(true);
    expect(result.fingerprintChanged).toBe(false);
    expect(result.riskLevel).toBe("none");
  });

  it("treats ISP change as new network (ID includes ISP)", () => {
    // Fingerprint ID is derived from ssid + org, so different org = different ID
    const fp1 = createFingerprint("MyWiFi", "1.2.3.4", CHECKS_ALL_PASS, IP_REP, 90);
    compareAndStoreFingerprint(fp1);

    const newIpRep = { org: "EvilCorp VPN", asn: "AS7922", city: "Philadelphia" };
    const fp2 = createFingerprint("MyWiFi", "1.2.3.4", CHECKS_ALL_PASS, newIpRep, 85);
    expect(fp1.id).not.toBe(fp2.id);

    const result = compareAndStoreFingerprint(fp2);
    expect(result.isKnownNetwork).toBe(false);
  });

  it("detects DNS regression as high risk", () => {
    const fp1 = createFingerprint("CafeWiFi", "5.5.5.5", CHECKS_ALL_PASS, IP_REP, 90);
    compareAndStoreFingerprint(fp1);

    const badChecks = [
      { id: "dns-hijack", passed: false as const, evidence: {} },
      { id: "ssl-cert", passed: true as const, evidence: {} },
      { id: "tls-version", passed: true as const, evidence: { "TLS Version": "TLS 1.3" } },
    ];
    const fp2 = createFingerprint("CafeWiFi", "5.5.5.5", badChecks, IP_REP, 70);
    const result = compareAndStoreFingerprint(fp2);
    expect(result.riskLevel).toBe("high");
    expect(result.changes.some((c) => c.includes("DNS"))).toBe(true);
  });

  it("detects public IP change as low risk", () => {
    const fp1 = createFingerprint("HomeNet", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 95);
    compareAndStoreFingerprint(fp1);

    const fp2 = createFingerprint("HomeNet", "2.2.2.2", CHECKS_ALL_PASS, IP_REP, 95);
    const result = compareAndStoreFingerprint(fp2);
    expect(result.fingerprintChanged).toBe(true);
    expect(result.riskLevel).toBe("low");
    expect(result.changes.some((c) => c.includes("Public IP changed"))).toBe(true);
  });

  it("detects significant trust score drop", () => {
    const fp1 = createFingerprint("ScoreDrop", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 95);
    compareAndStoreFingerprint(fp1);

    const fp2 = createFingerprint("ScoreDrop", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 40);
    const result = compareAndStoreFingerprint(fp2);
    expect(result.changes.some((c) => c.includes("Trust score dropped"))).toBe(true);
  });

  it("increments scanCount on repeat visits", () => {
    const fp = createFingerprint("Counter", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 90);
    compareAndStoreFingerprint(fp);
    compareAndStoreFingerprint(createFingerprint("Counter", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 90));
    compareAndStoreFingerprint(createFingerprint("Counter", "1.1.1.1", CHECKS_ALL_PASS, IP_REP, 90));

    const stored = getStoredFingerprints();
    const counterFp = stored.find((f) => f.ssid === "Counter");
    expect(counterFp?.scanCount).toBe(3);
  });
});

describe("getStoredFingerprints / clearFingerprints", () => {
  it("returns empty array when cleared", () => {
    clearFingerprints();
    expect(getStoredFingerprints()).toEqual([]);
  });

  it("stores multiple fingerprints", () => {
    const fp1 = createFingerprint("NetA", "1.1.1.1", [], null, 80);
    compareAndStoreFingerprint(fp1);

    const fp2 = createFingerprint("NetB", "2.2.2.2", [], null, 90);
    compareAndStoreFingerprint(fp2);

    const stored = getStoredFingerprints();
    expect(stored.length).toBe(2);
    const ssids = stored.map((f) => f.ssid).sort();
    expect(ssids).toEqual(["NetA", "NetB"]);
  });
});
