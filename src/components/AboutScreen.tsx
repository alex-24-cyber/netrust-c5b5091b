import { Shield, Wifi, Scan, Award, Lock, Globe, Server, ChevronRight, Video, Code, Fingerprint, Timer } from "lucide-react";

const STEPS = [
  { icon: Wifi, label: "Connect to any network" },
  { icon: Scan, label: "Tap to scan" },
  { icon: Award, label: "Get your trust rating" },
];

const CHECKS = [
  { icon: Globe, name: "DNS Hijacking", desc: "Detects if DNS responses are being manipulated to redirect you to malicious servers" },
  { icon: Lock, name: "SSL Certificate Validation", desc: "Verifies HTTPS connections aren't being stripped or intercepted" },
  { icon: Server, name: "Captive Portal / Rogue DHCP", desc: "Identifies unauthorised network gateways intercepting your traffic" },
  { icon: Video, name: "WebRTC IP Leak Detection", desc: "Checks if your local IP is exposed through browser WebRTC" },
  { icon: Code, name: "Content Injection Detection", desc: "Scans HTTP traffic for injected scripts, ads, or tracking code" },
  { icon: Fingerprint, name: "Public IP Reputation", desc: "Verifies your traffic exits through a legitimate ISP, not a proxy or datacenter" },
  { icon: Timer, name: "Latency Anomaly Detection", desc: "Measures round-trip times to detect suspicious traffic routing" },
];

const AboutScreen = () => {
  return (
    <div className="animate-fade-in flex flex-col gap-6 pb-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-6">
        <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20">
          <Shield size={48} className="text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">NetTrust</h2>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Wi-Fi Trust Scanner</p>
      </div>

      {/* What is TrustNet */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          What is NetTrust?
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          NetTrust analyses public Wi-Fi networks for common attack vectors before you trust them with your data. Get a clear trust rating in seconds.
        </p>
      </div>

      {/* How It Works */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          How It Works
        </h3>
        <div className="flex items-start justify-between gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <p className="text-[11px] text-center text-foreground/80 leading-tight">{step.label}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className="text-muted-foreground/50 shrink-0 mt-3" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* What We Detect */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          What We Detect
        </h3>
        <p className="text-[10px] text-muted-foreground mb-3">7 live checks running against your real connection</p>
        <div className="flex flex-col gap-3">
          {CHECKS.map((check) => {
            const Icon = check.icon;
            return (
              <div key={check.name} className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Icon size={14} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                      <span className="w-1 h-1 rounded-full bg-trust-safe" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{check.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stat Card */}
      <div className="glass-card p-5 border-l-4 border-l-trust-warning text-center">
        <p className="text-lg font-bold text-foreground leading-snug">
          "1 in 4 travellers have been hacked on public Wi-Fi"
        </p>
        <p className="text-xs text-muted-foreground mt-2">— Norton Cyber Safety Report</p>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground/60 text-center py-2">
        Built at Dogpatch Labs × Lovable — March 2026
      </p>
    </div>
  );
};

export default AboutScreen;
