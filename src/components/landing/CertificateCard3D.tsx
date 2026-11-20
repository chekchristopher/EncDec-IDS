/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Award } from 'lucide-react';
import TiltStage3D from './TiltStage3D.js';

interface CertificateCard3DProps {
  totalCertified: number | null;
  averageScore: number | null;
  onVerifyClick: () => void;
}

// Deterministic decorative QR schematic pattern representing EncDec's public /api/certificates/verify/:id endpoint
const QR_BITS = [
  1, 1, 1, 0, 1, 0, 1, 1, 1,
  1, 0, 1, 1, 0, 1, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1, 1, 1,
  0, 1, 0, 1, 1, 0, 0, 1, 0,
  1, 0, 1, 1, 0, 1, 1, 0, 1,
  0, 1, 1, 0, 1, 0, 0, 1, 1,
  1, 1, 1, 0, 1, 1, 1, 0, 1,
  1, 0, 1, 1, 0, 0, 0, 1, 0,
  1, 1, 1, 0, 1, 0, 1, 1, 1,
];

export default function CertificateCard3D({
  totalCertified,
  averageScore,
  onVerifyClick,
}: CertificateCard3DProps) {
  const [tapTilted, setTapTilted] = useState(false);

  return (
    <TiltStage3D
      maxTilt={8}
      enableVolumetricDepth={true}
      glareColor="rgba(103, 232, 249, 0.55)"
      glareOpacity={0.28}
      className="w-full max-w-md mx-auto"
    >
      <div
        onClick={() => setTapTilted((prev) => !prev)}
        role="group"
        aria-label="CE-SOC 3D Holographic Credential Preview"
        className="encdec-dark-card encdec-holo-card relative rounded-2xl border border-cyan-300/35 bg-gradient-to-br from-[#07152a] via-[#0c1d38] to-[#050e1f] p-5 sm:p-6 shadow-[0_28px_65px_-18px_rgba(2,6,23,0.92)] overflow-hidden transition-transform duration-300 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: tapTilted ? 'perspective(1100px) rotateX(6deg) rotateY(-8deg)' : undefined,
        }}
      >
        {/* Subtle Iridescent Metallic Foil Sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-12 opacity-25"
          style={{
            background:
              'linear-gradient(125deg, transparent 22%, rgba(34,211,238,0.45) 42%, rgba(16,185,129,0.35) 52%, rgba(125,211,252,0.42) 62%, transparent 78%)',
          }}
        />

        {/* Top Credential Header (Elevated in Z-Space) */}
        <div
          className="relative flex items-start justify-between gap-3"
          style={{ transform: 'translateZ(18px)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-cyan-400/45 bg-[#091c36] flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(34,211,238,0.3)]">
              <Award className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
                EncDec Academy
              </p>
              <p className="text-sm font-bold text-white truncate">
                CE-SOC Specialist
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] text-emerald-300 border border-emerald-400/35 bg-[#061c20] px-2 py-0.5 rounded shrink-0">
            QR Verified
          </span>
        </div>

        {/* Center Metallic Plate with Live Registry Telemetry */}
        <div
          className="relative mt-5 rounded-xl border border-white/12 bg-[#050d1d]/90 p-4 flex items-center justify-between gap-4"
          style={{ transform: 'translateZ(26px)' }}
        >
          <div className="space-y-1.5 min-w-0">
            <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
              Academic Standard
            </p>
            <p className="text-xs font-semibold text-white">
              10-Chapter Workbook · 220+ Bank
            </p>
            <p className="font-mono text-[11px] text-cyan-300 tabular-nums">
              10-Min Randomized · 80% Min
            </p>
            <div className="pt-1 flex items-center gap-3 font-mono text-[10px] text-slate-300 tabular-nums">
              <span>
                Registry:{' '}
                <strong className="text-white">
                  {totalCertified !== null ? `${totalCertified} Issued` : 'Live'}
                </strong>
              </span>
              {averageScore !== null && averageScore > 0 && (
                <span>
                  Avg: <strong className="text-emerald-300">{averageScore}%</strong>
                </span>
              )}
            </div>
          </div>

          {/* Crisp Mini QR Verification Matrix */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerifyClick();
            }}
            aria-label="Open CE-SOC QR Certificate Verifier"
            className="shrink-0 p-2 rounded-lg border border-cyan-400/30 bg-[#0b1930] hover:border-cyan-300 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 90 90" className="w-14 h-14" aria-hidden="true">
              {QR_BITS.map((bit, i) => {
                if (!bit) return null;
                const x = (i % 9) * 10 + 1;
                const y = Math.floor(i / 9) * 10 + 1;
                return <rect key={i} x={x} y={y} width="8" height="8" rx="1.5" fill="#67e8f9" />;
              })}
            </svg>
          </button>
        </div>

        {/* Bottom Seal Strip */}
        <div
          className="relative mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-slate-400"
          style={{ transform: 'translateZ(14px)' }}
        >
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>CERT-ENCDEC-2026</span>
          </span>
          <span className="text-cyan-300">Public Registry Active</span>
        </div>
      </div>
    </TiltStage3D>
  );
}
