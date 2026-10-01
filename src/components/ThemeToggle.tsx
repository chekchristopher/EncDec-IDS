/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'switch';
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ 
  variant = 'icon', 
  className = '',
  showLabel = false 
}: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  if (variant === 'button') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
          isDark 
            ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-cyan-500/30' 
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm'
        } ${className}`}
        id="theme-toggle-btn-full"
      >
        <div className="flex items-center gap-2">
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-cyan-400 transition-transform duration-300 hover:rotate-12" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform duration-300 hover:rotate-45" />
          )}
          <span className="font-medium">
            {isDark ? 'Dark Console Mode' : 'Light Console Mode'}
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
          isDark ? 'bg-slate-800 text-cyan-400' : 'bg-slate-100 text-amber-600'
        }`}>
          {isDark ? 'Dark' : 'Light'}
        </span>
      </button>
    );
  }

  if (variant === 'switch') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
          isDark ? 'bg-cyan-600' : 'bg-amber-400'
        } ${className}`}
        id="theme-toggle-switch"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        >
          {isDark ? (
            <Moon className="w-3 h-3 text-slate-900" />
          ) : (
            <Sun className="w-3 h-3 text-amber-600" />
          )}
        </span>
      </button>
    );
  }

  // Default 'icon' variant for header bars
  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      className={`p-2 min-h-[38px] min-w-[38px] rounded-lg transition-all cursor-pointer flex items-center justify-center border ${
        isDark
          ? 'bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white border-white/10 hover:border-cyan-500/40 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 hover:border-slate-300 shadow-sm'
      } ${className}`}
      id="theme-toggle-btn-icon"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-cyan-600 transition-transform duration-300 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-mono font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
