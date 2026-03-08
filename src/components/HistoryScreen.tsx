import { ShieldCheck, ShieldAlert, ShieldX, Clock, ChevronRight, Fingerprint, Trash2 } from "lucide-react";
import { ScanResult } from "@/lib/mockData";
import { getStoredFingerprints, NetworkFingerprint } from "@/lib/networkFingerprint";

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

function getThreatLevel(score: number) {
  if (score <= 40) return "danger";
  if (score <= 70) return "warning";
  return "safe";
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
  const fingerprints = getStoredFingerprints();

  if (entries.length === 0) {
    return (
      <div className="animate-fade-in flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <div className="p-5 rounded-2xl bg-muted/50">
          <ShieldAlert size={40} className="text-muted-foreground/50" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No scans yet</h2>
        <p className="text-sm text-muted-foreground text-center max-w-[260px]">
          Connect to any WiFi and scan to check if it's safe
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
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      {/* Known Networks Summary */}
      {fingerprints.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <Fingerprint size={12} className="text-primary" /> Known Networks
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Networks are fingerprinted to detect changes between visits
          </p>
          <div className="flex flex-wrap gap-2">
            {fingerprints.slice(0, 8).map((fp) => {
              const avgScore = fp.trustScores.length > 0
                ? Math.round(fp.trustScores.reduce((a, b) => a + b, 0) / fp.trustScores.length)
                : null;
              const level = avgScore != null ? getThreatLevel(avgScore) : null;
              return (
                <div
                  key={fp.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/50"
                >
                  {level === "danger" ? <ShieldX size={11} className="text-trust-danger" /> :
                   level === "warning" ? <ShieldAlert size={11} className="text-trust-warning" /> :
                   level === "safe" ? <ShieldCheck size={11} className="text-trust-safe" /> :
                   <Fingerprint size={11} className="text-muted-foreground" />}
                  <span className="text-[11px] font-mono text-foreground truncate max-w-[100px]">{fp.ssid}</span>
                  <span className="text-[9px] text-muted-foreground/50">{fp.scanCount}x</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scan History */}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Scan History
      </h3>
      {entries.map((entry) => {
        const level = getThreatLevel(entry.result.trustScore);
        const failedCount = entry.result.checks.filter(c => c.passed === false).length;
        const Icon = level === "danger" ? ShieldX : level === "warning" ? ShieldAlert : ShieldCheck;
        const colorClass = level === "danger" ? "text-trust-danger" : level === "warning" ? "text-trust-warning" : "text-trust-safe";
        const bgClass = level === "danger" ? "bg-trust-danger/10" : level === "warning" ? "bg-trust-warning/10" : "bg-trust-safe/10";

        return (
          <button
            key={entry.id}
            onClick={() => onViewResult(entry)}
            className="glass-card p-4 text-left w-full transition-all duration-200 active:scale-[0.98] hover:border-primary/30"
          >
            <div className="flex items-center gap-3">
              {/* Verdict icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
                <Icon size={22} className={colorClass} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {entry.result.wifiCurrentConnection?.ssid || entry.result.networkName}
                  </p>
                  <span className={`text-xs font-bold font-mono ${colorClass}`}>
                    {entry.result.trustScore}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{entry.result.networkType}</span>
                  {failedCount > 0 && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-[11px] text-trust-danger">{failedCount} threat{failedCount > 1 ? "s" : ""}</span>
                    </>
                  )}
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
