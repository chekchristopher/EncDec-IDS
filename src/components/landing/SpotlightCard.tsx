/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

/**
 * High-performance cursor-tracked specular surface & border spotlight card.
 * Updates CSS custom properties directly on the DOM node (zero React re-renders)
 * and ignores touch pointers so mobile scrolling remains locked at 60fps.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(34, 211, 238, 0.16)',
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${Math.round(e.clientX - rect.left)}px`);
    el.style.setProperty('--spot-y', `${Math.round(e.clientY - rect.top)}px`);
    el.style.setProperty('--spot-opacity', '1');
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--spot-opacity', '0');
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 transition-colors duration-300 hover:border-cyan-400/35 ${className}`}
      style={
        {
          '--spot-x': '50%',
          '--spot-y': '50%',
          '--spot-opacity': '0',
        } as React.CSSProperties
      }
    >
      {/* Cursor-following radial illumination */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: 'var(--spot-opacity)' as any,
          background: `radial-gradient(460px circle at var(--spot-x) var(--spot-y), ${spotlightColor}, transparent 68%)`,
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between gap-6">{children}</div>
    </div>
  );
}
