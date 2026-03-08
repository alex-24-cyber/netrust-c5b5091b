import { useState } from "react";
import { ScanResult, SecurityCheck } from "@/lib/mockData";
import { FingerprintComparison } from "@/lib/networkFingerprint";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Check, X,
  ChevronDown, ChevronUp, Lock, Globe, Server, Video, Code, Fingerprint,
  Timer, Gauge, Layers, Radar, Wifi, RefreshCw, Smartphone, Eye,
} from "lucide-react";

function getThreatLevel(score: number): "safe" | "caution" | "danger" {
  if (score <= 40) return "danger";
  if (score <= 70) return "caution";
  return "safe";
}

const VERDICTS = {
  safe: {
    icon: ShieldCheck,
    title: "Network Looks Safe",
    subtitle: "No active threats detected",
    color: "trust-safe",
    advice: "You can browse normally. Use HTTPS sites and consider a VPN for extra privacy on public WiFi.",
  },
  caution: {
    icon: ShieldAlert,
    title: "Use With Caution",
    subtitle: "Some concerns detected",
    color: "trust-warning",
    advice: "Avoid logging into banking or sensitive accounts. Use a VPN if possible. Switch to mobile data for important tasks.",
  },
  danger: {
    icon: ShieldX,
    title: "Disconnect Now",
    subtitle: "Active threats detected",
    color: "trust-danger",
    advice: "This network may be intercepting your traffic. Switch to mobile data immediately. Do not enter any passwords.",
  },
};

