import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import ResultsScreen from "@/components/ResultsScreen";
import AboutScreen from "@/components/AboutScreen";
import HistoryScreen from "@/components/HistoryScreen";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import { ScanResult } from "@/lib/mockData";
import type { HistoryEntry } from "@/components/HistoryScreen";

type AppState = "idle" | "scanning" | "results";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
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

  const handleScanComplete = useCallback((scanResult: ScanResult) => {
    setResult(scanResult);
    setState("results");

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
    setState("idle");
  }, []);

  const handleViewHistoryResult = useCallback((entry: HistoryEntry) => {
    setResult(entry.result);
    setState("results");
    setActiveTab("scan");
  }, []);

  const handleGoToScan = useCallback(() => {
    setActiveTab("scan");
  }, []);

  if (showSplash) {
    return <SplashScreen onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="relative flex items-center justify-center gap-2 pt-12 pb-4 px-6">
          <div className="flex items-center gap-2 select-none">
            <Shield size={20} className="text-primary" strokeWidth={2.5} />
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Net<span className="text-primary">Trust</span>
            </h1>
            <span className="text-[9px] font-mono uppercase tracking-wider text-primary/40 ml-1">v3.0</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col px-5 overflow-y-auto">
          {activeTab === "scan" && (
            <>
              {(state === "idle" || state === "scanning") && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  {state === "idle" && (
                    <p className="text-muted-foreground/60 text-xs font-mono mb-8 text-center tracking-wide">
                      Verify your network security in seconds
                    </p>
                  )}
                  <ScanButton onScanComplete={handleScanComplete} />
                </div>
              )}

              {state === "results" && result && (
                <ResultsScreen result={result} onScanAgain={handleScanAgain} />
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

          {activeTab === "about" && (
            <AboutScreen />
          )}
        </main>

        {/* Bottom Nav */}
        <div className="sticky bottom-0">
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    </div>
  );
};

export default Index;
