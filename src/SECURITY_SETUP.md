# Sikasem Security Implementation — Ghana DPA 2012 Compliant

## Installation & Setup

### 1. Environment Variables
Create `.env.local`:
```
REACT_APP_PII_KEY=your-32-byte-secret-key-here
REACT_APP_BIOMETRIC_ENABLED=true
REACT_APP_FRAUD_DETECTION=true
```

### 2. Encryption (AES-256)
**Location:** `lib/encryption.js`
- Encrypts: Ghana Card ID, MoMo phone numbers, banking details
- Standard: AES-256-CBC (256-bit key)
- All PII encrypted before storage or logging
- Masked in audit trails (e.g., +233 24• ••• ••XX)

```javascript
import { encrypt, decrypt, maskPII } from '@/lib/encryption';

// Encrypt sensitive data
const encryptedCard = encrypt('GHA-12345678-9');

// Display masked version in logs
const masked = maskPII('+233241234567', 'phone');
```

---

## 3. Fraud Detection
**Location:** `lib/fraudDetection.js`

**Rules Engine:**
| Rule | Trigger | Action |
|------|---------|--------|
| Credit Velocity | >5 credits/day | Warn cashier, require manager approval |
| Unusual Amount | 3x above average | Flag transaction, log event |
| Multi-Account Abuse | Same phone, >3 shops | Escalate to admin |
| MoMo Network Switching | 3+ rapid network changes | Investigate payout |
| Impossible Travel | >500 km/hour location jump | Block transaction |

**Usage:**
```javascript
import { checkCreditFraud, shouldRequireApproval } from '@/lib/fraudDetection';

const fraudCheck = await checkCreditFraud(transaction, userHistory);
if (fraudCheck.riskScore >= 40) {
  const approval = shouldRequireApproval(fraudCheck.riskScore);
  // approval = 'manager' | 'supervisor' | 'log_only' | false
}
```

---

## 4. Compliance & Audit Trail
**Location:** `lib/complianceAudit.js`

**Features:**
- Immutable transaction log (SHA-256 hash chain)
- GRA VAT return export (monthly/quarterly)
- Bank of Ghana payout reporting
- Cryptographic integrity verification

**Usage:**
```javascript
import { ComplianceAudit } from '@/lib/complianceAudit';

const audit = new ComplianceAudit('shop-001', 'user-001');

// Log every transaction
await audit.logTransaction({
  type: 'sale',
  amount: 100.00,
  payment_method: 'cash',
  // ...
});

// Export for GRA
const vatReturn = audit.getVATReturn('monthly');
// { totalRevenue, totalVAT, transactions, auditHash }

// Verify integrity (detect tampering)
const integrity = audit.verifyIntegrity();
// { valid: true/false, tamperedAt: index }
```

**Audit Trail Fields (PII Redacted):**
```javascript
{
  timestamp: "2026-04-06T09:41:00Z",
  type: "sale|credit|payout",
  amount: 100.50,
  vat: 15.08,
  paymentMethod: "cash|momo|credit",
  redactedData: { customer: "KK•••", phone: "••••7890" },
  hash: "sha256...", // Current
  previousHash: "sha256...", // Chain
}
```

---

## 5. Device Fingerprinting
**Location:** `lib/deviceFingerprint.js`

**Detects:**
- Headless/simulated environments (fraud bots)
- Device tampering (modified browser, rooted phone)
- Jailbreak on iOS, custom ROMs on Android

**Usage:**
```javascript
import { DeviceFingerprint } from '@/lib/deviceFingerprint';

// Register device on first login
const fp = await DeviceFingerprint.generate();
// { fingerprint: "abc123...", components: {...}, timestamp }

// Verify device on subsequent logins
const verify = await DeviceFingerprint.verify(storedFingerprint);
if (!verify.match) {
  alert('Device changed. Require biometric + OTP.');
}
```

**Compatible:**
- Web: Canvas fingerprinting, browser APIs
- React Native/Expo: Device.deviceId, modelId, osVersion

---

## 6. Biometric + MFA
**Location:** `lib/biometricAuth.js`

**Methods:**
1. **Fingerprint/Face** (Expo native)
2. **WebAuthn/FIDO2** (Web browsers)
3. **OTP Backup** (SMS/Authenticator)

