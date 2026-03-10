import { describe, it, expect } from "vitest";
import {
  COMPLIANCE,
  formatComplianceRef,
  formatCweBadge,
  CHECK_COUNT,
} from "@/lib/compliance";

describe("COMPLIANCE mappings", () => {
  const CHECK_IDS = [
    "ssl-cert",
    "dns-hijack",
    "rogue-dhcp",
    "webrtc-leak",
    "content-inject",
    "ip-reputation",
    "tls-version",
  ];

  it("contains all 7 expected check IDs", () => {
    expect(CHECK_COUNT).toBe(7);
    for (const id of CHECK_IDS) {
      expect(COMPLIANCE[id]).toBeDefined();
    }
  });

  it("every entry has valid NIST CSF 2.0 mapping", () => {
    const validFunctions = ["Identify", "Protect", "Detect"];
    for (const [id, ref] of Object.entries(COMPLIANCE)) {
      expect(validFunctions).toContain(ref.nist.fn);
      expect(ref.nist.category).toMatch(/^(ID|PR|DE)\./);
      expect(ref.nist.subcategory).toBeTruthy();
    }
  });

  it("every entry has a CWE reference", () => {
    for (const [id, ref] of Object.entries(COMPLIANCE)) {
      expect(ref.cwe).toMatch(/^CWE-\d+$/);
    }
  });

  it("covers all three NIST CSF functions", () => {
    const fns = new Set(Object.values(COMPLIANCE).map((r) => r.nist.fn));
    expect(fns).toContain("Identify");
    expect(fns).toContain("Protect");
    expect(fns).toContain("Detect");
  });
});

describe("formatComplianceRef", () => {
  it("returns pipe-delimited string for known ID", () => {
    const result = formatComplianceRef("ssl-cert");
    expect(result).toContain("PR.DS");
    expect(result).toContain("CWE-295");
    expect(result).toContain("OWASP A02:2021");
  });

  it("omits OWASP when not present", () => {
    const result = formatComplianceRef("ip-reputation");
    expect(result).not.toContain("OWASP");
    expect(result).toContain("CWE-346");
  });

  it("returns null for unknown ID", () => {
    expect(formatComplianceRef("nonexistent")).toBeNull();
  });
});

describe("formatCweBadge", () => {
  it("returns CWE + OWASP for check with OWASP ref", () => {
    const badge = formatCweBadge("dns-hijack");
    expect(badge).toBe("CWE-350 · OWASP A05:2021");
  });

  it("returns CWE only for check without OWASP ref", () => {
    const badge = formatCweBadge("ip-reputation");
    expect(badge).toBe("CWE-346");
  });

  it("returns null for unknown ID", () => {
    expect(formatCweBadge("nonexistent")).toBeNull();
  });
});
