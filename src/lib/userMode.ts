/**
 * User experience level.
 *
 *  - "simple"  : plain-English verdicts, no jargon. The default — it's what a
 *                traveller in an airport lounge needs.
 *  - "expert"  : adds the scoring methodology, per-check weights, raw evidence,
 *                and the live scan log. For people who want to see the receipts.
 *
 * The two modes render the *same* scan — only the depth of explanation changes,
 * so nobody is ever locked out of a result.
 */
export type UserMode = "simple" | "expert";

const KEY = "nettrust_mode";

export function loadUserMode(): UserMode {
  try {
    return localStorage.getItem(KEY) === "expert" ? "expert" : "simple";
  } catch {
    return "simple";
  }
}

export function saveUserMode(mode: UserMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable — fall back to in-memory default */
  }
}
