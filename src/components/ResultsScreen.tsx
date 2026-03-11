import { useState } from "react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import { FingerprintComparison } from "@/lib/networkFingerprint";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Check, X,
  ChevronDown, ChevronUp, Lock, Globe, Server, Video, Code, Fingerprint,
  Wifi, RefreshCw, Smartphone, Eye, Shield, Terminal,
} from "lucide-react";
import ScanLog from "./ScanLog";

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
    advice: "This network looks clean. You can browse, shop, and log in normally.",
  },
  caution: {
    icon: ShieldAlert,
    title: "Be Careful",
    subtitle: "Some things don't look right",
    color: "trust-warning",
    advice: "Avoid banking or entering passwords on this network. A VPN would help protect you here.",
  },
  danger: {
    icon: ShieldX,
    title: "Not Safe",
    subtitle: "This network has serious problems",
    color: "trust-danger",
    advice: "Someone may be watching your traffic. Switch to mobile data right now.",
  },
};

/** Plain-English descriptions for each check — what non-tech users need to know */
const FRIENDLY_CHECKS: Record<string, {
  safe: string;
  threat: string;
  action: string;
  inconclusive: string;
  icon: React.ElementType;
}> = {
  "ssl-cert": {
    safe: "Your connections are encrypted and private",
    threat: "Your encrypted connections are being intercepted",
    action: "Don't enter any passwords on this network",
    inconclusive: "Couldn't verify if encryption is working",
    icon: Lock,
  },
  "dns-hijack": {
    safe: "Websites are loading from the right place",
    threat: "You might be sent to fake versions of real websites",
    action: "Don't trust any login pages — they could be fake",
    inconclusive: "Couldn't verify website addresses",
    icon: Globe,
  },
  "rogue-dhcp": {
    safe: "No one is hijacking your connection",
    threat: "Something is intercepting your connection",
    action: "Your traffic may be going through an attacker — disconnect",
    inconclusive: "Couldn't check for connection hijacking",
    icon: Server,
  },
  "webrtc-leak": {
    safe: "Your device identity is hidden",
    threat: "Your device's network address is exposed",
    action: "Attackers can see your device on this network — use a VPN",
    inconclusive: "Couldn't check if your device is exposed",
    icon: Video,
  },
  "content-inject": {
    safe: "Web pages are loading without tampering",
    threat: "Someone is inserting code into the pages you visit",
    action: "Only visit sites starting with https:// on this network",
    inconclusive: "Couldn't check for page tampering",
    icon: Code,
  },
  "ip-reputation": {
    safe: "Your internet connection exits through a normal provider",
    threat: "Your traffic is being routed through suspicious servers",
    action: "Your data may be monitored — use a VPN you trust",
    inconclusive: "Couldn't verify your connection's exit point",
    icon: Fingerprint,
  },
  "tls-version": {
    safe: "Your security protocols are up to date",
    threat: "Outdated security — your encryption could be cracked",
    action: "Update your browser to get stronger encryption",
    inconclusive: "Couldn't check your security protocol version",
    icon: ShieldCheck,
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
  const [showTechDetails, setShowTechDetails] = useState(false);

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
      {/* === VERDICT === */}
      <div className="flex flex-col items-center gap-3 pt-2">
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

      {/* === NETWORK FINGERPRINT ALERT === */}
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
            <h3 className="text-sm font-semibold text-foreground">
              {fingerprintResult.riskLevel === "high"
                ? "This network looks different than before"
                : "Some things changed on this network"}
            </h3>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed mb-2">{fingerprintResult.message}</p>
          <div className="flex flex-col gap-1">
            {fingerprintResult.changes.map((change, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <AlertTriangle size={10} className="text-trust-warning shrink-0" />
                {change}
              </div>
            ))}
          </div>
        </div>
      )}

      {fingerprintResult && !fingerprintResult.fingerprintChanged && fingerprintResult.isKnownNetwork && (
        <div className="glass-card p-3 border-l-4 border-l-trust-safe">
          <div className="flex items-center gap-2">
            <Fingerprint size={14} className="text-trust-safe" />
            <p className="text-xs text-trust-safe">{fingerprintResult.message}</p>
          </div>
        </div>
      )}

      {/* === WHAT TO DO === */}
      <div className={`glass-card p-4 border-l-4 ${
        level === "danger" ? "border-l-trust-danger" : level === "caution" ? "border-l-trust-warning" : "border-l-trust-safe"
      }`}>
        <h3 className={`text-sm font-bold text-${verdict.color} mb-2 flex items-center gap-2`}>
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

      {/* === PROBLEMS FOUND === */}
      {failedChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-trust-danger px-1 flex items-center gap-2">
            <AlertTriangle size={14} /> Problems Found ({failedChecks.length})
          </h3>
          {failedChecks.map((check) => {
            const friendly = FRIENDLY_CHECKS[check.id];
            const Icon = friendly?.icon || Shield;
            const isExpanded = expandedCheck === check.id;
            return (
              <button
                key={check.id}
                onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                className="glass-card p-3.5 text-left w-full border-l-4 border-l-trust-danger transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-trust-danger/10 border border-trust-danger/20">
                    <Icon size={18} className="text-trust-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{friendly?.threat || check.name}</p>
                    <p className="text-xs text-trust-danger/80 mt-0.5">{friendly?.action || check.status}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <X size={14} className="text-trust-danger" />
                    {isExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{check.explanation}</p>
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
          })}
        </div>
      )}

      {/* === COULDN'T CHECK === */}
      {warningChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-trust-warning px-1 flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn't Verify ({warningChecks.length})
          </h3>
          {warningChecks.map((check) => {
            const friendly = FRIENDLY_CHECKS[check.id];
            const Icon = friendly?.icon || Shield;
            const isExpanded = expandedCheck === check.id;
            return (
              <button
                key={check.id}
                onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                className="glass-card p-3 text-left w-full border-l-4 border-l-trust-warning transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-trust-warning/10 border border-trust-warning/20">
                    <Icon size={16} className="text-trust-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{friendly?.inconclusive || check.name}</p>
                    <p className="text-xs text-trust-warning/80 mt-0.5">{check.status}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <AlertTriangle size={12} className="text-trust-warning" />
                    {isExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </div>
                {isExpanded && check.evidence && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="bg-[#0a0a0f]/80 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed space-y-0.5">
                      {Object.entries(check.evidence).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-primary/50 shrink-0">{key}:</span>
                          <span className="text-foreground/70 break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* === PASSED CHECKS === */}
      <div>
        <button
          onClick={() => setShowPassed(!showPassed)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
        >
          {showPassed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <Check size={12} className="text-trust-safe" />
          {passedChecks.length} checks passed
        </button>
        {showPassed && (
          <div className="flex flex-col gap-1.5 mt-2">
            {passedChecks.map((check) => {
              const friendly = FRIENDLY_CHECKS[check.id];
              const Icon = friendly?.icon || Shield;
              const isExpanded = expandedCheck === check.id;
              return (
                <button
                  key={check.id}
                  onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                  className="glass-card p-2.5 text-left w-full transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <Check size={14} className="text-trust-safe shrink-0" />
                    <p className="text-xs text-foreground/80 flex-1">{friendly?.safe || check.name}</p>
                    <ChevronDown size={10} className={`text-muted-foreground/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                  {isExpanded && check.evidence && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="bg-[#0a0a0f]/80 rounded-lg p-2.5 font-mono text-[10px] leading-relaxed space-y-0.5">
                        {Object.entries(check.evidence).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-primary/50 shrink-0">{key}:</span>
                            <span className="text-foreground/70 break-all">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* === TECH DETAILS (for power users) === */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-secondary/30"
        >
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Technical Details
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${showTechDetails ? "rotate-180" : ""}`}
          />
        </button>

        {showTechDetails && (
          <div className="px-4 pb-4 space-y-3 animate-fade-in">
            {/* Network info */}
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              <div>
                <span className="text-muted-foreground/60">Network</span>
                <p className="font-mono text-foreground truncate">{result.wifiCurrentConnection?.ssid || result.networkName}</p>
              </div>
              <div>
                <span className="text-muted-foreground/60">Type</span>
                <p className="font-mono text-foreground">{result.networkType}</p>
              </div>
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
              {result.connectionInfo?.effectiveType && (
                <div>
                  <span className="text-muted-foreground/60">Speed Class</span>
                  <p className="font-mono text-foreground">{result.connectionInfo.effectiveType}</p>
                </div>
              )}
              {result.connectionInfo?.rtt != null && (
                <div>
                  <span className="text-muted-foreground/60">Latency</span>
                  <p className="font-mono text-foreground">{result.connectionInfo.rtt}ms</p>
                </div>
              )}
            </div>

            {/* Scan log */}
            {result.scanLog && result.scanLog.length > 0 && (
              <ScanLog entries={result.scanLog} />
            )}
          </div>
        )}
      </div>

      {/* === SCAN AGAIN === */}
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

export default ResultsScreen;
