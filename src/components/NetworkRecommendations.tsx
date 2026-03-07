import { Shield, AlertTriangle, Lightbulb, Wifi, WifiOff, Lock, Globe, Server, Network, Copy } from "lucide-react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import { useState } from "react";

interface Props {
  result: ScanResult;
  color: "danger" | "warning" | "safe";
  textClass: string;
}

const FAILED_CHECK_TIPS: Record<string, { title: string; tips: string[] }> = {
  "evil-twin": {
    title: "Evil Twin Detected",
    tips: [
      "Disconnect and forget this network from your device",
      "Verify the correct network name with venue staff",
      "Use mobile data until you can confirm the legitimate network",
    ],
  },
  "arp-spoof": {
    title: "ARP Spoofing Suspected",
    tips: [
      "Enable a VPN immediately to encrypt your traffic",
      "Avoid logging into accounts on this network",
      "Switch to mobile data for sensitive tasks",
    ],
  },
  "ssl-cert": {
    title: "SSL Issues Found",
    tips: [
      "Do not enter passwords or payment details",
      "Check that websites show the padlock icon before interacting",
      "Use a VPN to restore encrypted communication",
    ],
  },
  "dns-hijack": {
    title: "DNS Manipulation Detected",
    tips: [
      "Switch your DNS to 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google)",
      "Enable DNS-over-HTTPS in your browser settings",
      "Use a VPN to bypass local DNS entirely",
    ],
  },
  "rogue-dhcp": {
    title: "Rogue Gateway Detected",
    tips: [
      "Verify the network with venue staff before continuing",
      "Your traffic may be routed through an unauthorized device",
      "Disconnect and use mobile data as a safer alternative",
    ],
  },
};

const GENERAL_TIPS: Record<"danger" | "warning" | "safe", { heading: string; tips: string[] }> = {
  danger: {
    heading: "High Risk — Immediate Action Needed",
    tips: [
      "Disconnect from this network immediately",
      "Do not access banking, email, or any accounts",
      "Switch to mobile data or use a trusted VPN",
    ],
  },
  warning: {
    heading: "Proceed With Caution",
    tips: [
      "Avoid sensitive logins without a VPN",
      "Some checks raised concerns — review details above",
      "Consider switching to mobile data for sensitive tasks",
    ],
  },
  safe: {
    heading: "Network Looks Good",
    tips: [
      "No significant threats detected",
      "Standard security practices still recommended",
      "Safe for general browsing — use a VPN for extra protection",
    ],
  },
};

const PROACTIVE_TIPS = [
  "Always use a VPN on public Wi-Fi networks",
  "Keep your device's operating system and browser up to date",
  "Turn off auto-connect for Wi-Fi to avoid joining rogue networks",
  "Use two-factor authentication on all important accounts",
  "Prefer mobile data over public Wi-Fi for banking and sensitive tasks",
  "Disable file sharing and AirDrop when on public networks",
];

const NetworkRecommendations = ({ result, color, textClass }: Props) => {
  const [showProactive, setShowProactive] = useState(false);

  const failedChecks = result.checks.filter((c) => c.passed === false);
  const timedOutChecks = result.checks.filter((c) => c.passed === null);
  const general = GENERAL_TIPS[color];

  // Pick 3 proactive tips (deterministic based on score)
  const proactivePicks = PROACTIVE_TIPS.filter((_, i) => (result.trustScore + i) % 2 === 0).slice(0, 3);

  const borderColor = color === "danger" ? "border-l-trust-danger" : color === "warning" ? "border-l-trust-warning" : "border-l-trust-safe";
  const dotColor = color === "danger" ? "bg-trust-danger" : color === "warning" ? "bg-trust-warning" : "bg-trust-safe";
  const HeaderIcon = color === "danger" ? AlertTriangle : color === "warning" ? AlertTriangle : Shield;
  const headerIconColor = color === "danger" ? "text-trust-danger" : color === "warning" ? "text-trust-warning" : "text-trust-safe";

  return (
    <div className="flex flex-col gap-3">
      {/* Overall recommendation */}
      <div className={`glass-card p-4 border-l-4 ${borderColor}`}>
        <div className="flex items-center gap-2 mb-3">
          <HeaderIcon size={18} className={headerIconColor} />
          <h3 className={`text-sm font-semibold ${textClass}`}>{general.heading}</h3>
        </div>
        <ul className="flex flex-col gap-2">
          {general.tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Per-check specific tips for failed checks */}
      {failedChecks.map((check) => {
        const tips = FAILED_CHECK_TIPS[check.id];
        if (!tips) return null;
        return (
          <div key={check.id} className="glass-card p-4 border-l-4 border-l-trust-danger">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-trust-danger" />
              <h4 className="text-xs font-semibold text-trust-danger uppercase tracking-wider">{tips.title}</h4>
            </div>
            <ul className="flex flex-col gap-2">
              {tips.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-trust-danger" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {/* Timed out check warnings */}
      {timedOutChecks.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-l-trust-warning">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-trust-warning" />
            <h4 className="text-xs font-semibold text-trust-warning uppercase tracking-wider">Inconclusive Checks</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            {timedOutChecks.length} check{timedOutChecks.length > 1 ? "s" : ""} timed out and couldn't be verified. This may indicate network restrictions or instability.
          </p>
          <ul className="flex flex-col gap-1.5">
            {timedOutChecks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-trust-warning" />
                {c.name}: {c.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proactive security tips (collapsible) */}
      <button
        onClick={() => setShowProactive((p) => !p)}
        className="glass-card p-4 text-left transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
            General Security Tips
          </h4>
          <span className={`text-muted-foreground text-xs transition-transform ${showProactive ? "rotate-180" : ""}`}>▾</span>
        </div>
        {showProactive && (
          <ul className="flex flex-col gap-2 mt-3">
            {proactivePicks.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-primary" />
                {tip}
              </li>
            ))}
          </ul>
        )}
      </button>
    </div>
  );
};

export default NetworkRecommendations;
