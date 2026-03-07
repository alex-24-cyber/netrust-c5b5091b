import { useState, useCallback, useRef } from "react";
import { Shield } from "lucide-react";
import ScanButton from "@/components/ScanButton";
import ResultsScreen from "@/components/ResultsScreen";
import BottomNav from "@/components/BottomNav";
import { ScanResult } from "@/lib/mockData";
import { DemoForce, generateForcedResult } from "@/lib/demoMode";

type AppState = "idle" | "scanning" | "results";

const FORCE_OPTIONS: { value: DemoForce; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "red", label: "Force Red (High Risk)" },
  { value: "amber", label: "Force Amber (Caution)" },
  { value: "green", label: "Force Green (Trusted)" },
];

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState("scan");
  const [result, setResult] = useState<ScanResult | null>(null);

  // Demo mode
  const [demoMode, setDemoMode] = useState(false);
  const [demoForce, setDemoForce] = useState<DemoForce>("random");
  const [showDropdown, setShowDropdown] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDemoMode((prev) => !prev);
      setShowDropdown(false);
      setDemoForce("random");
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 800);
    }
  }, []);

  const handleScanComplete = useCallback((scanResult: ScanResult | null) => {
    if (demoMode) {
      // In demo mode, ScanButton signals completion; we generate forced result
      const forced = demoForce !== "random"
        ? generateForcedResult(demoForce)
        : generateForcedResult("random");
      setResult(forced);
    } else {
      // Real scan: result comes from ScanButton with live checks
      setResult(scanResult);
    }
    setState("results");
  }, [demoMode, demoForce]);

  const handleScanAgain = useCallback(() => {
    setResult(null);
    setState("idle");
  }, []);

  return (
    <div className="min-h-screen flex justify-center bg-background">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="relative flex items-center justify-center gap-2 pt-12 pb-4 px-6">
          <button onClick={handleLogoTap} className="flex items-center gap-2 select-none">
            <Shield size={22} className="text-primary" strokeWidth={2.5} />
            <h1 className="text-xl font-bold tracking-tight text-foreground">TrustNet</h1>
          </button>

          {demoMode && (
            <div className="absolute right-4 top-12 flex items-center gap-1.5">
              <button
                onClick={() => setShowDropdown((p) => !p)}
                className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-primary/30 text-primary/70 bg-primary/5"
              >
                Demo
              </button>
            </div>
          )}

          {demoMode && showDropdown && (
            <div className="absolute right-4 top-[72px] z-50 glass-card p-1.5 min-w-[180px] animate-fade-in">
              {FORCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDemoForce(opt.value); setShowDropdown(false); }}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                    demoForce === opt.value
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col px-5 overflow-y-auto">
          {(state === "idle" || state === "scanning") && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              {state === "idle" && (
                <p className="text-muted-foreground text-sm mb-10 text-center">
                  Know your network before you connect
                </p>
              )}
              <ScanButton onScanComplete={handleScanComplete} demoMode={demoMode} />
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
