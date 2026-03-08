import { useEffect, useState, useCallback, useRef } from "react";
import { runAllRealChecks, detectNetworkType, RealCheckResult, IPReputationData, ScanLogEntry, ConnectionInfo } from "@/lib/networkChecks";
import { buildScanResult, ScanResult } from "@/lib/mockData";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
  autoStart?: boolean;
}

const SCAN_PHASES = [
  "Checking DNS integrity...",
  "Validating SSL certificates...",
  "Detecting rogue access points...",
  "Scanning for traffic interception...",
  "Analyzing network identity...",
  "Testing for content injection...",
  "Probing open ports...",
  "Checking protocol security...",
  "Finalizing threat assessment...",
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

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      // Small delay for visual smoothness
      const t = setTimeout(startScan, 300);
      return () => clearTimeout(t);
    }
  }, [autoStart, startScan]);

  // Progress animation
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Speed up toward end if checks are done
        const increment = realChecksResolvedRef.current && p > 70 ? 4 : 1.5;
        return Math.min(100, p + increment);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [scanning]);

  // Phase cycling
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setPhaseFade(false);
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % SCAN_PHASES.length);
        setPhaseFade(true);
      }, 150);
    }, 1500);
    return () => clearInterval(interval);
  }, [scanning]);

  // Completion: when progress hits 100 AND checks are done
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

    // If checks already done, finish after brief pause
    if (realChecksResolvedRef.current) {
      const t = setTimeout(checkAndFinish, 600);
      return () => clearTimeout(t);
    }

    // Otherwise poll
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

  // Idle state: big scan button
  if (!scanning) {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={startScan}
          className="group relative w-52 h-52 rounded-full flex items-center justify-center transition-transform active:scale-95"
        >
          {/* Pulse rings */}
          <div className="absolute inset-[-12px] rounded-full border border-primary/20 animate-[radar-ping_3s_ease-out_infinite]" />
          <div className="absolute inset-[-28px] rounded-full border border-primary/10 animate-[radar-ping_3s_ease-out_1s_infinite]" />

          {/* Button face */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/20 to-primary/5 border-2 border-primary/40 backdrop-blur-sm" />
          <div className="absolute inset-0 rounded-full glow-pulse" />

          {/* Shield icon */}
          <ShieldAlert size={56} className="relative z-10 text-primary group-hover:scale-110 transition-transform" strokeWidth={1.5} />
        </button>
        <div className="text-center">
          <p className="text-foreground font-semibold text-base">Tap to Scan Network</p>
          <p className="text-muted-foreground/50 text-xs mt-1 font-mono">11 threat checks in seconds</p>
        </div>
      </div>
    );
  }

  // Scanning state
  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Shield scanner */}
      <div className="relative w-52 h-52 flex items-center justify-center">
        {/* Radar sweep */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 animate-[radar-sweep_2s_linear_infinite]"
            style={{
              background: "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.25) 40deg, transparent 80deg)",
            }}
          />
        </div>

        {/* Progress ring */}
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

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <Loader2 size={28} className="text-primary animate-spin mb-1" />
          <span className="text-3xl font-bold font-mono text-foreground tabular-nums">
            {Math.min(Math.round(progress), 100)}%
          </span>
          <span className="text-[10px] uppercase tracking-widest text-primary/60 mt-0.5">
            {checksCompleted > 0 ? `${checksCompleted}/11 checks` : "scanning"}
          </span>
        </div>
      </div>

      {/* Phase text */}
      <p
        className={`text-xs text-muted-foreground text-center font-mono transition-opacity duration-150 h-4 ${
          phaseFade ? "opacity-100" : "opacity-0"
        }`}
      >
        {SCAN_PHASES[phaseIndex]}
      </p>
    </div>
  );
};

export default ScanButton;
