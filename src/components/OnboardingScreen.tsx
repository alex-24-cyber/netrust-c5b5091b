import { useState } from "react";
import { ShieldAlert, Wifi, Zap, ChevronRight } from "lucide-react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Wifi,
    title: "Is this WiFi safe?",
    body: "Public WiFi at cafes, airports, and hotels can be risky. Hackers can spy on your traffic, steal passwords, or redirect you to fake websites.",
    accent: "primary",
  },
  {
    icon: ShieldAlert,
    title: "NetTrust checks for you",
    body: "With one tap, we run real security tests on your connection — checking for fake networks, traffic interception, and encryption problems.",
    accent: "primary",
  },
  {
    icon: Zap,
    title: "Get a clear answer",
    body: "No tech jargon. You'll see a simple safe, caution, or danger verdict with advice on what to do. It takes just a few seconds.",
    accent: "trust-safe",
  },
];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const Icon = current.icon;
  const isLast = slide === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem("nettrust_onboarded", "true");
      onComplete();
    } else {
      setSlide(slide + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-background flex flex-col items-center justify-center px-8">
      {/* Dots */}
      <div className="absolute top-14 flex gap-2" role="tablist" aria-label="Onboarding progress">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === slide ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
            }`}
            role="tab"
            aria-selected={i === slide}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-6 max-w-[340px] animate-fade-in" key={slide}>
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
          <div className="relative p-6 rounded-3xl bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/20">
            <Icon size={56} className="text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">{current.title}</h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{current.body}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="absolute bottom-16 w-full max-w-[340px] flex flex-col gap-3 px-8">
        <button
          onClick={next}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-sm transition-all active:scale-[0.98] glow-blue flex items-center justify-center gap-2"
          aria-label={isLast ? "Start scanning" : "Next slide"}
        >
          {isLast ? "Start Scanning" : "Next"}
          <ChevronRight size={16} />
        </button>

        {!isLast && (
          <button
            onClick={() => {
              localStorage.setItem("nettrust_onboarded", "true");
              onComplete();
            }}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
