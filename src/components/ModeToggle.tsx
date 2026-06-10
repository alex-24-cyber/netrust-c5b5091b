import { UserMode } from "@/lib/userMode";

interface ModeToggleProps {
  mode: UserMode;
  onChange: (mode: UserMode) => void;
  size?: "sm" | "md";
}

const OPTIONS: { id: UserMode; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "expert", label: "Expert" },
];

/** Segmented control that switches between plain-English and technical depth. */
const ModeToggle = ({ mode, onChange, size = "sm" }: ModeToggleProps) => {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs";
  return (
    <div
      role="radiogroup"
      aria-label="Detail level"
      className="inline-flex items-center rounded-full bg-secondary/70 border border-border/50 p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`${pad} rounded-full font-semibold tracking-wide transition-colors ${
              active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

export default ModeToggle;
