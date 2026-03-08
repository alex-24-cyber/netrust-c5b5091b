import { Shield, Wifi, Scan, Award, Lock, Globe, Server, ChevronRight, Video, Code, Fingerprint, Timer, ShieldCheck, Gauge, Layers, Zap, Radar } from "lucide-react";

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
  { icon: ShieldCheck, name: "TLS Version Analysis", desc: "Checks your connection negotiates modern TLS 1.2/1.3 — detects forced downgrades" },
  { icon: Gauge, name: "Bandwidth Throttle Detection", desc: "Measures throughput to CDNs to detect intentional traffic limiting or inspection" },
  { icon: Layers, name: "Protocol Downgrade Detection", desc: "Verifies HTTP/2 and HTTP/3 support — detects transparent proxy interception" },
  { icon: Radar, name: "Port Scan (nmap-style)", desc: "Probes 20 common ports via timing attacks — detects exposed services like SSH, RDP, SMB, databases" },
];

const AboutScreen = () => {
  return (
    <div className="animate-fade-in flex flex-col gap-5 pb-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3 pt-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-primary/20 to-primary/5 border border-primary/30">
            <Shield size={48} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Net<span className="text-primary">Trust</span>
        </h2>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-primary/60">WiFi Security Scanner</p>
      </div>

      {/* What is TrustNet */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          What is NetTrust?
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          NetTrust is the most comprehensive browser-based WiFi security scanner. It runs <strong className="text-primary">11 live security checks</strong> against your real connection to detect DNS hijacking, SSL stripping, traffic interception, protocol downgrades, and more — all in seconds.
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Zap size={12} className="text-primary" /> What We Detect
        </h3>
        <p className="text-[10px] text-muted-foreground mb-3 font-mono">11 live checks running against your real connection</p>
        <div className="flex flex-col gap-3">
          {CHECKS.map((check) => {
            const Icon = check.icon;
            return (
              <div key={check.name} className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                  <Icon size={14} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 border border-primary/20">
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
      <div className="glass-card p-5 border-l-4 border-l-trust-danger text-center">
        <p className="text-lg font-bold text-foreground leading-snug">
          "1 in 4 travellers have been hacked on public Wi-Fi"
        </p>
        <p className="text-xs text-muted-foreground mt-2">— Norton Cyber Safety Report</p>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground/40 text-center py-2 font-mono">
        NetTrust v2.0 — 11 live security checks
      </p>
    </div>
  );
};

export default AboutScreen;
