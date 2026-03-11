import { useState } from "react";
import { ShieldAlert, Wifi, Lock, CheckCircle2, ChevronDown, ChevronUp, Database } from "lucide-react";

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
            Before We Scan
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            NetTrust checks if this WiFi is safe. Please confirm you're allowed to scan this network.
          </p>
        </div>

        {/* Permissions */}
        <div className="w-full glass-card p-4 flex flex-col gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            What we'll do:
          </h3>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Wifi size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Check your WiFi security</p>
              <p className="text-xs text-muted-foreground">Run quick tests to find threats on this network</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Lock size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Keep everything private</p>
              <p className="text-xs text-muted-foreground">All tests run on your device — nothing leaves your phone</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
              <Database size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Save results locally</p>
              <p className="text-xs text-muted-foreground">Your scan history stays on your device — delete it anytime</p>
            </div>
          </div>
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
              <p><strong className="text-foreground/80">1. Authorization.</strong> You confirm you're allowed to scan this network. Scanning networks without permission may be illegal.</p>
              <p><strong className="text-foreground/80">2. For info only.</strong> Results help you make decisions but don't guarantee safety. This isn't a professional security audit.</p>
              <p><strong className="text-foreground/80">3. Your data.</strong> Everything stays on your device. No data is sent anywhere. You can delete it all anytime.</p>
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
              I'm authorized to scan this network and agree to the terms
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
            Start Scanning
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentScreen;
