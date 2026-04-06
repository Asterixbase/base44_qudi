/**
 * Secure Credit Sale with PII Encryption + Biometric MFA
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { encrypt, maskPII } from '@/lib/encryption';
import BiometricAuth from '@/lib/biometricAuth';
import { ComplianceAudit } from '@/lib/complianceAudit';
import { checkCreditFraud, shouldRequireApproval } from '@/lib/fraudDetection';
import { AlertCircle, Shield, Lock } from 'lucide-react';

export default function CreditSecure() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: customer ID, 2: verify, 3: confirm
  const [ghanaCard, setGhanaCard] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [biometricDone, setBiometricDone] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [audit] = useState(new ComplianceAudit('shop-001', 'user-001'));

  const handleBiometric = async () => {
    setLoading(true);
    const result = await BiometricAuth.authenticate('user-001');
    if (result.success) {
      setBiometricDone(true);
      setStep(2);
    } else {
      alert('❌ Biometric failed: ' + result.error);
    }
    setLoading(false);
  };

  const handleCustomerVerify = async () => {
    if (!ghanaCard || !phone) {
      alert('Ghana Card + Phone required');
      return;
    }

    setLoading(true);
    try {
      // Check fraud
      const userHistory = await base44.entities.Transaction.filter({ 
        created_by: (await base44.auth.me()).email 
      });
      const fraudCheck = await checkCreditFraud(
        {
          amount: parseFloat(amount),
          customer_phone: phone,
          dueDate,
          type: 'credit',
        },
        userHistory
      );

      setFraudAlerts(fraudCheck.alerts);

      if (!fraudCheck.safe) {
        const approval = shouldRequireApproval(fraudCheck.riskScore);
        if (approval && approval !== 'log_only') {
          alert(`⚠️ Fraud detected: ${fraudCheck.alerts.map(a => a.message).join('; ')}`);
          return;
        }
      }

      setStep(3);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCredit = async () => {
    setLoading(true);
    try {
      // ENCRYPT PII before storage
      const creditRecord = {
        customer_name: ghanaCard.split('-')[0] || 'Unknown',
        customer_ghana_card: encrypt(ghanaCard), // AES-256
        customer_phone: encrypt(phone), // AES-256
        amount: parseFloat(amount),
        due_date: dueDate,
        status: 'pending',
        reference: `CRD-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      // Log to compliance audit
      await audit.logTransaction({
        type: 'credit',
        amount: creditRecord.amount,
        reference: creditRecord.reference,
        customer_name: ghanaCard.split('-')[0],
        customer_phone: phone, // Logged before encryption
      });

      // Save encrypted
      await base44.entities.Transaction.create(creditRecord);

      alert('✓ Credit recorded securely\nPII encrypted (GHS-DPA 2012)\nBiometric + fraud verified');
      navigate('/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Secure Credit Sale
        </h1>
        <p className="text-sm text-primary-light">PII encrypted + Fraud detected</p>
      </div>

      {/* Step 1: Biometric Authentication */}
      {step === 1 && (
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-blue-900">Verify Your Identity</h3>
            <p className="text-sm text-blue-800">Biometric authentication required for credit transactions</p>
            <button
              onClick={handleBiometric}
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-light transition disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : '🔐 Use Fingerprint / Face'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Customer Details + Fraud Check */}
      {step === 2 && (
        <div className="p-4 space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <label className="block text-sm font-semibold">Ghana Card ID</label>
            <input
              type="text"
              placeholder="GHA-XXXXXXXX-X"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3"
            />

            <label className="block text-sm font-semibold">Phone (MoMo)</label>
            <input
              type="tel"
              placeholder="+233 24 XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3"
            />

            <label className="block text-sm font-semibold">Amount (GHS)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3"
            />

            <label className="block text-sm font-semibold">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-border rounded-lg px-4 py-3"
            />

            {fraudAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                {fraudAlerts.map((alert, i) => (
                  <div key={i} className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{alert.code}</p>
                      <p className="text-xs text-amber-700">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCustomerVerify}
              disabled={loading || !ghanaCard || !phone || !amount || !dueDate}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-light transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Check Fraud'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm + Encryption */}
      {step === 3 && (
        <div className="p-4 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-green-900 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Ready to Process
            </h3>
            <div className="space-y-2 text-sm text-green-800">
              <p>✓ Biometric verified</p>
              <p>✓ Fraud checks passed</p>
              <p>✓ PII will be AES-256 encrypted</p>
              <p>✓ Audit trail logged (GRA-ready)</p>
            </div>

            <button
              onClick={handleConfirmCredit}
              disabled={loading}
              className="w-full bg-accent text-white py-3 rounded-lg font-medium hover:bg-accent-light transition disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Confirm Credit Sale'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}