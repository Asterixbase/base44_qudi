import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../lib/qudiTokens';
import KenteStripe from '../components/qudi/KenteStripe';

const STEPS = ['Personal', 'Identity', 'Verify', 'Terms'];

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: '', phone: '', country: 'GH', idType: 'ghanaCard', otp: '' });
  const [kyc, setKyc] = useState('idle'); // idle | scanning | done
  const [errors, setErrors] = useState({});

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required';
      if (!/^\+?[0-9]{10,14}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid MoMo number';
    }
    if (step === 2 && form.otp.length !== 6) e.otp = 'Enter the 6-digit code sent to your phone';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, 3)); };

  const simulateKYC = () => {
    setKyc('scanning');
    setTimeout(() => setKyc('done'), 2000);
  };

  const Field = ({ label, field, type = 'text', placeholder, inputMode }) => (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</label>
      <input
        type={type} inputMode={inputMode} placeholder={placeholder}
        value={form[field]} onChange={e => update(field, e.target.value)}
        style={{
          width: '100%', padding: '13px 14px', borderRadius: 10, fontSize: 15,
          border: `1.5px solid ${errors[field] ? C.red : C.border}`,
          background: C.white, color: C.ink, outline: 'none', boxSizing: 'border-box',
        }}
      />
      {errors[field] && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{errors[field]}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <KenteStripe height={4} />
      {/* Header */}
      <div style={{ background: C.ink, padding: '16px 16px 20px' }}>
        <button onClick={() => step === 0 ? navigate('/') : setStep(s => s - 1)} style={{
          background: 'none', border: 'none', color: C.cream, fontSize: 22, cursor: 'pointer', marginBottom: 16, padding: 0,
        }}>←</button>
        <div style={{ color: C.cream, fontWeight: 700, fontSize: 20 }}>Create account</div>
        <div style={{ color: C.hintOnDark, fontSize: 13, marginTop: 4 }}>{STEPS[step]} — Step {step + 1} of 4</div>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: i <= step ? 2 : 1, height: 4, borderRadius: 2,
              background: i <= step ? C.gold : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 16px', overflowY: 'auto' }}>
        {step === 0 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 20 }}>Tell us about yourself</div>
            <Field label="Full name" field="fullName" placeholder="e.g. Akosua Asante" />
            <Field label="MoMo phone number" field="phone" type="tel" inputMode="numeric" placeholder="+233 XX XXX XXXX" />
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Country</label>
              <select value={form.country} onChange={e => update('country', e.target.value)} style={{
                width: '100%', padding: '13px 14px', borderRadius: 10, fontSize: 15,
                border: `1.5px solid ${C.border}`, background: C.white, color: C.ink,
              }}>
                <option value="GH">🇬🇭 Ghana</option>
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="UK">🇬🇧 United Kingdom</option>
              </select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Identity verification</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
              {form.country === 'GH' ? 'Ghana Card (NIA)' : form.country === 'NG' ? 'NIN — NIMC' : 'UK Passport / BRP'}
            </div>
            {kyc === 'idle' ? (
              <div style={{
                background: C.card, border: `2px dashed ${C.border}`, borderRadius: 12,
                padding: '32px 20px', textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🪪</div>
                <div style={{ fontWeight: 600, color: C.ink, marginBottom: 8 }}>Scan your ID document</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                  Hold your {form.country === 'UK' ? 'passport' : 'Ghana Card'} flat and well-lit
                </div>
                <button onClick={simulateKYC} style={{
                  background: C.gold, color: C.ink, border: 'none', borderRadius: 10,
                  padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>Start scan (simulated)</button>
              </div>
            ) : kyc === 'scanning' ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
                <div style={{ color: C.muted, fontSize: 14 }}>Verifying with {form.country === 'GH' ? 'NIA' : form.country === 'NG' ? 'NIMC' : 'Onfido'}...</div>
                <div style={{ marginTop: 16, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: C.gold, width: '70%', borderRadius: 2, animation: 'none' }} />
                </div>
              </div>
            ) : (
              <div style={{
                background: C.greenBg, border: `1px solid ${C.green}`, borderRadius: 12,
                padding: '16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
              }}>
                <div style={{ color: C.green, fontSize: 24 }}>✓</div>
                <div>
                  <div style={{ color: C.greenTx, fontWeight: 600, fontSize: 14 }}>Identity verified</div>
                  <div style={{ color: C.greenTx, fontSize: 12 }}>
                    {form.country === 'GH' ? 'NIA' : form.country === 'NG' ? 'NIMC' : 'Onfido'} confirmed your identity
                  </div>
                </div>
              </div>
            )}

            {/* Selfie */}
            <div style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 28 }}>🤳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Liveness check</div>
                <div style={{ fontSize: 12, color: C.muted }}>Blink twice when prompted</div>
              </div>
              <span style={{ background: kyc === 'done' ? C.greenBg : C.amberBg, color: kyc === 'done' ? C.greenTx : C.amberTx, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600 }}>
                {kyc === 'done' ? 'Done' : 'Pending'}
              </span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Verify your number</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
              A 6-digit code was sent to <strong style={{ color: C.ink }}>{form.phone || '+233 XX XXX XXXX'}</strong> via SMS
            </div>
            <Field label="Verification code" field="otp" inputMode="numeric" placeholder="_ _ _ _ _ _" />
            <button style={{
              background: 'none', border: 'none', color: C.goldText, fontSize: 14,
              fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: -8,
            }}>Resend code (60s)</button>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 12 }}>Fraud & terms</div>
            <div style={{
              background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20,
              fontSize: 13, color: C.muted, lineHeight: '20px', maxHeight: 260, overflowY: 'auto',
            }}>
              {['Provide accurate identity information',
                'Never share your Qudi PIN',
                'Report fraudulent circle activity immediately',
                'Qudi funds are held in escrow — organisers cannot withdraw pot',
                'Guarantee liability: you are responsible for your guarantor nominations',
                'Payout order is set at circle creation and cannot be changed',
                'SIM-swap protection: payouts freeze for 48h after a number change',
                'GLICO insurance covers default events — not voluntary withdrawals',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: C.gold, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <div style={{
              background: C.amberBg, border: `1px solid ${C.gold}`, borderRadius: 10,
              padding: '12px 14px', fontSize: 13, color: C.amberTx, marginBottom: 8,
            }}>
              By creating an account you agree to Qudi's Terms of Service, Privacy Policy, and Anti-Fraud Policy.
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '16px', background: C.cream, borderTop: `1px solid ${C.border}` }}>
        {step < 3 ? (
          <button onClick={next} disabled={step === 1 && kyc !== 'done'} style={{
            width: '100%', background: (step === 1 && kyc !== 'done') ? C.border : C.gold,
            color: C.ink, border: 'none', borderRadius: 12, padding: '16px',
            fontSize: 16, fontWeight: 700, cursor: step === 1 && kyc !== 'done' ? 'not-allowed' : 'pointer',
          }}>
            {step === 1 && kyc !== 'done' ? 'Complete identity scan first' : 'Continue →'}
          </button>
        ) : (
          <button onClick={() => navigate('/dashboard')} style={{
            width: '100%', background: C.gold, color: C.ink, border: 'none',
            borderRadius: 12, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>I agree — Create my account</button>
        )}
      </div>
    </div>
  );
}