import { describe, it, expect } from "vitest";
import {
  scoreChecks,
  bandFromScore,
  metaFor,
  CHECK_META,
  CRITICAL_CAP,
  type ScorableCheck,
} from "@/lib/scoring";

const ALL = Object.keys(CHECK_META);

function checks(map: Record<string, boolean | null>): ScorableCheck[] {
  return ALL.map((id) => ({ id, passed: id in map ? map[id] : true }));
}

describe("check weights", () => {
  it("sum to exactly 100", () => {
    const total = Object.values(CHECK_META).reduce((a, m) => a + m.weight, 0);
    expect(total).toBe(100);
  });

  it("marks the four interception/tampering checks as critical", () => {
    const critical = Object.values(CHECK_META).filter((m) => m.critical).map((m) => m.id).sort();
    expect(critical).toEqual(["content-inject", "dns-hijack", "rogue-dhcp", "ssl-cert"]);
  });
});

describe("scoreChecks", () => {
  it("returns 100 / safe / high confidence when all checks pass", () => {
    const r = scoreChecks(checks({}));
    expect(r.score).toBe(100);
    expect(r.band).toBe("safe");
    expect(r.confidence).toBe(1);
    expect(r.confidenceLabel).toBe("High");
    expect(r.capped).toBe(false);
  });

  it("returns 0 / danger when all checks fail", () => {
    const r = scoreChecks(ALL.map((id) => ({ id, passed: false })));
    expect(r.score).toBe(0);
    expect(r.band).toBe("danger");
    expect(r.label).toBe("High Risk");
  });

  it("excludes inconclusive checks from the denominator", () => {
    // ip-reputation (weight 8) and webrtc-leak (weight 6) inconclusive; rest pass.
    const r = scoreChecks(checks({ "ip-reputation": null, "webrtc-leak": null }));
    expect(r.score).toBe(100); // everything we *could* verify passed
    expect(r.inconclusive.sort()).toEqual(["ip-reputation", "webrtc-leak"]);
    expect(r.confidence).toBeCloseTo(0.86, 2); // (100-14)/100
  });

  it("caps a single critical failure into the danger band", () => {
    const r = scoreChecks(checks({ "dns-hijack": false }));
    expect(r.criticalFailures).toEqual(["dns-hijack"]);
    expect(r.capped).toBe(true);
    expect(r.score).toBe(CRITICAL_CAP);
    expect(r.band).toBe("danger");
  });

  it("does NOT cap when only a non-critical check fails", () => {
    const r = scoreChecks(checks({ "webrtc-leak": false }));
    expect(r.capped).toBe(false);
    expect(r.criticalFailures).toEqual([]);
    expect(r.band).toBe("safe"); // 94/100, low-severity miss
    expect(r.score).toBe(94);
  });

  it("reports unknown when confidence is below the floor", () => {
    // Only webrtc-leak (weight 6) completes — far below the 40% floor.
    const r = scoreChecks(ALL.map((id) => ({ id, passed: id === "webrtc-leak" ? true : null })));
    expect(r.band).toBe("unknown");
    expect(r.label).toBe("Unverified");
    expect(r.confidenceLabel).toBe("Low");
  });

  it("lands in the caution band for a middling weighted result", () => {
    // Fail tls-version (10) + ip-reputation (8) + webrtc (6) = 24 of 100 lost,
    // no critical failures -> 76 -> caution.
    const r = scoreChecks(checks({ "tls-version": false, "ip-reputation": false, "webrtc-leak": false }));
    expect(r.score).toBe(76);
    expect(r.band).toBe("caution");
    expect(r.label).toBe("Use Caution");
  });

  it("handles an empty check list", () => {
    const r = scoreChecks([]);
    expect(r.band).toBe("unknown");
    expect(r.score).toBe(0);
    expect(r.confidence).toBe(0);
  });
});

describe("bandFromScore", () => {
  it("maps scores to bands at the 80/50 thresholds", () => {
    expect(bandFromScore(80)).toBe("safe");
    expect(bandFromScore(79)).toBe("caution");
    expect(bandFromScore(50)).toBe("caution");
    expect(bandFromScore(49)).toBe("danger");
  });
});

describe("metaFor", () => {
  it("falls back to a neutral weight for unknown check ids", () => {
    const m = metaFor("totally-new-check");
    expect(m.weight).toBe(10);
    expect(m.critical).toBe(false);
  });
});
