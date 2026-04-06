import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { C } from '../../lib/qudiTokens';

export default function ReminderButton({ members, circle }) {
  const [state, setState] = useState('idle'); // idle | sending | done
  const [results, setResults] = useState([]);

  const targets = members.filter(m => m.payment_status === 'pending' || m.payment_status === 'overdue');

  const sendReminders = async () => {
    setState('sending');
    const logs = [];
    for (const m of targets) {
      const message = `Hi ${m.full_name}, your GHS ${circle.contribution_amount || 200} contribution to "${circle.name}" is ${m.payment_status}. Please pay via MoMo to keep the circle on track. — Qudi`;
      const record = await base44.entities.Notification.create({
        circle_id: circle.id || 'demo',
        member_id: m.id,
        member_name: m.full_name,
        phone: m.phone || 'N/A',
        message,
        status: 'sent',
        channel: 'in-app',
      });
      logs.push({ name: m.full_name, status: m.payment_status });
    }
    setResults(logs);
    setState('done');
  };

  if (targets.length === 0) return null;

  return (
    <div style={{ margin: '0 16px 16px', background: C.amberBg, border: `1px solid ${C.gold}`, borderRadius: 12, padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: state === 'done' ? 12 : 0 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
            {targets.length} member{targets.length > 1 ? 's' : ''} need a nudge
          </div>
          <div style={{ fontSize: 12, color: C.amberTx, marginTop: 2 }}>Pending or overdue this cycle</div>
        </div>
        {state !== 'done' && (
          <button
            onClick={sendReminders}
            disabled={state === 'sending'}
            style={{
              background: state === 'sending' ? C.border : C.ink,
              color: C.cream, border: 'none', borderRadius: 8,
              padding: '9px 14px', fontSize: 13, fontWeight: 700,
              cursor: state === 'sending' ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            {state === 'sending' ? 'Sending…' : '🔔 Send reminders'}
          </button>
        )}
      </div>

      {state === 'done' && (
        <div>
          {results.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.white, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
              border: `0.5px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{r.name}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✓ Reminder logged</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: C.amberTx, marginTop: 6, textAlign: 'center' }}>
            All reminders recorded in notification log
          </div>
        </div>
      )}
    </div>
  );
}