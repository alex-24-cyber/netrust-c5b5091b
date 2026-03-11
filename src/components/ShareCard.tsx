import { useRef } from "react";
import { ScanResult } from "@/lib/mockData";
import { ShieldCheck, ShieldAlert, ShieldX, Share2, Copy } from "lucide-react";

interface ShareCardProps {
  result: ScanResult;
  onClose: () => void;
  onToast: (msg: string) => void;
}

function getThreatLevel(score: number) {
  if (score <= 40) return "danger";
  if (score <= 70) return "caution";
  return "safe";
}

const VERDICTS = {
  safe: { icon: ShieldCheck, title: "Safe", color: "trust-safe", bg: "bg-trust-safe" },
  caution: { icon: ShieldAlert, title: "Use Caution", color: "trust-warning", bg: "bg-trust-warning" },
  danger: { icon: ShieldX, title: "Not Safe", color: "trust-danger", bg: "bg-trust-danger" },
};

const ShareCard = ({ result, onClose, onToast }: ShareCardProps) => {
  const level = getThreatLevel(result.trustScore);
  const verdict = VERDICTS[level];
  const VerdictIcon = verdict.icon;
  const failedCount = result.checks.filter(c => c.passed === false).length;
  const passedCount = result.checks.filter(c => c.passed === true).length;

  const shareText = () => {
    const ssid = result.wifiCurrentConnection?.ssid || result.networkName;
    const lines = [
      `🛡️ NetTrust WiFi Scan`,
      ``,
      `Network: ${ssid}`,
      `Score: ${result.trustScore}/100 — ${verdict.title}`,
      `✅ ${passedCount} passed | ❌ ${failedCount} failed`,
      ``,
      `Scan your WiFi at netrust.lovable.app`,
    ];
    return lines.join("\n");
  };

  const handleShare = async () => {
    const text = shareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: "NetTrust Scan Result", text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    onToast("Copied to clipboard!");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText());
    onToast("Copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[430px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview card */}
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-border/50 bg-card">
          <div className={`${verdict.bg}/10 p-6 flex flex-col items-center gap-3`}>
            <VerdictIcon size={40} className={`text-${verdict.color}`} />
            <div className="text-center">
              <p className={`text-3xl font-black font-mono text-${verdict.color}`}>{result.trustScore}</p>
              <p className={`text-sm font-bold text-${verdict.color} mt-1`}>{verdict.title}</p>
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {result.wifiCurrentConnection?.ssid || result.networkName}
              </p>
              <p className="text-[11px] text-muted-foreground">
                ✅ {passedCount} passed · ❌ {failedCount} failed
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 font-mono">netrust.lovable.app</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mx-4 mb-6 flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            aria-label="Share scan result"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={handleCopy}
            className="py-3.5 px-5 rounded-xl bg-secondary border border-border/50 text-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            aria-label="Copy scan result to clipboard"
          >
            <Copy size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
