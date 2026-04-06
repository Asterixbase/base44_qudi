import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

const STATUS_META = {
  submitted:    { label: 'Submitted',    bg: C.blueBg,  color: C.blue },
  under_review: { label: 'Under Review', bg: C.amberBg, color: C.amberTx },
  approved:     { label: 'Approved',     bg: C.greenBg, color: C.greenTx },
  rejected:     { label: 'Rejected',     bg: C.redBg,   color: C.redTx },
  paid_out:     { label: 'Paid Out',     bg: '#D4EDDA',  color: '#155724' },
};

const CLAIM_TYPES = [
  { value: 'missed_payout',   label: '📭 Missed Payout' },
  { value: 'member_default',  label: '🚨 Member Default' },
  { value: 'fraud',           label: '⚠️ Fraud / Theft' },
  { value: 'death_hardship',  label: '🕊️ Death / Hardship' },
  { value: 'other',           label: '📝 Other' },
];

const TABS = ['Claims', 'Insured Circles', 'File Claim'];

export default function InsuranceManagement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Claims');
  const [claims, setClaims] = useState([]);
  const [circles, setCircles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({ circle_id: '', member_id: '', claim_type: '', amount_claimed: '', description: '', cycle: '' });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.InsuranceClaim.list('-created_date', 50),
      base44.entities.Circle.filter({ is_insured: true }, '-created_date', 30),
    ]).then(([c, ci]) => { setClaims(c); setCircles(ci); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!form.circle_id) return;
    base44.entities.Member.filter({ circle_id: form.circle_id }, 'full_name', 30).then(setMembers);
  }, [form.circle_id]);

  const selectedCircle = circles.find(c => c.id === form.circle_id);

  const submitClaim = async () => {
    if (!form.circle_id || !form.claim_type || !form.description.trim()) return;
    setSubmitting(true);
    let evidence_url = null;
    if (evidenceFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: evidenceFile });
      evidence_url = file_url;
    }
    const ref = 'CLM-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const member = members.find(m => m.id === form.member_id);
    const claim = await base44.entities.InsuranceClaim.create({
      circle_id: form.circle_id,
      circle_name: selectedCircle?.name || '',
      member_id: form.member_id || '',
      member_name: member?.full_name || 'General',
      claim_type: form.claim_type,
      amount_claimed: form.amount_claimed ? parseFloat(form.amount_claimed) : undefined,
      description: form.description.trim(),
      evidence_url,
      status: 'submitted',
      claim_ref: ref,
      cycle: form.cycle ? parseInt(form.cycle) : selectedCircle?.current_cycle || 1,
    });
    setClaims(prev => [claim, ...prev]);
    setSubmitDone(true);
    setSubmitting(false);
    setForm({ circle_id: '', member_id: '', claim_type: '', amount_claimed: '', description: '', cycle: '' });
    setEvidenceFile(null);
  };

  const insuredClaims = claims.filter(c => c.status === 'submitted' || c.status === 'under_review');
  const resolvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'paid_out' || c.status === 'rejected');

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Insurance" subtitle="Circle protection & claims" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: `1px solid rgba(255,255,255,0.08)` }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px 4px', background: 'none', border: 'none',
              color: tab === t ? C.gold : C.hintOnDark,
              fontWeight: tab === t ? 700 : 400, fontSize: 12, cursor: 'pointer',
              borderBottom: tab === t ? `2px solid ${C.gold}` : '2px solid transparent',
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 80 }}>

        {/* ── CLAIMS TAB ── */}
        {tab === 'Claims' && (
          <>
            {/* Summary */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Open', count: insuredClaims.length, bg: C.amberBg, color: C.amberTx },
                { label: 'Approved', count: claims.filter(c => c.status === 'approved' || c.status === 'paid_out').length, bg: C.greenBg, color: C.greenTx },
                { label: 'Rejected', count: claims.filter(c => c.status === 'rejected').length, bg: C.redBg, color: C.redTx },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {loading && <div style={{ color: C.muted, textAlign: 'center', padding: 24, fontSize: 13 }}>Loading claims…</div>}

            {!loading && claims.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
                <div style={{ fontWeight: 600, color: C.ink, marginBottom: 4 }}>No claims yet</div>
                <div style={{ fontSize: 13 }}>File a claim from the "File Claim" tab.</div>
              </div>
            )}

            {insuredClaims.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 8 }}>ACTIVE CLAIMS</div>
                {insuredClaims.map(c => <ClaimCard key={c.id} claim={c} />)}
              </>
            )}

            {resolvedClaims.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, marginTop: 16 }}>RESOLVED</div>
                {resolvedClaims.map(c => <ClaimCard key={c.id} claim={c} />)}
              </>
            )}
          </>
        )}

        {/* ── INSURED CIRCLES TAB ── */}
        {tab === 'Insured Circles' && (
          <>
            {loading && <div style={{ color: C.muted, textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</div>}
            {!loading && circles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
                <div style={{ fontWeight: 600, color: C.ink, marginBottom: 4 }}>No insured circles</div>
                <div style={{ fontSize: 13 }}>Enable insurance when creating a circle.</div>
              </div>
            )}
            {circles.map(circle => {
              const circleClaims = claims.filter(c => c.circle_id === circle.id);
              const open = circleClaims.filter(c => ['submitted','under_review'].includes(c.status)).length;
              return (
                <div key={circle.id} style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{circle.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        GHS {circle.contribution_amount} · {circle.frequency} · {circle.max_members} members
                      </div>
                    </div>
                    <span style={{ background: C.tealBg, color: C.tealTx, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>Insured</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: C.muted }}>Claims: <strong style={{ color: C.ink }}>{circleClaims.length}</strong></div>
                    {open > 0 && <div style={{ fontSize: 12, color: C.amberTx, fontWeight: 600 }}>{open} open</div>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── FILE CLAIM TAB ── */}
        {tab === 'File Claim' && (
          <>
            {submitDone ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 6 }}>Claim Submitted</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Your claim has been logged and is under review by the insurer.</div>
                <button onClick={() => { setSubmitDone(false); setTab('Claims'); }}
                  style={{ padding: '13px 32px', background: C.ink, color: C.cream, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  View Claims
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Circle */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>INSURED CIRCLE *</label>
                  <select value={form.circle_id} onChange={e => setForm(f => ({ ...f, circle_id: e.target.value, member_id: '' }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, fontSize: 14, color: C.ink }}>
                    <option value="">— select circle —</option>
                    {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Member */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>AFFECTED MEMBER (optional)</label>
                  <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}
                    disabled={!form.circle_id}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: form.circle_id ? C.white : C.cream, fontSize: 14, color: C.ink }}>
                    <option value="">— general / circle-wide —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>

                {/* Claim type */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>CLAIM TYPE *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {CLAIM_TYPES.map(ct => (
                      <label key={ct.value} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: form.claim_type === ct.value ? C.amberBg : C.white,
                        border: `1px solid ${form.claim_type === ct.value ? C.gold : C.border}`,
                        borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      }}>
                        <input type="radio" name="claim_type" value={ct.value} checked={form.claim_type === ct.value}
                          onChange={() => setForm(f => ({ ...f, claim_type: ct.value }))} style={{ accentColor: C.gold }} />
                        <span style={{ fontSize: 13, color: C.ink, fontWeight: form.claim_type === ct.value ? 600 : 400 }}>{ct.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount + Cycle */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>AMOUNT (GHS)</label>
                    <input type="number" value={form.amount_claimed} onChange={e => setForm(f => ({ ...f, amount_claimed: e.target.value }))}
                      placeholder="0.00"
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.white, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>CYCLE #</label>
                    <input type="number" value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}
                      placeholder={selectedCircle?.current_cycle || '1'}
                      style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, color: C.ink, background: C.white, boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>DESCRIPTION *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the incident clearly — dates, amounts, affected members…"
                    rows={4}
                    style={{ width: '100%', borderRadius: 8, border: `1px solid ${C.border}`, padding: '10px', fontSize: 13, fontFamily: 'inherit', background: C.white, color: C.ink, resize: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Evidence */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6 }}>EVIDENCE (optional)</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.white, border: `1px dashed ${C.border}`, borderRadius: 8, padding: '12px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 18 }}>📎</span>
                    <span style={{ fontSize: 13, color: evidenceFile ? C.ink : C.muted }}>
                      {evidenceFile ? evidenceFile.name : 'Attach screenshot, receipt or document'}
                    </span>
                    <input type="file" accept="image/*,application/pdf" hidden onChange={e => setEvidenceFile(e.target.files[0] || null)} />
                  </label>
                </div>

                <button onClick={submitClaim} disabled={submitting || !form.circle_id || !form.claim_type || !form.description.trim()}
                  style={{
                    width: '100%', padding: '14px', background: (submitting || !form.circle_id || !form.claim_type || !form.description.trim()) ? C.border : C.ink,
                    color: C.cream, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800,
                    cursor: (submitting || !form.circle_id || !form.claim_type || !form.description.trim()) ? 'default' : 'pointer',
                  }}>
                  {submitting ? 'Submitting…' : '🛡️ File Claim'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}

function ClaimCard({ claim }) {
  const s = STATUS_META[claim.status] || STATUS_META.submitted;
  const typeLabel = {
    missed_payout: 'Missed Payout', member_default: 'Member Default',
    fraud: 'Fraud', death_hardship: 'Death / Hardship', other: 'Other',
  }[claim.claim_type] || claim.claim_type;

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '14px', marginBottom: 10, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{claim.circle_name || '—'}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{typeLabel} · {claim.member_name || 'General'}</div>
        </div>
        <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>{s.label}</span>
      </div>
      {claim.amount_claimed > 0 && (
        <div style={{ fontSize: 13, fontWeight: 700, color: C.goldText, marginBottom: 4 }}>GHS {claim.amount_claimed?.toLocaleString()}</div>
      )}
      <div style={{ fontSize: 12, color: C.muted, marginBottom: claim.insurer_note ? 6 : 0 }}>{claim.description}</div>
      {claim.insurer_note && (
        <div style={{ background: C.amberBg, borderRadius: 6, padding: '6px 10px', fontSize: 11, color: C.amberTx, fontWeight: 600 }}>
          Insurer note: {claim.insurer_note}
        </div>
      )}
      {claim.claim_ref && <div style={{ fontSize: 10, color: C.hint, marginTop: 6 }}>Ref: {claim.claim_ref}</div>}
    </div>
  );
}