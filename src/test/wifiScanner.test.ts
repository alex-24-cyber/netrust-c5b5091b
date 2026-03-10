import { describe, it, expect } from "vitest";
import { analyzeWifiSecurity, WifiNetwork } from "@/lib/wifiScanner";

function makeNetwork(ssid: string, bssid: string, security: string, signal = 80): WifiNetwork {
  return { ssid, bssid, signal, frequency: "2.4 GHz", security, channel: 6 };
}

describe("analyzeWifiSecurity", () => {
  it("classifies open networks", () => {
    const networks = [
      makeNetwork("FreeWifi", "aa:bb:cc:dd:ee:01", "Open"),
      makeNetwork("Secure", "aa:bb:cc:dd:ee:02", "WPA2"),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.openNetworks).toHaveLength(1);
    expect(result.openNetworks[0].ssid).toBe("FreeWifi");
  });

  it("classifies weak WEP/WPA networks", () => {
    const networks = [
      makeNetwork("OldRouter", "aa:bb:cc:dd:ee:01", "WEP"),
      makeNetwork("SlightlyBetter", "aa:bb:cc:dd:ee:02", "WPA"),
      makeNetwork("Modern", "aa:bb:cc:dd:ee:03", "WPA2"),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.weakNetworks).toHaveLength(2);
  });

  it("classifies strong WPA2/WPA3 networks", () => {
    const networks = [
      makeNetwork("HomeNet", "aa:bb:cc:dd:ee:01", "WPA2"),
      makeNetwork("Office", "aa:bb:cc:dd:ee:02", "WPA3"),
      makeNetwork("Legacy", "aa:bb:cc:dd:ee:03", "WEP"),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.strongNetworks).toHaveLength(2);
  });

  it("detects evil twin candidates (same SSID, different BSSID)", () => {
    const networks = [
      makeNetwork("CoffeeShop", "aa:bb:cc:dd:ee:01", "WPA2", 90),
      makeNetwork("CoffeeShop", "aa:bb:cc:dd:ee:02", "WPA2", 60),
      makeNetwork("UniqueNet", "aa:bb:cc:dd:ee:03", "WPA2"),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.evilTwinCandidates).toHaveLength(1);
    expect(result.evilTwinCandidates[0]).toHaveLength(2);
    expect(result.evilTwinCandidates[0][0].ssid).toBe("CoffeeShop");
  });

  it("ignores hidden SSIDs for evil twin detection", () => {
    const networks = [
      makeNetwork("<Hidden>", "aa:bb:cc:dd:ee:01", "WPA2"),
      makeNetwork("<Hidden>", "aa:bb:cc:dd:ee:02", "WPA2"),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.evilTwinCandidates).toHaveLength(0);
  });

  it("handles empty network list", () => {
    const result = analyzeWifiSecurity([]);
    expect(result.openNetworks).toHaveLength(0);
    expect(result.weakNetworks).toHaveLength(0);
    expect(result.strongNetworks).toHaveLength(0);
    expect(result.evilTwinCandidates).toHaveLength(0);
  });

  it("treats 'None' and empty string security as open", () => {
    const networks = [
      makeNetwork("NoneNet", "aa:bb:cc:dd:ee:01", "None"),
      makeNetwork("EmptyNet", "aa:bb:cc:dd:ee:02", ""),
    ];
    const result = analyzeWifiSecurity(networks);
    expect(result.openNetworks).toHaveLength(2);
  });
});
