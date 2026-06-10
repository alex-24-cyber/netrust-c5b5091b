/**
 * NetTrust Trust-Score Engine
 *
 * Turns the raw pass/fail/inconclusive results of the live security checks
 * into a single, defensible trust score.
 *
 * Why this isn't a simple average:
 *  1. Severity weighting — a DNS-hijack or rogue-gateway detection is far more
 *     dangerous than an outdated TLS cipher or a WebRTC privacy quirk. Each
 *     check carries a weight proportional to the real-world risk it represents.
 *  2. Confidence — checks that couldn't complete (timeouts, blocked requests)
 *     are excluded from the denominator instead of being awarded arbitrary
 *     partial credit. We report how much of the network we were actually able
 *     to verify as a separate "confidence" figure, so the score is never
 *     silently inflated by checks we never ran.
 *  3. Critical-failure override — if any *critical* check confidently fails,
 *     the score is capped into the danger band. A product that says
 *     "82/100, looks good" while DNS is being hijacked is worse than useless.
 */

export type TrustBand = "safe" | "caution" | "danger" | "unknown";

export type CheckCategory =
  | "integrity"
  | "interception"
  | "encryption"
  | "reputation"
  | "privacy";

export interface CheckMeta {
  id: string;
  /** Severity weight. The seven weights sum to 100. */
  weight: number;
  /** A confident failure of a critical check forces the danger band. */
  critical: boolean;
  category: CheckCategory;
  /** Short label used in expert breakdowns. */
  shortName: string;
}

/**
 * Per-check severity model. Weights are tuned so that the four checks that
 * detect *active interception or tampering* dominate, while informational
 * checks (exit-point reputation, WebRTC privacy) contribute but never carry
 * the verdict on their own. The weights sum to exactly 100.
 */
export const CHECK_META: Record<string, CheckMeta> = {
  "dns-hijack": { id: "dns-hijack", weight: 24, critical: true, category: "integrity", shortName: "DNS integrity" },
  "rogue-dhcp": { id: "rogue-dhcp", weight: 20, critical: true, category: "interception", shortName: "Gateway" },
  "ssl-cert": { id: "ssl-cert", weight: 18, critical: true, category: "encryption", shortName: "HTTPS" },
  "content-inject": { id: "content-inject", weight: 14, critical: true, category: "integrity", shortName: "Injection" },
  "tls-version": { id: "tls-version", weight: 10, critical: false, category: "encryption", shortName: "TLS version" },
  "ip-reputation": { id: "ip-reputation", weight: 8, critical: false, category: "reputation", shortName: "Exit point" },
  "webrtc-leak": { id: "webrtc-leak", weight: 6, critical: false, category: "privacy", shortName: "IP leak" },
};

const DEFAULT_META: Omit<CheckMeta, "id"> = {
  weight: 10,
  critical: false,
  category: "integrity",
  shortName: "Check",
};

/** A confident critical failure caps the score here, no matter what else passed. */
export const CRITICAL_CAP = 35;
/** Below this fraction of verifiable weight, we decline to give a verdict. */
export const MIN_CONFIDENCE = 0.4;

export interface ScoreBreakdown {
  /** 0–100 trust score. */
  score: number;
  band: TrustBand;
  /** Human label: Trusted / Use Caution / High Risk / Unverified. */
  label: string;
  /** 0–1 — fraction of total check weight we were able to verify. */
  confidence: number;
  confidenceLabel: "High" | "Medium" | "Low";
  totalWeight: number;
  completedWeight: number;
  passedWeight: number;
  /** ids of critical checks that confidently failed. */
  criticalFailures: string[];
  /** ids of all checks that confidently failed. */
  failures: string[];
  /** ids of checks that could not be completed. */
  inconclusive: string[];
  /** true when the critical-failure override pulled the score down. */
  capped: boolean;
}

export function metaFor(id: string): CheckMeta {
  return CHECK_META[id] ?? { id, ...DEFAULT_META };
}

export function labelForBand(band: TrustBand): string {
  switch (band) {
    case "safe": return "Trusted";
    case "caution": return "Use Caution";
    case "danger": return "High Risk";
    default: return "Unverified";
  }
}

/**
 * Derive a band from a bare score. Used as a fallback for historical scans
 * that were stored before the engine recorded a band of their own.
 */
export function bandFromScore(score: number): TrustBand {
  if (score >= 80) return "safe";
  if (score >= 50) return "caution";
  return "danger";
}

/**
 * Resolve the display band for a scan result, preferring the band the engine
 * recorded and falling back to the bare score for scans stored before the
 * engine tracked bands.
 */
export function resolveBand(result: { band?: TrustBand; trustScore: number }): TrustBand {
  return result.band ?? bandFromScore(result.trustScore);
}

export interface ScorableCheck {
  id: string;
  passed: boolean | null;
}

/**
 * Score a set of completed checks. Order-independent; unknown check ids fall
 * back to a neutral default weight so the engine degrades gracefully.
 */
export function scoreChecks(checks: ScorableCheck[]): ScoreBreakdown {
  let totalWeight = 0;
  let completedWeight = 0;
  let passedWeight = 0;
  const criticalFailures: string[] = [];
  const failures: string[] = [];
  const inconclusive: string[] = [];

  for (const c of checks) {
    const meta = metaFor(c.id);
    totalWeight += meta.weight;

    if (c.passed === null) {
      inconclusive.push(c.id);
      continue;
    }
    completedWeight += meta.weight;
    if (c.passed) {
      passedWeight += meta.weight;
    } else {
      failures.push(c.id);
      if (meta.critical) criticalFailures.push(c.id);
    }
  }

  const rawScore = completedWeight > 0 ? Math.round((passedWeight / completedWeight) * 100) : 0;
  const capped = criticalFailures.length > 0 && rawScore > CRITICAL_CAP;
  const score = capped ? CRITICAL_CAP : rawScore;

  const confidence = totalWeight > 0 ? completedWeight / totalWeight : 0;
  const confidenceLabel: ScoreBreakdown["confidenceLabel"] =
    confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low";

  let band: TrustBand;
  if (completedWeight === 0 || confidence < MIN_CONFIDENCE) {
    band = "unknown";
  } else if (criticalFailures.length > 0) {
    band = "danger";
  } else {
    band = bandFromScore(score);
  }

  return {
    score,
    band,
    label: labelForBand(band),
    confidence,
    confidenceLabel,
    totalWeight,
    completedWeight,
    passedWeight,
    criticalFailures,
    failures,
    inconclusive,
    capped,
  };
}
