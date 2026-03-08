import { useState } from "react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import ScanLog from "@/components/ScanLog";
import { Shield, Network, Lock, Globe, Server, Check, X, ChevronDown, AlertTriangle, ShieldCheck, Info, Video, Code, Fingerprint, Timer, Wifi, Signal, Cable, HelpCircle, Gauge, Layers, Zap, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ElementType> = {
  Network, Lock, Globe, Server, Video, Code, Fingerprint, Timer, ShieldCheck, Gauge, Layers,
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
    risk: "Your traffic is exiting the internet through a datacenter or proxy service rather than a normal ISP. This could mean the network operator is routing your traffic through a remote server — possibly to monitor or modify it.",
    actions: ["Verify with the network operator why traffic is routed through a datacenter", "Use your own VPN to ensure traffic encryption", "Switch to mobile data for sensitive browsing"],
  },
  "latency-anomaly": {
    detected: "Latency measurements to major internet services showed abnormally high round-trip times, suggesting traffic is being routed through additional infrastructure.",
    risk: "Your traffic is taking unusually long to reach major internet services. This can indicate your data is being routed through additional hops — possibly a proxy, transparent gateway, or man-in-the-middle device.",
    actions: ["Compare latency on mobile data to confirm the issue is network-specific", "Use a VPN to bypass potential traffic interception", "Avoid sensitive transactions on this network"],
  },
  "tls-version": {
    detected: "Your connection is negotiating an outdated TLS version or has a weak security configuration, leaving encrypted communications potentially vulnerable.",
    risk: "Older TLS versions (1.0, 1.1) have known vulnerabilities that attackers can exploit to decrypt your traffic. A network forcing TLS downgrades may be attempting to intercept encrypted data.",
    actions: ["Ensure your browser is up to date", "Avoid entering sensitive data on this network", "Use a VPN to add an extra encryption layer"],
  },
  "bandwidth-throttle": {
    detected: "Download speed tests to major CDNs showed unusually low throughput, suggesting the network may be intentionally limiting bandwidth.",
    risk: "Severe bandwidth throttling can indicate traffic inspection — the network may be decrypting, analyzing, and re-encrypting your data, which adds significant overhead. It could also force you onto specific, potentially compromised services.",
    actions: ["Switch to mobile data for time-sensitive tasks", "Use a VPN to prevent traffic inspection", "Verify with the network operator if throttling is intentional"],
  },
  "http2-support": {
    detected: "Your connections are only negotiating HTTP/1.1 instead of modern HTTP/2 or HTTP/3 protocols, suggesting a transparent proxy may be intercepting your traffic.",
    risk: "A transparent proxy that forces protocol downgrades can inspect and modify your traffic. This is a sign that someone on the network infrastructure is actively intercepting connections.",
    actions: ["Use HTTPS-only mode in your browser", "Enable a VPN to bypass the transparent proxy", "Avoid this network for sensitive browsing"],
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

const EvidenceBlock = ({ evidence }: { evidence?: Record<string, string> }) => {
  if (!evidence || Object.keys(evidence).length === 0) return null;
  return (
    <div className="w-full mt-1">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Code size={10} /> Technical Details
      </h3>
      <div className="bg-[#0a0a0f]/80 border border-primary/10 rounded-lg p-3 font-mono text-[11px] leading-relaxed space-y-1">
        {Object.entries(evidence).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-primary/50 shrink-0">{key}:</span>
            <span className="text-foreground break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CheckModal = ({ check, onClose }: CheckModalProps) => {
  const Icon = iconMap[check.icon] || Shield;
  const isPassed = check.passed === true;
  const isTimedOut = check.passed === null;
  const details = CHECK_DETAILS[check.id];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-[430px] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card border border-border border-b-0 p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {isPassed ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="p-4 rounded-2xl bg-trust-safe/10 border border-trust-safe/20">
              <ShieldCheck size={40} className="text-trust-safe" />
            </div>
            <h2 className="text-lg font-semibold text-foreground text-center">{check.name}</h2>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
              <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
              Live
            </span>
            <p className="text-trust-safe text-sm font-medium text-center">All clear — no issues detected</p>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[300px]">
              {check.explanation}
            </p>
            <EvidenceBlock evidence={check.evidence} />
            <button
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-xl bg-trust-safe/10 text-trust-safe font-semibold text-sm transition-transform active:scale-[0.98] border border-trust-safe/20"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isTimedOut ? "bg-trust-warning/10 border border-trust-warning/20" : "bg-trust-danger/10 border border-trust-danger/20"}`}>
                <AlertTriangle size={24} className={isTimedOut ? "text-trust-warning" : "text-trust-danger"} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{check.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-xs ${isTimedOut ? "text-trust-warning" : "text-trust-danger"}`}>
                    {check.status}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
                    Live
                  </span>
                </div>
              </div>
            </div>

            {details && (
              <>
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Icon size={12} /> What was detected
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{details.detected}</p>
                </div>
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Shield size={12} /> Why it matters
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{details.risk}</p>
                </div>
                <div className={`glass-card p-4 border-l-4 ${isTimedOut ? "border-l-trust-warning" : "border-l-trust-danger"}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">What to do</h3>
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

            <EvidenceBlock evidence={check.evidence} />

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

const ThreatBreakdown = ({ checks }: { checks: SecurityCheck[] }) => {
  const passed = checks.filter(c => c.passed === true).length;
  const failed = checks.filter(c => c.passed === false).length;
  const inconclusive = checks.filter(c => c.passed === null).length;
  const total = checks.length;

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Activity size={14} /> Threat Breakdown
      </h3>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-secondary mb-3">
        {passed > 0 && (
          <div
            className="bg-trust-safe rounded-full animate-threat-bar"
            style={{ width: `${(passed / total) * 100}%` }}
          />
        )}
        {inconclusive > 0 && (
          <div
            className="bg-trust-warning rounded-full animate-threat-bar"
            style={{ width: `${(inconclusive / total) * 100}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="bg-trust-danger rounded-full animate-threat-bar"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-trust-safe flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-trust-safe" />
          {passed} Passed
        </span>
        <span className="text-trust-warning flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-trust-warning" />
          {inconclusive} Warn
        </span>
        <span className="text-trust-danger flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-trust-danger" />
          {failed} Failed
        </span>
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

  const connInfo = result.connectionInfo;
  const isCellular = connInfo?.type === "Cellular";

  const connectionIcon = connInfo?.type === "Wi-Fi" ? Wifi
    : connInfo?.type === "Cellular" ? Signal
    : connInfo?.type === "Ethernet" ? Cable
    : HelpCircle;

  const networkInfo: { label: string; value: string; icon?: React.ElementType; badge?: string; subtitle?: string }[] = [
    {
      label: "Connection Type",
      value: connInfo?.apiSupported ? connInfo.type : "Unknown (API not supported by this browser)",
      icon: connectionIcon,
    },
    ...(connInfo?.effectiveType ? [{ label: "Effective Speed", value: connInfo.effectiveType.toUpperCase() }] : []),
    ...(connInfo?.downlink != null ? [{ label: "Est. Bandwidth", value: `${connInfo.downlink} Mbps` }] : []),
    ...(connInfo?.rtt != null ? [{ label: "Est. Latency", value: `${connInfo.rtt} ms` }] : []),
    {
      label: "SSID",
      value: "Current Network",
      subtitle: "Browser privacy policy hides the actual network name",
    },
    ...(result.publicIp ? [{ label: "Public IP", value: result.publicIp }] : []),
    ...(result.webrtcLocalIp ? [{ label: "Local IP (via WebRTC)", value: result.webrtcLocalIp, badge: "live" }] : []),
  ];

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      {/* Trust Score Gauge */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={`relative w-44 h-44 flex items-center justify-center rounded-full ${glowClass}`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" opacity="0.3" />
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              className={strokeClass}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-5xl font-bold font-mono ${textClass} animate-score-count`}>
              {result.trustScore}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">/ 100</span>
          </div>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${textClass}`}>{result.trustLabel}</p>
          <p className="text-muted-foreground text-xs font-mono mt-0.5">{result.networkType} Connection — {result.checks.length} checks completed</p>
        </div>
      </div>

      {/* Threat Breakdown */}
      <ThreatBreakdown checks={result.checks} />

      {/* Network Info */}
      <TooltipProvider>
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Wifi size={14} className="text-primary" /> Network Info
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {networkInfo.map((item) => (
              <div key={item.label}>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  {item.badge === "live" && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase px-1 py-0 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                      <span className="w-1 h-1 rounded-full bg-trust-safe animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {item.icon && <item.icon size={13} className="text-primary/60 shrink-0" />}
                  <p className="text-sm font-mono truncate text-foreground">{item.value}</p>
                </div>
                {item.subtitle && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">{item.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cellular note */}
        {isCellular && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-trust-safe/10 border border-trust-safe/20">
            <Signal size={14} className="text-trust-safe shrink-0" />
            <p className="text-xs text-trust-safe">You're on mobile data — most Wi-Fi attacks don't apply</p>
          </div>
        )}
      </TooltipProvider>

      {/* Network Identity */}
      {result.ipReputation && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Fingerprint size={14} className="text-primary" /> Network Identity
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1 flex items-center gap-2">
          <Zap size={12} className="text-primary" /> Security Checks ({result.checks.length})
        </h3>
        {result.checks.map((check) => {
          const Icon = iconMap[check.icon] || Shield;
          const isTimedOut = check.passed === null;

          return (
            <button
              key={check.id}
              onClick={() => setModalCheck(check)}
              className="glass-card p-3 text-left w-full transition-all duration-200 active:scale-[0.98] hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg border ${
                  isTimedOut ? "bg-trust-warning/10 border-trust-warning/20" : check.passed ? "bg-trust-safe/10 border-trust-safe/20" : "bg-trust-danger/10 border-trust-danger/20"
                }`}>
                  <Icon size={16} className={
                    isTimedOut ? "text-trust-warning" : check.passed ? "text-trust-safe" : "text-trust-danger"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-1 py-0 rounded-full bg-primary/10 text-primary/60 border border-primary/20">
                      Live
                    </span>
                  </div>
                  <p className={`text-[11px] leading-tight mt-0.5 ${
                    isTimedOut ? "text-trust-warning/80" : check.passed ? "text-trust-safe/80" : "text-trust-danger/80"
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
                  <ChevronDown size={14} className="text-muted-foreground/40" />
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

        if (failedChecks.length > 0) {
          return (
            <div className="glass-card p-4 border-l-4 border-l-trust-danger">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-danger mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Immediate Action Required
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
              <ShieldCheck size={14} /> Network Secure
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed">
              All {result.checks.length} security checks passed. No threats detected. You can browse safely, but always use HTTPS and consider a VPN on public networks.
            </p>
          </div>
        );
      })()}

      {/* Scan Log */}
      {result.scanLog && result.scanLog.length > 0 && (
        <ScanLog entries={result.scanLog} />
      )}

      {/* Scan Again */}
      <button
        onClick={onScanAgain}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] glow-blue hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
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
