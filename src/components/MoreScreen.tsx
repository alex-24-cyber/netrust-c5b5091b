import { useState } from "react";
import {
  Shield, ShieldCheck, Wifi, Lock, Globe, Server, Video, Code, Fingerprint,
  Timer, Gauge, Layers, Radar, Zap, Radio, Star, Share2, Trash2,
  ChevronRight, ExternalLink, FileText, Info, Settings, Mail,
  Database, Scale, Download, AlertTriangle,
} from "lucide-react";

interface MoreScreenProps {
  onClearHistory: () => void;
  onClearFingerprints: () => void;
  onExportReport: () => void;
  onEraseAllData: () => void;
  historyCount: number;
  hasResults: boolean;
}

const FEATURES = [
  { icon: Globe, name: "DNS Hijacking Detection", nist: "DE.CM-01", owasp: "A05:2021" },
  { icon: Lock, name: "SSL/TLS Interception Check", nist: "PR.DS-02", owasp: "A02:2021" },
  { icon: Server, name: "Rogue Gateway Detection", nist: "DE.AE-02", owasp: "A07:2021" },
  { icon: Video, name: "WebRTC IP Leak Scanner", nist: "PR.DS-05", owasp: "A01:2021" },
  { icon: Code, name: "Content Injection Detection", nist: "DE.CM-04", owasp: "A03:2021" },
  { icon: Fingerprint, name: "IP Reputation Analysis", nist: "ID.RA-02", owasp: "" },
  { icon: Timer, name: "Latency Anomaly Detection", nist: "DE.AE-03", owasp: "" },
  { icon: ShieldCheck, name: "TLS Version Analysis", nist: "PR.DS-02", owasp: "A02:2021" },
  { icon: Gauge, name: "Bandwidth Throttle Detection", nist: "DE.AE-02", owasp: "" },
  { icon: Layers, name: "Protocol Downgrade Detection", nist: "DE.CM-01", owasp: "A02:2021" },
  { icon: Radar, name: "Port Scan (nmap-style)", nist: "ID.RA-01", owasp: "A05:2021" },
  { icon: Radio, name: "WiFi Network Scanner", nist: "DE.CM-01", owasp: "" },
];

