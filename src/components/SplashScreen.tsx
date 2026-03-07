import { useState } from "react";
import { Shield } from "lucide-react";

interface SplashScreenProps {
  onDismiss: () => void;
}

const SplashScreen = ({ onDismiss }: SplashScreenProps) => {
  const [fading, setFading] = useState(false);

  const handleStart = () => {
    setFading(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-8 max-w-[360px]">
        {/* Logo */}
        <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 glow-blue">
          <Shield size={56} className="text-primary" strokeWidth={1.5} />
        </div>

        {/* Name */}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">NetTrust</h1>
        <p className="text-sm text-muted-foreground text-center">
          Know your network before you connect
        </p>

        {/* Stat */}
        <div className="glass-card p-4 border-l-4 border-l-trust-warning w-full text-center mt-2">
          <p className="text-sm font-semibold text-foreground leading-snug">
            1 in 4 people are hacked on public Wi-Fi
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">— Norton Cyber Safety Report</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-transform active:scale-[0.98] glow-blue mt-2"
        >
          Start Scanning
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