**Setup Workflow:**
```javascript
import BiometricAuth from '@/lib/biometricAuth';

// Register biometric on first use
const register = await BiometricAuth.registerBiometric('user-id');
// Returns: { success: true, method: 'expo-biometric|webauthn' }

// Authenticate (sensitive transactions, payouts)
const auth = await BiometricAuth.authenticate('user-id');
if (!auth.success) {
  // Fallback to OTP
  await BiometricAuth.sendOTP(userPhone);
  const verified = await BiometricAuth.verifyOTP(code, userPhone);
}
```

---

## 7. Pages & Workflows

### Sale Page (`/sale`)
- Regular cash/MoMo sales
- Fraud detection on credit transactions
- Compliance audit logging
- Offline queue support

### Secure Credit Sale (`/credit-secure`)
1. **Biometric verification** (fingerprint/face)
2. **Customer ID scan** (Ghana Card)
3. **Fraud detection** (checks rules engine)
4. **Encryption** (PII stored encrypted)
5. **Compliance audit** (GRA-ready log)

### Compliance Dashboard (`/compliance`)
- Audit trail integrity check
- GRA VAT Return export (CSV)
- Bank of Ghana Payout Report (JSON)
- Cryptographic signature verification

---

## 8. GRA Compliance Example

**Monthly VAT Return:**
```json
{
  "period": "monthly",
  "totalRevenue": "12450.00",
  "totalVAT": "1867.50",
  "transactions": 47,
  "auditHash": "sha256...",
  "exportDate": "2026-04-06T09:41:00Z"
}
```

**Submit to GRA:**
1. Download CSV from ComplianceDashboard
2. Upload to GRA portal (https://gra.gov.gh)
3. Audit hash provides cryptographic proof of integrity

---

## 9. Bank of Ghana Payout Reporting

**Required for MoMo → Bank transfers:**
```json
{
  "reportDate": "2026-04-06T09:41:00Z",
  "shopId": "shop-001",
  "totalPayouts": "45000.00",
  "payoutCount": 12,
  "transactions": [
    {
      "reference": "SAL-1234567890",
      "amount": 3750.00,
      "timestamp": "2026-04-05T15:30:00Z",
      "hash": "sha256..."
    }
  ]
}
```

---

## 10. Migration Guide (Expo → Production)

### Files to Copy:
```
lib/
  ├── encryption.js          → Use native crypto library
  ├── fraudDetection.js       → Portable as-is
  ├── complianceAudit.js      → Portable as-is
  ├── deviceFingerprint.js    → Require expo-device on mobile
  └── biometricAuth.js        → Require expo-local-authentication

pages/
  ├── CreditSecure.jsx        → React Native friendly
  ├── ComplianceDashboard.jsx → Use react-native components
  └── Sale.jsx                → Minor mobile adjustments
```

### Expo Modifications:
1. Replace `navigator.userAgent` with `expo-device` APIs
2. Use `expo-local-authentication` for biometric
3. Replace Web WebAuthn with Expo Secure Store for token storage
4. Use `expo-file-system` for local audit log storage

---

## 11. Testing

**Run Fraud Detection Tests:**
```bash
npm test -- lib/fraudDetection.js
```

**Verify Encryption:**
```bash
npm test -- lib/encryption.js
```

**Check Audit Integrity:**
```javascript
const audit = new ComplianceAudit('test-shop', 'test-user');
await audit.logTransaction({type: 'sale', amount: 100});
const integrity = audit.verifyIntegrity();
console.assert(integrity.valid, 'Audit trail should be valid');
```

---

## 12. Handoff to Agency

**Deliverables:**
1. ✅ Encryption layer (AES-256, Ghana DPA 2012 ready)
2. ✅ Fraud detection (rules-based, Ghana-specific)
3. ✅ Compliance audit trail (GRA/BoG export-ready)
4. ✅ Device fingerprinting (tamper detection)
5. ✅ Biometric + MFA (Expo + web compatible)
6. ✅ React Native adaptation guide (for Expo)
7. ✅ Test suite stubs

**Agency Tasks:**
- [ ] Set up `.env` secrets (REACT_APP_PII_KEY)
- [ ] Test Expo integration (esp. biometric, device fingerprint)
- [ ] Integrate GRA/BoG APIs
- [ ] Add push notifications on fraud alerts
- [ ] Set up Sentry/Firebase for error monitoring
- [ ] Conduct security audit (pen test)
- [ ] Deploy to TestFlight/Play Store

---

**Status:** Security framework ready for Ghana fintech. All modules portable to Expo (React Native). ✅