// NIST CSF 2.0 function mapping for each check
const NIST_MAP: Record<string, { fn: string; category: string; subcategory: string }> = {
  "ssl-cert":          { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-02 — Data-in-transit confidentiality" },
  "dns-hijack":        { fn: "Detect",  category: "DE.CM", subcategory: "DE.CM-01 — Network monitoring" },
  "rogue-dhcp":        { fn: "Detect",  category: "DE.AE", subcategory: "DE.AE-02 — Anomalous activity detection" },
  "webrtc-leak":       { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-05 — Data leak prevention" },
  "content-inject":    { fn: "Detect",  category: "DE.CM", subcategory: "DE.CM-04 — Malicious code detection" },
  "ip-reputation":     { fn: "Identify",category: "ID.RA", subcategory: "ID.RA-02 — Threat intelligence" },
  "latency-anomaly":   { fn: "Detect",  category: "DE.AE", subcategory: "DE.AE-03 — Event correlation" },
  "tls-version":       { fn: "Protect", category: "PR.DS", subcategory: "PR.DS-02 — Data-in-transit confidentiality" },
  "bandwidth-throttle":{ fn: "Detect",  category: "DE.AE", subcategory: "DE.AE-02 — Anomalous activity detection" },
  "http2-support":     { fn: "Detect",  category: "DE.CM", subcategory: "DE.CM-01 — Network monitoring" },
  "port-scan":         { fn: "Identify",category: "ID.RA", subcategory: "ID.RA-01 — Asset vulnerability identification" },
};

// CWE / OWASP references
const CWE_MAP: Record<string, string> = {
  "ssl-cert":       "CWE-295 · OWASP A02:2021",
  "dns-hijack":     "CWE-350 · OWASP A05:2021",
  "rogue-dhcp":     "CWE-923 · OWASP A07:2021",
  "webrtc-leak":    "CWE-200 · OWASP A01:2021",
  "content-inject": "CWE-94 · OWASP A03:2021",
  "ip-reputation":  "CWE-346",
  "latency-anomaly":"CWE-799",
  "tls-version":    "CWE-326 · OWASP A02:2021",
  "bandwidth-throttle": "CWE-400",
  "http2-support":  "CWE-757 · OWASP A02:2021",
  "port-scan":      "CWE-200 · OWASP A05:2021",
};

const THREAT_ADVICE: Record<string, {
  threat: string;
  action: string;
  icon: React.ElementType;
}> = {
  "ssl-cert": {
    threat: "SSL/TLS connections are being intercepted",
    action: "Don't enter passwords — your encrypted traffic may be visible",
    icon: Lock,
  },
  "dns-hijack": {
    threat: "DNS responses are being manipulated",
    action: "You could be redirected to fake websites — enable DNS-over-HTTPS",
    icon: Globe,
  },
  "rogue-dhcp": {
    threat: "Rogue gateway or captive portal detected",
    action: "Your traffic may route through an attacker's machine — disconnect",
    icon: Server,
  },
  "webrtc-leak": {
    threat: "Your local IP is exposed via WebRTC",
    action: "Attackers can target your device directly — disable WebRTC or use VPN",
    icon: Video,
  },
  "content-inject": {
    threat: "Code is being injected into web pages",
    action: "Only visit HTTPS sites — HTTP traffic is being tampered with",
    icon: Code,
  },
  "ip-reputation": {
    threat: "Traffic exits through suspicious infrastructure",
    action: "Your data may be monitored — use your own VPN to encrypt traffic",
    icon: Fingerprint,
  },
  "latency-anomaly": {
    threat: "Abnormal latency suggests traffic interception",
    action: "Data is being routed through extra hops — avoid sensitive tasks",
    icon: Timer,
  },
  "tls-version": {
    threat: "Outdated TLS version detected",
    action: "Encrypted connections may be vulnerable — update your browser",
    icon: ShieldAlert,
  },
  "bandwidth-throttle": {
    threat: "Bandwidth is being heavily throttled",
    action: "Traffic may be decrypted and re-encrypted — use VPN or mobile data",
    icon: Gauge,
  },
  "http2-support": {
    threat: "Protocol downgrade detected — proxy intercepting traffic",
    action: "A transparent proxy is active — use HTTPS-only mode",
    icon: Layers,
  },
  "port-scan": {
    threat: "Dangerous ports are exposed on the network",
    action: "Services like RDP, SMB are open — avoid file sharing on this network",
    icon: Radar,
  },
};

interface ResultsScreenProps {
  result: ScanResult;
  onScanAgain: () => void;
  fingerprintResult?: FingerprintComparison | null;
}

const ResultsScreen = ({ result, onScanAgain, fingerprintResult }: ResultsScreenProps) => {
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

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
      {/* === VERDICT SHIELD === */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={`relative w-48 h-48 flex items-center justify-center rounded-full ${
          level === "danger" ? "trust-glow-danger" : level === "caution" ? "trust-glow-warning" : "trust-glow-safe"
        }`}>
          {/* Score ring */}
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
          {/* Center verdict */}
          <div className="absolute flex flex-col items-center">
            <VerdictIcon size={36} className={`text-${verdict.color} animate-score-count`} />
            <span className={`text-4xl font-bold font-mono text-${verdict.color} mt-1`}>
              {result.trustScore}
            </span>
          </div>
        </div>

        {/* Verdict text */}
        <div className="text-center">
          <h2 className={`text-xl font-bold text-${verdict.color}`}>{verdict.title}</h2>
          <p className="text-muted-foreground text-xs mt-1">{verdict.subtitle}</p>
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
            <h3 className="text-sm font-semibold text-foreground">Network Fingerprint Changed</h3>
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

      {/* === WHAT TO DO NOW === */}
      <div className={`glass-card p-4 border-l-4 ${
        level === "danger" ? "border-l-trust-danger" : level === "caution" ? "border-l-trust-warning" : "border-l-trust-safe"
      }`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider text-${verdict.color} mb-2 flex items-center gap-2`}>
          {level === "danger" ? <ShieldX size={14} /> : level === "caution" ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
          What To Do
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

      {/* === ACTIVE THREATS === */}
      {failedChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-danger px-1 flex items-center gap-2">
            <AlertTriangle size={12} /> Active Threats ({failedChecks.length})
          </h3>
          {failedChecks.map((check) => {
            const advice = THREAT_ADVICE[check.id];
            const Icon = advice?.icon || Shield;
            const isExpanded = expandedCheck === check.id;
            return (
              <button
                key={check.id}
                onClick={() => setExpandedCheck(isExpanded ? null : check.id)}
                className="glass-card p-3 text-left w-full border-l-4 border-l-trust-danger transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-trust-danger/10 border border-trust-danger/20">
                    <Icon size={18} className="text-trust-danger" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{advice?.threat || check.name}</p>
                    <p className="text-[11px] text-trust-danger/80 mt-0.5">{advice?.action || check.status}</p>
                  </div>
                  <X size={16} className="text-trust-danger shrink-0" />
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
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
                    {/* NIST / CWE reference badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {NIST_MAP[check.id] && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary/70 border border-primary/20">
                          NIST {NIST_MAP[check.id].category}
                        </span>
                      )}
                      {CWE_MAP[check.id] && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-trust-danger/10 text-trust-danger/70 border border-trust-danger/20">
                          {CWE_MAP[check.id]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* === WARNINGS === */}
      {warningChecks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-trust-warning px-1 flex items-center gap-2">
            <AlertTriangle size={12} /> Inconclusive ({warningChecks.length})
          </h3>
          {warningChecks.map((check) => {
            const advice = THREAT_ADVICE[check.id];
            const Icon = advice?.icon || Shield;
            return (
              <button
                key={check.id}
                onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                className="glass-card p-3 text-left w-full border-l-4 border-l-trust-warning transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-trust-warning/10 border border-trust-warning/20">
                    <Icon size={16} className="text-trust-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <p className="text-[11px] text-trust-warning/80 mt-0.5">{check.status}</p>
                  </div>
                  <AlertTriangle size={14} className="text-trust-warning shrink-0" />
                </div>
                {expandedCheck === check.id && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
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
                    <div className="flex flex-wrap gap-1.5">
                      {NIST_MAP[check.id] && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary/70 border border-primary/20">
                          NIST {NIST_MAP[check.id].category}
                        </span>
                      )}
                      {CWE_MAP[check.id] && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-trust-warning/10 text-trust-warning/70 border border-trust-warning/20">
                          {CWE_MAP[check.id]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* === PASSED CHECKS (collapsed by default) === */}
      <div>
        <button
          onClick={() => setShowAllChecks(!showAllChecks)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
        >
          {showAllChecks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <Check size={12} className="text-trust-safe" />
          {passedChecks.length} checks passed
        </button>
        {showAllChecks && (
          <div className="flex flex-col gap-1.5 mt-2">
            {passedChecks.map((check) => (
              <div key={check.id} className="glass-card p-2.5 flex items-center gap-3 opacity-70">
                <Check size={14} className="text-trust-safe shrink-0" />
                <p className="text-xs text-foreground/70">{check.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === NETWORK INFO (compact) === */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Wifi size={12} className="text-primary" /> Network Details
        </h3>
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
        </div>
      </div>

      {/* === NIST CSF COVERAGE === */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Shield size={12} className="text-primary" /> NIST CSF 2.0 Coverage
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(["Identify", "Protect", "Detect"] as const).map((fn) => {
            const checksInFn = result.checks.filter(c => NIST_MAP[c.id]?.fn === fn);
            const passedInFn = checksInFn.filter(c => c.passed === true).length;
            const totalInFn = checksInFn.length;
            const pct = totalInFn > 0 ? Math.round((passedInFn / totalInFn) * 100) : 0;
            const color = pct >= 80 ? "text-trust-safe" : pct >= 50 ? "text-trust-warning" : "text-trust-danger";
            return (
              <div key={fn} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-secondary/30">
                <span className={`text-lg font-bold font-mono ${color}`}>{pct}%</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{fn}</span>
                <span className="text-[8px] text-muted-foreground/50">{passedInFn}/{totalInFn} checks</span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-2 text-center font-mono">
          Mapped to NIST Cybersecurity Framework 2.0 functions
        </p>
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
