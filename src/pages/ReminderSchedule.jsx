import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import {
  getNextContributionDate, daysUntil, getReminderTier, buildReminderMessage
} from '../lib/reminderScheduler';

const TIER_STYLE = {
  '3-day':     { bg: '#E3F2FD', color: '#0D47A1', border: '#90CAF9' },
  '1-day':     { bg: '#FFF8E1', color: '#856404', border: C.gold },
  'due-today': { bg: '#FCE4E4', color: '#721C24', border: '#F5C6CB' },
};

export default function ReminderSchedule() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  useEffect(() => {
    async function load() {
      const circles = await base44.entities.Circle.list('-created_date', 50);
      const all = [];
      await Promise.all(circles.map(async circle => {
        const members = await base44.entities.Member.filter({ circle_id: circle.id });
        const deadline = getNextContributionDate(circle);
        const daysLeft = daysUntil(deadline);
        for (const m of members) {
          if (m.payment_status === 'paid') continue;
          all.push({ circle, member: m, deadline, daysLeft });
        }
      }));
      // Sort: most urgent first
      all.sort((a, b) => a.daysLeft - b.daysLeft);
      setRows(all);
      setLoading(false);
    }
    load();
  }, []);

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
      status:  'sent',
      channel: 'in-app',
    });
    setSentIds(s => new Set([...s, uid]));
    setSending(null);
  };

  const urgencyLabel = (daysLeft) => {
    if (daysLeft <= 0) return { text: 'DUE TODAY', style: TIER_STYLE['due-today'] };
    if (daysLeft === 1) return { text: 'DUE TOMORROW', style: TIER_STYLE['1-day'] };
    if (daysLeft <= 3) return { text: `${daysLeft} DAYS LEFT`, style: TIER_STYLE['3-day'] };
    return { text: `${daysLeft} days`, style: { bg: C.card, color: C.muted, border: C.border } };
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Reminder Schedule" subtitle="Upcoming contribution deadlines & alerts" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: C.white, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        {[['due-today','🔔 Due today'],['1-day','⏰ 1 day'],['3-day','📅 3 days']].map(([key, label]) => (
          <span key={key} style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: TIER_STYLE[key].bg, color: TIER_STYLE[key].color,
            border: `1px solid ${TIER_STYLE[key].border}`,
          }}>{label}</span>
        ))}
        <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center', marginLeft: 'auto' }}>
          Auto-reminders fire daily
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', paddingBottom: 80 }}>
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
            const { text, style } = urgencyLabel(row.daysLeft);
            const wasSent = sentIds.has(uid);
            const isSending = sending === uid;

            return (
              <div key={i} style={{
                background: C.white, borderRadius: 12, marginBottom: 8,
                border: `1px solid ${row.daysLeft <= 0 ? '#F5C6CB' : row.daysLeft === 1 ? C.gold : C.border}`,
                padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <Avatar initials={row.member.initials || row.member.full_name?.slice(0,2).toUpperCase()} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{row.member.full_name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {row.circle.name} · GHS {row.circle.contribution_amount}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    Deadline: {row.deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                  }}>{text}</span>
                  <button
                    onClick={() => !wasSent && sendManual(row)}
                    disabled={isSending || wasSent}
                    style={{
                      background: wasSent ? C.greenBg : C.ink,
                      color: wasSent ? C.green : C.cream,
                      border: 'none', borderRadius: 6, padding: '5px 10px',
                      fontSize: 11, fontWeight: 700,
                      cursor: wasSent || isSending ? 'default' : 'pointer',
                    }}
                  >
                    {isSending ? '…' : wasSent ? '✓ Sent' : '🔔 Send now'}
                  </button>
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