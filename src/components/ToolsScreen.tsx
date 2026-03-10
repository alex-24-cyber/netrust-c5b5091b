import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  KeyRound, Globe, Shield, Loader2, Check, X, AlertTriangle,
  Lock, Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

/* ── Password Breach Checker ── */
function BreachChecker() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ breached: boolean; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("check-breach", {
        body: { password: password.trim() },
      });
      if (fnErr) throw fnErr;
      setResult(data);
    } catch {
      setError("Couldn't check — try again later");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Type a password to check..."
          className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 pr-20 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          aria-label="Password to check for breaches"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={() => setShow(!show)}
            className="p-1.5 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={check}
            disabled={loading || !password.trim()}
            className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-primary disabled:opacity-40 transition-colors hover:bg-primary/20"
            aria-label="Check password"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Check"}
          </button>
        </div>
      </div>

      {result && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${
          result.breached
            ? "bg-trust-danger/5 border-trust-danger/20"
            : "bg-trust-safe/5 border-trust-safe/20"
        }`}>
          {result.breached ? (
            <X size={18} className="text-trust-danger shrink-0 mt-0.5" />
          ) : (
            <Check size={18} className="text-trust-safe shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-sm font-semibold ${result.breached ? "text-trust-danger" : "text-trust-safe"}`}>
              {result.breached ? "This password has been leaked!" : "This password looks safe"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.breached
                ? `Found in ${result.count.toLocaleString()} data breach${result.count > 1 ? "es" : ""}. Change it immediately.`
                : "Not found in any known data breaches. Keep using strong, unique passwords."}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-trust-danger flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
        <Lock size={9} /> Your password is hashed — we never see or store it
      </p>
    </div>
  );
}

/* ── Security Headers Scanner ── */
interface HeaderResult {
  name: string;
  present: boolean;
  value: string | null;
  description: string;
  severity: string;
}

function HeadersScanner() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    url: string; grade: string; score: number; headers: HeaderResult[];
    isHttps: boolean; presentCount: number; totalCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const scan = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("check-headers", {
        body: { url: url.trim() },
      });
      if (fnErr) throw fnErr;
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't scan — check the URL and try again");
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = (grade: string) => {
    if (grade === "A") return "text-trust-safe";
    if (grade === "B") return "text-trust-safe";
    if (grade === "C") return "text-trust-warning";
    return "text-trust-danger";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setResult(null); }}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder="Enter a website URL (e.g. google.com)"
          className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-3 pr-16 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          aria-label="Website URL to scan"
        />
        <button
          onClick={scan}
          disabled={loading || !url.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-primary disabled:opacity-40 transition-colors hover:bg-primary/20"
          aria-label="Scan website headers"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Scan"}
        </button>
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          {/* Grade card */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 border border-border/30">
            <div className={`text-4xl font-black font-mono ${gradeColor(result.grade)}`}>
              {result.grade}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{result.presentCount}/{result.totalCount} headers found</p>
              <p className="text-xs text-muted-foreground">
                {result.isHttps ? "✓ Uses HTTPS" : "✗ No HTTPS — insecure"}
              </p>
            </div>
          </div>

          {/* Headers list */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide details" : "Show all headers"}
          </button>

          {expanded && (
            <div className="flex flex-col gap-1.5">
              {result.headers.map((h) => (
                <div key={h.name} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${
                  h.present ? "bg-trust-safe/5" : "bg-trust-danger/5"
                }`}>
                  {h.present ? (
                    <Check size={13} className="text-trust-safe shrink-0 mt-0.5" />
                  ) : (
                    <X size={13} className="text-trust-danger shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-medium text-foreground">{h.name}</p>
                    <p className="text-[10px] text-muted-foreground">{h.description}</p>
                    {h.present && h.value && (
                      <p className="text-[10px] font-mono text-primary/60 mt-0.5 truncate">{h.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-trust-danger flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

/* ── Main Tools Screen ── */
const TOOLS = [
  {
    id: "breach",
    icon: KeyRound,
    title: "Password Breach Checker",
    desc: "Check if a password has appeared in known data breaches",
    component: BreachChecker,
  },
  {
    id: "headers",
    icon: Globe,
    title: "Website Security Scanner",
    desc: "Check if a website has proper security headers",
    component: HeadersScanner,
  },
];

const ToolsScreen = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-6">
      <div className="flex items-center gap-2 pt-2">
        <Shield size={16} className="text-primary" />
        <h2 className="text-base font-bold text-foreground">Security Tools</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Free tools to check your security beyond WiFi
      </p>

      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const Component = tool.component;

        return (
          <div key={tool.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setActiveTool(isActive ? null : tool.id)}
              className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/30"
              aria-expanded={isActive}
            >
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{tool.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{tool.desc}</p>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isActive ? "rotate-180" : ""}`} />
            </button>

            {isActive && (
              <div className="px-4 pb-4 pt-0">
                <Component />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ToolsScreen;
