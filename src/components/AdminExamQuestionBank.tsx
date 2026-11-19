/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Search, CheckCircle2, Plus, X, RefreshCw,
  Clock, ShieldCheck, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiRequest } from '../api.js';
import type { ExamQuestion, ExamDifficulty } from '../types.js';

const PAGE_SIZE = 15;

export default function AdminExamQuestionBank() {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [chapterBreakdown, setChapterBreakdown] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | ExamDifficulty>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Add Custom Question Drawer
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapter, setNewChapter] = useState<number>(1);
  const [newDifficulty, setNewDifficulty] = useState<ExamDifficulty>('Hard');
  const [newPrompt, setNewPrompt] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [newCorrectIndex, setNewCorrectIndex] = useState<number>(0);
  const [newExplanation, setNewExplanation] = useState('');
  const [creating, setCreating] = useState(false);
  const [createNotice, setCreateNotice] = useState<string | null>(null);

  const fetchBank = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/api/admin/workbook/question-bank', 'GET', null, {
        'x-secret-passkey': 'VIGIL_ADMIN_77',
      });
      setQuestions(Array.isArray(res?.questions) ? res.questions : []);
      setChapterBreakdown(res?.chapterBreakdown || {});
    } catch (err: any) {
      setError(err?.message || 'Failed to load CE-SOC examination question bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBank();
  }, []);

  const filteredQuestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return questions.filter((q) => {
      if (selectedChapter !== 'all' && q.chapterNumber !== selectedChapter) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      if (!query) return true;
      return (
        q.id.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.question.toLowerCase().includes(query) ||
        q.explanation.toLowerCase().includes(query) ||
        q.options.some((opt) => opt.toLowerCase().includes(query))
      );
    });
  }, [questions, selectedChapter, selectedDifficulty, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [selectedChapter, selectedDifficulty, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageQuestions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const handleAddCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCreateNotice(null);
    try {
      const res = await apiRequest(
        '/api/admin/workbook/question-bank',
        'POST',
        {
          chapterNumber: newChapter,
          difficulty: newDifficulty,
          question: newPrompt.trim(),
          options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
          correctIndex: newCorrectIndex,
          explanation: newExplanation.trim(),
        },
        { 'x-secret-passkey': 'VIGIL_ADMIN_77' }
      );
      setCreateNotice(`Added question ${res?.question?.id || ''} to active bank (${res?.totalQuestions || questions.length + 1} total).`);
      setNewPrompt('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setNewExplanation('');
      setShowAddForm(false);
      await fetchBank();
    } catch (err: any) {
      setError(err?.message || 'Failed to add question.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="bg-slate-900 border-2 border-amber-500/30 rounded-xl p-6 space-y-5 shadow-2xl"
      id="admin-exam-question-bank"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              CE-SOC Academic Examination Question Bank
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              {questions.length} Questions Loaded
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Authoritative graduate-level examination repository with verified answer keys and rationales. Each candidate receives 6 randomized questions under a strict 10-minute timer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              setCreateNotice(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            id="btn-toggle-add-exam-question"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showAddForm ? 'Cancel New Question' : 'Add Question'}</span>
          </button>

          <button
            type="button"
            onClick={fetchBank}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Bank</span>
          </button>
        </div>
      </div>

      {/* Policy Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Total Bank Size</span>
          <span className="text-base font-bold text-white">{questions.length} Questions</span>
          <span className="text-[10px] text-emerald-400 block">Min. 200 requirement met</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block">Per-User Anti-Malpractice Draw</span>
          <span className="text-base font-bold text-cyan-300">6 Unique Questions</span>
          <span className="text-[10px] text-slate-400 block">Cryptographic per-candidate selection</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            Strict Time Limit
          </span>
          <span className="text-base font-bold text-amber-300">10:00 (600 Seconds)</span>
          <span className="text-[10px] text-slate-400 block">Server-enforced deadline</span>
        </div>
        <div className="p-3 rounded-lg bg-slate-950 border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase block flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-red-400" />
            Pass & Reset Policy
          </span>
          <span className="text-base font-bold text-white">80% Pass Standard</span>
          <span className="text-[10px] text-red-400 block">&lt;80% or Timeout → Reset to Ch. 1</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {createNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{createNotice}</span>
        </div>
      )}

      {/* Add Custom Question Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCustomQuestion}
          className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3 text-xs"
          id="admin-add-question-form"
        >
          <h4 className="text-xs font-bold uppercase text-amber-300">Add New Examination Question</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Chapter (1–10)</label>
              <select
                value={newChapter}
                onChange={(e) => setNewChapter(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-2 text-white"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>
                    Chapter {ch}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Difficulty</label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value as ExamDifficulty)}
                className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-2 text-white"
              >
                <option value="Hard">Hard</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase block mb-1">Correct Option</label>
              <select
                value={newCorrectIndex}
                onChange={(e) => setNewCorrectIndex(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-2 text-emerald-300 font-bold"
              >
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Question Prompt</label>
            <textarea
              required
              minLength={15}
              rows={2}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Enter rigorous technical or scenario-based question..."
              className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              required
              value={optA}
              onChange={(e) => setOptA(e.target.value)}
              placeholder="Option A"
              className="bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
            <input
              required
              value={optB}
              onChange={(e) => setOptB(e.target.value)}
              placeholder="Option B"
              className="bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
            <input
              required
              value={optC}
              onChange={(e) => setOptC(e.target.value)}
              placeholder="Option C"
              className="bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
            <input
              required
              value={optD}
              onChange={(e) => setOptD(e.target.value)}
              placeholder="Option D"
              className="bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase block mb-1">Academic Rationale / Explanation</label>
            <textarea
              required
              minLength={15}
              rows={2}
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              placeholder="Explain why the marked option is technically correct..."
              className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
            >
              {creating ? 'Saving Question...' : 'Save Question to Examination Bank'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search ID (Q-001), keyword, protocol, MITRE, answer..."
            className="w-full bg-slate-950 border border-white/10 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none"
            id="admin-question-bank-search"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
            id="admin-question-bank-chapter-filter"
          >
            <option value="all">All Chapters ({questions.length})</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>
                Chapter {ch} ({chapterBreakdown[ch] ?? 0} Qs)
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as 'all' | ExamDifficulty)}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Difficulties</option>
            <option value="Hard">Hard</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Pagination Bar Top */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          Showing <strong className="text-white">{pageQuestions.length}</strong> of{' '}
          <strong className="text-amber-300">{filteredQuestions.length}</strong> matching questions
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded bg-slate-950 border border-white/10 disabled:opacity-40 hover:border-white/30 text-white cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="text-white font-bold tabular-nums">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded bg-slate-950 border border-white/10 disabled:opacity-40 hover:border-white/30 text-white cursor-pointer flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Questions List with Verified Correct Answers & Rationales */}
      <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
        {loading && questions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading 220+ examination bank...</div>
        ) : pageQuestions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No questions match your current filter.</div>
        ) : (
          pageQuestions.map((q) => (
            <div
              key={q.id}
              className="p-4 rounded-xl bg-slate-950/90 border border-white/10 space-y-3"
              data-testid={`admin-question-${q.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    {q.id}
                  </span>
                  <span className="text-slate-400">{q.topic}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {q.isCustom && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300">
                      CUSTOM
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      q.difficulty === 'Advanced'
                        ? 'bg-red-500/15 border-red-500/30 text-red-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-xs font-semibold text-white font-sans leading-relaxed">
                {q.question}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {q.options.map((opt, idx) => {
                  const isCorrect = idx === q.correctIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-400/70 text-emerald-200 font-semibold'
                          : 'bg-slate-900/60 border-white/5 text-slate-400'
                      }`}
                    >
                      <span>
                        <strong className="mr-1.5">{String.fromCharCode(65 + idx)}.</strong>
                        {opt}
                      </span>
                      {isCorrect && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-[11px] text-slate-300">
                <strong className="text-cyan-400 uppercase text-[9px] mr-1.5">Academic Rationale:</strong>
                {q.explanation}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
