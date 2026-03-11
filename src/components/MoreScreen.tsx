import { useState } from "react";
import {
  Shield, ShieldCheck, Wifi, Lock, Globe, Server, Video, Code, Fingerprint,
  Zap, Radio, Share2, Trash2, ChevronRight, Info, Settings,
  Database, Timer, Gauge, Layers, Radar,
} from "lucide-react";

interface MoreScreenProps {
  onClearHistory: () => void;
  onClearFingerprints: () => void;
  onExportReport: () => void;
  onEraseAllData: () => void;
  historyCount: number;
  hasResults: boolean;
}

const CHECKS_INFO = [
  { icon: Lock, name: "Encryption check", desc: "Makes sure no one can read your encrypted traffic" },
  { icon: Globe, name: "DNS safety", desc: "Checks websites load from the right servers" },
  { icon: Server, name: "Gateway check", desc: "Detects rogue devices intercepting your connection" },
  { icon: Video, name: "IP leak check", desc: "Verifies your device address stays hidden" },
  { icon: Code, name: "Injection check", desc: "Scans for code being injected into web pages" },
  { icon: Fingerprint, name: "IP reputation", desc: "Checks your traffic exits through a trusted provider" },
  { icon: Timer, name: "Speed check", desc: "Detects suspicious traffic routing delays" },
  { icon: ShieldCheck, name: "Protocol check", desc: "Ensures modern encryption standards are used" },
  { icon: Gauge, name: "Throttle check", desc: "Detects if your connection is being slowed down" },
  { icon: Layers, name: "Downgrade check", desc: "Catches attempts to weaken your connection" },
  { icon: Radar, name: "Port scan", desc: "Finds exposed services that shouldn't be open" },
  { icon: Radio, name: "WiFi scanner", desc: "Discovers nearby networks and detects evil twins" },
];

const MoreScreen = ({
  onClearHistory,
  onClearFingerprints,
  onExportReport,
  onEraseAllData,
  historyCount,
  hasResults,
}: MoreScreenProps) => {
  const [showChecks, setShowChecks] = useState(false);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearFingerprints, setConfirmClearFingerprints] = useState(false);
  const [confirmEraseAll, setConfirmEraseAll] = useState(false);

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      {/* Hero */}
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
          <p className="text-sm text-muted-foreground mt-1">WiFi Security Scanner</p>
        </div>
      </div>

      {/* About */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          NetTrust checks if a WiFi network is safe to use. It runs <strong className="text-primary">real security tests</strong> on your connection to spot hackers, fake networks, and traffic interception — think of it as a <strong className="text-primary">virus scanner for WiFi</strong>.
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed mt-2">
          Perfect for anyone who uses WiFi at cafes, airports, hotels, or coworking spaces.
        </p>
      </div>

      {/* How it works */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={14} className="text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How It Works</h3>
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            { step: "1", text: "Connect to any WiFi network" },
            { step: "2", text: "Tap Scan — we run security checks in seconds" },
            { step: "3", text: "See if it's safe, risky, or dangerous" },
            { step: "4", text: "Follow the advice to stay protected" },
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

      {/* Security checks list */}
      <div className="glass-card p-4">
        <button
          onClick={() => setShowChecks(!showChecks)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What We Check ({CHECKS_INFO.length})
            </h3>
          </div>
          <ChevronRight
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${showChecks ? "rotate-90" : ""}`}
          />
        </button>

        {showChecks && (
          <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-border/50">
            {CHECKS_INFO.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.name} className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-primary/10 border border-primary/20 mt-0.5">
                    <Icon size={12} className="text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground">{f.name}</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="glass-card overflow-hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-4 pb-2 flex items-center gap-2">
          <Settings size={12} className="text-primary" /> Settings
        </h3>

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
            <p className="text-sm font-medium text-foreground">Share Scan Report</p>
            <p className="text-[11px] text-muted-foreground">Copy or share your latest scan results</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </button>

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
              {historyCount} scan{historyCount !== 1 ? "s" : ""} saved on this device
            </p>
          </div>
        </button>

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
              {confirmClearFingerprints ? "Tap again to confirm" : "Forget Known Networks"}
            </p>
            <p className="text-[11px] text-muted-foreground">Stop recognizing networks you've scanned before</p>
          </div>
        </button>

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
              {confirmEraseAll ? "Tap again — this can't be undone" : "Delete All My Data"}
            </p>
            <p className="text-[11px] text-muted-foreground">Erase everything and start fresh</p>
          </div>
        </button>
      </div>

      {/* Privacy */}
      <div className="glass-card p-4">
        <button
          onClick={() => setShowDataDetails(!showDataDetails)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Privacy</h3>
          </div>
          <ChevronRight
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${showDataDetails ? "rotate-90" : ""}`}
          />
        </button>
        <div className="flex flex-col gap-2 text-sm text-foreground/80 leading-relaxed mt-3">
          <p>Everything happens on your device. We never see your data.</p>
          <div className="flex flex-col gap-1.5 mt-1">
            {[
              "No account needed",
              "No tracking or analytics",
              "All data stays on your device",
              "Delete everything anytime",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-foreground/70">
                <ShieldCheck size={11} className="text-trust-safe shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {showDataDetails && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What's stored on your device</h4>
            <div className="space-y-2">
              {[
                { key: "Consent", desc: "That you agreed to scan" },
                { key: "Scan history", desc: "Up to 50 past scan results" },
                { key: "Network fingerprints", desc: "So we can tell if a network changes" },
              ].map((item) => (
                <div key={item.key} className="flex items-start gap-2 text-[11px]">
                  <span className="text-primary/60 font-medium shrink-0">{item.key}:</span>
                  <span className="text-foreground/70">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/30 text-center py-2">
        NetTrust — WiFi Security Scanner
      </p>
    </div>
  );
};

export default MoreScreen;
