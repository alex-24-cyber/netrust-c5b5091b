import { useState } from "react";
import {
  Shield, ShieldCheck, Wifi, Lock, Globe, Server, Video, Code, Fingerprint,
  Timer, Gauge, Layers, Radar, Zap, Radio, Star, Share2, Trash2,
  ChevronRight, ExternalLink, FileText, Info, Settings, Mail,
} from "lucide-react";

interface MoreScreenProps {
  onClearHistory: () => void;
  onClearFingerprints: () => void;
  onExportReport: () => void;
  historyCount: number;
  hasResults: boolean;
}

const FEATURES = [
  { icon: Globe, name: "DNS Hijacking Detection", color: "text-primary" },
  { icon: Lock, name: "SSL/TLS Interception Check", color: "text-primary" },
  { icon: Server, name: "Rogue Gateway Detection", color: "text-primary" },
  { icon: Video, name: "WebRTC IP Leak Scanner", color: "text-primary" },
  { icon: Code, name: "Content Injection Detection", color: "text-primary" },
  { icon: Fingerprint, name: "IP Reputation Analysis", color: "text-primary" },
  { icon: Timer, name: "Latency Anomaly Detection", color: "text-primary" },
  { icon: ShieldCheck, name: "TLS Version Analysis", color: "text-primary" },
  { icon: Gauge, name: "Bandwidth Throttle Detection", color: "text-primary" },
  { icon: Layers, name: "Protocol Downgrade Detection", color: "text-primary" },
  { icon: Radar, name: "Port Scan (nmap-style)", color: "text-primary" },
  { icon: Radio, name: "WiFi Network Scanner", color: "text-trust-safe" },
];

const MoreScreen = ({
  onClearHistory,
  onClearFingerprints,
  onExportReport,
  historyCount,
  hasResults,
}: MoreScreenProps) => {
  const [showFeatures, setShowFeatures] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearFingerprints, setConfirmClearFingerprints] = useState(false);

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
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/50">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-center gap-2.5">
                  <div className="p-1 rounded-md bg-primary/10 border border-primary/20">
                    <Icon size={12} className={f.color} />
                  </div>
                  <span className="text-xs text-foreground/80">{f.name}</span>
                  <span className="ml-auto text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 border border-primary/20">
                    Live
                  </span>
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
            { step: "3", text: "Review your Trust Score and threat details" },
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
            <p className="text-[11px] text-muted-foreground">Share your latest scan results as text</p>
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
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50 active:bg-secondary"
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
      </div>

      {/* === PRIVACY & DATA === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Privacy & Data</h3>
        </div>
        <div className="flex flex-col gap-2 text-sm text-foreground/80 leading-relaxed">
          <p>All security checks execute entirely on your device. No personal data, scan results, or network information is ever transmitted to external servers.</p>
          <div className="flex flex-col gap-1.5 mt-1">
            {[
              "No account required",
              "No analytics or tracking",
              "No cloud storage — data stays on-device",
              "WiFi scanner runs on your local machine only",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-foreground/70">
                <ShieldCheck size={11} className="text-trust-safe shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === LEGAL === */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
        </div>
        <p className="text-xs text-foreground/70 leading-relaxed">
          NetTrust is an authorized network security diagnostic tool. Only scan networks you own or have explicit permission to test. Unauthorized network scanning may violate local, state, or federal laws. Results are provided for informational purposes only and do not constitute a guarantee of network security.
        </p>
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
          NetTrust v4.0 — 12 live security checks
        </p>
        <p className="text-[10px] text-muted-foreground/30 font-mono">
          Made with care for your network security
        </p>
      </div>
    </div>
  );
};

export default MoreScreen;
