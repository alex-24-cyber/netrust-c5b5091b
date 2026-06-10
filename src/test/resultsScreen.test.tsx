import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import ResultsScreen from "@/components/ResultsScreen";
import { buildScanResult } from "@/lib/mockData";
import type { RealCheckResult, ConnectionInfo } from "@/lib/networkChecks";

beforeAll(() => {
  // jsdom doesn't always provide rAF; the animated score counter needs it.
  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 0) as unknown as number) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame;
  }
});

afterEach(() => cleanup());

const CONN: ConnectionInfo = { type: "Wi-Fi", ssidNote: "x", apiSupported: true };
const ALL = ["ssl-cert", "dns-hijack", "rogue-dhcp", "webrtc-leak", "content-inject", "ip-reputation", "tls-version"];

function rc(id: string, passed: boolean | null): RealCheckResult {
  return { id, passed, status: passed ? "OK" : passed === false ? "Failed" : "Inconclusive", explanation: "detail" };
}

describe("ResultsScreen", () => {
  it("renders a Safe verdict in simple mode without expert-only panels", () => {
    const result = buildScanResult(ALL.map((id) => rc(id, true)), CONN, "1.2.3.4");
    render(<ResultsScreen result={result} onScanAgain={() => {}} mode="simple" />);
    expect(screen.getByText(/You're Safe/i)).toBeInTheDocument();
    expect(screen.queryByText(/How we scored this/i)).not.toBeInTheDocument();
  });

  it("shows the scoring methodology in expert mode", () => {
    const result = buildScanResult(ALL.map((id) => rc(id, true)), CONN, "1.2.3.4");
    render(<ResultsScreen result={result} onScanAgain={() => {}} mode="expert" />);
    expect(screen.getByText(/How we scored this/i)).toBeInTheDocument();
  });

  it("renders the Not Safe verdict when a critical check fails", () => {
    const result = buildScanResult(ALL.map((id) => rc(id, id !== "dns-hijack")), CONN, "1.2.3.4");
    render(<ResultsScreen result={result} onScanAgain={() => {}} mode="simple" />);
    expect(screen.getByText(/Not Safe/i)).toBeInTheDocument();
    expect(screen.getByText(/You could be redirected to fake websites/i)).toBeInTheDocument();
  });

  it("renders the Unverified state when nothing could be checked", () => {
    const result = buildScanResult(ALL.map((id) => rc(id, null)), CONN, "1.2.3.4");
    render(<ResultsScreen result={result} onScanAgain={() => {}} mode="simple" />);
    expect(screen.getByText(/Too many checks couldn't complete/i)).toBeInTheDocument();
  });
});
