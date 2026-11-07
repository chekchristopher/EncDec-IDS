/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Download, Shield, Activity, Terminal, Database, 
  Mail, CheckCircle, Search, ChevronRight, FileText, Sparkles, 
  Layers, Lock, ExternalLink, HelpCircle, ArrowRight, Award,
  CheckCircle2, Eye, RotateCcw, X, Share2, Printer, Star,
  Bookmark, Cloud, MapPin, Check, AlertCircle, HelpCircle as QuizIcon,
  RefreshCw, CheckSquare, Copy, FileCheck, ShieldAlert, Award as CertIcon,
  User, CheckCheck, SlidersHorizontal, QrCode
} from 'lucide-react';
import { apiRequest } from '../api.js';
import { WORKBOOK_DATA, generateWorkbookPdf } from '../services/workbookPdf.js';
import { 
  generateCertificatePdf, 
  generateCertificatePdfWithQr,
  generateQrCodeDataUrl,
  createCertificatePdfDoc, 
  CertificateData 
} from '../services/certificatePdf.js';

interface EncDecWorkbookProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
}

interface QuizQuestion {
  id: number;
  question: string;
  topic: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    topic: 'Chapter 3: Network IDS & DPI',
    question: "What distinguishes EncDec's Deep Packet Inspection (DPI) engine from standard layer-3/4 packet filters?",
    options: [
      "It only inspects TCP/UDP headers and source/destination port numbers.",
      "It reassembles Application Layer-7 payloads to detect shellcode, SQL injections, and malicious strings.",
      "It converts all incoming network traffic into cleartext files on the local disk.",
      "It completely replaces physical network switches with unmonitored software routers."
    ],
    correctIndex: 1,
    explanation: "DPI reconstructs application protocols (HTTP, DNS, SSH, TLS) and analyzes hex payloads for known attack signatures beyond basic IP/port filtering."
  },
  {
    id: 2,
    topic: 'Chapter 4: Host IDS & FIM',
    question: "How does EncDec's File Integrity Monitoring (FIM) identify unauthorized tampering with critical system files (e.g., /etc/passwd)?",
    options: [
      "By continuously computing and diffing cryptographic SHA-256 hashes against verified baselines.",
      "By manually prompting SOC operators every hour to verify file byte lengths.",
      "By permanently preventing all administrators from modifying server configuration files.",
      "By deleting any file that has been modified within the last 30 days."
    ],
    correctIndex: 0,
    explanation: "FIM calculates SHA-256 hashes of critical system directories and instantly alerts when a hash diverges from the authorized baseline benchmark."
  },
  {
    id: 3,
    topic: 'Chapter 6: TopoJSON Geodesic Incursion Telemetry',
    question: "Which mathematical model is utilized by EncDec's D3.js engine to render smooth incursion trajectories from attacking IPs to the protected node?",
    options: [
      "Linear point-to-point scatterplots without geographic projection.",
      "Quadratic Bézier curves computed across D3 Natural Earth geographic coordinates.",
      "Static satellite bitmap overlays without real-time animation.",
      "Unanchored random noise generators."
    ],
    correctIndex: 1,
    explanation: "Quadratic Bézier curves (M sx sy Q mx my tx ty) animate curved geodesic arcs from origin threat coordinates to the defended portal."
  },
  {
    id: 4,
    topic: 'Chapter 5: Threat Intelligence & MITRE ATT&CK',
    question: "What is the primary operational advantage of mapping intrusion alerts to the MITRE ATT&CK framework?",
    options: [
      "It automatically purges raw alert logs to reduce database storage.",
      "It standardizes adversary Tactics, Techniques, and Procedures (TTPs) for faster containment and threat attribution.",
      "It disables endpoint security software during recognized penetration tests.",
      "It guarantees that attackers cannot spoof their IP addresses."
    ],
    correctIndex: 1,
    explanation: "MITRE ATT&CK classifies detected anomalies into standardized tactics (e.g., T1110 brute force, T1498 DoS) to guide incident response playbooks."
  },
  {
    id: 5,
    topic: 'Chapter 8: Dual Database Architecture',
    question: "In EncDec's dual-database resilience architecture, how do Google Cloud Firestore and Microsoft SQL Server collaborate?",
    options: [
      "Firestore acts as the sub-millisecond real-time WebSocket stream layer, while MSSQL provides immutable relational ACID auditing.",
      "Firestore is used only for image storage, while MSSQL handles all network packet captures.",
      "Both databases are shut down during active cyberattacks to preserve computing power.",
      "MSSQL replaces Firestore entirely and disables all real-time notifications."
    ],
    correctIndex: 0,
    explanation: "Firestore broadcasts live sub-millisecond events to analyst consoles, while MSSQL maintains relational integrity and long-term regulatory compliance."
  },
  {
    id: 6,
    topic: 'Chapter 7: Distributed Sensor Fabric & Containment',
    question: "When multi-stage incident correlation (e.g. INC-1042) exceeds critical confidence thresholds, what autonomous response can EncDec initiate?",
    options: [
      "IP border null-routing, rogue daemon SIGKILL termination, and network interface isolation.",
      "Dispatching promotional marketing surveys to the attacking subnet.",
      "Erasing the SOC audit logs to hide that an intrusion occurred.",
      "Shutting down all university campus electrical power grids immediately."
    ],
    correctIndex: 0,
    explanation: "The automated active response engine executes perimeter null-routing, kernel process termination, and host quarantine in sub-second windows."
  }
];

const STORAGE_READ_KEY = 'encdec_workbook_read_chapters';
const STORAGE_POS_KEY = 'encdec_workbook_last_position';
const STORAGE_QUIZ_KEY = 'encdec_workbook_quiz_status';

/**
 * Splits a full name string into First, Middle, and Last name components.
 */
function parseNameParts(fullName: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Chris', middle: '', last: 'Analyst' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return { 
    first: parts[0], 
    middle: parts.slice(1, -1).join(' '), 
    last: parts[parts.length - 1] 
  };
}

