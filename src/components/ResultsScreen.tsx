import { useState } from "react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import { Shield, Copy, Network, Lock, Globe, Server, Check, X, ChevronDown, AlertTriangle, ShieldCheck, Info, Video, Code, Fingerprint, Timer } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ElementType> = {
  Copy, Network, Lock, Globe, Server, Video, Code, Fingerprint, Timer,
};

function getTrustColor(score: number) {
  if (score <= 40) return "danger";
  if (score <= 70) return "warning";
  return "safe";
}

const CHECK_DETAILS: Record<string, {
  detected: string;
  risk: string;
  actions: string[];
}> = {
  "evil-twin": {
    detected: "A second network broadcasting the same SSID was found with a different hardware identifier (BSSID). This is consistent with an evil twin attack where an attacker clones a legitimate network.",
    risk: "If you connect to the fake network, all your traffic — including passwords, messages, and banking details — can be intercepted in real time. The attacker can also serve fake login pages to steal credentials.",
    actions: ["Disconnect from this network immediately", "Forget this network in your device settings", "Switch to mobile data or a known trusted network"],
  },
  "arp-spoof": {
    detected: "The ARP table contains conflicting entries where multiple IP addresses resolve to the same MAC address. This pattern is consistent with ARP poisoning, a technique used in man-in-the-middle attacks.",
    risk: "An attacker may be intercepting all traffic between your device and the router. This allows them to read, modify, or inject data into your unencrypted connections without your knowledge.",
    actions: ["Disconnect and switch to mobile data", "Enable a VPN before reconnecting", "Avoid logging into any accounts on this network"],
  },
  "ssl-cert": {
    detected: "Multiple HTTPS connections to well-known websites failed or returned invalid certificates. This suggests something on the network is interfering with encrypted connections.",
    risk: "SSL stripping or interception means your encrypted traffic could be downgraded to plain HTTP. Passwords, credit card numbers, and personal data sent over these connections could be visible to attackers.",
    actions: ["Do not enter any passwords or sensitive data", "Switch to mobile data immediately", "Use a VPN to re-encrypt your traffic"],
  },
  "dns-hijack": {
    detected: "DNS queries sent to Google and Cloudflare returned different IP addresses for the same domain. This inconsistency suggests DNS responses are being manipulated on this network.",
    risk: "DNS hijacking can redirect you to fake versions of real websites. You might think you're on your bank's site, but you're actually on an attacker's server designed to capture your login credentials.",
    actions: ["Switch to a trusted DNS provider (1.1.1.1 or 8.8.8.8)", "Enable DNS-over-HTTPS in your browser settings", "Use a VPN to bypass local DNS manipulation"],
  },
  "rogue-dhcp": {
    detected: "The network connectivity check was intercepted or redirected, indicating a captive portal or rogue DHCP server is active. Your traffic may be routed through an unauthorised gateway.",
    risk: "A rogue DHCP server can assign your device a malicious gateway, routing all your internet traffic through an attacker's machine. This gives them complete visibility into your browsing activity.",
    actions: ["Disconnect from this network", "Verify the network with the venue staff", "Use mobile data for any sensitive browsing"],
  },
  "webrtc-leak": {
    detected: "Your browser exposed your local network IP address through WebRTC ICE candidate gathering. This is a well-known privacy leak that can reveal your position on the local network.",
    risk: "Attackers on this network can use your leaked local IP to map your device's position and target you directly with network-level attacks such as ARP spoofing or port scanning.",
    actions: ["Install a browser extension that blocks WebRTC leaks", "Disable WebRTC in your browser settings", "Use a VPN to mask your local network identity"],
  },
  "content-inject": {
    detected: "The HTTP content injection test found additional scripts, iframes, or suspicious patterns injected into an unencrypted HTTP page that should contain none of these elements.",
    risk: "This network is injecting additional code into your unencrypted web traffic. This could be advertisements, tracking scripts, or malicious payloads. Any website you visit over HTTP (not HTTPS) on this network may be tampered with.",
    actions: ["Only visit HTTPS websites on this network", "Use a VPN to encrypt all your traffic", "Avoid entering sensitive information on any HTTP pages"],
  },
  "ip-reputation": {
    detected: "Your traffic is exiting the internet through a datacenter, VPN, or proxy service rather than a recognised consumer ISP. This is unusual for standard network connections.",
    risk: "Your traffic is exiting the internet through a datacenter or proxy service rather than a normal ISP. This could mean the network operator is routing your traffic through a remote server — possibly to monitor or modify it. This isn't always malicious (some businesses use VPN concentrators), but on a public Wi-Fi network it's a red flag.",
    actions: ["Verify with the network operator why traffic is routed through a datacenter", "Use your own VPN to ensure traffic encryption", "Switch to mobile data for sensitive browsing"],
  },
  "latency-anomaly": {
    detected: "Latency measurements to major internet services showed abnormally high round-trip times, suggesting traffic is being routed through additional infrastructure.",
    risk: "Your traffic is taking unusually long to reach major internet services. This can indicate your data is being routed through additional hops — possibly a proxy, transparent gateway, or man-in-the-middle device. Normal Wi-Fi should reach Google or Cloudflare in under 200ms from most locations.",
    actions: ["Compare latency on mobile data to confirm the issue is network-specific", "Use a VPN to bypass potential traffic interception", "Avoid sensitive transactions on this network"],
  },
};

