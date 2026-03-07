import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import type { ScanLogEntry } from "@/lib/networkChecks";

interface ScanLogProps {
  entries: ScanLogEntry[];
}

const typeColorClass: Record<ScanLogEntry["type"], string> = {
  info: "text-[#8b949e]",
  pass: "text-[#3fb950]",
  fail: "text-[#f85149]",
  warn: "text-[#d29922]",
};

const ScanLog = ({ entries }: ScanLogProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-[#1a1a2e]">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0a0f] text-left transition-colors hover:bg-[#0f0f18]"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#3fb950]" />
          <span
            className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            Scan Log
          </span>
          <span className="text-[9px] font-mono text-[#8b949e]/60">
            ({entries.length} events)
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[#8b949e] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Log body */}
      {expanded && (
        <div
          className="bg-[#0a0a0f] px-4 py-3 max-h-[400px] overflow-y-auto"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          <div className="flex flex-col gap-0.5">
            {entries.map((entry, i) => {
              const ts = (entry.timestamp / 1000).toFixed(3);
              return (
                <div key={i} className="flex gap-0">
                  <span className="text-[#58a6ff] shrink-0 text-[12px] leading-[1.6]">
                    [{ts}s]
                  </span>
                  <span className={`text-[12px] leading-[1.6] ml-1.5 ${typeColorClass[entry.type]}`}>
                    {entry.message}
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
