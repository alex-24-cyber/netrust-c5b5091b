import { useState, useCallback } from "react";
import { Shield } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import ResultsScreen from "@/components/ResultsScreen";
import BottomNav from "@/components/BottomNav";
import { generateScanResult, ScanResult } from "@/lib/mockData";

type AppState = "idle" | "scanning" | "results";

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState("scan");
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScanComplete = useCallback(() => {
    const scanResult = generateScanResult();
    setResult(scanResult);
    setState("results");
  }, []);

  const handleScanAgain = useCallback(() => {
    setResult(null);
    setState("idle");
  }, []);

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-center gap-2 pt-12 pb-4 px-6">
          <Shield size={22} className="text-primary" strokeWidth={2.5} />
          <h1 className="text-xl font-bold tracking-tight text-foreground">TrustNet</h1>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col px-5 overflow-y-auto">
          {state === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <p className="text-muted-foreground text-sm mb-10 text-center">
                Know your network before you connect
              </p>
              <ScanButton onScanComplete={handleScanComplete} />
            </div>
          )}

          {state === "scanning" && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ScanButton onScanComplete={handleScanComplete} />
            </div>
          )}

          {state === "results" && result && (
            <ResultsScreen result={result} onScanAgain={handleScanAgain} />
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
