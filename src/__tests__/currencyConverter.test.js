/* eslint-env jest */
/* eslint-env jest */

import { convertCurrency, calculateComplianceFee, buildPayoutSummary, EXCHANGE_RATES, COMPLIANCE_FEES } from '../lib/currencyConverter';

describe('Currency Converter', () => {
  describe('convertCurrency', () => {
    test('converts GBP to GHS correctly', () => {
      const result = convertCurrency(100, 'UK');
      expect(result).toBeDefined();
      expect(result.rate).toBe(11.5);
      expect(result.amount).toBe(1150);
    });

    test('converts USD to GHS correctly', () => {
      const result = convertCurrency(100, 'US');
      expect(result.rate).toBe(15.2);
      expect(result.amount).toBe(1520);
    });

    test('returns null for invalid country', () => {
      const result = convertCurrency(100, 'INVALID');
      expect(result).toBeNull();
    });

    test('handles decimal amounts', () => {
      const result = convertCurrency(50.5, 'UK');
      expect(result.amount).toBe(580.75);
    });
  });

  describe('calculateComplianceFee', () => {
    test('calculates UK compliance fee', () => {
      const fee = calculateComplianceFee(100, 'UK');
      expect(fee).toBeGreaterThan(2.5); // £2.50 flat + 1%
      expect(fee).toBeLessThanOrEqual(25); // max £25
    });

    test('applies fee cap correctly', () => {
      const fee = calculateComplianceFee(10000, 'UK');
      expect(fee).toBe(25); // capped at max
    });

    test('returns null for invalid country', () => {
      const fee = calculateComplianceFee(100, 'INVALID');
      expect(fee).toBeNull();
    });

    test('calculates different fees per country', () => {
      const ukFee = calculateComplianceFee(100, 'UK');
      const usFee = calculateComplianceFee(100, 'US');
      expect(ukFee).not.toBe(usFee);
    });
  });

  describe('buildPayoutSummary', () => {
    test('builds complete payout summary', () => {
      const summary = buildPayoutSummary(500, 'UK');
      expect(summary).toHaveProperty('country', 'UK');
      expect(summary).toHaveProperty('amountSourceCurrency', 500);
      expect(summary).toHaveProperty('ghsAmount');
      expect(summary).toHaveProperty('complianceFeeGHS');
      expect(summary).toHaveProperty('netGHS');
      expect(summary.ghsAmount).toBe(5750); // 500 * 11.5
    });

    test('net amount is less than gross after fees', () => {
      const summary = buildPayoutSummary(1000, 'UK');
      expect(summary.netGHS).toBeLessThan(summary.ghsAmount);
    });

    test('calculates correct net for different countries', () => {
      const uk = buildPayoutSummary(100, 'UK');
      const us = buildPayoutSummary(100, 'US');
      expect(uk.netGHS).not.toBe(us.netGHS);
    });

    test('returns null for invalid country', () => {
      const summary = buildPayoutSummary(100, 'INVALID');
      expect(summary).toBeNull();
    });
  });

  describe('Exchange rates', () => {
    test('all supported countries have rates', () => {
      ['UK', 'US', 'EU', 'AUS'].forEach(country => {
        expect(EXCHANGE_RATES[country]).toBeDefined();
        expect(EXCHANGE_RATES[country].rate).toBeGreaterThan(0);
        expect(EXCHANGE_RATES[country].currency).toBeDefined();
      });
    });
  });

  describe('Compliance fees', () => {
    test('all countries have compliance fee structure', () => {
      ['UK', 'US', 'EU', 'AUS'].forEach(country => {
        expect(COMPLIANCE_FEES[country]).toBeDefined();
        expect(COMPLIANCE_FEES[country].flatFee).toBeGreaterThan(0);
        expect(COMPLIANCE_FEES[country].percentage).toBeGreaterThan(0);
        expect(COMPLIANCE_FEES[country].maxFee).toBeGreaterThan(0);
      });
    });
  });
});