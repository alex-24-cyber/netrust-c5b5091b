import { useEffect, useState, useCallback, useRef } from "react";
import { runAllRealChecks, detectNetworkType, RealCheckResult, IPReputationData, ScanLogEntry, ConnectionInfo } from "@/lib/networkChecks";
import { buildScanResult, ScanResult } from "@/lib/mockData";

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
}

const SCAN_MESSAGES = [
  "Probing network topology...",
  "Analysing DNS resolution paths...",
  "Verifying SSL/TLS certificates...",
  "Testing protocol negotiation...",
  "Scanning for rogue access points...",
  "Checking WebRTC leak surface...",
  "Measuring bandwidth integrity...",
  "Inspecting exit node reputation...",
  "Detecting content injection...",
  "Scanning nearby WiFi networks...",
  "Analysing traffic routing...",
];

const ScanButton = ({ onScanComplete }: ScanButtonProps) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [messageFade, setMessageFade] = useState(true);
  const [finalising, setFinalising] = useState(false);
  const [liveLog, setLiveLog] = useState<ScanLogEntry[]>([]);
  const [checksCompleted, setChecksCompleted] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const realChecksRef = useRef<{ checks: RealCheckResult[]; publicIp: string | null; webrtcLeakedIp?: string; ipReputation?: IPReputationData; scanLog: ScanLogEntry[]; wifiNetworks?: import("@/lib/wifiScanner").WifiNetwork[]; wifiCurrentConnection?: import("@/lib/wifiScanner").WifiCurrentConnection } | null>(null);
  const realChecksResolvedRef = useRef(false);
  const animDoneRef = useRef(false);

  const startScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setProgress(0);
    setMessageIndex(0);
    setShowComplete(false);
    setMessageFade(true);
    setFinalising(false);
    setLiveLog([]);
    setChecksCompleted(0);
    realChecksRef.current = null;
    realChecksResolvedRef.current = false;
    animDoneRef.current = false;

    runAllRealChecks().then((results) => {
      realChecksRef.current = results;
      realChecksResolvedRef.current = true;
      setLiveLog(results.scanLog);
      setChecksCompleted(results.checks.length);
    });
  }, [scanning]);

  // Progress timer
  useEffect(() => {
    if (!scanning || showComplete || finalising) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 1.5;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [scanning, showComplete, finalising]);

  // Message cycling
  useEffect(() => {
    if (!scanning || showComplete) return;
    const interval = setInterval(() => {
      setMessageFade(false);
      setTimeout(() => {
        setMessageIndex((i) => (i + 1) % SCAN_MESSAGES.length);
        setMessageFade(true);
      }, 200);
    }, 1200);
    return () => clearInterval(interval);
  }, [scanning, showComplete]);

  // When animation hits 100%
  useEffect(() => {
    if (progress < 100 || !scanning || showComplete || finalising) return;
    animDoneRef.current = true;
    if (realChecksResolvedRef.current) {
      setShowComplete(true);
    } else {
      setFinalising(true);
    }
  }, [progress, scanning, showComplete, finalising]);

  // Finalising
  useEffect(() => {
    if (!finalising) return;
    const maxWait = setTimeout(() => {
      setFinalising(false);
      setShowComplete(true);
    }, 5000);
    const poll = setInterval(() => {
      if (realChecksResolvedRef.current) {
        clearTimeout(maxWait);
        clearInterval(poll);
        setFinalising(false);
        setShowComplete(true);
      }
    }, 200);
    return () => { clearTimeout(maxWait); clearInterval(poll); };
  }, [finalising]);

  // Completion
  useEffect(() => {
    if (!showComplete || !scanning) return;
    const timer = setTimeout(() => {
      const connInfo = detectNetworkType();
      const realData = realChecksRef.current || { checks: [], publicIp: null, scanLog: [] };
      const result = buildScanResult(realData.checks, connInfo, realData.publicIp, realData.webrtcLeakedIp, realData.ipReputation, realData.scanLog, realData.wifiNetworks, realData.wifiCurrentConnection);
      setScanning(false);
      setShowComplete(false);
      setFinalising(false);
      onScanComplete(result);
    }, 1500);
    return () => clearTimeout(timer);
  }, [showComplete, scanning, onScanComplete]);

  // Auto-scroll live log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLog]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  if (!scanning) {
    return (
      <div className="flex flex-col items-center gap-8">
        <button
          onClick={startScan}
          className="group relative w-48 h-48 rounded-full flex items-center justify-center transition-transform active:scale-95"
        >
          {/* Outer ring pulses */}
          <div className="absolute inset-[-12px] rounded-full border border-primary/20 animate-[radar-ping_3s_ease-out_infinite]" />
          <div className="absolute inset-[-24px] rounded-full border border-primary/10 animate-[radar-ping_3s_ease-out_1s_infinite]" />
          <div className="absolute inset-[-36px] rounded-full border border-primary/5 animate-[radar-ping_3s_ease-out_2s_infinite]" />

          {/* Main button */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary/40 backdrop-blur-sm" />
          <div className="absolute inset-0 rounded-full glow-pulse" />

          {/* WiFi icon */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="relative z-10 group-hover:scale-110 transition-transform">
            <path d="M12 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="hsl(var(--primary))" />
            <path d="M9.5 15a4 4 0 0 1 5 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" className="animate-[wifi-wave_2s_ease-in-out_infinite_0.6s]" />
            <path d="M7 12a7 7 0 0 1 10 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" className="animate-[wifi-wave_2s_ease-in-out_infinite_0.3s]" />
            <path d="M4.5 9a10.5 10.5 0 0 1 15 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" className="animate-[wifi-wave_2s_ease-in-out_infinite]" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-muted-foreground text-sm font-medium">Tap to scan network</p>
          <p className="text-muted-foreground/50 text-xs mt-1">11 security checks + WiFi scan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Radar Scanner */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Background grid effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 rounded-full border border-primary/10" />
          <div className="absolute inset-[15%] rounded-full border border-primary/10" />
          <div className="absolute inset-[30%] rounded-full border border-primary/10" />
          <div className="absolute inset-[45%] rounded-full border border-primary/10" />
          {/* Crosshair lines */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/10" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/10" />
        </div>

        {/* Radar sweep */}
        {!showComplete && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-0 animate-[radar-sweep_2s_linear_infinite]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.3) 30deg, transparent 60deg)",
              }}
            />
          </div>
        )}

        {/* Progress ring */}
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" opacity="0.3" />
          <circle
            cx="90" cy="90" r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-linear"
            style={{ filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.6))" }}
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {showComplete ? (
            <div className="flex flex-col items-center animate-fade-in">
              <span className="text-4xl font-bold text-trust-safe">&#10003;</span>
              <span className="text-[10px] uppercase tracking-widest text-trust-safe/80 mt-1">Complete</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold font-mono text-foreground tabular-nums">
                {Math.min(Math.round(progress), 100)}%
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary/60 mt-1">
                {checksCompleted > 0 ? `${checksCompleted}/11` : "scanning"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status message */}
      <div className="h-5 flex items-center">
        <p
          className={`text-xs text-muted-foreground text-center transition-opacity duration-200 font-mono ${
            messageFade ? "opacity-100" : "opacity-0"
          }`}
        >
          {showComplete
            ? "Analysis Complete"
            : finalising
            ? "Finalising live checks..."
            : SCAN_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Live Terminal Output */}
      {liveLog.length > 0 && (
        <div className="w-full rounded-xl overflow-hidden border border-primary/20 bg-[#0a0a0f]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-primary/5">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-trust-danger/60" />
              <div className="w-2 h-2 rounded-full bg-trust-warning/60" />
              <div className="w-2 h-2 rounded-full bg-trust-safe/60" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary/50">
              nettrust — live scan
            </span>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-trust-safe animate-pulse" />
              <span className="text-[9px] font-mono text-trust-safe/70">LIVE</span>
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="px-3 py-2 max-h-[160px] overflow-y-auto scrollbar-thin"
            style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
          >
            {liveLog.slice(-20).map((entry, i) => {
              const ts = (entry.timestamp / 1000).toFixed(2);
              const typeColor = entry.type === "pass" ? "text-trust-safe"
                : entry.type === "fail" ? "text-trust-danger"
                : entry.type === "warn" ? "text-trust-warning"
                : "text-muted-foreground";
              return (
                <div key={i} className="flex gap-0 leading-[1.5]">
                  <span className="text-primary/40 shrink-0 text-[11px]">[{ts}s]</span>
                  <span className={`text-[11px] ml-1.5 ${typeColor}`}>{entry.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanButton;
