import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-900/40 bg-slate-900 p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-900/30">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-100">Something went wrong</h2>
            <p className="mb-6 text-sm text-slate-400">
              An unexpected error occurred. Please refresh the page to try again.
            </p>
            <p className="mb-6 rounded-lg bg-slate-800 px-3 py-2 text-left font-mono text-xs text-red-400">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