const MoreScreen = ({
  onClearHistory,
  onClearFingerprints,
  onExportReport,
  onEraseAllData,
  historyCount,
  hasResults,
}: MoreScreenProps) => {
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearFingerprints, setConfirmClearFingerprints] = useState(false);
  const [confirmEraseAll, setConfirmEraseAll] = useState(false);

  const consentDate = localStorage.getItem("nettrust_consent_date");

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      {/* === APP INFO HERO === */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
          <div className="relative p-4 rounded-2xl bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30">
            <Shield size={40} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Net<span className="text-primary">Trust</span>
          </h2>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/60 mt-0.5">
            WiFi Security Scanner
          </p>
          <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">Version 4.0</p>
        </div>
        {/* Compliance badges */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {["NIST CSF 2.0", "OWASP Top 10", "CWE", "GDPR"].map((badge) => (
            <span key={badge} className="text-[8px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary/60 border border-primary/20">
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* === ABOUT === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          NetTrust is a real-time WiFi security scanner that helps you determine whether a wireless network is safe to use. It runs <strong className="text-primary">11 live security checks</strong> against your active connection to detect man-in-the-middle attacks, DNS hijacking, SSL stripping, traffic interception, and more.
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed mt-2">
          Designed for travelers, remote workers, and security-conscious users who connect to public WiFi at cafes, airports, hotels, and coworking spaces.
        </p>
      </div>

      {/* === COMPLIANCE & STANDARDS === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compliance & Standards</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Shield size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">NIST CSF 2.0</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">All 11 checks mapped to NIST Cybersecurity Framework functions: Identify (ID), Protect (PR), Detect (DE). Coverage spans ID.RA, PR.DS, DE.CM, and DE.AE categories.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-trust-danger/10 border border-trust-danger/20 shrink-0 mt-0.5">
              <AlertTriangle size={14} className="text-trust-danger" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">OWASP Top 10 (2021)</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Threat detections reference OWASP categories including A01 (Broken Access Control), A02 (Cryptographic Failures), A03 (Injection), A05 (Security Misconfiguration), and A07 (Authentication Failures).</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-trust-warning/10 border border-trust-warning/20 shrink-0 mt-0.5">
              <Code size={14} className="text-trust-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">CWE Classification</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Each security check maps to Common Weakness Enumerations (CWE) for standardized vulnerability classification and incident reporting.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-trust-safe/10 border border-trust-safe/20 shrink-0 mt-0.5">
              <Globe size={14} className="text-trust-safe" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">GDPR / EU Data Protection</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Privacy-by-design architecture. Zero data collection, on-device processing only, full data portability (Art. 20), right to erasure (Art. 17), and transparent data processing disclosures (Art. 13).</p>
            </div>
          </div>
        </div>
      </div>

      {/* === KEY FEATURES === */}
      <div className="glass-card p-4">
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Security Checks ({FEATURES.length})
            </h3>
          </div>
          <ChevronRight
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${showFeatures ? "rotate-90" : ""}`}
          />
        </button>

        {showFeatures && (
          <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-border/50">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-2.5">
                  <div className="p-1 rounded-md bg-primary/10 border border-primary/20">
                    <Icon size={12} className="text-primary" />
                  </div>
                  <span className="text-xs text-foreground/80 flex-1">{f.name}</span>
                  <div className="flex gap-1">
                    <span className="text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary/50 border border-primary/15">
                      {f.nist}
                    </span>
                    {f.owasp && (
                      <span className="text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-trust-danger/10 text-trust-danger/50 border border-trust-danger/15">
                        {f.owasp}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === HOW IT WORKS === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How It Works</h3>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { step: "1", text: "Connect to any WiFi network" },
            { step: "2", text: "Tap Scan to run all 11 security checks" },
            { step: "3", text: "Review your Trust Score and NIST-mapped threat details" },
            { step: "4", text: "Follow recommendations to stay safe" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">{step}</span>
              </div>
              <span className="text-sm text-foreground/80">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === ACTIONS === */}
      <div className="glass-card overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-4 pb-2 flex items-center gap-2">
          <Settings size={12} className="text-primary" /> Actions
        </h3>

        {/* Export Report */}
        <button
          onClick={onExportReport}
          disabled={!hasResults}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 ${
            hasResults ? "hover:bg-secondary/50 active:bg-secondary" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Share2 size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Export Scan Report</p>
            <p className="text-[11px] text-muted-foreground">NIST/OWASP-tagged report with compliance metadata</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </button>

        {/* Clear History */}
        <button
          onClick={() => {
            if (confirmClearHistory) {
              onClearHistory();
              setConfirmClearHistory(false);
            } else {
              setConfirmClearHistory(true);
              setTimeout(() => setConfirmClearHistory(false), 3000);
            }
          }}
          disabled={historyCount === 0}
          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 ${
            historyCount > 0 ? "hover:bg-secondary/50 active:bg-secondary" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <div className="p-1.5 rounded-lg bg-trust-danger/10 border border-trust-danger/20">
            <Trash2 size={14} className="text-trust-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${confirmClearHistory ? "text-trust-danger" : "text-foreground"}`}>
              {confirmClearHistory ? "Tap again to confirm" : "Clear Scan History"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {historyCount} scan{historyCount !== 1 ? "s" : ""} saved locally
            </p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </button>

        {/* Clear Fingerprints */}
        <button
          onClick={() => {
            if (confirmClearFingerprints) {
              onClearFingerprints();
              setConfirmClearFingerprints(false);
            } else {
              setConfirmClearFingerprints(true);
              setTimeout(() => setConfirmClearFingerprints(false), 3000);
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-secondary/50 active:bg-secondary"
        >
          <div className="p-1.5 rounded-lg bg-trust-warning/10 border border-trust-warning/20">
            <Fingerprint size={14} className="text-trust-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${confirmClearFingerprints ? "text-trust-warning" : "text-foreground"}`}>
              {confirmClearFingerprints ? "Tap again to confirm" : "Clear Network Fingerprints"}
            </p>
            <p className="text-[11px] text-muted-foreground">Forget all known network identities</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </button>

        {/* Erase All Data (GDPR Art. 17) */}
        <button
          onClick={() => {
            if (confirmEraseAll) {
              onEraseAllData();
              setConfirmEraseAll(false);
            } else {
              setConfirmEraseAll(true);
              setTimeout(() => setConfirmEraseAll(false), 3000);
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary"
        >
          <div className="p-1.5 rounded-lg bg-trust-danger/10 border border-trust-danger/20">
            <Database size={14} className="text-trust-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${confirmEraseAll ? "text-trust-danger" : "text-foreground"}`}>
              {confirmEraseAll ? "Tap again — this cannot be undone" : "Erase All Data"}
            </p>
            <p className="text-[11px] text-muted-foreground">GDPR Art. 17 — Right to Erasure. Deletes everything.</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </button>
      </div>

      {/* === PRIVACY & DATA === */}
      <div className="glass-card p-4">
        <button
          onClick={() => setShowDataDetails(!showDataDetails)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacy & Data Protection</h3>
          </div>
          <ChevronRight
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${showDataDetails ? "rotate-90" : ""}`}
          />
        </button>
        <div className="flex flex-col gap-2 text-sm text-foreground/80 leading-relaxed mt-3">
          <p>All security checks execute entirely on your device. No personal data, scan results, or network information is ever transmitted to external servers.</p>
          <div className="flex flex-col gap-1.5 mt-1">
            {[
              "No account required",
              "No analytics, tracking, or telemetry",
              "No cloud storage — data stays on-device",
              "WiFi scanner runs on your local machine only",
              "Full GDPR Art. 17 right to erasure support",
              "Data portability via export (GDPR Art. 20)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-foreground/70">
                <ShieldCheck size={11} className="text-trust-safe shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {showDataDetails && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Storage Inventory</h4>
            <div className="space-y-2">
              {[
                { key: "nettrust_consent", desc: "Consent agreement flag", type: "Boolean" },
                { key: "nettrust_consent_date", desc: "Date consent was given", type: "ISO timestamp" },
                { key: "nettrust_history", desc: "Scan results history", type: "JSON (up to 50 entries)" },
                { key: "nettrust_fingerprints", desc: "Known network identities", type: "JSON (per SSID)" },
              ].map((item) => (
                <div key={item.key} className="flex items-start gap-2 text-[11px]">
                  <code className="text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded text-[10px] shrink-0">{item.key}</code>
                  <div className="flex-1">
                    <span className="text-foreground/70">{item.desc}</span>
                    <span className="text-muted-foreground/50 ml-1">({item.type})</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground/50">
              All data stored in browser localStorage. No cookies, no IndexedDB, no service workers.
              {consentDate && ` Consent recorded: ${new Date(consentDate).toLocaleDateString()}.`}
            </p>
          </div>
        )}
      </div>

      {/* === LEGAL === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal & Disclaimer</h3>
        </div>
        <div className="text-xs text-foreground/70 leading-relaxed space-y-2">
          <p>NetTrust is an authorized network security diagnostic tool. Only scan networks you own or have explicit permission to test. Unauthorized network scanning may violate:</p>
          <div className="flex flex-col gap-1 ml-2">
            {[
              "US: Computer Fraud and Abuse Act (CFAA, 18 U.S.C. § 1030)",
              "EU: Directive 2013/40/EU on attacks against information systems",
              "UK: Computer Misuse Act 1990",
              "Equivalent local cybercrime legislation",
            ].map((law) => (
              <div key={law} className="flex items-start gap-1.5 text-[11px] text-foreground/60">
                <span className="text-primary/40 mt-0.5">•</span>
                {law}
              </div>
            ))}
          </div>
          <p className="mt-2">Results are provided for informational purposes only and do not constitute a professional security audit, penetration test, or compliance certification.</p>
        </div>
      </div>

      {/* === RATE & SUPPORT === */}
      <div className="glass-card overflow-hidden">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary border-b border-border/30">
          <div className="p-1.5 rounded-lg bg-trust-warning/10 border border-trust-warning/20">
            <Star size={14} className="text-trust-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Rate NetTrust</p>
            <p className="text-[11px] text-muted-foreground">Love it? Leave a review</p>
          </div>
          <ExternalLink size={14} className="text-muted-foreground/40" />
        </button>

        <button className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Mail size={14} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Send Feedback</p>
            <p className="text-[11px] text-muted-foreground">Report bugs or suggest features</p>
          </div>
          <ExternalLink size={14} className="text-muted-foreground/40" />
        </button>
      </div>

      {/* Footer */}
      <div className="text-center py-2 space-y-1">
        <p className="text-[10px] text-muted-foreground/40 font-mono">
          NetTrust v4.0 — NIST CSF 2.0 · OWASP · CWE · GDPR
        </p>
        <p className="text-[10px] text-muted-foreground/30 font-mono">
          Made with care for your network security
        </p>
      </div>
    </div>
  );
};

export default MoreScreen;
