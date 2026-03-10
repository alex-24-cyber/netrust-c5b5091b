import { describe, it, expect } from "vitest";
import { buildScanResult } from "@/lib/mockData";
import type { RealCheckResult, ConnectionInfo } from "@/lib/networkChecks";

function makeCheck(id: string, passed: boolean | null): RealCheckResult {
  return {
    id,
    passed,
    status: passed === true ? "OK" : passed === false ? "Failed" : "Inconclusive",
    explanation: "Test check",
  };
}

const CONNECTION_INFO: ConnectionInfo = {
  type: "Wi-Fi",
  ssidNote: "Test",
  apiSupported: true,
};

const ALL_CHECK_IDS = [
  "ssl-cert",
  "dns-hijack",
  "rogue-dhcp",
  "webrtc-leak",
  "content-inject",
  "ip-reputation",
  "tls-version",
];

describe("buildScanResult", () => {
  it("calculates trustScore 100 when all checks pass", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, true));
    const result = buildScanResult(checks, CONNECTION_INFO, "1.2.3.4");
    expect(result.trustScore).toBe(100);
    expect(result.trustLabel).toBe("Trusted");
  });

  it("calculates trustScore 0 when all checks fail", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, false));
    const result = buildScanResult(checks, CONNECTION_INFO, "1.2.3.4");
    expect(result.trustScore).toBe(0);
    expect(result.trustLabel).toBe("High Risk");
  });

  it("gives half credit for inconclusive checks", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, null));
    const result = buildScanResult(checks, CONNECTION_INFO, "1.2.3.4");
    expect(result.trustScore).toBe(50);
    expect(result.trustLabel).toBe("Use Caution");
  });

  it("scores mixed results correctly", () => {
    // 5 pass, 1 fail, 1 inconclusive = ~5*14.3 + 0 + 7.1 = ~78.6 → 79
    const checks = ALL_CHECK_IDS.map((id, i) =>
      makeCheck(id, i < 5 ? true : i === 5 ? false : null)
    );
    const result = buildScanResult(checks, CONNECTION_INFO, "1.2.3.4");
    expect(result.trustScore).toBeGreaterThan(70);
    expect(result.trustScore).toBeLessThan(90);
    expect(result.trustLabel).toBe("Trusted");
  });

  it("orders checks in canonical order", () => {
    const checks = ALL_CHECK_IDS.slice().reverse().map((id) => makeCheck(id, true));
    const result = buildScanResult(checks, CONNECTION_INFO, null);
    expect(result.checks.map((c) => c.id)).toEqual(ALL_CHECK_IDS);
  });

  it("includes publicIp and networkType from inputs", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, true));
    const result = buildScanResult(checks, CONNECTION_INFO, "8.8.8.8");
    expect(result.publicIp).toBe("8.8.8.8");
    expect(result.networkType).toBe("Wi-Fi");
  });

  it("maps check names from REAL_CHECK_NAMES", () => {
    const checks = [makeCheck("ssl-cert", true)];
    const result = buildScanResult(checks, CONNECTION_INFO, null);
    const sslCheck = result.checks.find((c) => c.id === "ssl-cert");
    expect(sslCheck?.name).toBe("SSL Certificate Validation");
    expect(sslCheck?.icon).toBe("Lock");
    expect(sslCheck?.checkType).toBe("live");
  });

  it("uses wifiCurrentConnection SSID as networkName", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, true));
    const result = buildScanResult(
      checks,
      CONNECTION_INFO,
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      { connected: true, ssid: "CoffeeShop_5G", bssid: "aa:bb:cc:dd:ee:ff" }
    );
    expect(result.networkName).toBe("CoffeeShop_5G");
  });

  it("falls back to 'Current Network' when no SSID", () => {
    const checks = ALL_CHECK_IDS.map((id) => makeCheck(id, true));
    const result = buildScanResult(checks, CONNECTION_INFO, null);
    expect(result.networkName).toBe("Current Network");
  });
});
