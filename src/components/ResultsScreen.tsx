import { useState } from "react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import { FingerprintComparison } from "@/lib/networkFingerprint";
import ScanLog from "@/components/ScanLog";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Check, X,
  ChevronDown, ChevronUp, Lock, Globe, Server, Video, Code, Fingerprint,
  Wifi, RefreshCw, Smartphone, Eye, Info, Terminal,
} from "lucide-react";

/* ── plain-english check descriptions ── */
const HUMAN_LABELS: Record<string, {
  safeLine: string;
  threatLine: string;
  action: string;
  icon: React.ElementType;
  techLabel: string;
}> = {
  "ssl-cert": {
    safeLine: "Your encrypted connections are secure",
    threatLine: "Someone may be reading your encrypted traffic",
    action: "Don't enter passwords on this network",
    icon: Lock,
    techLabel: "SSL/TLS Certificate Validation",
  },
  "dns-hijack": {
    safeLine: "Websites are loading from the right servers",
    threatLine: "You could be redirected to fake websites",
    action: "Enable DNS-over-HTTPS in your browser settings",
    icon: Globe,
    techLabel: "DNS Integrity Check",
  },
  "rogue-dhcp": {
    safeLine: "Your network gateway looks legitimate",
    threatLine: "A rogue device may be intercepting your traffic",
    action: "Disconnect from this network immediately",
    icon: Server,
    techLabel: "Rogue Gateway / Captive Portal Detection",
  },
  "webrtc-leak": {
    safeLine: "Your device address is hidden",
    threatLine: "Your local device address is exposed",
    action: "Use a VPN or disable WebRTC in your browser",
    icon: Video,
    techLabel: "WebRTC IP Leak Detection",
  },
  "content-inject": {
    safeLine: "No code is being injected into web pages",
    threatLine: "Someone is injecting code into web pages you visit",
    action: "Only visit HTTPS websites on this network",
    icon: Code,
    techLabel: "HTTP Content Injection Detection",
  },
  "ip-reputation": {
    safeLine: "Your traffic exits through a trusted provider",
    threatLine: "Your traffic routes through suspicious infrastructure",
    action: "Use your own VPN to encrypt your traffic",
    icon: Fingerprint,
    techLabel: "Public IP Reputation Analysis",
  },
  "tls-version": {
    safeLine: "Your connection uses modern encryption",
    threatLine: "Your connection uses outdated encryption",
    action: "Update your browser to the latest version",
    icon: ShieldAlert,
    techLabel: "TLS Protocol Version Analysis",
  },
};

function getThreatLevel(score: number): "safe" | "caution" | "danger" {
  if (score <= 40) return "danger";
  if (score <= 70) return "caution";
  return "safe";
}

const VERDICTS = {
  safe: {
    icon: ShieldCheck,
    title: "You're Safe",
    subtitle: "No threats found on this network",
    color: "trust-safe",
    advice: "You can browse normally. For extra privacy on public WiFi, consider using a VPN.",
  },
  caution: {
    icon: ShieldAlert,
    title: "Be Careful",
    subtitle: "Some issues found — stay alert",
    color: "trust-warning",
    advice: "Avoid logging into bank accounts or entering sensitive info. Use a VPN if you have one, or switch to mobile data for important tasks.",
  },
  danger: {
    icon: ShieldX,
    title: "Not Safe — Disconnect",
    subtitle: "Active threats detected on this network",
    color: "trust-danger",
    advice: "This network may be spying on your traffic. Switch to mobile data right now. Do not enter any passwords or personal information.",
  },
};

interface ResultsScreenProps {
  result: ScanResult;
  onScanAgain: () => void;
  fingerprintResult?: FingerprintComparison | null;
}

