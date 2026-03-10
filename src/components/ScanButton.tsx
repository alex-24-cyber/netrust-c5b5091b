import { useEffect, useState, useCallback, useRef } from "react";
import { runAllRealChecks, detectNetworkType, RealCheckResult, IPReputationData, ScanLogEntry, ConnectionInfo } from "@/lib/networkChecks";
import { buildScanResult, ScanResult } from "@/lib/mockData";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
  autoStart?: boolean;
}

const SCAN_PHASES = [
  "Checking your connection...",
  "Looking for threats...",
  "Testing encryption...",
  "Verifying DNS safety...",
  "Checking for leaks...",
  "Analyzing network...",
  "Almost done...",
];

const ScanButton = ({ onScanComplete, autoStart = false }: ScanButtonProps) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseFade, setPhaseFade] = useState(true);
  const [checksCompleted, setChecksCompleted] = useState(0);
  const hasAutoStarted = useRef(false);

  const realChecksRef = useRef<{
    checks: RealCheckResult[];
    publicIp: string | null;
    webrtcLeakedIp?: string;
    ipReputation?: IPReputationData;
    scanLog: ScanLogEntry[];
    wifiNetworks?: import("@/lib/wifiScanner").WifiNetwork[];
    wifiCurrentConnection?: import("@/lib/wifiScanner").WifiCurrentConnection;
  } | null>(null);
  const realChecksResolvedRef = useRef(false);

  const startScan = useCallback(() => {
    if (scanning) return;
    setScanning(true);
    setProgress(0);
    setPhaseIndex(0);
    setPhaseFade(true);
    setChecksCompleted(0);
    realChecksRef.current = null;
    realChecksResolvedRef.current = false;

    runAllRealChecks().then((results) => {
      realChecksRef.current = results;
      realChecksResolvedRef.current = true;
      setChecksCompleted(results.checks.length);
    });
  }, [scanning]);

  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const t = setTimeout(startScan, 300);
      return () => clearTimeout(t);
    }
  }, [autoStart, startScan]);

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = realChecksResolvedRef.current && p > 70 ? 4 : 1.5;
        return Math.min(100, p + increment);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [scanning]);

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setPhaseFade(false);
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % SCAN_PHASES.length);
        setPhaseFade(true);
      }, 150);
    }, 1800);
    return () => clearInterval(interval);
  }, [scanning]);

  useEffect(() => {
    if (!scanning || progress < 100) return;

    const checkAndFinish = () => {
      if (realChecksResolvedRef.current) {
        const connInfo = detectNetworkType();
        const realData = realChecksRef.current || { checks: [], publicIp: null, scanLog: [] };
        const result = buildScanResult(
          realData.checks, connInfo, realData.publicIp,
          realData.webrtcLeakedIp, realData.ipReputation,
          realData.scanLog, realData.wifiNetworks, realData.wifiCurrentConnection
        );
        setScanning(false);
        onScanComplete(result);
      }
    };

    if (realChecksResolvedRef.current) {
      const t = setTimeout(checkAndFinish, 600);
      return () => clearTimeout(t);
    }

    const poll = setInterval(() => {
      if (realChecksResolvedRef.current) {
        clearInterval(poll);
        checkAndFinish();
      }
    }, 200);
    const maxWait = setTimeout(() => {
      clearInterval(poll);
      checkAndFinish();
    }, 8000);
    return () => { clearInterval(poll); clearTimeout(maxWait); };
  }, [scanning, progress, onScanComplete]);

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  if (!scanning) {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={startScan}
          className="group relative w-52 h-52 rounded-full flex items-center justify-center transition-transform active:scale-95"
        >
          <div className="absolute inset-[-12px] rounded-full border border-primary/20 animate-[radar-ping_3s_ease-out_infinite]" />
          <div className="absolute inset-[-28px] rounded-full border border-primary/10 animate-[radar-ping_3s_ease-out_1s_infinite]" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary/40 backdrop-blur-sm" />
          <div className="absolute inset-0 rounded-full glow-pulse" />
          <ShieldAlert size={56} className="relative z-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-foreground font-semibold text-base">Tap to Check This WiFi</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Takes just a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="relative w-52 h-52 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 animate-[radar-sweep_2s_linear_infinite]"
            style={{
              background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.25) 40deg, transparent 80deg)",
            }}
          />
        </div>
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" opacity="0.3" />
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-linear"
            style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <Loader2 size={28} className="text-primary animate-spin mb-1" />
          <span className="text-3xl font-bold font-mono text-foreground tabular-nums">
            {Math.min(Math.round(progress), 100)}%
          </span>
          <span className="text-[10px] uppercase tracking-widest text-primary/60 mt-0.5">
            scanning
          </span>
        </div>
      </div>
      <p
        className={`text-sm text-muted-foreground text-center transition-opacity duration-150 h-5 ${
          phaseFade ? "opacity-100" : "opacity-0"
        }`}
      >
        {SCAN_PHASES[phaseIndex]}
      </p>
    </div>
  );
};

export default ScanButton;
