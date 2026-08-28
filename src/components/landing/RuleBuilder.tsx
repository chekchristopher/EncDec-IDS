import React from 'react';
import { Shield, Plus, Check, Code, Cpu } from 'lucide-react';

interface RuleBuilderProps {
  customRuleName: string;
  setCustomRuleName: (val: string) => void;
  customRuleTarget: string;
  setCustomRuleTarget: (val: string) => void;
  customRuleSeverity: string;
  setCustomRuleSeverity: (val: string) => void;
  customRulePattern: string;
  setCustomRulePattern: (val: string) => void;
  customRuleMitre: string;
  setCustomRuleMitre: (val: string) => void;
  onDeployRule: () => void;
  ruleDeploySuccess: boolean;
}

export default function RuleBuilder({
  customRuleName,
  setCustomRuleName,
  customRuleTarget,
  setCustomRuleTarget,
  customRuleSeverity,
  setCustomRuleSeverity,
  customRulePattern,
  setCustomRulePattern,
  customRuleMitre,
  setCustomRuleMitre,
  onDeployRule,
  ruleDeploySuccess
}: RuleBuilderProps) {
  return (
    <div id="rule-builder-container" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Interactive Snort/Suricata Rule Synthesizer</h3>
      </div>
      <p className="text-xs text-slate-400 mb-6">
        Compile signature and behavioral detection rules with automated MITRE ATT&CK mapping directly into the live engine.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Rule Designation</label>
          <input
            type="text"
            value={customRuleName}
            onChange={(e) => setCustomRuleName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            placeholder="e.g., Detect Unauthorized Student Portal API Access"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Layer</label>
          <select
            value={customRuleTarget}
            onChange={(e) => setCustomRuleTarget(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="network">Network Layer (DPI Packet Filter)</option>
            <option value="host">Host Layer (Kernel & FIM)</option>
            <option value="application">Application Layer (HTTP/API Gateway)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Alert Severity</label>
          <select
            value={customRuleSeverity}
            onChange={(e) => setCustomRuleSeverity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="critical">Critical (P1 - Instant Containment)</option>
            <option value="high">High (P2 - Security Escalation)</option>
            <option value="medium">Medium (P3 - Triage Queue)</option>
            <option value="low">Low (P4 - Audit Trail Only)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">MITRE ATT&CK Tactic / Technique</label>
          <input
            type="text"
            value={customRuleMitre}
            onChange={(e) => setCustomRuleMitre(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            placeholder="e.g., T1110.001 Brute Force"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-300 mb-1.5">Payload Detection Signature (Regex / Hex / JSON)</label>
        <textarea
          value={customRulePattern}
          onChange={(e) => setCustomRulePattern(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          placeholder='{"uri": "/api/portal/*", "pattern": "UNION+SELECT", "threshold": 3}'
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          <span>Synthesized Snort SID: <span className="text-slate-300 font-mono">100009</span></span>
        </div>

        <button
          id="btn-deploy-custom-rule"
          onClick={onDeployRule}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            ruleDeploySuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50'
          }`}
        >
          {ruleDeploySuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Rule Active in Engine
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Compile & Inject Rule
            </>
          )}
        </button>
      </div>
    </div>
  );
}
