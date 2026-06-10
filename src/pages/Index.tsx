import { useState, useCallback } from "react";
import { ShieldAlert } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import ResultsScreen from "@/components/ResultsScreen";
import HistoryScreen from "@/components/HistoryScreen";
import MoreScreen from "@/components/MoreScreen";

import SplashScreen from "@/components/SplashScreen";
import ConsentScreen from "@/components/ConsentScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import ShareCard from "@/components/ShareCard";
import Toast from "@/components/Toast";
import BottomNav from "@/components/BottomNav";
import ModeToggle from "@/components/ModeToggle";
import { ScanResult } from "@/lib/mockData";
import { UserMode, loadUserMode, saveUserMode } from "@/lib/userMode";
import { createFingerprint, compareAndStoreFingerprint, FingerprintComparison, clearFingerprints } from "@/lib/networkFingerprint";
import type { HistoryEntry } from "@/components/HistoryScreen";

type AppState = "idle" | "scanning" | "results";

const Index = () => {
  const [hasConsent, setHasConsent] = useState(() => {
    return localStorage.getItem("nettrust_consent") === "true";
  });
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    return localStorage.getItem("nettrust_onboarded") === "true";
  });
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState("scan");
  const [mode, setMode] = useState<UserMode>(loadUserMode);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [fingerprintResult, setFingerprintResult] = useState<FingerprintComparison | null>(null);
  const [autoScan, setAutoScan] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem("nettrust_history");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((e: HistoryEntry & { timestamp: string }) => ({ ...e, timestamp: new Date(e.timestamp) }));
      }
    } catch {
      /* corrupt or unavailable storage — start with an empty history */
    }
    return [];
  });

  const handleSplashDismiss = useCallback(() => {
    setShowSplash(false);
    if (hasOnboarded) {
      setAutoScan(true);
      setState("scanning");
    }
  }, [hasOnboarded]);

  const handleOnboardingComplete = useCallback(() => {
    setHasOnboarded(true);
    setAutoScan(true);
    setState("scanning");
  }, []);

  const handleScanComplete = useCallback((scanResult: ScanResult) => {
    setResult(scanResult);
    setState("results");
    setAutoScan(false);

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

    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      result: scanResult,
      timestamp: new Date(),
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, 50);
      try { localStorage.setItem("nettrust_history", JSON.stringify(updated)); } catch { /* storage full — keep in memory only */ }
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
    setFingerprintResult(null);
    setState("results");
    setActiveTab("scan");
  }, []);

  const handleGoToScan = useCallback(() => {
    setActiveTab("scan");
  }, []);

  const handleModeChange = useCallback((next: UserMode) => {
    setMode(next);
    saveUserMode(next);
  }, []);

  const showToast = useCallback((message: string, type: "success" | "warning" = "success") => {
    setToast({ message, type });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("nettrust_history");
    showToast("Scan history cleared");
  }, [showToast]);

  const handleClearFingerprints = useCallback(() => {
    clearFingerprints();
    showToast("Network fingerprints cleared");
  }, [showToast]);

  const handleEraseAllData = useCallback(() => {
    setHistory([]);
    setResult(null);
    setFingerprintResult(null);
    setState("idle");
    clearFingerprints();
    localStorage.removeItem("nettrust_history");
    localStorage.removeItem("nettrust_consent");
    localStorage.removeItem("nettrust_consent_date");
    localStorage.removeItem("nettrust_onboarded");
    setHasConsent(false);
    setHasOnboarded(false);
  }, []);

  const handleExportReport = useCallback(() => {
    if (!result) return;
    setShowShare(true);
  }, [result]);

  const threatCount = result
    ? result.checks.filter(c => c.passed === false).length
    : 0;

  if (!hasConsent) {
    return <ConsentScreen onAccept={() => setHasConsent(true)} />;
  }

  if (showSplash) {
    return <SplashScreen onDismiss={handleSplashDismiss} />;
  }

  if (!hasOnboarded) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-semibold">
        Skip to content
      </a>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}
      {showShare && result && (
        <ShareCard result={result} onClose={() => setShowShare(false)} onToast={(msg) => { setShowShare(false); showToast(msg); }} />
      )}
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        <header className="relative flex items-center justify-between gap-2 pt-[max(3rem,env(safe-area-inset-top))] pb-3 px-5">
          <div className="flex items-center gap-2 select-none">
            <ShieldAlert size={20} className="text-primary" strokeWidth={2.5} aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Net<span className="text-primary">Trust</span>
            </h1>
          </div>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </header>

        <main id="main-content" className="flex-1 flex flex-col px-5 overflow-y-auto" role="main">
          {activeTab === "scan" && (
            <>
              {(state === "idle" || state === "scanning") && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  {state === "idle" && (
                    <p className="text-muted-foreground/60 text-sm mb-6 text-center">
                      Is this WiFi safe to use?
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
                  onShare={() => setShowShare(true)}
                  mode={mode}
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

          {activeTab === "more" && (
            <MoreScreen
              onClearHistory={handleClearHistory}
              onClearFingerprints={handleClearFingerprints}
              onExportReport={handleExportReport}
              onEraseAllData={handleEraseAllData}
              historyCount={history.length}
              hasResults={result !== null}
              mode={mode}
              onModeChange={handleModeChange}
            />
          )}
        </main>

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