const ResultsScreen = ({ result, onScanAgain, fingerprintResult }: ResultsScreenProps) => {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [showPassed, setShowPassed] = useState(false);
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);

  const level = getThreatLevel(result.trustScore);
  const verdict = VERDICTS[level];
  const VerdictIcon = verdict.icon;

  const failedChecks = result.checks.filter(c => c.passed === false);
  const warningChecks = result.checks.filter(c => c.passed === null);
  const passedChecks = result.checks.filter(c => c.passed === true);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.trustScore / 100) * circumference;

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      {/* ── VERDICT SHIELD ── */}
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className={`relative w-48 h-48 flex items-center justify-center rounded-full ${
          level === "danger" ? "trust-glow-danger" : level === "caution" ? "trust-glow-warning" : "trust-glow-safe"
        }`}>
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" opacity="0.3" />
            <circle
              cx="90" cy="90" r={radius}
              fill="none"
              stroke={`hsl(var(--${verdict.color}))`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <VerdictIcon size={36} className={`text-${verdict.color} animate-score-count`} />
            <span className={`text-4xl font-bold font-mono text-${verdict.color} mt-1`}>
              {result.trustScore}
            </span>
          </div>
        </div>

        <div className="text-center">
          <h2 className={`text-xl font-bold text-${verdict.color}`}>{verdict.title}</h2>
          <p className="text-muted-foreground text-sm mt-1">{verdict.subtitle}</p>
        </div>
      </div>

      {/* ── FINGERPRINT CHANGE ALERT ── */}
      {fingerprintResult && fingerprintResult.fingerprintChanged && (
        <div className={`glass-card p-4 border-l-4 ${
          fingerprintResult.riskLevel === "high" ? "border-l-trust-danger" :
          fingerprintResult.riskLevel === "medium" ? "border-l-trust-warning" :
          "border-l-primary"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint size={16} className={
              fingerprintResult.riskLevel === "high" ? "text-trust-danger" :
              fingerprintResult.riskLevel === "medium" ? "text-trust-warning" :
              "text-primary"
            } />
            <h3 className="text-sm font-semibold text-foreground">This network looks different</h3>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed mb-2">{fingerprintResult.message}</p>
          <button
            onClick={() => setExpandedCheck(expandedCheck === "_fp" ? null : "_fp")}
            className="text-[11px] text-primary/70 flex items-center gap-1"
          >
            <Info size={10} />
            {expandedCheck === "_fp" ? "Hide details" : "What changed?"}
          </button>
          {expandedCheck === "_fp" && (
            <div className="mt-2 flex flex-col gap-1">
              {fingerprintResult.changes.map((change, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                  <AlertTriangle size={10} className="text-trust-warning shrink-0" />
                  {change}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {fingerprintResult && !fingerprintResult.fingerprintChanged && fingerprintResult.isKnownNetwork && (
        <div className="glass-card p-3 border-l-4 border-l-trust-safe">
          <div className="flex items-center gap-2">
            <Fingerprint size={14} className="text-trust-safe" />
            <p className="text-xs text-trust-safe">This network matches your previous visit — no changes detected</p>
          </div>
        </div>
      )}

      {/* ── WHAT TO DO ── */}
      <div className={`glass-card p-4 border-l-4 ${
        level === "danger" ? "border-l-trust-danger" : level === "caution" ? "border-l-trust-warning" : "border-l-trust-safe"
      }`}>
        <h3 className={`text-sm font-semibold text-${verdict.color} mb-2 flex items-center gap-2`}>
          {level === "danger" ? <ShieldX size={16} /> : level === "caution" ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
          What should I do?
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">{verdict.advice}</p>

        {level === "danger" && (
          <div className="flex gap-2 mt-3">
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-trust-danger/10 border border-trust-danger/20 text-trust-danger text-xs font-semibold">
              <Smartphone size={14} />
              Switch to Mobile Data
            </div>
          </div>
        )}

        {level === "caution" && (
          <div className="flex gap-2 mt-3">
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-trust-warning/10 border border-trust-warning/20 text-trust-warning text-xs font-semibold">
              <Eye size={14} />
              Use a VPN
            </div>
          </div>
        )}
      </div>

      {/* ── PROBLEMS FOUND ── */}
      {failedChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-trust-danger px-1 flex items-center gap-2">
            <AlertTriangle size={14} /> Problems Found ({failedChecks.length})
          </h3>
          {failedChecks.map((check) => (
            <CheckCard
              key={check.id}
              check={check}
              variant="danger"
              expanded={expandedCheck === check.id}
              onToggle={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
            />
          ))}
        </div>
      )}

      {/* ── WARNINGS ── */}
      {warningChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-trust-warning px-1 flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't Verify ({warningChecks.length})
          </h3>
          {warningChecks.map((check) => (
            <CheckCard
              key={check.id}
              check={check}
              variant="warning"
              expanded={expandedCheck === check.id}
              onToggle={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
            />
          ))}
        </div>
      )}

      {/* ── PASSED ── */}
      <div>
        <button
          onClick={() => setShowPassed(!showPassed)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
        >
          {showPassed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <Check size={14} className="text-trust-safe" />
          {passedChecks.length} checks passed — all good
        </button>
        {showPassed && (
          <div className="flex flex-col gap-1.5 mt-2">
            {passedChecks.map((check) => {
              const meta = HUMAN_LABELS[check.id];
              return (
                <div key={check.id} className="glass-card p-3 flex items-center gap-3 opacity-80">
                  <Check size={14} className="text-trust-safe shrink-0" />
                  <p className="text-xs text-foreground/80">{meta?.safeLine || check.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── NETWORK INFO (collapsible) ── */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowNetworkDetails(!showNetworkDetails)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {result.wifiCurrentConnection?.ssid || result.networkName}
            </span>
            <span className="text-xs text-muted-foreground">· {result.networkType}</span>
          </div>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${showNetworkDetails ? "rotate-180" : ""}`} />
        </button>

        {showNetworkDetails && (
          <div className="px-4 pb-4 pt-0">
            {!result.wifiCurrentConnection?.ssid && (
              <div className="flex items-start gap-2 mb-3 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <Info size={12} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  WiFi name (SSID) isn't visible to web apps for your privacy. Check your device's WiFi settings to see which network you're on.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              {result.publicIp && (
                <div>
                  <span className="text-muted-foreground/60">Public IP</span>
                  <p className="font-mono text-foreground">{result.publicIp}</p>
                </div>
              )}
              {result.ipReputation && (
                <>
                  <div>
                    <span className="text-muted-foreground/60">ISP</span>
                    <p className="font-mono text-foreground truncate">{result.ipReputation.org}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">Location</span>
                    <p className="font-mono text-foreground truncate">{result.ipReputation.city}, {result.ipReputation.country}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground/60">IP Type</span>
                    <p className={`font-mono font-medium ${result.ipReputation.isSuspicious ? "text-trust-danger" : "text-trust-safe"}`}>
                      {result.ipReputation.ipType}
                    </p>
                  </div>
                </>
              )}
              {result.webrtcLocalIp && (
                <div>
                  <span className="text-muted-foreground/60">Local IP (WebRTC)</span>
                  <p className="font-mono text-foreground">{result.webrtcLocalIp}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SCAN LOG (tech users) ── */}
      {result.scanLog && result.scanLog.length > 0 && (
        <ScanLog entries={result.scanLog} />
      )}

      {/* ── SCAN AGAIN ── */}
      <button
        onClick={onScanAgain}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] glow-blue hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)] flex items-center justify-center gap-2"
      >
        <RefreshCw size={16} />
        Scan Again
      </button>
    </div>
  );
};

/* ── Individual check card with expandable tech details ── */
function CheckCard({ check, variant, expanded, onToggle }: {
  check: SecurityCheck;
  variant: "danger" | "warning";
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = HUMAN_LABELS[check.id];
  const Icon = meta?.icon || Info;
  const isDanger = variant === "danger";
  const colorClass = isDanger ? "trust-danger" : "trust-warning";

  return (
    <button
      onClick={onToggle}
      className={`glass-card p-3 text-left w-full border-l-4 border-l-${colorClass} transition-all active:scale-[0.99]`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${colorClass}/10 border border-${colorClass}/20`}>
          <Icon size={18} className={`text-${colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isDanger ? (meta?.threatLine || check.name) : check.name}
          </p>
          <p className={`text-[11px] text-${colorClass}/80 mt-0.5`}>
            {isDanger ? (meta?.action || check.status) : check.status}
          </p>
        </div>
        {isDanger ? (
          <X size={16} className="text-trust-danger shrink-0" />
        ) : (
          <AlertTriangle size={14} className="text-trust-warning shrink-0" />
        )}
      </div>

      {/* Expandable tech details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          {/* Tech label */}
          {meta && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Terminal size={10} />
              <span className="font-mono">{meta.techLabel}</span>
            </div>
          )}
          {/* Raw evidence data */}
          {check.evidence && (
            <div className="bg-[#0a0a0f]/80 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed space-y-0.5">
              {Object.entries(check.evidence).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-primary/50 shrink-0">{key}:</span>
                  <span className="text-foreground/70 break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export default ResultsScreen;
