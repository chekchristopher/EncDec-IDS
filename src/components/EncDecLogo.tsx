/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EncDecLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export default function EncDecLogo({ className = '', size = 'md', showGlow = false }: EncDecLogoProps) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const dimension = sizeMap[size] || sizeMap.md;

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dimension} ${className}`} id="encdec-app-logo">
      {showGlow && (
        <div className="absolute inset-0 bg-cyan-500/10 rounded-xl blur-sm pointer-events-none" />
      )}
      <img 
        src="/encdec-icon.svg" 
        alt="EncDec IDS 2D Trust Shield" 
        className="w-full h-full object-contain relative z-10 transition-transform duration-200 hover:scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
