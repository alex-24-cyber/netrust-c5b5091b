import { useState } from "react";
import { ScanResult } from "@/lib/mockData";
import { Shield, Copy, Network, Lock, Globe, Server, Check, X, ChevronDown, AlertTriangle } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Copy, Network, Lock, Globe, Server,
};

function getTrustColor(score: number) {
  if (score <= 40) return "danger";
  if (score <= 70) return "warning";
  return "safe";
}

interface ResultsScreenProps {
  result: ScanResult;
  onScanAgain: () => void;
}

const ResultsScreen = ({ result, onScanAgain }: ResultsScreenProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const color = getTrustColor(result.trustScore);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.trustScore / 100) * circumference;

  const strokeClass = color === "danger" ? "stroke-trust-danger" : color === "warning" ? "stroke-trust-warning" : "stroke-trust-safe";
  const textClass = color === "danger" ? "text-trust-danger" : color === "warning" ? "text-trust-warning" : "text-trust-safe";
  const glowClass = color === "danger" ? "trust-glow-danger" : color === "warning" ? "trust-glow-warning" : "trust-glow-safe";

  const networkInfo = [
    { label: "SSID", value: result.networkName, note: result.ssidNote },
    { label: "Type", value: result.networkType },
    { label: "BSSID", value: result.bssid },
    { label: "Channel", value: String(result.channel) },
    { label: "Signal", value: `${result.signalStrength} dBm` },
    { label: "Encryption", value: result.encryption },
    { label: "Gateway", value: result.gatewayIp },
  ];

  return (
    <div className="animate-fade-in flex flex-col gap-5 pb-6">
      {/* Trust Score Gauge */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className={`relative w-44 h-44 flex items-center justify-center rounded-full ${glowClass}`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="80" cy="80" r={radius}
              fill="none"
              className={strokeClass}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <span className={`absolute text-5xl font-bold font-mono ${textClass}`}>
            {result.trustScore}
          </span>
        </div>
        <div className="text-center">
          <p className={`text-lg font-semibold ${textClass}`}>{result.trustLabel}</p>
          <p className="text-muted-foreground text-sm">"{result.networkName}"</p>
        </div>
      </div>

      {/* Network Info */}
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Shield size={14} /> Network Info
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {networkInfo.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="text-sm font-mono text-foreground truncate">{item.value}</p>
              {item.note && (
                <p className="text-[9px] text-muted-foreground/70 italic">{item.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Checks */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Security Checks
        </h3>
        {result.checks.map((check) => {
          const Icon = iconMap[check.icon] || Shield;
          const isOpen = expanded === check.id;
          const isTimedOut = check.passed === null;

          return (
            <button
              key={check.id}
              onClick={() => setExpanded(isOpen ? null : check.id)}
              className="glass-card p-3 text-left w-full transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${
                  isTimedOut
                    ? "bg-trust-warning/10"
                    : check.passed
                    ? "bg-trust-safe/10"
                    : "bg-trust-danger/10"
                }`}>
                  <Icon size={16} className={
                    isTimedOut
                      ? "text-trust-warning"
                      : check.passed
                      ? "text-trust-safe"
                      : "text-trust-danger"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{check.name}</p>
                    {check.checkType === "live" ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-trust-safe/10 text-trust-safe border border-trust-safe/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        Simulated
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${
                    isTimedOut
                      ? "text-trust-warning"
                      : check.passed
                      ? "text-trust-safe"
                      : "text-trust-danger"
                  }`}>
                    {check.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isTimedOut ? (
                    <AlertTriangle size={16} className="text-trust-warning" />
                  ) : check.passed ? (
                    <Check size={16} className="text-trust-safe" />
                  ) : (
                    <X size={16} className="text-trust-danger" />
                  )}
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </div>
              {isOpen && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border leading-relaxed animate-fade-in">
                  {check.explanation}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Scan Again */}
      <button
        onClick={onScanAgain}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] glow-blue"
      >
        Scan Again
      </button>
    </div>
  );
};

export default ResultsScreen;
