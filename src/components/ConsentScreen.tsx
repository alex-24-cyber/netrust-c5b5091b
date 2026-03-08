import { useState } from "react";
import { ShieldAlert, Wifi, Lock, CheckCircle2, ChevronDown, ChevronUp, Database, Globe } from "lucide-react";

interface ConsentScreenProps {
  onAccept: () => void;
}

const ConsentScreen = ({ onAccept }: ConsentScreenProps) => {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="fixed inset-0 z-[90] bg-background flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-[400px] flex flex-col items-center gap-5 px-8 py-10 animate-fade-in">
        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30">
            <ShieldAlert size={44} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            Network Scanning Authorization
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            NetTrust scans your WiFi network to detect security threats. Please confirm you are authorized to scan this network.
          </p>
        </div>

        {/* Permissions */}
        <div className="w-full glass-card p-4 flex flex-col gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            This app will:
          </h3>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Wifi size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Scan your WiFi connection</p>
              <p className="text-xs text-muted-foreground">Run 11 live security checks against your active network</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Lock size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Stay private</p>
              <p className="text-xs text-muted-foreground">All checks run locally in your browser — no data leaves your device</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Database size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Store data on-device only</p>
              <p className="text-xs text-muted-foreground">Scan history and fingerprints saved to browser storage — you can delete anytime</p>
            </div>
          </div>
        </div>

        {/* GDPR Notice */}
        <div className="w-full glass-card p-3 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-1.5">
            <Globe size={12} className="text-primary" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Protection Notice</h3>
          </div>
          <p className="text-[11px] text-foreground/70 leading-relaxed">
            In accordance with GDPR Art. 13 and applicable data protection laws: NetTrust processes network diagnostic data locally on your device. No personal data is collected, transmitted, or stored on external servers. You retain full control over all data — including the right to access, export, and permanently delete it at any time via the app's Settings.
          </p>
        </div>

        {/* Terms */}
        <div className="w-full">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTerms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Terms of Use
          </button>
          {showTerms && (
            <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border/50 text-[11px] text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground/80">1. Authorization.</strong> You confirm you are the owner or authorized user of the network being scanned. Scanning networks without permission may violate the Computer Fraud and Abuse Act (CFAA), EU Directive 2013/40/EU, or equivalent local legislation.</p>
              <p><strong className="text-foreground/80">2. Purpose.</strong> NetTrust is a security diagnostic tool. Results are informational and do not constitute a guarantee of network safety or a professional security audit.</p>
              <p><strong className="text-foreground/80">3. Data Processing.</strong> All processing occurs on-device. No telemetry, analytics, or personal data is transmitted externally. Scan results are stored in localStorage and can be erased at any time (GDPR Art. 17 — Right to Erasure).</p>
              <p><strong className="text-foreground/80">4. Data Retention.</strong> Scan history is retained locally for up to 50 entries. Network fingerprints are stored indefinitely until manually cleared. No automatic cloud backup exists.</p>
              <p><strong className="text-foreground/80">5. Compliance.</strong> Security checks are mapped to NIST Cybersecurity Framework 2.0, OWASP Top 10 (2021), and CWE classifications. This tool supports — but does not replace — organizational compliance requirements.</p>
            </div>
          )}
        </div>

        {/* Checkbox + Accept */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => setAgreed(!agreed)}
            className="flex items-center gap-3 text-left"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              agreed ? "bg-primary border-primary" : "border-muted-foreground/40"
            }`}>
              {agreed && <CheckCircle2 size={14} className="text-primary-foreground" />}
            </div>
            <span className="text-xs text-foreground/80">
              I am authorized to scan this network and agree to the Terms of Use and Data Protection Notice
            </span>
          </button>

          <button
            onClick={() => {
              if (agreed) {
                localStorage.setItem("nettrust_consent", "true");
                localStorage.setItem("nettrust_consent_date", new Date().toISOString());
                onAccept();
              }
            }}
            disabled={!agreed}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              agreed
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground active:scale-[0.98] glow-blue hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <ShieldAlert size={16} />
            Continue to NetTrust
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/40 text-center font-mono">
          NetTrust v4.0 — NIST CSF 2.0 · OWASP · GDPR Compliant
        </p>
      </div>
    </div>
  );
};

export default ConsentScreen;