interface ResultsScreenProps {
  result: ScanResult;
  onScanAgain: () => void;
}

interface CheckModalProps {
  check: SecurityCheck;
  onClose: () => void;
}

const CheckModal = ({ check, onClose }: CheckModalProps) => {
  const Icon = iconMap[check.icon] || Shield;
  const isPassed = check.passed === true;
  const isTimedOut = check.passed === null;
  const details = CHECK_DETAILS[check.id];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[430px] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card border border-border border-b-0 p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {isPassed ? (
          /* Passed check - simple view */
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="p-4 rounded-2xl bg-trust-safe/10">
              <ShieldCheck size={40} className="text-trust-safe" />
            </div>
            <h2 className="text-lg font-semibold text-foreground text-center">{check.name}</h2>
            <div className="flex items-center gap-2">
              {check.checkType === "live" ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Simulated
                </span>
              )}
            </div>
            <p className="text-trust-safe text-sm font-medium text-center">All clear — no issues detected</p>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[300px]">
              {check.explanation}
            </p>
            <button
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-xl bg-trust-safe/10 text-trust-safe font-semibold text-sm transition-transform active:scale-[0.98] border border-trust-safe/20"
            >
              Got it
            </button>
          </div>
        ) : (
          /* Failed or timed-out check - detailed view */
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isTimedOut ? "bg-trust-warning/10" : "bg-trust-danger/10"}`}>
                {isTimedOut ? (
                  <AlertTriangle size={24} className="text-trust-warning" />
                ) : (
                  <AlertTriangle size={24} className="text-trust-danger" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{check.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-xs ${isTimedOut ? "text-trust-warning" : "text-trust-danger"}`}>
                    {check.status}
                  </p>
                  {check.checkType === "live" ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Simulated
                    </span>
                  )}
                </div>
              </div>
            </div>

            {details && (
              <>
                {/* What was detected */}
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Icon size={12} /> What was detected
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{details.detected}</p>
                </div>

                {/* Why it matters */}
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Shield size={12} /> Why it matters
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{details.risk}</p>
                </div>

                {/* What to do */}
                <div className={`glass-card p-4 border-l-4 ${isTimedOut ? "border-l-trust-warning" : "border-l-trust-danger"}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    What to do
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {details.actions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isTimedOut ? "bg-trust-warning" : "bg-trust-danger"}`} />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-transform active:scale-[0.98] border ${
                isTimedOut
                  ? "bg-trust-warning/10 text-trust-warning border-trust-warning/20"
                  : "bg-trust-danger/10 text-trust-danger border-trust-danger/20"
              }`}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ResultsScreen = ({ result, onScanAgain }: ResultsScreenProps) => {
  const [modalCheck, setModalCheck] = useState<SecurityCheck | null>(null);
  const color = getTrustColor(result.trustScore);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.trustScore / 100) * circumference;

  const strokeClass = color === "danger" ? "stroke-trust-danger" : color === "warning" ? "stroke-trust-warning" : "stroke-trust-safe";
  const textClass = color === "danger" ? "text-trust-danger" : color === "warning" ? "text-trust-warning" : "text-trust-safe";
  const glowClass = color === "danger" ? "trust-glow-danger" : color === "warning" ? "trust-glow-warning" : "trust-glow-safe";

  const isDemo = result.isDemo;
  const restrictedTooltip = "Browsers restrict access to SSID and BSSID for privacy. The security checks below are running live against your current network connection.";

  const networkInfo = isDemo
    ? [
        { label: "SSID", value: result.networkName, badge: "demo" },
        { label: "Type", value: result.networkType },
        { label: "BSSID", value: result.bssid, badge: "demo" },
        { label: "Channel", value: String(result.channel) },
        { label: "Signal", value: `${result.signalStrength} dBm` },
        { label: "Encryption", value: result.encryption },
        { label: "Gateway", value: result.gatewayIp, badge: "demo" },
      ]
    : [
        { label: "Connection Type", value: result.networkType },
        { label: "SSID", value: "Not available", restricted: true },
        { label: "BSSID", value: "Not available", restricted: true },
        ...(result.publicIp ? [{ label: "Public IP", value: result.publicIp }] : []),
        ...(result.webrtcLocalIp ? [{ label: "Local IP (via WebRTC)", value: result.webrtcLocalIp, badge: "live" as const }] : []),
        { label: "Encryption", value: result.encryption },
      ];

  return (
    <div className="animate-fade-in flex flex-col gap-5 pb-6">
      {/* Trust Score Gauge */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={`relative w-44 h-44 flex items-center justify-center rounded-full ${glowClass}`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              className={strokeClass}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className={`absolute text-5xl font-bold font-mono ${textClass}`}>
            {result.trustScore}
          </span>
        </div>
        <div className="text-center">
          <p className={`text-lg font-semibold ${textClass}`}>{result.trustLabel}</p>
          {isDemo ? (
            <p className="text-muted-foreground text-sm">"{result.networkName}"</p>
          ) : (
            <p className="text-muted-foreground text-sm">{result.networkType} Connection</p>
          )}
        </div>
      </div>

      {/* Network Info */}
      <TooltipProvider>
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Shield size={14} /> Network Info
            {isDemo && (
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-primary/30 text-primary/70 bg-primary/5">
                Demo
              </span>
            )}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {networkInfo.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  {(item as any).restricted && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-0.5 rounded-full hover:bg-muted transition-colors">
                          <Info size={10} className="text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs">
                        {restrictedTooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {(item as any).badge === "demo" && (
                    <span className="text-[8px] font-mono uppercase px-1 py-0 rounded bg-primary/10 text-primary/60 border border-primary/20">
                      fake
                    </span>
                  )}
                  {(item as any).badge === "live" && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase px-1 py-0 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                      <span className="w-1 h-1 rounded-full bg-trust-safe animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <p className={`text-sm font-mono truncate ${(item as any).restricted ? "text-muted-foreground italic" : "text-foreground"}`}>
                  {item.value}
                  {(item as any).restricted && (
                    <span className="text-[9px] not-italic block text-muted-foreground/60">browser restricted</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {/* Network Identity */}
      {!isDemo && result.ipReputation && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Fingerprint size={14} /> Network Identity
            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
              <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
              Live
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Public IP</p>
              <p className="text-sm font-mono text-foreground truncate">{result.ipReputation.ip}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ISP</p>
              <p className="text-sm font-mono text-foreground truncate">{result.ipReputation.org}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ASN</p>
              <p className="text-sm font-mono text-foreground truncate">{result.ipReputation.asn}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Exit Location</p>
              <p className="text-sm font-mono text-foreground truncate">{result.ipReputation.city}, {result.ipReputation.country}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">IP Type</p>
              <p className={`text-sm font-mono font-medium ${result.ipReputation.isSuspicious ? "text-trust-danger" : "text-trust-safe"}`}>
                {result.ipReputation.ipType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Checks */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Security Checks
        </h3>
        {result.checks.map((check) => {
          const Icon = iconMap[check.icon] || Shield;
          const isTimedOut = check.passed === null;

          return (
            <button
              key={check.id}
              onClick={() => setModalCheck(check)}
              className="glass-card p-3 text-left w-full transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${
                  isTimedOut
                    ? "bg-trust-warning/10"
                    : check.passed
                    ? "bg-trust-safe/10"
                    : "bg-trust-danger/10"
                }`}>
                  <Icon size={16} className={
                    isTimedOut
                      ? "text-trust-warning"
                      : check.passed
                      ? "text-trust-safe"
                      : "text-trust-danger"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    {check.checkType === "live" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${
                    isTimedOut
                      ? "text-trust-warning"
                      : check.passed
                      ? "text-trust-safe"
                      : "text-trust-danger"
                  }`}>
                    {check.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isTimedOut ? (
                    <AlertTriangle size={16} className="text-trust-warning" />
                  ) : check.passed ? (
                    <Check size={16} className="text-trust-safe" />
                  ) : (
                    <X size={16} className="text-trust-danger" />
                  )}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </div>
              </div>
            </button>
          );
        })}
      </div>


      {/* Immediate Action */}
      {(() => {
        const failedChecks = result.checks.filter((c) => c.passed === false);
        const timedOutChecks = result.checks.filter((c) => c.passed === null);
        const color = getTrustColor(result.trustScore);

        if (failedChecks.length > 0) {
          return (
            <div className="glass-card p-4 border-l-4 border-l-trust-danger">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-danger mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Immediate Action
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {failedChecks.length === 1
                  ? `A threat was detected. ${CHECK_DETAILS[failedChecks[0].id]?.actions[0] || "Disconnect from this network immediately."}`
                  : `${failedChecks.length} threats detected. Disconnect from this network and switch to mobile data immediately.`}
              </p>
            </div>
          );
        }

        if (timedOutChecks.length > 0) {
          return (
            <div className="glass-card p-4 border-l-4 border-l-trust-warning">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-warning mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Recommended Action
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {timedOutChecks.length === 1
                  ? `One check was inconclusive. Avoid sensitive activity until you can verify this network.`
                  : `${timedOutChecks.length} checks were inconclusive. Use a VPN or switch to mobile data as a precaution.`}
              </p>
            </div>
          );
        }

        return (
          <div className="glass-card p-4 border-l-4 border-l-trust-safe">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-safe mb-2 flex items-center gap-2">
              <ShieldCheck size={14} /> You're Good
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">
              No threats detected. You can browse safely, but always use HTTPS and consider a VPN on public networks.
            </p>
          </div>
        );
      })()}

      {/* Scan Again */}
      <button
        onClick={onScanAgain}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] glow-blue"
      >
        Scan Again
      </button>

      {/* Check Detail Modal */}
      {modalCheck && (
        <CheckModal check={modalCheck} onClose={() => setModalCheck(null)} />
      )}
    </div>
  );
};

export default ResultsScreen;
