import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import type { ScanLogEntry } from "@/lib/networkChecks";

interface ScanLogProps {
  entries: ScanLogEntry[];
}

const typeColorClass: Record<ScanLogEntry["type"], string> = {
  info: "text-muted-foreground",
  pass: "text-trust-safe",
  fail: "text-trust-danger",
  warn: "text-trust-warning",
};

const typePrefix: Record<ScanLogEntry["type"], string> = {
  info: "",
  pass: "[PASS] ",
  fail: "[FAIL] ",
  warn: "[WARN] ",
};

const ScanLog = ({ entries }: ScanLogProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-primary/15 bg-[#060610]/90">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 text-left transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-primary" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            Scan Log
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/40">
            ({entries.length} events)
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Log body */}
      {expanded && (
        <div
          className="px-4 py-3 max-h-[400px] overflow-y-auto"
          style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
        >
          <div className="flex flex-col gap-0.5">
            {entries.map((entry, i) => {
              const ts = (entry.timestamp / 1000).toFixed(3);
              return (
                <div key={i} className="flex gap-0">
                  <span className="text-primary/40 shrink-0 text-[11px] leading-[1.6]">
                    [{ts}s]
                  </span>
                  <span className={`text-[11px] leading-[1.6] ml-1.5 ${typeColorClass[entry.type]}`}>
                    {typePrefix[entry.type]}{entry.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanLog;
