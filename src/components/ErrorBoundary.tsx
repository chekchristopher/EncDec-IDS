/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert, Terminal } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[EncDec IDS Global Shield] Uncaught render exception caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-200 flex items-center justify-center p-4 font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold block">
                  EncDec SOC Gateway Protection
                </span>
                <h1 className="text-xl font-bold text-white font-sans">
                  Console Component Interrupted
                </h1>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              An unexpected runtime error occurred within the user interface view. Your authentication state and backend telemetry remain active and protected.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 border border-white/10 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-[11px]">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{this.state.error.name || 'Runtime Error'}:</span>
                </div>
                <p className="text-slate-300 text-[11px] break-all">
                  {this.state.error.message || 'Unknown error occurred'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Console</span>
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors border border-white/10 cursor-pointer"
              >
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
