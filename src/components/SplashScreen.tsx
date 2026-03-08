import { useState, useEffect } from "react";
import { Shield } from "lucide-react";

interface SplashScreenProps {
  onDismiss: () => void;
}

const SplashScreen = ({ onDismiss }: SplashScreenProps) => {
  const [fading, setFading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 300);
    const t2 = setTimeout(() => setShowStats(true), 800);
    const t3 = setTimeout(() => setShowCTA(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleStart = () => {
    setFading(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full border border-primary/5 animate-[radar-ping_4s_ease-out_infinite]" />
        <div className="absolute w-[450px] h-[450px] rounded-full border border-primary/8 animate-[radar-ping_4s_ease-out_1s_infinite]" />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-primary/10 animate-[radar-ping_4s_ease-out_2s_infinite]" />
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-trust-safe/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className={`flex flex-col items-center gap-6 px-8 max-w-[360px] relative z-10 transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
          <div className="relative p-7 rounded-3xl bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30 glow-blue">
            <Shield size={56} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Name */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Net<span className="text-primary">Trust</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-primary/60 mt-2">
            WiFi Security Scanner
          </p>
        </div>

        {/* Feature pills */}
        <div className={`flex flex-wrap justify-center gap-2 transition-all duration-500 ${showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <span className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary/80">
            11 Live Checks
          </span>
          <span className="px-3 py-1.5 rounded-full bg-trust-safe/10 border border-trust-safe/20 text-[11px] font-mono text-trust-safe/80">
            Real-Time Scan
          </span>
          <span className="px-3 py-1.5 rounded-full bg-trust-warning/10 border border-trust-warning/20 text-[11px] font-mono text-trust-warning/80">
            Threat Analysis
          </span>
        </div>

        {/* Stat */}
        <div className={`glass-card p-4 border-l-4 border-l-trust-danger w-full text-center transition-all duration-500 ${showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-sm font-semibold text-foreground leading-snug">
            1 in 4 people are hacked on public Wi-Fi
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">— Norton Cyber Safety Report</p>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Scan any network in seconds. Detect DNS hijacking, SSL stripping, traffic interception, and more.
        </p>

        {/* CTA */}
        <div className={`w-full transition-all duration-500 ${showCTA ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] glow-blue hover:shadow-[0_0_40px_hsl(var(--primary)/0.5)]"
          >
            Start Scanning
          </button>
          <p className="text-center text-[10px] text-muted-foreground/40 mt-3 font-mono">
            v2.0 — 11 live security checks
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
