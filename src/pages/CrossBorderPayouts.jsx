import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';
import Avatar from '../components/qudi/Avatar';
import { buildPayoutSummary, generateFCAReference, EXCHANGE_RATES } from '../lib/currencyConverter';

export default function CrossBorderPayouts() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: list, 2: new payout form, 3: summary
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState('UK');
  const [amountGBP, setAmountGBP] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [circle, setCircle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    base44.entities.CrossBorderPayout.list('-created_date', 20)
      .then(data => setPayouts(data))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreatePayout = async () => {
    if (!selectedMember || !amountGBP || !selectedCountry || !recipientPhone) {
      alert('Please fill all fields');
      return;
    }

    const payoutSummary = buildPayoutSummary(parseFloat(amountGBP), selectedCountry);
    setSummary({ ...payoutSummary, member: selectedMember, bankAccount });
    setStep(3);
  };

  const handleSubmitPayout = async () => {
    setSubmitting(true);
    try {
      const fca_ref = generateFCAReference();
      await base44.entities.CrossBorderPayout.create({
        member_id: selectedMember.id,
        member_name: selectedMember.full_name,
        circle_id: circle?.id || 'c1',
        country: selectedCountry,
        gbp_amount: parseFloat(amountGBP),
        ghs_amount: summary.ghsAmount,
        exchange_rate: summary.exchangeRate,
        compliance_fee_gbp: summary.complianceFeeSource,
        compliance_fee_ghs: summary.complianceFeeGHS,
        bank_account: bankAccount.slice(-4),
        recipient_phone: recipientPhone,
        status: 'pending',
        fca_reference: fca_ref,
      });

      // Reset form
      setAmountGBP('');
      setBankAccount('');
      setRecipientPhone('');
      setSelectedMember(null);
      setSummary(null);
      setStep(1);
      
      // Refresh list
      const updated = await base44.entities.CrossBorderPayout.list('-created_date', 20);
      setPayouts(updated);
    } catch (err) {
      console.error('Payout submission failed:', err);
      alert('Failed to submit payout. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status) => {
    const colors = {
      pending: { bg: '#FEF3C7', color: '#92400E' },
      approved: { bg: '#DCFCE7', color: '#166534' },
      processing: { bg: '#DBEAFE', color: '#075985' },
      completed: { bg: '#E0E7FF', color: '#312E81' },
      failed: { bg: '#FEE2E2', color: '#991B1B' },
    };
    return colors[status] || colors.pending;
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: C.ink }}>
        <Header dark title="Cross-Border Payouts" subtitle="UK diaspora & international transfers" onBack={() => navigate('/dashboard')} />
        <KenteStripe height={3} />
        <div style={{ padding: '10px 16px', color: C.hintOnDark, fontSize: 11 }}>
          🌍 FCA-regulated compliance · Real-time GBP↔GHS conversion
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 90 }}>
        {step === 1 && (
          <>
            {/* New payout button */}
            <button onClick={() => setStep(2)} style={{
              width: '100%', background: C.gold, color: C.ink, border: 'none',
              borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 14,
              marginBottom: 16, cursor: 'pointer',
            }}>
              + New Payout Request
            </button>

            {/* Payouts list */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading…</div>
            ) : payouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
                <div style={{ fontWeight: 600, color: C.ink }}>No payouts yet</div>
                <div style={{ fontSize: 12 }}>Create your first cross-border payout above</div>
              </div>
            ) : (
              payouts.map(p => {
                const sc = statusColor(p.status);
                return (
                  <div key={p.id} style={{
                    background: C.white, borderRadius: 12, padding: '14px',
                    marginBottom: 10, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: C.goldBg, color: C.goldText,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14,
                      }}>
                        £
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{p.member_name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{EXCHANGE_RATES[p.country]?.country}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.goldText }}>£{p.gbp_amount}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>GHS {p.ghs_amount}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 10, color: C.muted }}>{p.fca_reference}</div>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>COUNTRY</div>
              <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} style={{
                width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: C.ink,
              }}>
                {Object.entries(EXCHANGE_RATES).map(([key, val]) => (
                  <option key={key} value={key}>{val.country} ({val.currency})</option>
                ))}
              </select>
            </div>

            <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>AMOUNT ({EXCHANGE_RATES[selectedCountry]?.currency})</div>
              <input
                type="number"
                placeholder="e.g. 500"
                value={amountGBP}
                onChange={e => setAmountGBP(e.target.value)}
                style={{
                  width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>UK BANK ACCOUNT (Last 4 digits)</div>
              <input
                type="text"
                placeholder="e.g. 5678"
                value={bankAccount}
                onChange={e => setBankAccount(e.target.value)}
                maxLength="4"
                style={{
                  width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ background: C.white, borderRadius: 12, padding: '16px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>GHS RECIPIENT MOMO</div>
              <input
                type="tel"
                placeholder="+233 24 000 0000"
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                style={{
                  width: '100%', padding: '10px', border: `1px solid ${C.border}`, borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, background: C.cream, color: C.ink, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleCreatePayout} style={{
                flex: 1, background: C.gold, color: C.ink, border: 'none',
                borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer',
              }}>Review Payout</button>
            </div>
          </>
        )}

        {step === 3 && summary && (
          <>
            <div style={{ background: C.ink, borderRadius: 12, padding: '16px', marginBottom: 16, color: C.cream }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.hintOnDark, marginBottom: 8 }}>PAYOUT SUMMARY</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>GHS {summary.netGHS.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: C.hintOnDark }}>Net amount to {summary.member.full_name}</div>
            </div>

            {/* Breakdown */}
            <div style={{ background: C.white, borderRadius: 12, padding: '14px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 12 }}>BREAKDOWN</div>
              {[
                { label: `Amount (${summary.sourceSymbol})`, value: `${summary.sourceSymbol} ${summary.amountSourceCurrency}`, color: C.ink },
                { label: `Exchange Rate`, value: `1 ${summary.sourceSymbol} = GHS ${summary.exchangeRate}`, color: C.muted },
                { label: `Gross GHS`, value: `GHS ${summary.ghsAmount.toLocaleString()}`, color: C.ink },
                { label: `FCA Compliance Fee`, value: `− GHS ${summary.complianceFeeGHS.toLocaleString()}`, color: '#DC2626' },
                { label: `Net Amount`, value: `GHS ${summary.netGHS.toLocaleString()}`, color: C.goldText, bold: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: 8, borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ color: C.muted }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: item.bold ? 700 : 600 }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Compliance info */}
            <div style={{ background: '#DBEAFE', borderRadius: 12, padding: '12px', marginBottom: 16, fontSize: 11, color: '#075985', fontWeight: 600 }}>
              ✓ FCA-regulated transfer · Reference: {summary.country === 'UK' ? 'FCA-REG-UK' : 'INT-REG'} · Real-time settlement
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{
                flex: 1, background: C.cream, color: C.ink, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer',
              }}>Back</button>
              <button onClick={handleSubmitPayout} disabled={submitting} style={{
                flex: 1, background: submitting ? C.border : C.gold, color: C.ink, border: 'none',
                borderRadius: 10, padding: '12px', fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
              }}>
                {submitting ? 'Processing…' : 'Confirm & Submit'}
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}