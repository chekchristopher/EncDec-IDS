/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, Download, Shield, Activity, Terminal, Database, 
  Mail, CheckCircle, Search, ChevronRight, FileText, Sparkles, 
  Layers, Lock, ExternalLink, HelpCircle, ArrowRight
} from 'lucide-react';
import { WORKBOOK_DATA, generateWorkbookPdf } from '../services/workbookPdf.js';

export default function EncDecWorkbook() {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);

  const activeSection = WORKBOOK_DATA[activeChapterIndex];

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      generateWorkbookPdf();
    } catch (err) {
      console.error('Failed to export Workbook PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const filteredSections = WORKBOOK_DATA.filter((sec) => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.content.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="encdec-workbook-view">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">EncDec IDS Workbook</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold uppercase">
                Official Operations Manual
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-1 max-w-2xl leading-relaxed">
              Comprehensive 8-Chapter documentary and operational manual explaining every layer of the EncDec Hybrid Intrusion Detection System. Fully elucidated for SOC analysts, system administrators, and security auditors.
            </p>
          </div>
        </div>

        {/* Action Button: Download Full PDF */}
        <div className="relative z-10 shrink-0">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            id="btn-download-workbook-pdf"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Compiling PDF...' : 'Download EncDec IDS Workbook (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chapter Navigation & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chapters Directory */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Search Box */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search topics, protocols, rules, FIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Chapters List */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-3 space-y-1.5 font-mono">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Curriculum Chapters (1-8)</span>
              <span className="text-[10px] text-cyan-400">{WORKBOOK_DATA.length} Modules</span>
            </div>

            <div className="space-y-1">
              {filteredSections.map((sec, idx) => {
                const originalIndex = WORKBOOK_DATA.findIndex((s) => s.chapter === sec.chapter);
                const isActive = originalIndex === activeChapterIndex;

                return (
                  <button
                    key={sec.chapter}
                    onClick={() => setActiveChapterIndex(originalIndex)}
                    className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                      isActive
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          isActive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {sec.chapter}
                        </span>
                        <span className="text-xs font-bold truncate text-white">
                          {sec.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {sec.summary}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-transform ${isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick PDF Export Box */}
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 text-xs font-mono space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <FileText className="w-4 h-4" />
              <span>Full Multi-Page PDF Edition</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Export the complete 9-page formal operations manual with styled headers, technical specification matrices, and compliance frameworks.
            </p>
            <button
              onClick={handleDownloadPdf}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-lg border border-cyan-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Offline PDF</span>
            </button>
          </div>

        </div>

        {/* Right Column: Chapter Reader */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
            
            {/* Chapter Header */}
            <div className="border-b border-white/5 pb-5 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {activeSection.chapter}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-sans">Module Documentation</span>
              </div>
              <h3 className="text-2xl font-bold text-white font-sans tracking-tight">
                {activeSection.title}
              </h3>
            </div>

            {/* Executive Summary Callout */}
            <div className="p-4 rounded-xl bg-slate-950 border-l-4 border-cyan-500 border-y border-r border-white/5 text-xs text-slate-300 font-mono leading-relaxed">
              <span className="text-cyan-400 font-bold uppercase tracking-wider block mb-1">Executive Summary:</span>
              {activeSection.summary}
            </div>

            {/* Main Explanatory Content */}
            <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
              {activeSection.content.map((paragraph, pIdx) => {
                const isHeading = /^\d+\./.test(paragraph);
                return (
                  <div 
                    key={pIdx} 
                    className={`p-3 rounded-lg ${
                      isHeading 
                        ? 'bg-slate-950/60 border border-white/5 text-white' 
                        : 'text-slate-300'
                    }`}
                  >
                    <p className={isHeading ? 'font-bold text-cyan-200' : 'text-slate-300 leading-relaxed font-sans text-sm'}>
                      {paragraph}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Optional Technical Matrix Table */}
            {activeSection.tables && (
              <div className="space-y-2 font-mono">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Technical Specification Matrix</span>
                </h4>
                
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
                      <tr>
                        {activeSection.tables.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-900/80">
                      {activeSection.tables.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`p-3 font-mono text-[11px] ${cIdx === 0 ? 'font-bold text-cyan-300' : 'text-slate-300'}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Key Takeaways & Operator Checklist */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 space-y-3 font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle className="w-4 h-4" />
                <span>Operational Best Practices & Key Takeaways</span>
              </div>
              <ul className="space-y-2 text-xs text-emerald-200/90">
                {activeSection.keyTakeaways.map((takeaway, tIdx) => (
                  <li key={tIdx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Chapter Navigation Footer */}
            <div className="flex items-center justify-between border-t border-white/5 pt-5">
              <button
                onClick={() => setActiveChapterIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeChapterIndex === 0}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                ← Previous Chapter
              </button>

              <span className="text-xs text-slate-500 font-mono">
                Chapter {activeChapterIndex + 1} of {WORKBOOK_DATA.length}
              </span>

              <button
                onClick={() => setActiveChapterIndex((prev) => Math.min(WORKBOOK_DATA.length - 1, prev + 1))}
                disabled={activeChapterIndex === WORKBOOK_DATA.length - 1}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-mono transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next Chapter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
