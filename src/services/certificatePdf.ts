/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface CertificateData {
  recipientName: string;
  recipientEmail: string;
  certificateId: string;
  issueDate: string;
  courseTitle: string;
  accreditationLevel: string;
  verificationCode: string;
  quizScore?: number;
  qrCodeDataUrl?: string;
  verificationUrl?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

/**
 * Generates a high-resolution QR code data URL for certificate verification.
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 280,
    color: {
      dark: '#081426',
      light: '#ffffff'
    }
  });
}

/**
 * Creates an official, high-resolution landscape certificate in PDF format using jsPDF.
 */
export function createCertificatePdfDoc(data: CertificateData): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  doc.setDocumentProperties({
    title: `EncDec IDS CE-SOC Certificate - ${data.recipientName}`,
    subject: 'Certified EncDec IDS SOC Specialist (CE-SOC) Accreditation',
    author: 'EncDec Cybersecurity Academy & Threat Research Lab',
    keywords: 'cybersecurity, ids, soc, accreditation, certificate, ce-soc',
    creator: 'EncDec IDS Unified Security Operations Platform'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;

  // Colors
  const darkNavy = [10, 18, 36] as const;
  const cyanGlow = [6, 182, 212] as const;
  const darkCard = [15, 23, 42] as const;
  const goldAccent = [217, 119, 6] as const;
  const slateText = [148, 163, 184] as const;
  const charcoal = [30, 41, 59] as const;

  // 1. Certificate Outer Background
  doc.setFillColor(8, 14, 26);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Ornate Double Border
  doc.setDrawColor(...cyanGlow);
  doc.setLineWidth(1.8);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(0.6);
  doc.rect(margin + 2.5, margin + 2.5, pageWidth - (margin + 2.5) * 2, pageHeight - (margin + 2.5) * 2);

  // Corner decorative flourishes
  const cornerSize = 10;
  // Top-left
  doc.setFillColor(...goldAccent);
  doc.triangle(margin + 3, margin + 3, margin + 3 + cornerSize, margin + 3, margin + 3, margin + 3 + cornerSize, 'F');
  // Top-right
  doc.triangle(pageWidth - margin - 3, margin + 3, pageWidth - margin - 3 - cornerSize, margin + 3, pageWidth - margin - 3, margin + 3 + cornerSize, 'F');
  // Bottom-left
  doc.triangle(margin + 3, pageHeight - margin - 3, margin + 3 + cornerSize, pageHeight - margin - 3, margin + 3, pageHeight - margin - 3 - cornerSize, 'F');
  // Bottom-right
  doc.triangle(pageWidth - margin - 3, pageHeight - margin - 3, pageWidth - margin - 3 - cornerSize, pageHeight - margin - 3, pageWidth - margin - 3, pageHeight - margin - 3 - cornerSize, 'F');

  // 3. Institution / Issuing Authority
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...cyanGlow);
  doc.text('ENCDEC CYBERSECURITY ACADEMY & THREAT RESEARCH LAB', pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('NATIONAL CYBERSECURITY WORKFORCE ALLIANCE • AUTONOMOUS SOC THREAT RESEARCH LAB', pageWidth / 2, 31, { align: 'center' });

  // 4. Main Certificate Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text('CERTIFICATE OF OPERATIONAL MASTERY', pageWidth / 2, 45, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text('This credential is officially conferred upon completion of the master curriculum to', pageWidth / 2, 53, { align: 'center' });

  // 5. Recipient Name Highlight
  doc.setFont('helvetica', 'bold');
  const nameLength = (data.recipientName || '').length;
  const nameFontSize = nameLength > 36 ? 18 : nameLength > 26 ? 20 : 24;
  doc.setFontSize(nameFontSize);
  doc.setTextColor(6, 182, 212);
  doc.text(data.recipientName || 'Security Operations Analyst', pageWidth / 2, 67, { align: 'center' });

  // Underline bar
  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 60, 71, pageWidth / 2 + 60, 71);

  // 6. Course Specification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `For successfully studying, verifying, and completing the comprehensive operational curriculum for:`,
    pageWidth / 2,
    80,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.courseTitle, pageWidth / 2, 88, { align: 'center' });

  // 7. Core Competency Modules Covered
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  const competencies = [
    '• Deep Packet Inspection (DPI) & Snort-Compatible Rule Synthesis',
    '• Host File Integrity Monitoring (FIM) & eBPF Daemon Auditing',
    '• Real-Time TopoJSON Geodesic Incursion Telemetry & D3 Vector Projections',
    '• MITRE ATT&CK Matrix Cross-Correlation & CVE Scoring',
    '• Dual Database Resiliency (Google Cloud Firestore + Microsoft SQL Server)',
    '• Autonomous Distributed Sensor Fabric & Active Containment Dispatch'
  ];
  
  let compY = 98;
  competencies.forEach((comp, idx) => {
    const x = idx % 2 === 0 ? margin + 25 : pageWidth / 2 + 10;
    const y = compY + Math.floor(idx / 2) * 5.5;
    doc.text(comp, x, y);
  });

  if (data.quizScore) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...cyanGlow);
    doc.text(`★ CAPSTONE KNOWLEDGE CHECK SCORE: ${data.quizScore}% (VERIFIED MASTERY)`, pageWidth / 2, compY + 20, { align: 'center' });
  }

  // 8. Seal / Badge of Verification
  const sealCenterX = pageWidth / 2;
  const sealCenterY = 135;
  doc.setDrawColor(...goldAccent);
  doc.setLineWidth(1.2);
  doc.circle(sealCenterX, sealCenterY, 14, 'S');

  doc.setDrawColor(...cyanGlow);
  doc.setLineWidth(0.5);
  doc.circle(sealCenterX, sealCenterY, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...goldAccent);
  doc.text('OFFICIAL SEAL', sealCenterX, sealCenterY - 3, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('VERIFIED SOC', sealCenterX, sealCenterY + 1.5, { align: 'center' });
  doc.text('ACCREDITATION', sealCenterX, sealCenterY + 5.5, { align: 'center' });

  // 8B. Verified Credential Accreditation Box (Left)
  const badgeX = margin + 18;
  const badgeY = 120;
  const badgeWidth = 42;
  const badgeHeight = 31;
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(...cyanGlow);
  doc.setLineWidth(0.5);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...cyanGlow);
  doc.text('ACCREDITATION MATRIX', badgeX + badgeWidth / 2, badgeY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(203, 213, 225);
  doc.text('TIER-III AUTONOMOUS DEFENSE', badgeX + badgeWidth / 2, badgeY + 12, { align: 'center' });
  doc.text('SOC OPERATIONS SPECIALIST', badgeX + badgeWidth / 2, badgeY + 17, { align: 'center' });
  doc.text('ENCDEC AUTONOMOUS THREAT LAB', badgeX + badgeWidth / 2, badgeY + 22, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...goldAccent);
  doc.text('★ CRYPTOGRAPHICALLY VERIFIED ★', badgeX + badgeWidth / 2, badgeY + 27, { align: 'center' });

  // 8C. QR Code for Employer Validation (Right)
  if (data.qrCodeDataUrl) {
    const qrSize = 25;
    const qrBoxWidth = 36;
    const qrBoxHeight = 31;
    const qrBoxX = pageWidth - margin - 18 - qrBoxWidth;
    const qrBoxY = 120;

    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(...goldAccent);
    doc.setLineWidth(0.5);
    doc.roundedRect(qrBoxX, qrBoxY, qrBoxWidth, qrBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...goldAccent);
    doc.text('SCAN TO VERIFY', qrBoxX + qrBoxWidth / 2, qrBoxY + 5.5, { align: 'center' });

    try {
      doc.addImage(data.qrCodeDataUrl, 'PNG', qrBoxX + (qrBoxWidth - qrSize) / 2, qrBoxY + 7, qrSize, qrSize);
    } catch (err) {
      console.warn('QR code could not be embedded into PDF:', err);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Online Employer Verification', qrBoxX + qrBoxWidth / 2, qrBoxY + qrBoxHeight + 3, { align: 'center' });
  }

  // 9. Signatures Block
  const sigY = 172;

  // Signature 1: Chief Information Security Officer
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, sigY, margin + 80, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Dr. Chidubem Eze (CISSP, CISM)', margin + 50, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Chief Information Security Officer • Lead Architect', margin + 50, sigY + 9, { align: 'center' });

  // Signature 2: SOC Operations Director
  doc.line(pageWidth - margin - 80, sigY, pageWidth - margin - 20, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Prof. K. C. Okafor (IEEE Senior)', pageWidth - margin - 50, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Director of Academic Computing & SOC Operations', pageWidth - margin - 50, sigY + 9, { align: 'center' });

  // 10. Security Verification Footer Bar
  doc.setFillColor(...charcoal);
  doc.rect(margin + 3, pageHeight - margin - 14, pageWidth - (margin + 3) * 2, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...cyanGlow);
  doc.text(`CREDENTIAL ID: ${data.certificateId}`, margin + 8, pageHeight - margin - 7);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`ISSUED: ${data.issueDate}`, margin + 90, pageHeight - margin - 7);

  doc.text(`OPERATOR EMAIL: ${data.recipientEmail}`, margin + 145, pageHeight - margin - 7);

  doc.setTextColor(...goldAccent);
  doc.text(`SECURE HASH: ${data.verificationCode}`, pageWidth - margin - 8, pageHeight - margin - 7, { align: 'right' });

  return doc;
}

/**
 * Generates and downloads an official, high-resolution landscape certificate PDF.
 */
export function generateCertificatePdf(data: CertificateData): void {
  const doc = createCertificatePdfDoc(data);
  const cleanName = (data.recipientName || 'Analyst').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `EncDec_CE-SOC_Certificate_${cleanName}_${data.certificateId}.pdf`;
  doc.save(filename);
}

/**
 * Ensures QR code is generated before compiling and downloading PDF.
 */
export async function generateCertificatePdfWithQr(data: CertificateData): Promise<void> {
  if (!data.qrCodeDataUrl) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = data.verificationUrl || `${origin}/verify/${encodeURIComponent(data.certificateId)}`;
    try {
      data.qrCodeDataUrl = await generateQrCodeDataUrl(url);
    } catch (e) {
      console.warn('QR code generation error:', e);
    }
  }
  generateCertificatePdf(data);
}

/**
 * Returns a data URI URL for previewing the certificate in an iframe or viewer.
 */
export function getCertificatePdfDataUri(data: CertificateData): string {
  const doc = createCertificatePdfDoc(data);
  return doc.output('datauristring');
}
