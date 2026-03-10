import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "warning";
  onDone: () => void;
}

const Toast = ({ message, type = "success", onDone }: ToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 200);
    }, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  const Icon = type === "success" ? Check : AlertTriangle;
  const color = type === "success" ? "text-trust-safe" : "text-trust-warning";
  const bg = type === "success" ? "bg-trust-safe/10 border-trust-safe/20" : "bg-trust-warning/10 border-trust-warning/20";

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl border ${bg} backdrop-blur-md flex items-center gap-2 transition-all duration-200 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <Icon size={14} className={color} />
      <span className={`text-xs font-medium ${color}`}>{message}</span>
    </div>
  );
};

export default Toast;
