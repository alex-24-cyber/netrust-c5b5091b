import { useEffect, useState, useCallback, useRef } from "react";
import { runAllRealChecks, detectNetworkType, RealCheckResult, IPReputationData } from "@/lib/networkChecks";
import { buildScanResult, ScanResult, SecurityCheck, CachedNetworkInfo } from "@/lib/mockData";

interface ScanButtonProps {
  onScanComplete: (result: ScanResult) => void;
  demoMode?: boolean;
  cachedSimulated?: SecurityCheck[];
  cachedNetworkInfo?: CachedNetworkInfo;
}

const SCAN_MESSAGES = [
  "Checking SSID authenticity...",
  "Analysing ARP tables...",
  "Verifying SSL certificates...",
  "Inspecting DNS configuration...",
  "Scanning for rogue access points...",
];

const ScanButton = ({ onScanComplete, demoMode, cachedSimulated, cachedNetworkInfo }: ScanButtonProps) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [messageFade, setMessageFade] = useState(true);
  const [finalising, setFinalising] = useState(false);

  const realChecksRef = useRef<{ checks: RealCheckResult[]; publicIp: string | null; webrtcLeakedIp?: string; ipReputation?: IPReputationData } | null>(null);
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
    realChecksRef.current = null;
    realChecksResolvedRef.current = false;
    animDoneRef.current = false;

    // Start real checks immediately (unless demo mode skips them)
    if (!demoMode) {
      runAllRealChecks().then((results) => {
        realChecksRef.current = results;
        realChecksResolvedRef.current = true;
      });
    }
  }, [scanning, demoMode]);

  // Progress timer
  useEffect(() => {
    if (!scanning || showComplete || finalising) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 100);
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
    }, 1000);
    return () => clearInterval(interval);
  }, [scanning, showComplete]);

  // When animation hits 100%
  useEffect(() => {
    if (progress < 100 || !scanning || showComplete || finalising) return;
    animDoneRef.current = true;

    if (demoMode) {
      // Demo mode: no real checks needed
      setShowComplete(true);
      return;
    }

    if (realChecksResolvedRef.current) {
      setShowComplete(true);
    } else {
      // Wait for real checks with extended timeout
      setFinalising(true);
    }
  }, [progress, scanning, showComplete, finalising, demoMode]);

  // Finalising: wait up to 5 more seconds for real checks
  useEffect(() => {
    if (!finalising) return;
    const maxWait = setTimeout(() => {
      // Force complete even without results
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

    return () => {
      clearTimeout(maxWait);
      clearInterval(poll);
    };
  }, [finalising]);

  // Completion: build result and notify parent
  useEffect(() => {
    if (!showComplete || !scanning) return;
    const timer = setTimeout(() => {
      if (!demoMode) {
        const { type, ssidNote } = detectNetworkType();
        const realData = realChecksRef.current || { checks: [], publicIp: null };
        const result = buildScanResult(realData.checks, type, ssidNote, realData.publicIp, cachedSimulated, cachedNetworkInfo, realData.webrtcLeakedIp, realData.ipReputation);
        setScanning(false);
        setShowComplete(false);
        setFinalising(false);
        onScanComplete(result);
      } else {
        // Demo mode: parent handles result generation
        setScanning(false);
        setShowComplete(false);
        setFinalising(false);
        onScanComplete(null as any); // signal demo mode
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [showComplete, scanning, onScanComplete, demoMode]);

  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!scanning) {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={startScan}
          className="relative w-44 h-44 rounded-full bg-secondary border-2 border-primary/30 flex items-center justify-center glow-pulse transition-transform active:scale-95"
        >
          <div className="absolute inset-0 rounded-full bg-primary/10" />
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="relative z-10">
            <path d="M12 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="hsl(var(--primary))" />
            <path d="M9.5 14a4 4 0 0 1 5 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 11a7 7 0 0 1 10 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4.5 8a10.5 10.5 0 0 1 15 0" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-muted-foreground text-sm">Tap to analyse network</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <circle
            cx="80" cy="80" r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100 ease-linear"
            style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.5))" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold font-mono text-foreground">
            {showComplete ? "✓" : `${Math.min(progress, 100)}%`}
          </span>
        </div>
      </div>
      <div className="h-6 flex items-center">
        <p
          className={`text-sm text-muted-foreground text-center transition-opacity duration-200 ${
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
    </div>
  );
};

export default ScanButton;
