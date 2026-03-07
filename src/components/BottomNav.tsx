import { Scan, Clock, Info } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "scan", label: "Scan", icon: Scan },
  { id: "history", label: "History", icon: Clock },
  { id: "about", label: "About", icon: Info },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="glass-card rounded-none border-x-0 border-b-0 px-6 py-3 flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 transition-colors duration-200 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium tracking-wide uppercase">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