export default function EncDecWorkbook({ currentUser }: EncDecWorkbookProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [lastReadParagraphIndex, setLastReadParagraphIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  // View state: 'reader' | 'quiz' | 'certificate_download'
  const [activeView, setActiveView] = useState<'reader' | 'quiz' | 'certificate_download'>('reader');

  // Database Persistence States
  const [isSyncingWithDb, setIsSyncingWithDb] = useState(false);
  const [dbLastSavedTime, setDbLastSavedTime] = useState<string | null>(null);
  const [resumeNotification, setResumeNotification] = useState<string | null>(null);
  const [justSavedIndex, setJustSavedIndex] = useState<number | null>(null);

  // Knowledge Check Quiz States
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Chapter Reading Progress State
  const [readChapters, setReadChapters] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_READ_KEY);
      return stored ? JSON.parse(stored) : [0];
    } catch {
      return [0];
    }
  });

  // Candidate Name Arrangement States (First, Middle, Last)
  const initialNameParts = parseNameParts(currentUser?.name || 'Chris Analyst');
  const [candidateFirstName, setCandidateFirstName] = useState(initialNameParts.first);
  const [candidateMiddleName, setCandidateMiddleName] = useState(initialNameParts.middle);
  const [candidateLastName, setCandidateLastName] = useState(initialNameParts.last);
  const [nameArrangementFormat, setNameArrangementFormat] = useState<'standard' | 'initial' | 'surname_first'>('standard');
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingActionAfterName, setPendingActionAfterName] = useState<'download' | 'print' | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Modals & UI States
  const [showSampleCert, setShowSampleCert] = useState(false);
  const [showEarnedCertModal, setShowEarnedCertModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(currentUser?.email || 'chekchris85@gmail.com');
  const [copiedHash, setCopiedHash] = useState(false);

  // Official Certificate QR Code & Verification States
  const [activeCertId, setActiveCertId] = useState<string>(() => {
    return `CERT-ENCDEC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  });
  const [certQrCodeUrl, setCertQrCodeUrl] = useState<string | null>(null);
  const [certVerificationUrl, setCertVerificationUrl] = useState<string | null>(null);
  const [isRegisteringCert, setIsRegisteringCert] = useState(false);

  // Sync recipient details if currentUser changes
  useEffect(() => {
    if (currentUser?.name) {
      const parts = parseNameParts(currentUser.name);
      setCandidateFirstName(parts.first);
      setCandidateMiddleName(parts.middle);
      setCandidateLastName(parts.last);
    }
    if (currentUser?.email) setRecipientEmail(currentUser.email);
  }, [currentUser]);

  // Load progress and quiz status from Database on initial mount
  useEffect(() => {
    const fetchProgressFromDatabase = async () => {
      try {
        const res = await apiRequest('/api/workbook/progress');
        if (res && res.progress) {
          const p = res.progress;
          if (typeof p.chapterIndex === 'number' && p.chapterIndex >= 0 && p.chapterIndex < WORKBOOK_DATA.length) {
            setActiveChapterIndex(p.chapterIndex);
          }
          if (typeof p.paragraphIndex === 'number' && p.paragraphIndex >= 0) {
            setLastReadParagraphIndex(p.paragraphIndex);
          }
          if (Array.isArray(p.readChapters) && p.readChapters.length > 0) {
            setReadChapters(p.readChapters);
          }
          if (typeof p.quizPassed === 'boolean') {
            setQuizPassed(p.quizPassed);
            if (typeof p.quizScore === 'number') {
              setQuizScore(p.quizScore);
              setQuizSubmitted(true);
            }
          }
          if (p.lastReadAt) {
            const timeStr = new Date(p.lastReadAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setDbLastSavedTime(p.lastReadAt);
            setResumeNotification(`Resumed from database: Chapter ${p.chapterIndex + 1}, Section ${p.paragraphIndex + 1} (${timeStr})`);
            setTimeout(() => setResumeNotification(null), 6000);
          }
        }
      } catch (err) {
        console.warn('Operating in offline/cached workbook mode, could not fetch from database:', err);
      }
    };

    fetchProgressFromDatabase();
  }, []);

  // Persist read chapters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(readChapters));
    } catch {
      // localStorage fallback
    }
  }, [readChapters]);

  // Save progress & last read position to Database and localStorage
  const persistProgressToDb = async (chIdx: number, pIdx: number, markCompleted = false, passed = quizPassed, score = quizScore) => {
    setIsSyncingWithDb(true);
    setJustSavedIndex(pIdx);
    setTimeout(() => setJustSavedIndex(null), 2500);

    const safeReadChapters = readChapters.includes(chIdx) ? readChapters : [...readChapters, chIdx];

    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify({ chapterIndex: chIdx, paragraphIndex: pIdx }));
    } catch {
      // ignore
    }

    try {
      const res = await apiRequest('/api/workbook/progress', 'POST', {
        chapterIndex: chIdx,
        paragraphIndex: pIdx,
        chapterTitle: WORKBOOK_DATA[chIdx]?.title || `Chapter ${chIdx + 1}`,
        readChapters: safeReadChapters,
        completed: markCompleted,
        quizPassed: passed,
        quizScore: score
      });

      if (res && res.progress) {
        setDbLastSavedTime(res.progress.lastReadAt);
      }
    } catch (err) {
      console.warn('Failed to sync workbook reading position to database:', err);
    } finally {
      setIsSyncingWithDb(false);
    }
  };

  const activeSection = WORKBOOK_DATA[activeChapterIndex] || WORKBOOK_DATA[0];
  const totalChapters = WORKBOOK_DATA.length;
  const isChaptersFinished = readChapters.length >= totalChapters;
  const isCertified = isChaptersFinished && quizPassed;
  const completionPercentage = Math.round(
    ((readChapters.length + (quizPassed ? 1 : 0)) / (totalChapters + 1)) * 100
  );

  const isCurrentChapterRead = readChapters.includes(activeChapterIndex);

  // Jump to last saved paragraph position
  const handleScrollToLastRead = () => {
    setActiveView('reader');
    setTimeout(() => {
      const el = document.getElementById(`workbook-paragraph-${lastReadParagraphIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Handler to mark chapter read and advance
  const handleMarkAsRead = (index: number) => {
    if (!readChapters.includes(index)) {
      const nextRead = [...readChapters, index];
      setReadChapters(nextRead);
      persistProgressToDb(index, 0, false);
    }
  };

  const handleNextChapter = () => {
    handleMarkAsRead(activeChapterIndex);
    if (activeChapterIndex < totalChapters - 1) {
      const nextIdx = activeChapterIndex + 1;
      setActiveChapterIndex(nextIdx);
      setLastReadParagraphIndex(0);
      setActiveView('reader');
      persistProgressToDb(nextIdx, 0);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      setActiveView('quiz');
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrevChapter = () => {
    if (activeView === 'certificate_download') {
      setActiveView('quiz');
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (activeView === 'quiz') {
      setActiveView('reader');
      setActiveChapterIndex(totalChapters - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (activeChapterIndex > 0) {
      const prevIdx = activeChapterIndex - 1;
      setActiveChapterIndex(prevIdx);
      setLastReadParagraphIndex(0);
      persistProgressToDb(prevIdx, 0);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleParagraphClick = (pIdx: number) => {
    setLastReadParagraphIndex(pIdx);
    persistProgressToDb(activeChapterIndex, pIdx);
  };

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

  // Quiz Handling
  const handleOptionSelect = (qId: number, optIdx: number) => {
    if (quizSubmitted && quizPassed) return;
    setQuizAnswers(prev => ({ ...prev, [qId]: optIdx }));
    setQuizError(null);
  };

  const handleSubmitQuiz = async () => {
    const answeredCount = Object.keys(quizAnswers).length;
    if (answeredCount < QUIZ_QUESTIONS.length) {
      setQuizError(`Please answer all ${QUIZ_QUESTIONS.length} questions before submitting.`);
      return;
    }

    let correctCount = 0;
    QUIZ_QUESTIONS.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) {
        correctCount += 1;
      }
    });

    const calculatedScore = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);
    const passed = calculatedScore >= 80;

    setQuizScore(calculatedScore);
    setQuizPassed(passed);
    setQuizSubmitted(true);
    setQuizError(null);

    await persistProgressToDb(
      activeChapterIndex, 
      lastReadParagraphIndex, 
      passed && isChaptersFinished, 
      passed, 
      calculatedScore
    );

    if (passed) {
      setTimeout(() => {
        setShowEarnedCertModal(true);
      }, 700);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizError(null);
  };

  // Computes the arranged full name based on candidate's First, Middle, Last and format
  const getArrangedFullName = (
    first = candidateFirstName, 
    middle = candidateMiddleName, 
    last = candidateLastName, 
    format = nameArrangementFormat
  ): string => {
    const f = first.trim();
    const m = middle.trim();
    const l = last.trim();

    if (!f && !l) return 'Security Operations Specialist';

    if (format === 'initial' && m) {
      const initial = m[0].toUpperCase() + '.';
      return [f, initial, l].filter(Boolean).join(' ');
    }

    if (format === 'surname_first' && l) {
      const rest = [f, m].filter(Boolean).join(' ');
      return rest ? `${l.toUpperCase()}, ${rest}` : l.toUpperCase();
    }

    // Default Standard: First Middle Last
    return [f, m, l].filter(Boolean).join(' ');
  };

  const currentArrangedFullName = getArrangedFullName();

  // Ensures the certificate is cryptographically registered in the database and QR code is ready
  const ensureCertificateRegistered = async (forcedId?: string): Promise<{ qrDataUrl: string; vUrl: string }> => {
    const targetId = forcedId || activeCertId;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const vUrl = `${origin}/verify/${encodeURIComponent(targetId)}`;
    setCertVerificationUrl(vUrl);

    try {
      setIsRegisteringCert(true);
      const res = await apiRequest('/api/certificates/register', 'POST', {
        certificateId: targetId,
        firstName: candidateFirstName.trim() || 'Chris',
        middleName: candidateMiddleName.trim() || '',
        lastName: candidateLastName.trim() || 'Analyst',
        fullName: currentArrangedFullName,
        recipientEmail: (recipientEmail || 'operator@coou.edu.ng').trim(),
        courseTitle: 'Certified EncDec IDS SOC Specialist (CE-SOC)',
        accreditationLevel: 'Tier-III Cyber Operations • Comprehensive Defense Mastery',
        quizScore: quizScore || 100,
        quizPassed: quizPassed,
        issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      });

      if (res && res.qrCodeDataUrl) {
        setCertQrCodeUrl(res.qrCodeDataUrl);
        if (res.verificationUrl) setCertVerificationUrl(res.verificationUrl);
        return { qrDataUrl: res.qrCodeDataUrl, vUrl: res.verificationUrl || vUrl };
      } else {
        const fallbackQr = await generateQrCodeDataUrl(vUrl);
        setCertQrCodeUrl(fallbackQr);
        return { qrDataUrl: fallbackQr, vUrl };
      }
    } catch (err) {
      console.warn('Certificate backend registry sync fallback to client QR generator:', err);
      const fallbackQr = await generateQrCodeDataUrl(vUrl);
      setCertQrCodeUrl(fallbackQr);
      return { qrDataUrl: fallbackQr, vUrl };
    } finally {
      setIsRegisteringCert(false);
    }
  };

  // Pre-generate QR code when opening the certificate download view
  useEffect(() => {
    if (activeView === 'certificate_download' && !certQrCodeUrl) {
      ensureCertificateRegistered();
    }
  }, [activeView, candidateFirstName, candidateLastName, candidateMiddleName, nameArrangementFormat]);

  // Certificate Data Factory
  const generateCertData = (isSample = false, customQrUrl?: string): CertificateData => {
    const certNumber = isSample 
      ? 'CERT-ENCDEC-SAMPLE-2026' 
      : activeCertId;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const vUrl = isSample 
      ? `${origin}/verify/CERT-ENCDEC-SAMPLE-2026` 
      : (certVerificationUrl || `${origin}/verify/${encodeURIComponent(certNumber)}`);

    return {
      recipientName: isSample ? 'Alexandra Vance (Sample Candidate)' : (currentArrangedFullName || 'Security Operations Specialist'),
      recipientEmail: isSample ? 'alex.vance@enterprise.sec' : (recipientEmail.trim() || 'operator@coou.edu.ng'),
      certificateId: certNumber,
      issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      courseTitle: 'Certified EncDec IDS SOC Specialist (CE-SOC)',
      accreditationLevel: 'Tier-III Cyber Operations • Comprehensive Defense Mastery',
      verificationCode: isSample 
        ? 'SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069' 
        : `SHA256: ${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`.toUpperCase(),
      quizScore: isSample ? 100 : (quizScore || 100),
      qrCodeDataUrl: isSample ? undefined : (customQrUrl || certQrCodeUrl || undefined),
      verificationUrl: vUrl,
      firstName: isSample ? 'Alexandra' : candidateFirstName,
      middleName: isSample ? 'Claire' : candidateMiddleName,
      lastName: isSample ? 'Vance' : candidateLastName
    };
  };

  // Certificate Download Action with QR Code
  const handleDownloadCertificate = async (isSample = false) => {
    setDownloadingCert(true);
    try {
      let qrUrl = certQrCodeUrl;
      if (!isSample && !qrUrl) {
        const registered = await ensureCertificateRegistered();
        qrUrl = registered.qrDataUrl;
      }
      const certData = generateCertData(isSample, qrUrl || undefined);
      await generateCertificatePdfWithQr(certData);
    } catch (err) {
      console.error('Failed to export certificate PDF:', err);
    } finally {
      setDownloadingCert(false);
    }
  };

  // Direct Browser Print Certificate Action (using hidden iframe)
  const handlePrintCertificate = async () => {
    try {
      let qrUrl = certQrCodeUrl;
      if (!qrUrl) {
        const registered = await ensureCertificateRegistered();
        qrUrl = registered.qrDataUrl;
      }
      const certData = generateCertData(false, qrUrl || undefined);
      const pdfDoc = createCertificatePdfDoc(certData);
      const blob = pdfDoc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.src = blobUrl;
      document.body.appendChild(printFrame);
      printFrame.onload = () => {
        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 200);
      };
    } catch (err) {
      console.error('Print iframe failed:', err);
      window.print();
    }
  };

  // Initiate action with Name Prompt Verification first
  const initiatePrint = () => {
    setPendingActionAfterName('print');
    setNameError(null);
    setShowNameModal(true);
  };

  const initiateDownload = (isSample = false) => {
    if (isSample) {
      handleDownloadCertificate(true);
      return;
    }
    setPendingActionAfterName('download');
    setNameError(null);
    setShowNameModal(true);
  };

  const handleConfirmNameAndProceed = () => {
    if (!candidateFirstName.trim()) {
      setNameError('Please enter candidate First Name.');
      return;
    }
    if (!candidateLastName.trim()) {
      setNameError('Please enter candidate Last Name / Surname.');
      return;
    }
    setNameError(null);
    setShowNameModal(false);

    const action = pendingActionAfterName;
    setPendingActionAfterName(null);

    if (action === 'print') {
      handlePrintCertificate();
    } else {
      handleDownloadCertificate(false);
    }
  };

  const handleCopyVerificationHash = (hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    });
  };

  const filteredSections = WORKBOOK_DATA.filter((sec) => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.content.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn" id="encdec-workbook-view">
      
      {/* ============================================================== */}
      {/* PROMINENT TOP CERTIFICATION PROGRESS & DOWNLOAD BAR             */}
      {/* ============================================================== */}
      <div className="bg-slate-900/95 border-2 border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden backdrop-blur-md" id="workbook-top-progress-bar">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          
          {/* Top Row: Metric & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm sm:text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Reading & Certification Progress Tracker</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  {completionPercentage}% COMPLETED
                </span>
                
                {/* Database Sync Indicator */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950 border border-white/10 text-[10px] font-mono text-slate-400">
                  <Cloud className={`w-3 h-3 ${isSyncingWithDb ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
                  <span>
                    {isSyncingWithDb 
                      ? 'Saving to Database...' 
                      : dbLastSavedTime 
                      ? `DB Synced (${new Date(dbLastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
                      : 'Database Ready'}
                  </span>
                </div>
              </div>

              {resumeNotification && (
                <div className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 animate-fadeIn">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{resumeNotification}</span>
                </div>
              )}

              <p className="text-xs text-slate-300 font-mono">
                {isCertified ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Official CE-SOC Credential unlocked for {currentArrangedFullName}! Download or print your high-resolution certificate PDF below.</span>
                  </span>
                ) : isChaptersFinished && !quizPassed ? (
                  <span className="text-amber-300 font-bold">
                    ★ All 10 chapters completed! Pass the Capstone Knowledge Check (80% minimum) to unlock high-resolution certificate PDF download.
                  </span>
                ) : (
                  <span>
                    Complete all 10 chapters and pass the Capstone Knowledge Check to download your verified <strong>Certified EncDec IDS SOC Specialist (CE-SOC)</strong> PDF certificate.
                  </span>
                )}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 font-mono">
              <button
                onClick={handleScrollToLastRead}
                className="px-3 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Scroll directly to your saved paragraph position"
                id="btn-resume-position-top"
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Resume Ch.{activeChapterIndex + 1} Sec.{lastReadParagraphIndex + 1}</span>
              </button>

              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase block">Curriculum Status</span>
                <span className="text-xs font-bold text-white">
                  {readChapters.length}/10 Chapters • Quiz: {quizPassed ? `Passed (${quizScore}%)` : 'Pending'}
                </span>
                <span className="text-[10px] text-cyan-400 block">
                  {isCertified 
                    ? 'Certificate Ready For Download' 
                    : !isChaptersFinished 
                    ? `${totalChapters - readChapters.length} chapter(s) remaining` 
                    : 'Pass quiz to unlock PDF'}
                </span>
              </div>

              {/* Dedicated Certificate Download Feature Trigger */}
              <button
                onClick={() => {
                  setActiveView('certificate_download');
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0 ${
                  isCertified
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                }`}
                id="btn-certificate-download-feature-top"
                title="Open the Certificate Download Station"
              >
                <Download className="w-4 h-4" />
                <span>{isCertified ? 'Download Certificate (PDF)' : 'Certificate Download Station'}</span>
              </button>
            </div>
          </div>

          {/* Continuous Glowing Progress Track */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-0.5 relative shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 transition-all duration-700 ease-out rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${Math.max(completionPercentage, 5)}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Chapter 1: Architecture</span>
              <span className="text-cyan-400 font-bold">
                {completionPercentage}% Progress ({readChapters.length}/10 Modules + {quizPassed ? 'Quiz Passed' : 'Quiz Required'})
              </span>
              <span>Candidate: <strong className="text-white">{currentArrangedFullName}</strong></span>
            </div>
          </div>

          {/* Interactive Stepper Nodes (Chapters 1 to 10 + Final Quiz + Certificate Download) */}
          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] font-mono text-slate-400 mb-2 flex items-center justify-between">
              <span>Curriculum & Certification Stepper:</span>
              <span className="text-slate-500">
                A4 Landscape High-Resolution PDF Issuance
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2">
              {WORKBOOK_DATA.map((ch, idx) => {
                const isRead = readChapters.includes(idx);
                const isCurrent = activeView === 'reader' && activeChapterIndex === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveView('reader');
                      setActiveChapterIndex(idx);
                      window.scrollTo({ top: 220, behavior: 'smooth' });
                    }}
                    title={`${ch.chapter}: ${ch.title} (${isRead ? 'Completed' : 'Pending'})`}
                    className={`py-2 px-1 rounded-lg text-center font-mono text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                        : isRead
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                        : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      {isRead ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{idx + 1}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold tracking-tighter truncate w-full block">
                      Ch.{idx + 1}
                    </span>
                  </button>
                );
              })}

              {/* 11th Node: Final Knowledge Check Exam */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('quiz');
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }}
                title="Capstone Knowledge Check Quiz"
                className={`py-2 px-1 rounded-lg text-center font-mono text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1 ${
                  activeView === 'quiz'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                    : quizPassed
                    ? 'bg-emerald-950/50 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950 border-amber-500/40 text-amber-400 hover:bg-amber-950/30'
                }`}
              >
                <div className="flex items-center justify-center">
                  {quizPassed ? (
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <QuizIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  )}
                </div>
                <span className="text-[9px] font-bold tracking-tighter truncate w-full block">
                  Exam
                </span>
              </button>

              {/* 12th Node: Certificate Download Feature */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('certificate_download');
                  window.scrollTo({ top: 220, behavior: 'smooth' });
                }}
                title="Certificate Download Feature"
                className={`py-2 px-1 rounded-lg text-center font-mono text-xs transition-all cursor-pointer border flex flex-col items-center justify-center gap-1 ${
                  activeView === 'certificate_download'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                    : isCertified
                    ? 'bg-emerald-950/70 border-emerald-400/80 text-emerald-300 animate-pulse'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:border-emerald-500/30 hover:text-white'
                }`}
                id="btn-stepper-cert-download"
              >
                <div className="flex items-center justify-center">
                  <Download className={`w-3.5 h-3.5 ${isCertified ? 'text-emerald-400' : 'text-slate-400'}`} />
                </div>
                <span className="text-[9px] font-bold tracking-tighter truncate w-full block">
                  Cert PDF
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-white/10 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
                EncDec IDS Master Workbook & Certification
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold uppercase">
                Upgraded v4.2 Software Edition
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-emerald-400" />
                Proper Candidate Name Arrangement
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono mt-1.5 max-w-2xl leading-relaxed">
              Complete 10-Chapter master operational curriculum and Capstone Knowledge Check. Verify candidate first, middle, and last name for proper academic arrangement before printing or downloading your high-resolution certificate.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => {
              setActiveView('certificate_download');
              window.scrollTo({ top: 180, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 font-mono text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Open Certificate Download Feature"
            id="btn-header-open-cert-download"
          >
            <CertIcon className="w-4 h-4 text-emerald-400" />
            <span>Certificate Download Station</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-mono text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            id="btn-download-workbook-pdf"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Compiling PDF...' : 'Download Full PDF (Offline)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chapter Navigation & Active View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chapters Directory, Assessment & Certificate Download Links */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Search Box */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search topics, protocols, D3, TopoJSON, FIM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Chapters List */}
          <div className="bg-slate-900 border border-white/5 rounded-xl p-3 space-y-1.5 font-mono">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Curriculum Modules (1-10)</span>
              <span className="text-[10px] text-cyan-400">{readChapters.length}/{totalChapters} Read</span>
            </div>

            <div className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
              {filteredSections.map((sec) => {
                const originalIndex = WORKBOOK_DATA.findIndex(s => s.chapter === sec.chapter);
                const isSelected = activeView === 'reader' && originalIndex === activeChapterIndex;
                const isRead = readChapters.includes(originalIndex);

                return (
                  <button
                    key={sec.chapter}
                    onClick={() => {
                      setActiveView('reader');
                      setActiveChapterIndex(originalIndex);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : isRead
                        ? 'bg-slate-950/60 border-emerald-500/20 text-slate-300 hover:border-white/20 hover:bg-slate-950'
                        : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/20 hover:bg-slate-950'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isRead ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-500">
                          {originalIndex + 1}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {sec.chapter}
                        </span>
                        {isRead && (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">Done</span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>
                        {sec.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Assessment Button in Left Sidebar */}
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <button
                onClick={() => {
                  setActiveView('quiz');
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer font-mono ${
                  activeView === 'quiz'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : quizPassed
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950 border-amber-500/30 text-amber-300 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Final Assessment</span>
                    <span className="text-xs font-bold text-white">Knowledge Check Quiz</span>
                  </div>
                </div>

                {quizPassed ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    Passed {quizScore}%
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    80% to Pass
                  </span>
                )}
              </button>

              {/* DEDICATED CERTIFICATE DOWNLOAD BUTTON IN SIDEBAR */}
              <button
                onClick={() => {
                  setActiveView('certificate_download');
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer font-mono ${
                  activeView === 'certificate_download'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-400'
                    : isCertified
                    ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/20'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
                id="btn-sidebar-cert-download"
              >
                <div className="flex items-center gap-2">
                  <Download className={`w-4 h-4 shrink-0 ${isCertified ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Accreditation Feature</span>
                    <span className="text-xs font-bold text-white">Certificate Download</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isCertified 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isCertified ? 'PDF Ready' : 'Requirements'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Offline PDF Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-white/5 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Download className="w-4 h-4" />
              <span>Offline Study Resource</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Prefer reading offline or on mobile? Export the entire 10-chapter curriculum with high-resolution reference matrices to PDF anytime.
            </p>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/30 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{downloading ? 'Compiling PDF...' : 'Export Offline PDF'}</span>
            </button>
          </div>

        </div>

        {/* Right Column: Active View */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* ================================================================ */}
          {/* VIEW 1: DEDICATED CERTIFICATE DOWNLOAD & PRINTING FEATURE        */}
          {/* ================================================================ */}
          {activeView === 'certificate_download' && (
            <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative font-mono animate-fadeIn" id="certificate-download-station">
              
              {/* Header */}
              <div className="border-b border-white/10 pb-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    High-Resolution PDF Certificate Issuance Station
                  </span>

                  <span className="text-xs text-slate-400">
                    Format: <strong className="text-white">A4 Landscape Vector (300 DPI)</strong>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                  Certificate of Operational Mastery: CE-SOC
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">
                  Before printing or downloading your certificate, verify candidate <strong>First Name, Middle Name, and Last Name</strong> below so that the full name is arranged properly in the certificate. Conferred by the EncDec Cybersecurity Academy & Threat Research Lab with institutional endorsement from COOU.
                </p>
              </div>

              {/* Status / Requirement Checklist */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isCertified 
                  ? 'bg-emerald-950/30 border-emerald-500/50' 
                  : 'bg-amber-950/30 border-amber-500/40'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-white flex items-center gap-2">
                    {isCertified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Credential Accreditation Status:</span>
                  </h4>

                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    isCertified 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {isCertified ? 'Qualified & Verified' : 'In Progress'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 flex items-center gap-2">
                    {isChaptersFinished ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] text-slate-500">
                        {readChapters.length}/10
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">1. Modules Read</span>
                      <span className="text-white font-bold">{readChapters.length} of 10 Read</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 flex items-center gap-2">
                    {quizPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <QuizIcon className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">2. Knowledge Check</span>
                      <span className="text-white font-bold">{quizPassed ? `Passed (${quizScore}%)` : 'Pending (80% req.)'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">3. DB Accreditation</span>
                      <span className="text-white font-bold">Cloud Synced ✓</span>
                    </div>
                  </div>
                </div>

                {!isCertified && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-amber-200/90">
                      {!isChaptersFinished 
                        ? `Please complete all 10 modules (${totalChapters - readChapters.length} remaining) and pass the Knowledge Check.`
                        : 'Pass the Capstone Knowledge Check (80% required) to unlock your official high-resolution PDF download.'}
                    </p>
                    <button
                      onClick={() => {
                        if (!isChaptersFinished) {
                          setActiveView('reader');
                        } else {
                          setActiveView('quiz');
                        }
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0 transition-colors"
                    >
                      {!isChaptersFinished ? 'Continue Reading →' : 'Take Knowledge Check →'}
                    </button>
                  </div>
                )}
              </div>

              {/* CANDIDATE NAME ARRANGEMENT FORM (FIRST, MIDDLE, LAST) */}
              <div className="bg-slate-950 p-5 rounded-xl border border-cyan-500/30 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>Candidate Name Verification & Arrangement</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Arranged properly for certificate</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* First Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>First Name (Given)</span>
                      <span className="text-red-400">*Required</span>
                    </label>
                    <input
                      type="text"
                      value={candidateFirstName}
                      onChange={(e) => setCandidateFirstName(e.target.value)}
                      placeholder="e.g. Christopher"
                      className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Middle Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>Middle Name</span>
                      <span className="text-slate-500">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={candidateMiddleName}
                      onChange={(e) => setCandidateMiddleName(e.target.value)}
                      placeholder="e.g. Chukwudi (or C.)"
                      className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                      <span>Last Name (Surname)</span>
                      <span className="text-red-400">*Required</span>
                    </label>
                    <input
                      type="text"
                      value={candidateLastName}
                      onChange={(e) => setCandidateLastName(e.target.value)}
                      placeholder="e.g. Okeke"
                      className="w-full bg-slate-900 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Name Arrangement Style Selector */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Select Name Arrangement Format on Certificate:</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNameArrangementFormat('standard')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        nameArrangementFormat === 'standard'
                          ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold ring-1 ring-cyan-400'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/25'
                      }`}
                    >
                      <span className="text-[10px] uppercase text-cyan-400 block font-bold">Standard Full Name</span>
                      <span className="truncate block font-mono text-[11px]">
                        {getArrangedFullName(candidateFirstName, candidateMiddleName, candidateLastName, 'standard')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNameArrangementFormat('initial')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        nameArrangementFormat === 'initial'
                          ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold ring-1 ring-cyan-400'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/25'
                      }`}
                    >
                      <span className="text-[10px] uppercase text-cyan-400 block font-bold">With Middle Initial</span>
                      <span className="truncate block font-mono text-[11px]">
                        {getArrangedFullName(candidateFirstName, candidateMiddleName, candidateLastName, 'initial')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNameArrangementFormat('surname_first')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        nameArrangementFormat === 'surname_first'
                          ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold ring-1 ring-cyan-400'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/25'
                      }`}
                    >
                      <span className="text-[10px] uppercase text-cyan-400 block font-bold">Formal Surname First</span>
                      <span className="truncate block font-mono text-[11px]">
                        {getArrangedFullName(candidateFirstName, candidateMiddleName, candidateLastName, 'surname_first')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Live Arrangement Banner */}
                <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                      Live Arrangement Preview (Printed on Official Certificate):
                    </span>
                    <span className="text-white font-bold text-sm tracking-wide">
                      {currentArrangedFullName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingActionAfterName(null);
                      setShowNameModal(true);
                    }}
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Open Arrangement Assistant
                  </button>
                </div>
              </div>

              {/* Interactive High-Resolution Live Preview Parchment */}
              <div className="p-6 sm:p-8 rounded-xl bg-slate-950 border-2 border-cyan-500/50 relative overflow-hidden shadow-2xl space-y-6 text-center" id="printable-certificate-parchment">
                <div className="border border-amber-500/40 p-6 sm:p-8 rounded-lg relative">
                  
                  {/* Watermark Tag */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[9px] uppercase tracking-widest">
                    {isCertified ? '★ OFFICIAL ACCREDITATION ★' : '★ PREVIEW MODE ★'}
                  </div>

                  <div className="space-y-1 mb-4">
                    <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">
                      ENCDEC CYBERSECURITY ACADEMY & THREAT RESEARCH LAB
                    </p>
                    <p className="text-[8px] text-slate-400">
                      NATIONAL CYBER DEFENSE ALLIANCE • AUTONOMOUS SOC THREAT RESEARCH LAB
                    </p>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase font-sans tracking-tight mb-2">
                    Certificate of Operational Mastery
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    This credential is officially conferred upon completion of the master curriculum to
                  </p>

                  <div className="text-xl sm:text-2xl font-bold text-cyan-400 border-b border-amber-500/40 pb-2 inline-block px-8 max-w-full truncate mb-3 font-sans shadow-sm">
                    {currentArrangedFullName}
                  </div>

                  <p className="text-xs text-slate-300 max-w-xl mx-auto mb-2">
                    For successfully studying, verifying, and completing the comprehensive operational curriculum for:
                  </p>
                  <p className="text-base font-bold text-white mb-2">
                    Certified EncDec IDS SOC Specialist (CE-SOC)
                  </p>
                  <p className="text-[11px] font-bold text-cyan-400 mb-5">
                    ★ Capstone Knowledge Check Score: {quizScore || 100}% (Verified Mastery)
                  </p>

                  {/* Signatures, Seal & Official QR Code Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-white/10 items-center text-xs">
                    {/* Signature 1 */}
                    <div>
                      <div className="border-b border-slate-600 pb-1 font-bold text-white text-[11px]">
                        Dr. Chidubem Eze (CISSP, CISM)
                      </div>
                      <span className="text-[9px] text-slate-400">Chief Information Security Officer</span>
                    </div>

                    {/* Official Seal */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-2 border-amber-400/80 flex flex-col items-center justify-center bg-amber-500/10 text-amber-300 text-[8px] font-bold">
                        <span>OFFICIAL</span>
                        <span>SOC SEAL</span>
                        <span>VERIFIED</span>
                      </div>
                    </div>

                    {/* Official Employer QR Code Validation Box */}
                    <div className="flex flex-col items-center justify-center bg-slate-900/90 border border-cyan-500/40 p-2.5 rounded-lg shadow-sm">
                      <span className="text-[8px] font-bold uppercase text-amber-400 mb-1 flex items-center gap-1">
                        <QrCode className="w-2.5 h-2.5" />
                        <span>Employer QR Validation</span>
                      </span>

                      {certQrCodeUrl ? (
                        <img 
                          src={certQrCodeUrl} 
                          alt="Verification QR Code" 
                          className="w-16 h-16 bg-white p-0.5 rounded border border-white/20 object-contain shadow"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-950 border border-white/10 rounded flex items-center justify-center text-[8px] text-slate-400">
                          {isRegisteringCert ? 'Generating...' : 'QR Ready'}
                        </div>
                      )}

                      <a
                        href={certVerificationUrl || `/verify/${encodeURIComponent(activeCertId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-[8px] text-cyan-400 hover:text-cyan-300 underline font-bold"
                        title="Click to preview employer verification URL"
                      >
                        Test Employer URL ↗
                      </a>
                    </div>

                    {/* Signature 2 */}
                    <div>
                      <div className="border-b border-slate-600 pb-1 font-bold text-white text-[11px]">
                        Prof. K. C. Okafor (IEEE Senior)
                      </div>
                      <span className="text-[9px] text-slate-400">Director of SOC Operations</span>
                    </div>
                  </div>

                  {/* Footer Metadata */}
                  <div className="pt-4 text-[9px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 mt-4">
                    <span className="text-cyan-400 font-bold">REGISTRY ID: {activeCertId}</span>
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline">SHA256: 7f83b165...126d9069</span>
                      <button
                        onClick={() => handleCopyVerificationHash(activeCertId)}
                        className="text-cyan-400 hover:text-cyan-300 cursor-pointer text-[8px] underline"
                      >
                        {copiedHash ? '✓ Copied ID' : 'Copy Cert ID'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* High-Resolution Printing & Download Actions */}
              <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setActiveView('reader');
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold cursor-pointer text-xs"
                >
                  ← Return to Workbook Reader
                </button>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  {/* Print Certificate Button */}
                  <button
                    onClick={initiatePrint}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white border border-white/20 hover:border-cyan-400 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
                    id="btn-print-certificate"
                    title="Verify Name and Print Certificate"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    <span>Print Certificate</span>
                  </button>

                  {/* Download Official Certificate PDF Button */}
                  <button
                    onClick={() => initiateDownload(false)}
                    disabled={downloadingCert}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
                    id="btn-download-high-res-pdf"
                    title="Verify Name and Download High-Resolution PDF"
                  >
                    <Download className={`w-4 h-4 ${downloadingCert ? 'animate-bounce' : ''}`} />
                    <span>
                      {downloadingCert ? 'Compiling Vector PDF...' : 'Download Certificate (PDF)'}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW 2: CAPSTONE KNOWLEDGE CHECK QUIZ COMPONENT                  */}
          {/* ================================================================ */}
          {activeView === 'quiz' && (
            <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative font-mono" id="knowledge-check-quiz">
              
              {/* Quiz Header */}
              <div className="border-b border-white/10 pb-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Capstone Certification Assessment
                  </span>

                  <span className="text-xs text-slate-400">
                    Passing Threshold: <strong className="text-emerald-400">80% or Higher</strong>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                  Certified EncDec IDS SOC Specialist (CE-SOC) Knowledge Check
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-white/5">
                  Complete this 6-question operational assessment covering all modules from the EncDec IDS curriculum: Deep Packet Inspection, File Integrity Monitoring, TopoJSON Geodesic Telemetry, Threat Intelligence, Dual Databases, and Autonomous Containment. 
                  Passing this assessment immediately grants your verified credential and unlocks your personalized Certificate of Operational Mastery.
                </p>
              </div>

              {/* Status Banner */}
              {quizError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{quizError}</span>
                </div>
              )}

              {quizSubmitted && (
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  quizPassed 
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300' 
                    : 'bg-amber-950/30 border-amber-500/50 text-amber-300'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {quizPassed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      )}
                      <h4 className="text-sm font-bold uppercase font-sans">
                        {quizPassed ? 'Congratulations! Assessment Passed' : 'Assessment Not Passed (Retake Available)'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300">
                      {quizPassed 
                        ? `You achieved ${quizScore}% on the Capstone Knowledge Check. Your official CE-SOC certificate has been accredited to your database record.`
                        : `You scored ${quizScore}%. A minimum of 80% is required for official certification. Review the rationales below and retake the test.`}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {quizPassed ? (
                      <button
                        onClick={() => {
                          setActiveView('certificate_download');
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                        id="btn-quiz-view-cert"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Certificate (PDF)</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleRetakeQuiz}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retake Quiz</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-6">
                {QUIZ_QUESTIONS.map((q, qIdx) => {
                  const selectedOpt = quizAnswers[q.id];
                  const isCorrect = selectedOpt === q.correctIndex;
                  const showFeedback = quizSubmitted;

                  return (
                    <div 
                      key={q.id} 
                      className={`p-5 rounded-xl border transition-all ${
                        showFeedback 
                          ? isCorrect 
                            ? 'bg-emerald-950/20 border-emerald-500/30' 
                            : 'bg-red-950/20 border-red-500/30'
                          : selectedOpt !== undefined
                          ? 'bg-slate-950/80 border-cyan-500/30'
                          : 'bg-slate-950/40 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-cyan-400">
                          Question {qIdx + 1} of {QUIZ_QUESTIONS.length} • {q.topic}
                        </span>

                        {showFeedback && (
                          <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
                            isCorrect ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mb-4 leading-relaxed font-sans">
                        {q.question}
                      </h3>

                      {/* Options */}
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = selectedOpt === optIdx;
                          const isOptionTheCorrectOne = optIdx === q.correctIndex;

                          let optionStyles = 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25 hover:bg-slate-800';

                          if (showFeedback) {
                            if (isOptionTheCorrectOne) {
                              optionStyles = 'bg-emerald-950/50 border-emerald-400 text-emerald-200 font-bold';
                            } else if (isOptionSelected && !isCorrect) {
                              optionStyles = 'bg-red-950/50 border-red-500 text-red-200';
                            } else {
                              optionStyles = 'bg-slate-900/40 border-white/5 text-slate-500';
                            }
                          } else if (isOptionSelected) {
                            optionStyles = 'bg-cyan-950/60 border-cyan-400 text-white font-semibold ring-1 ring-cyan-400';
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleOptionSelect(q.id, optIdx)}
                              disabled={quizSubmitted && quizPassed}
                              className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-3 cursor-pointer ${optionStyles}`}
                            >
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[9px] ${
                                isOptionSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-bold' : 'border-slate-600 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {showFeedback && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-white/10 text-[11px] text-slate-300 space-y-1">
                          <span className="text-cyan-400 font-bold uppercase text-[9px] block">
                            Operational Rationale:
                          </span>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setActiveView('reader');
                    setActiveChapterIndex(totalChapters - 1);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold cursor-pointer text-xs"
                >
                  ← Return to Chapter 10
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {quizSubmitted && !quizPassed && (
                    <button
                      onClick={handleRetakeQuiz}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer text-xs"
                    >
                      Reset Answers
                    </button>
                  )}

                  {!quizPassed ? (
                    <button
                      onClick={handleSubmitQuiz}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold cursor-pointer text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                      id="btn-submit-quiz"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Submit Knowledge Check & Verify</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveView('certificate_download');
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold cursor-pointer text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 animate-bounce"
                      id="btn-quiz-claim-cert"
                    >
                      <Download className="w-4 h-4" />
                      <span>Go to Certificate Download Station →</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================================================================ */}
          {/* VIEW 3: CHAPTER READER COMPONENT                                 */}
          {/* ================================================================ */}
          {activeView === 'reader' && (
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative">
              
              {/* Chapter Header */}
              <div className="border-b border-white/10 pb-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold uppercase">
                    {activeSection.chapter}
                  </span>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    {isCurrentChapterRead ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold text-xs">
                        Reading Now
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans tracking-tight">
                  {activeSection.title}
                </h2>

                <p className="text-xs text-slate-400 font-mono leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-white/5">
                  {activeSection.summary}
                </p>
              </div>

              {/* Chapter Core Content */}
              <div className="space-y-4 text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-white/5">
                  <span className="flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Click any section or paragraph below to bookmark and save your reading position:</span>
                  </span>
                  <span className="text-cyan-400 text-[10px]">
                    Auto-saved to Cloud Database
                  </span>
                </div>

                {activeSection.content.map((paragraph, pIdx) => {
                  const isHeading = /^\d+\./.test(paragraph);
                  const isLastRead = pIdx === lastReadParagraphIndex;
                  const wasJustSaved = pIdx === justSavedIndex;

                  return (
                    <div 
                      key={pIdx}
                      id={`workbook-paragraph-${pIdx}`}
                      onClick={() => handleParagraphClick(pIdx)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                        isLastRead
                          ? 'bg-cyan-950/30 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.18)] text-white'
                          : isHeading 
                          ? 'bg-slate-950/90 border-cyan-500/20 text-white font-medium hover:border-cyan-500/40' 
                          : 'bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/20 hover:bg-slate-950/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            isLastRead 
                              ? 'bg-cyan-500 text-slate-950 shadow-sm' 
                              : 'bg-slate-800 text-slate-400 group-hover:text-cyan-400'
                          }`}>
                            Section {pIdx + 1}
                          </span>

                          {isLastRead && (
                            <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400 animate-bounce" />
                              <span>Current Resume Point (Saved in Database)</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-mono flex items-center gap-1.5">
                          {wasJustSaved ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                              <Check className="w-3 h-3" />
                              <span>Saved to DB!</span>
                            </span>
                          ) : isLastRead ? (
                            <span className="text-slate-400">
                              {dbLastSavedTime ? new Date(dbLastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Persisted'}
                            </span>
                          ) : (
                            <span className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to bookmark
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="leading-relaxed">{paragraph}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reference Table if Available */}
              {activeSection.tables && (
                <div className="space-y-2 font-mono text-xs pt-2">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" />
                    Reference Matrix & Technical Specifications
                  </h4>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-white/10 text-slate-400 text-[11px] uppercase">
                          {activeSection.tables.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeSection.tables.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-3 text-[11px] text-slate-300">
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

              {/* Key Takeaways Card */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 font-mono">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Operational Best Practices & Key Takeaways
                </h4>
                <ul className="space-y-1.5 text-xs text-emerald-200/90 pl-1">
                  {activeSection.keyTakeaways.map((takeaway, tIdx) => (
                    <li key={tIdx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Navigation & Mark-as-Read Action */}
              <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                <button
                  onClick={handlePrevChapter}
                  disabled={activeChapterIndex === 0}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-40 border border-white/10 text-slate-300 font-bold cursor-pointer transition-colors"
                >
                  ← Previous Chapter
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!isCurrentChapterRead ? (
                    <button
                      onClick={() => handleMarkAsRead(activeChapterIndex)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors border border-white/10"
                    >
                      Mark Chapter as Read
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs px-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Chapter Read</span>
                    </div>
                  )}

                  <button
                    onClick={handleNextChapter}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
                  >
                    <span>
                      {activeChapterIndex < totalChapters - 1 
                        ? 'Next Chapter →' 
                        : 'Proceed to Knowledge Check Quiz →'}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* CANDIDATE NAME VERIFICATION MODAL (BEFORE PRINTING/DOWNLOADING) */}
      {/* ============================================================== */}
      {showNameModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative font-mono animate-fadeIn">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <User className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white uppercase font-sans tracking-tight">
                  Candidate Name Verification for Certificate
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setPendingActionAfterName(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-white/5">
              Before printing or downloading your certificate, please verify your <strong>First Name</strong>, <strong>Middle Name</strong>, and <strong>Last Name</strong> so that your official name is arranged with complete precision on the certificate.
            </p>

            {nameError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>First Name</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateFirstName}
                    onChange={(e) => {
                      setCandidateFirstName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder="e.g. Christopher"
                    autoFocus
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Middle Name</span>
                    <span className="text-slate-500">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={candidateMiddleName}
                    onChange={(e) => setCandidateMiddleName(e.target.value)}
                    placeholder="e.g. Chukwudi"
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                    <span>Last Name</span>
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={candidateLastName}
                    onChange={(e) => {
                      setCandidateLastName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder="e.g. Okeke"
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Arrangement Style Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                  Arrangement Style:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNameArrangementFormat('standard')}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      nameArrangementFormat === 'standard'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] block text-cyan-400">First Middle Last</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNameArrangementFormat('initial')}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      nameArrangementFormat === 'initial'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] block text-cyan-400">First M. Last</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNameArrangementFormat('surname_first')}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      nameArrangementFormat === 'surname_first'
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                        : 'bg-slate-950 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-[9px] block text-cyan-400">Last, First Middle</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase block font-bold">
                  Official Certificate Name Preview:
                </span>
                <span className="text-cyan-300 font-bold text-base tracking-wide font-sans">
                  {currentArrangedFullName}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowNameModal(false);
                  setPendingActionAfterName(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmNameAndProceed}
                disabled={downloadingCert}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95"
                id="btn-confirm-name-proceed"
              >
                {pendingActionAfterName === 'print' ? (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Confirm & Print Certificate</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Confirm & Download PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SAMPLE CERTIFICATE MODAL */}
      {showSampleCert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative font-mono">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Award className="w-5 h-5" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider font-sans">
                  Sample Certificate of Operational Mastery
                </h3>
              </div>
              <button
                onClick={() => setShowSampleCert(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This preview illustrates the official credential issued to operators upon completing all 10 curriculum chapters and passing the Capstone Knowledge Check within the EncDec IDS software platform. Each certificate features a verifiable cryptographic hash, verified exam score, and unique registry ID.
            </p>

            {/* Visual Sample Certificate Parchment */}
            <div className="p-6 sm:p-8 rounded-xl bg-slate-950 border-2 border-cyan-500/50 relative overflow-hidden shadow-2xl space-y-6 text-center">
              <div className="border border-amber-500/40 p-6 sm:p-8 rounded-lg relative">
                
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[9px] uppercase tracking-widest">
                  ★ SAMPLE PREVIEW ★
                </div>

                <div className="space-y-1 mb-4">
                  <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">
                    ENCDEC CYBERSECURITY ACADEMY & THREAT RESEARCH LAB
                  </p>
                  <p className="text-[8px] text-slate-400">
                    NATIONAL CYBER DEFENSE ALLIANCE • COOU INFRASTRUCTURE OPERATIONS
                  </p>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white uppercase font-sans tracking-tight mb-2">
                  Certificate of Operational Mastery
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  This credential is officially conferred upon passing the capstone assessment to
                </p>

                <div className="text-xl sm:text-2xl font-bold text-cyan-400 border-b border-amber-500/40 pb-2 inline-block px-8 max-w-full truncate mb-3 font-sans">
                  Alexandra Vance (Sample Candidate)
                </div>

                <p className="text-xs text-slate-300 max-w-xl mx-auto mb-2">
                  For successfully studying, verifying, and completing the comprehensive operational curriculum for:
                </p>
                <p className="text-base font-bold text-white mb-2">
                  Certified EncDec IDS SOC Specialist (CE-SOC)
                </p>
                <p className="text-[11px] font-bold text-cyan-400 mb-5">
                  ★ Capstone Knowledge Check Score: 100% (Verified Mastery)
                </p>

                {/* Signatures & Seal Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-white/10 items-center text-xs">
                  <div>
                    <div className="border-b border-slate-600 pb-1 font-bold text-white">
                      Dr. Chidubem Eze (CISSP, CISM)
                    </div>
                    <span className="text-[9px] text-slate-400">Lead Security Architect</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-400/80 flex flex-col items-center justify-center bg-amber-500/10 text-amber-300 text-[8px] font-bold">
                      <span>OFFICIAL</span>
                      <span>SOC SEAL</span>
                      <span>VERIFIED</span>
                    </div>
                  </div>

                  <div>
                    <div className="border-b border-slate-600 pb-1 font-bold text-white">
                      Prof. K. C. Okafor (IEEE)
                    </div>
                    <span className="text-[9px] text-slate-400">Director of SOC Operations</span>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-4 text-[9px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 mt-4">
                  <span>ID: CERT-ENCDEC-SAMPLE-2026</span>
                  <span>AUTHENTICATION HASH: 7f83b165...126d9069</span>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSampleCert(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => handleDownloadCertificate(true)}
                disabled={downloadingCert}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingCert ? 'Generating...' : 'Download Sample PDF'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EARNED CERTIFICATE AWARD MODAL */}
      {showEarnedCertModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative font-mono animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Award className="w-6 h-6 animate-bounce" />
                <h3 className="text-lg font-bold text-white uppercase font-sans tracking-tight">
                  Congratulations! Certification Conferred
                </h3>
              </div>
              <button
                onClick={() => setShowEarnedCertModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-300">
                  Curriculum & Knowledge Check Passed with {quizScore || 100}%!
                </p>
                <p className="text-[11px] text-slate-300">
                  Your official credential as a <strong>Certified EncDec IDS SOC Specialist (CE-SOC)</strong> has been accredited to your database record and verified.
                </p>
              </div>
            </div>

            {/* Candidate Name Form in Modal (First, Middle, Last) */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">
                Arrange Candidate Name for Official Certificate:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">First Name</label>
                  <input
                    type="text"
                    value={candidateFirstName}
                    onChange={(e) => setCandidateFirstName(e.target.value)}
                    placeholder="e.g. Christopher"
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Middle Name</label>
                  <input
                    type="text"
                    value={candidateMiddleName}
                    onChange={(e) => setCandidateMiddleName(e.target.value)}
                    placeholder="e.g. Chukwudi"
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase">Last Name</label>
                  <input
                    type="text"
                    value={candidateLastName}
                    onChange={(e) => setCandidateLastName(e.target.value)}
                    placeholder="e.g. Okeke"
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Certificate Preview Card */}
            <div className="p-6 rounded-xl bg-slate-950 border border-cyan-500/40 text-center space-y-3">
              <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Official Credential Ready For Download & Print
              </span>
              <h4 className="text-base font-bold text-white font-sans">
                Certified EncDec IDS SOC Specialist (CE-SOC)
              </h4>
              <p className="text-xs text-cyan-400 font-bold text-sm">
                Awarded To: {currentArrangedFullName}
              </p>
              <p className="text-[11px] text-slate-400">
                Knowledge Check Score: <span className="text-emerald-400 font-bold">{quizScore || 100}%</span> • Verified on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  setShowEarnedCertModal(false);
                  setActiveView('certificate_download');
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Go to Certificate Station
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setShowEarnedCertModal(false);
                    initiatePrint();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Print Certificate</span>
                </button>

                <button
                  onClick={() => {
                    setShowEarnedCertModal(false);
                    initiateDownload(false);
                  }}
                  disabled={downloadingCert}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all"
                  id="btn-download-official-cert"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingCert ? 'Compiling Vector PDF...' : 'Download Official Certificate (PDF)'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
