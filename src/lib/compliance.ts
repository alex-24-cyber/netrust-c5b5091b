/**
 * Shared compliance mappings — single source of truth for NIST CSF 2.0,
 * OWASP Top 10 (2021), and CWE references across the app.
 */

export interface NistMapping {
  fn: "Identify" | "Protect" | "Detect";
  category: string;
  subcategory: string;
}

export interface ComplianceRef {
  nist: NistMapping;
  cwe: string;
  owasp?: string;
}

export const COMPLIANCE: Record<string, ComplianceRef> = {
  "ssl-cert": {
    nist: { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-02 — Data-in-transit confidentiality" },
    cwe: "CWE-295",
    owasp: "A02:2021",
  },
  "dns-hijack": {
    nist: { fn: "Detect", category: "DE.CM", subcategory: "DE.CM-01 — Network monitoring" },
    cwe: "CWE-350",
    owasp: "A05:2021",
  },
  "rogue-dhcp": {
    nist: { fn: "Detect", category: "DE.AE", subcategory: "DE.AE-02 — Anomalous activity detection" },
    cwe: "CWE-923",
    owasp: "A07:2021",
  },
  "webrtc-leak": {
    nist: { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-05 — Data leak prevention" },
    cwe: "CWE-200",
    owasp: "A01:2021",
  },
  "content-inject": {
    nist: { fn: "Detect", category: "DE.CM", subcategory: "DE.CM-04 — Malicious code detection" },
    cwe: "CWE-94",
    owasp: "A03:2021",
  },
  "ip-reputation": {
    nist: { fn: "Identify", category: "ID.RA", subcategory: "ID.RA-02 — Threat intelligence" },
    cwe: "CWE-346",
  },
  "tls-version": {
    nist: { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-02 — Data-in-transit confidentiality" },
    cwe: "CWE-326",
    owasp: "A02:2021",
  },
};

/** Format compliance ref as a pipe-delimited string for reports */
export function formatComplianceRef(id: string): string | null {
  const ref = COMPLIANCE[id];
  if (!ref) return null;
  const parts = [ref.nist.category, ref.cwe];
  if (ref.owasp) parts.push(`OWASP ${ref.owasp}`);
  return parts.join(" | ");
}

/** Format CWE + OWASP as a badge string */
export function formatCweBadge(id: string): string | null {
  const ref = COMPLIANCE[id];
  if (!ref) return null;
  return ref.owasp ? `${ref.cwe} · OWASP ${ref.owasp}` : ref.cwe;
}

export const CHECK_COUNT = Object.keys(COMPLIANCE).length; // 7
