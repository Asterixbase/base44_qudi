import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  getNextContributionDateFromStart, daysUntil, getReminderTier,
  buildReminderMessage, runAutoReminders,
} from '../lib/reminderScheduler';

const TIER_STYLE = {
  '3-day':     { bg: '#E3F2FD', color: '#0D47A1', border: '#90CAF9', label: '📅 3 days left' },
  '2-day':     { bg: '#FFF3E0', color: '#E65100', border: '#FFCC80', label: '⏳ 2 days left' },
  '1-day':     { bg: '#FFF8E1', color: '#856404', border: C.gold,    label: '⏰ Due tomorrow' },
  'due-today': { bg: '#FCE4E4', color: '#721C24', border: '#F5C6CB', label: '🔔 Due today' },
};

const urgencyStyle = (daysLeft) => {
  if (daysLeft <= 0)  return TIER_STYLE['due-today'];
  if (daysLeft === 1) return TIER_STYLE['1-day'];
  if (daysLeft === 2) return TIER_STYLE['2-day'];
  if (daysLeft <= 3)  return TIER_STYLE['3-day'];
  return { bg: C.card, color: C.muted, border: C.border, label: `${daysLeft} days` };
};

export default function ReminderSchedule() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [cycleStartDate, setCycleStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Auto-blast state
  const [blasting, setBlasting] = useState(false);
  const [blastResult, setBlastResult] = useState(null);

  const loadSchedule = async (startDate) => {
    setLoading(true);
    setRows([]);
    const circles = await base44.entities.Circle.filter({ status: 'active' }, '-created_date', 50);
    const all = [];
    await Promise.all(circles.map(async circle => {
      const members = await base44.entities.Member.filter({ circle_id: circle.id });
      const deadline = getNextContributionDateFromStart(circle, startDate);
      const daysLeft = daysUntil(deadline);
      for (const m of members) {
        if (m.payment_status === 'paid') continue;
        all.push({ circle, member: m, deadline, daysLeft });
      }
    }));
    all.sort((a, b) => a.daysLeft - b.daysLeft);
    setRows(all);
    setLoading(false);
  };

  useEffect(() => { loadSchedule(cycleStartDate); }, []);

  const sendManual = async (row) => {
    const uid = `${row.circle.id}_${row.member.id}`;
    setSending(uid);
    const tier = getReminderTier(row.daysLeft) || { tier: 'manual' };
    const message = buildReminderMessage(row.member, row.circle, tier.tier);
    await base44.entities.Notification.create({
      circle_id:   row.circle.id,
      member_id:   row.member.id,
      member_name: row.member.full_name,
      phone:       row.member.phone || 'N/A',
      message,
      status: 'sent', channel: 'in-app',
    });
    setSentIds(s => new Set([...s, uid]));
    setSending(null);
  };

  const runBlast = async () => {
    setBlasting(true);
    setBlastResult(null);
    const result = await runAutoReminders(base44, cycleStartDate);
    setBlastResult(result);
    // Mark all sent ones in UI
    const newSent = new Set(sentIds);
    rows.forEach(r => {
      if (result.sent.find(s => s.name === r.member.full_name && s.circle === r.circle.name)) {
        newSent.add(`${r.circle.id}_${r.member.id}`);
      }
    });
    setSentIds(newSent);
    setBlasting(false);
  };

  const within3days = rows.filter(r => r.daysLeft <= 3);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Reminder Schedule" subtitle="Contribution deadlines & auto-alerts" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />

        {/* Stats */}
        <div style={{ display: 'flex', padding: '10px 16px', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F87171', fontWeight: 800, fontSize: 18 }}>{rows.filter(r => r.daysLeft <= 0).length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Due today</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 18 }}>{within3days.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Within 3 days</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.hintOnDark, fontWeight: 800, fontSize: 18 }}>{rows.length}</div>
            <div style={{ color: C.hintOnDark, fontSize: 10 }}>Total pending</div>
          </div>
        </div>
      </div>

      {/* Cycle date + blast panel */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 6 }}>CYCLE START DATE</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date" value={cycleStartDate}
            onChange={e => { setCycleStartDate(e.target.value); loadSchedule(e.target.value); }}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.ink, background: C.cream }}
          />
          <button onClick={runBlast} disabled={blasting || within3days.length === 0} style={{
            background: blasting ? C.border : C.gold, color: C.ink,
            border: 'none', borderRadius: 8, padding: '8px 14px',
            fontSize: 12, fontWeight: 700,
            cursor: blasting || within3days.length === 0 ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}>
            {blasting ? '⏳ Sending…' : `🚀 Send All (${within3days.length})`}
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          Sends automated in-app alerts to all unpaid members within 3 days of their deadline.
        </div>
      </div>

      {/* Blast result */}
      {blastResult && (
        <div style={{
          margin: '10px 16px 0',
          background: blastResult.sent.length > 0 ? '#DCFCE7' : '#FEF3C7',
          border: `1px solid ${blastResult.sent.length > 0 ? '#86EFAC' : '#FCD34D'}`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: blastResult.sent.length > 0 ? '#16A34A' : '#92400E' }}>
            {blastResult.sent.length > 0
              ? `✅ ${blastResult.sent.length} reminder${blastResult.sent.length > 1 ? 's' : ''} sent`
              : '⚠️ No reminders were sent'}
          </div>
          {blastResult.skipped.length > 0 && (
            <div style={{ fontSize: 11, color: '#92400E', marginTop: 3 }}>
              {blastResult.skipped.length} skipped (already paid or outside window)
            </div>
          )}
          {blastResult.sent.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {blastResult.sent.map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#166534', padding: '2px 0', borderBottom: i < blastResult.sent.length - 1 ? '1px solid #A7F3D0' : 'none' }}>
                  <strong>{s.name}</strong> ({s.circle}) — {TIER_STYLE[s.tier]?.label || s.tier}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px 4px', flexWrap: 'wrap' }}>
        {Object.entries(TIER_STYLE).map(([key, st]) => (
          <span key={key} style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
            background: st.bg, color: st.color, border: `1px solid ${st.border}`,
          }}>{st.label}</span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', paddingBottom: 80 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading schedule…</div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 15 }}>All caught up!</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>No pending contributions to track.</div>
          </div>
        ) : (
          rows.map((row, i) => {
            const uid = `${row.circle.id}_${row.member.id}`;
            const style = urgencyStyle(row.daysLeft);
            const wasSent = sentIds.has(uid);
            const isSending = sending === uid;
            const inWindow = row.daysLeft <= 3;

            return (
              <div key={i} style={{
                background: C.white, borderRadius: 12, marginBottom: 8,
                border: `1px solid ${row.daysLeft <= 0 ? '#F5C6CB' : row.daysLeft <= 1 ? C.gold : C.border}`,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Avatar initials={row.member.initials || row.member.full_name?.slice(0, 2).toUpperCase()} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{row.member.full_name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {row.circle.name} · GHS {row.circle.contribution_amount}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    Deadline: {row.deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                  }}>{style.label}</span>
                  {inWindow && (
                    <button
                      onClick={() => !wasSent && sendManual(row)}
                      disabled={isSending || wasSent}
                      style={{
                        background: wasSent ? '#DCFCE7' : C.ink,
                        color: wasSent ? '#16A34A' : C.cream,
                        border: 'none', borderRadius: 6, padding: '5px 10px',
                        fontSize: 11, fontWeight: 700,
                        cursor: wasSent || isSending ? 'default' : 'pointer',
                      }}
                    >
                      {isSending ? '…' : wasSent ? '✓ Sent' : '🔔 Send'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}