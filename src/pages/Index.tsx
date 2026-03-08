import { useState, useCallback, useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import ResultsScreen from "@/components/ResultsScreen";
import HistoryScreen from "@/components/HistoryScreen";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import { ScanResult } from "@/lib/mockData";
import { createFingerprint, compareAndStoreFingerprint, FingerprintComparison } from "@/lib/networkFingerprint";
import type { HistoryEntry } from "@/components/HistoryScreen";

type AppState = "idle" | "scanning" | "results";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [fingerprintResult, setFingerprintResult] = useState<FingerprintComparison | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("nettrust_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
      }
    } catch {}
    return [];
  });

  // Auto-start scan after splash dismisses
  const handleSplashDismiss = useCallback(() => {
    setShowSplash(false);
    setAutoScan(true);
    setState("scanning");
  }, []);

  const handleScanComplete = useCallback((scanResult: ScanResult) => {
    setResult(scanResult);
    setState("results");
    setAutoScan(false);

    // Create and compare network fingerprint
    const ssid = scanResult.wifiCurrentConnection?.ssid || scanResult.networkName;
    const fp = createFingerprint(
      ssid,
      scanResult.publicIp,
      scanResult.checks,
      scanResult.ipReputation ? {
        org: scanResult.ipReputation.org,
        asn: scanResult.ipReputation.asn,
        city: scanResult.ipReputation.city,
      } : null,
      scanResult.trustScore,
    );
    const comparison = compareAndStoreFingerprint(fp);
    setFingerprintResult(comparison);

    // Save to history
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      result: scanResult,
      timestamp: new Date(),
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50);
      try { localStorage.setItem("nettrust_history", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const handleScanAgain = useCallback(() => {
    setResult(null);
    setFingerprintResult(null);
    setAutoScan(true);
    setState("scanning");
  }, []);

  const handleViewHistoryResult = useCallback((entry: HistoryEntry) => {
    setResult(entry.result);
    setFingerprintResult(null); // Don't show fingerprint for historical views
    setState("results");
    setActiveTab("scan");
  }, []);

  const handleGoToScan = useCallback(() => {
    setActiveTab("scan");
  }, []);

  // Count active threats for nav badge
  const threatCount = result
    ? result.checks.filter(c => c.passed === false).length
    : 0;

  if (showSplash) {
    return <SplashScreen onDismiss={handleSplashDismiss} />;
  }

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="relative flex items-center justify-center gap-2 pt-12 pb-3 px-6">
          <div className="flex items-center gap-2 select-none">
            <ShieldAlert size={20} className="text-primary" strokeWidth={2.5} />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Net<span className="text-primary">Trust</span>
            </h1>
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary/40 ml-1">v4.0</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col px-5 overflow-y-auto">
          {activeTab === "scan" && (
            <>
              {(state === "idle" || state === "scanning") && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  {state === "idle" && (
                    <p className="text-muted-foreground/60 text-xs font-mono mb-6 text-center tracking-wide">
                      Is this WiFi safe?
                    </p>
                  )}
                  <ScanButton onScanComplete={handleScanComplete} autoStart={autoScan} />
                </div>
              )}

              {state === "results" && result && (
                <ResultsScreen
                  result={result}
                  onScanAgain={handleScanAgain}
                  fingerprintResult={fingerprintResult}
                />
              )}
            </>
          )}

          {activeTab === "history" && (
            <HistoryScreen
              entries={history}
              onViewResult={handleViewHistoryResult}
              onGoToScan={handleGoToScan}
            />
          )}
        </main>

        {/* Bottom Nav */}
        <div className="sticky bottom-0">
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            threatCount={state === "results" ? threatCount : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
