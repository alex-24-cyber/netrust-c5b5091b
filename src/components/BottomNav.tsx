import { ShieldAlert, Clock } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  threatCount?: number;
}

const tabs = [
  { id: "scan", label: "Scan", icon: ShieldAlert },
  { id: "history", label: "History", icon: Clock },
];

const BottomNav = ({ activeTab, onTabChange, threatCount }: BottomNavProps) => {
  return (
    <nav className="glass-card rounded-none border-x-0 border-b-0 px-6 py-3 flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center gap-1 transition-colors duration-200 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              {tab.id === "scan" && threatCount != null && threatCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-trust-danger text-[9px] font-bold text-white flex items-center justify-center">
                  {threatCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide uppercase">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
