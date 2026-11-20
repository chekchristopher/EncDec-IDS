/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';

interface TiltStage3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  disabled?: boolean;
  glareColor?: string;
  glareOpacity?: number;
  enableVolumetricDepth?: boolean;
}

/**
 * Pointer-responsive 3D perspective stage with optional volumetric preserve-3d depth
 * and optical specular glare. Stays zero-overhead at rest and touch-pan-y safe on mobile.
 */
export default function TiltStage3D({
  children,
  className = '',
  maxTilt = 4.5,
  disabled = false,
  glareColor = 'rgba(56, 189, 248, 0.48)',
  glareOpacity = 0.16,
  enableVolumetricDepth = false,
}: TiltStage3DProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [transformStyle, setTransformStyle] = useState<string>(
    'perspective(1400px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
  );
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 50,
    y: 50,
    visible: false,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.pointerType === 'touch') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * (maxTilt * 2);
    const rotateX = (0.5 - py) * (maxTilt * 2);

    setTransformStyle(
      `perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(0px)`
    );
    setGlarePos({ x: Math.round(px * 100), y: Math.round(py * 100), visible: true });
  };

  const handlePointerLeave = () => {
    setTransformStyle('perspective(1400px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
    setGlarePos((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={frameRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative touch-pan-y transition-transform duration-200 ease-out ${
        glarePos.visible ? 'will-change-transform' : ''
      } ${className}`}
      style={
        glarePos.visible || enableVolumetricDepth
          ? {
              transform: transformStyle,
              transformStyle: 'preserve-3d',
            }
          : undefined
      }
    >
      {children}
      {/* Subtle optical specular highlight on pointer hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: glarePos.visible ? glareOpacity : 0,
          background: `radial-gradient(520px circle at ${glarePos.x}% ${glarePos.y}%, ${glareColor}, transparent 65%)`,
          transform: enableVolumetricDepth ? 'translateZ(1px)' : undefined,
        }}
      />
    </div>
  );
}
