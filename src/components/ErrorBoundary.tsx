import { Component, type ReactNode } from "react";
import { ShieldX, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="p-4 rounded-full bg-trust-danger/10 border border-trust-danger/20">
              <ShieldX size={32} className="text-trust-danger" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              NetTrust encountered an unexpected error. Your scan data is safe in local storage.
            </p>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-muted-foreground/60 bg-secondary/30 rounded-lg p-3 max-w-full overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.98]"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
