/**
 * FraudMonitor — AI-powered anomaly detection panel
 * Analyzes member payment patterns across circles and flags suspicious behaviour.
 * Runs InvokeLLM (gemini_3_flash) with structured output, then lets the organiser
 * raise a Dispute directly from the flagged result.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { C } from '../../lib/qudiTokens';

const SEVERITY_STYLE = {
  critical: { bg: '#FCE4E4', color: '#721C24', border: '#F5C6CB', icon: '🔴' },
  high:     { bg: '#FFF3CD', color: '#856404', border: '#FFEEBA', icon: '🟠' },
  medium:   { bg: '#FFF8E1', color: '#6D4C00', border: '#FFE082', icon: '🟡' },
  low:      { bg: '#E3F0FF', color: '#1A4F8A', border: '#90CAF9', icon: '🔵' },
};

export default function FraudMonitor({ onDisputeCreated }) {
  const [scanning, setScanning]     = useState(false);
  const [flags, setFlags]           = useState(null);
  const [error, setError]           = useState(null);
  const [raising, setRaising]       = useState(null);
  const [raised, setRaised]         = useState({});
  const [collapsed, setCollapsed]   = useState(false);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setFlags(null);

    // 1. Gather data
    const [circles, members, transactions] = await Promise.all([
      base44.entities.Circle.filter({ status: 'active' }),
      base44.entities.Member.list('-created_date', 200),
      base44.entities.Transaction.list('-created_date', 500),
    ]);

    // Build a compact summary per member to keep prompt small
    const memberSummaries = members.map(m => {
      const txs = transactions.filter(t => t.product_id === m.id);
      const failedCount  = txs.filter(t => ['out', 'damage'].includes(t.type)).length;
      const totalTxs     = txs.length;
      const recentTxDates = txs.slice(0, 10).map(t => t.created_date);
      const circle = circles.find(c => c.id === m.circle_id);

      // Rapid-fire detection: >3 transactions within 60 min window
      let rapidFire = false;
      for (let i = 0; i < recentTxDates.length - 2; i++) {
        const window = new Date(recentTxDates[i]) - new Date(recentTxDates[i + 2]);
        if (Math.abs(window) < 3600000) { rapidFire = true; break; }
      }

      return {
        id:             m.id,
        name:           m.full_name,
        phone:          m.phone,
        circle_id:      m.circle_id,
        circle_name:    circle?.name || 'Unknown',
        trust_score:    m.trust_score ?? 50,
        payment_status: m.payment_status,
        failed_txs:     failedCount,
        total_txs:      totalTxs,
        rapid_fire:     rapidFire,
        days_in_circle: m.joined_cycles_ago ? m.joined_cycles_ago * (circle?.frequency === 'weekly' ? 7 : 30) : null,
        has_guarantor:  !!m.guarantor_name,
        is_verified:    m.is_verified,
      };
    });

    if (memberSummaries.length === 0) {
      setFlags([]);
      setScanning(false);
      return;
    }

    // 2. Invoke AI analysis
    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are a fraud analyst for Qudi, a mobile money savings circle (Susu/Tontine) platform in Ghana.
Analyse the following member payment data and flag any members showing signs of:
- Rapid-fire failed transactions (>3 failures in short succession)
- SIM-swap risk indicators (new unverified member, large trust-score drop, multiple failed txs)
- Unusual payment patterns (overdue + many failures + low trust)
- Multi-circle exposure risk
- Ghost member indicators (0 transactions, no guarantor, unverified)

Return ONLY flagged members. For each, give a clear, concise reason an organiser can act on.
Severity levels: critical (immediate action), high (review within 24h), medium (monitor), low (note only).

Member data:
${JSON.stringify(memberSummaries, null, 2)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            flags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  member_id:   { type: 'string' },
                  member_name: { type: 'string' },
                  circle_id:   { type: 'string' },
                  circle_name: { type: 'string' },
                  phone:       { type: 'string' },
                  severity:    { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  anomaly_type: { type: 'string' },
                  reason:      { type: 'string' },
                  recommended_action: { type: 'string' },
                },
              },
            },
            summary: { type: 'string' },
          },
        },
      });
    } catch (e) {
      setError('AI analysis failed: ' + e.message);
      setScanning(false);
      return;
    }

    setFlags(result?.flags || []);
    setScanning(false);
  };

  const raiseDispute = async (flag) => {
    setRaising(flag.member_id);
    await base44.entities.Dispute.create({
      circle_id:      flag.circle_id,
      member_id:      flag.member_id,
      member_name:    flag.member_name,
      dispute_type:   'suspicious_transaction',
      flagged_amount: 0,
      description:    `[AI Fraud Monitor] ${flag.reason}`,
      status:         'open',
      organiser_note: `Severity: ${flag.severity.toUpperCase()}. Recommended: ${flag.recommended_action}`,
    });
    setRaised(r => ({ ...r, [flag.member_id]: true }));
    setRaising(null);
    if (onDisputeCreated) onDisputeCreated();
  };

  return (
    <div style={{ margin: '0 0 12px 0', borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${C.border}` }}>
      {/* Header bar */}
      <div
        onClick={() => flags !== null && setCollapsed(c => !c)}
        style={{
          background: '#1A1208', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: flags !== null ? 'pointer' : 'default',
        }}
      >
        <div>
          <div style={{ color: '#EBA020', fontWeight: 800, fontSize: 14 }}>🤖 AI Fraud Monitor</div>
          <div style={{ color: '#C4B080', fontSize: 11, marginTop: 2 }}>
            {flags === null
              ? 'Detects anomalies: rapid-fire failures, SIM-swap risk, ghost members'
              : flags.length === 0
              ? '✅ No anomalies detected'
              : `${flags.length} flag${flags.length !== 1 ? 's' : ''} found — tap to ${collapsed ? 'expand' : 'collapse'}`}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); runScan(); }}
          disabled={scanning}
          style={{
            background: scanning ? '#856404' : '#EBA020',
            color: '#1A1208', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, fontWeight: 800,
            cursor: scanning ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}
        >
          {scanning ? '⏳ Scanning…' : flags === null ? '🔍 Run Scan' : '🔄 Re-scan'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#FCE4E4', padding: '10px 16px', fontSize: 12, color: '#721C24' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {flags !== null && !collapsed && (
        <div style={{ background: C.cream }}>
          {flags.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>
              ✅ All members passed fraud checks.
            </div>
          ) : (
            flags.map((flag, i) => {
              const sev = SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.low;
              const isRaised = raised[flag.member_id];
              return (
                <div key={i} style={{
                  margin: '8px 12px',
                  background: sev.bg,
                  border: `1px solid ${sev.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 14 }}>{sev.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: sev.color }}>{flag.member_name}</span>
                        <span style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: sev.color }}>
                          {flag.severity.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: sev.color, fontWeight: 600, marginBottom: 4 }}>
                        {flag.anomaly_type} · {flag.circle_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#3A2A10', lineHeight: 1.5, marginBottom: 6 }}>{flag.reason}</div>
                      <div style={{ fontSize: 11, color: sev.color, fontStyle: 'italic' }}>
                        💡 {flag.recommended_action}
                      </div>
                    </div>
                    <button
                      onClick={() => raiseDispute(flag)}
                      disabled={!!raising || isRaised}
                      style={{
                        background: isRaised ? '#D4EDDA' : sev.color,
                        color: isRaised ? '#155724' : '#fff',
                        border: 'none', borderRadius: 8,
                        padding: '7px 10px', fontSize: 11, fontWeight: 700,
                        cursor: isRaised || raising ? 'default' : 'pointer',
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >
                      {raising === flag.member_id ? '…' : isRaised ? '✓ Raised' : '🚩 Flag'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {flags.length > 0 && (
            <div style={{ padding: '8px 14px 12px', fontSize: 11, color: C.muted, textAlign: 'center' }}>
              Tap 🚩 Flag to open a dispute for that member
            </div>
          )}
        </div>
      )}
    </div>
  );
}