import { Shield, Clock, ChevronRight } from "lucide-react";
import { ScanResult } from "@/lib/mockData";

interface HistoryEntry {
  id: string;
  result: ScanResult;
  timestamp: Date;
}

interface HistoryScreenProps {
  entries: HistoryEntry[];
  onViewResult: (entry: HistoryEntry) => void;
  onGoToScan: () => void;
}

function getTrustColor(score: number) {
  if (score <= 40) return "trust-danger";
  if (score <= 70) return "trust-warning";
  return "trust-safe";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const HistoryScreen = ({ entries, onViewResult, onGoToScan }: HistoryScreenProps) => {
  if (entries.length === 0) {
    return (
      <div className="animate-fade-in flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <div className="p-5 rounded-2xl bg-muted/50">
          <Shield size={40} className="text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No scans yet</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[260px]">
          Run your first scan to see results here
        </p>
        <button
          onClick={onGoToScan}
          className="mt-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] glow-blue"
        >
          Start Scanning
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-3 pb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">
        Scan History
      </h3>
      {entries.map((entry) => {
        const color = getTrustColor(entry.result.trustScore);
        const passedCount = entry.result.checks.filter((c) => c.passed === true).length;
        return (
          <button
            key={entry.id}
            onClick={() => onViewResult(entry)}
            className="glass-card p-4 text-left w-full transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              {/* Score badge */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}/10 shrink-0`}>
                <span className={`text-lg font-bold font-mono text-${color}`}>
                  {entry.result.trustScore}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {entry.result.networkName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{entry.result.networkType}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-muted-foreground">{passedCount}/{entry.result.checks.length} passed</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock size={10} className="text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDate(entry.timestamp)} at {formatTime(entry.timestamp)}
                  </span>
                </div>
              </div>

              <ChevronRight size={16} className="text-muted-foreground/40 shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export type { HistoryEntry };
export default HistoryScreen;
