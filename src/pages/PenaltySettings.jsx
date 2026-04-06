import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import { computePenalty } from '../lib/penaltyEngine';

const PENALTY_TYPES = [
  { value: 'flat_fee',       label: 'Flat Fee',       desc: 'Fixed GHS amount per offence' },
  { value: 'percentage',     label: 'Percentage',     desc: '% of contribution per offence' },
  { value: 'daily_interest', label: 'Daily Interest', desc: 'Accrues each day overdue' },
];

export default function PenaltySettings() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const circleInit = state?.circle || null;

  const [circles, setCircles] = useState([]);
  const [selected, setSelected] = useState(circleInit);
  const [form, setForm] = useState({
    penalty_enabled: false,
    penalty_type: 'flat_fee',
    penalty_flat_fee: 10,
    penalty_percentage: 5,
    penalty_daily_rate: 1,
    penalty_grace_days: 1,
    penalty_notify_guarantor: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.Circle.list('-created_date', 20).then(setCircles);
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        penalty_enabled:          selected.penalty_enabled ?? false,
        penalty_type:             selected.penalty_type || 'flat_fee',
        penalty_flat_fee:         selected.penalty_flat_fee ?? 10,
        penalty_percentage:       selected.penalty_percentage ?? 5,
        penalty_daily_rate:       selected.penalty_daily_rate ?? 1,
        penalty_grace_days:       selected.penalty_grace_days ?? 1,
        penalty_notify_guarantor: selected.penalty_notify_guarantor ?? true,
      });
    }
  }, [selected?.id]);

  const preview = selected ? computePenalty({ ...selected, ...form }, 3) : 0;

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    await base44.entities.Circle.update(selected.id, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Penalty Settings" subtitle="Configure late payment fees per circle" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* Circle selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>SELECT CIRCLE</label>
          <select
            value={selected?.id || ''}
            onChange={e => setSelected(circles.find(c => c.id === e.target.value) || null)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}
          >
            <option value="">— choose a circle —</option>
            {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selected && (
          <>
            {/* Enable toggle */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>Enable Penalties</div>
                <div style={{ fontSize: 12, color: C.muted }}>Auto-apply fees to late members</div>
              </div>
              <div
                onClick={() => field('penalty_enabled', !form.penalty_enabled)}
                style={{
                  width: 48, height: 26, borderRadius: 13, cursor: 'pointer', transition: 'background 0.2s',
                  background: form.penalty_enabled ? C.gold : C.border,
                  position: 'relative', flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.penalty_enabled ? 25 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: C.white,
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>

            {form.penalty_enabled && (
              <>
                {/* Penalty type */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>PENALTY TYPE</div>
                  {PENALTY_TYPES.map(pt => (
                    <div key={pt.value}
                      onClick={() => field('penalty_type', pt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
                        borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                        background: form.penalty_type === pt.value ? '#FFF8E1' : 'transparent',
                        border: `1px solid ${form.penalty_type === pt.value ? C.gold : C.border}`,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${form.penalty_type === pt.value ? C.goldText : C.muted}`,
                        background: form.penalty_type === pt.value ? C.goldText : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {form.penalty_type === pt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.white }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{pt.label}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{pt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Amount config */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 10 }}>PENALTY AMOUNT</div>

                  {form.penalty_type === 'flat_fee' && (
                    <NumberInput label="Flat fee (GHS)" value={form.penalty_flat_fee} onChange={v => field('penalty_flat_fee', v)} />
                  )}
                  {form.penalty_type === 'percentage' && (
                    <NumberInput label="% of contribution" value={form.penalty_percentage} onChange={v => field('penalty_percentage', v)} suffix="%" />
                  )}
                  {form.penalty_type === 'daily_interest' && (
                    <NumberInput label="Daily interest rate" value={form.penalty_daily_rate} onChange={v => field('penalty_daily_rate', v)} suffix="% / day" />
                  )}

                  <NumberInput label="Grace period (days)" value={form.penalty_grace_days} onChange={v => field('penalty_grace_days', v)} suffix="days" />
                </div>

                {/* Guarantor notify */}
                <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 12, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>Notify Guarantor</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Send alert when penalty is applied</div>
                  </div>
                  <div
                    onClick={() => field('penalty_notify_guarantor', !form.penalty_notify_guarantor)}
                    style={{
                      width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
                      background: form.penalty_notify_guarantor ? C.gold : C.border,
                      position: 'relative', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: form.penalty_notify_guarantor ? 25 : 3,
                      width: 20, height: 20, borderRadius: '50%', background: C.white,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                </div>

                {/* Preview */}
                <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px', marginBottom: 16, border: `1px solid ${C.gold}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4 }}>PENALTY PREVIEW</div>
                  <div style={{ fontSize: 13, color: C.ink }}>
                    If a member pays <strong>3 days late</strong> (after grace period), penalty = <strong>GHS {preview}</strong>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={save}
              disabled={saving}
              style={{
                width: '100%', padding: '14px', background: saved ? C.green : C.ink,
                color: C.cream, border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Penalty Terms'}
            </button>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, suffix = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: C.muted, display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.cream }}
        />
        {suffix && <span style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}