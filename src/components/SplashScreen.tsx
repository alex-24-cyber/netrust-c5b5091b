import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

interface SplashScreenProps {
  onDismiss: () => void;
}

const SplashScreen = ({ onDismiss }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 1400);
    const t3 = setTimeout(onDismiss, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-400 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[300px] h-[300px] rounded-full border border-primary/10 animate-[radar-ping_3s_ease-out_infinite]" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-primary/15 animate-[radar-ping_3s_ease-out_0.5s_infinite]" />
      </div>

      <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${
        phase === "enter" ? "opacity-0 scale-90" : "opacity-100 scale-100"
      }`}>
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
          <ShieldAlert size={64} className="relative text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Net<span className="text-primary">Trust</span>
        </h1>
        <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-primary/50">
          WiFi Threat Scanner
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
