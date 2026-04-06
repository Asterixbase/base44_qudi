// Cross-border payout currency conversion & FCA compliance fees
export const EXCHANGE_RATES = {
  'UK': { rate: 11.5, country: 'United Kingdom', currency: 'GBP' },
  'US': { rate: 15.2, country: 'United States', currency: 'USD' },
  'EU': { rate: 12.8, country: 'Europe', currency: 'EUR' },
  'AUS': { rate: 10.2, country: 'Australia', currency: 'AUD' },
};

// FCA-regulated compliance fees (flat + percentage)
export const COMPLIANCE_FEES = {
  'UK': { flatFee: 2.50, percentage: 0.01, maxFee: 25 }, // £2.50 + 1%, max £25
  'US': { flatFee: 3.00, percentage: 0.015, maxFee: 30 },
  'EU': { flatFee: 2.75, percentage: 0.012, maxFee: 27 },
  'AUS': { flatFee: 3.50, percentage: 0.01, maxFee: 28 },
};

export function convertCurrency(amount, country) {
  if (!EXCHANGE_RATES[country]) return null;
  const rate = EXCHANGE_RATES[country].rate;
  const ghsAmount = Math.round(amount * rate * 100) / 100;
  return { amount: ghsAmount, rate };
}

export function calculateComplianceFee(amountInSourceCurrency, country) {
  if (!COMPLIANCE_FEES[country]) return null;
  const { flatFee, percentage, maxFee } = COMPLIANCE_FEES[country];
  const percentageFee = amountInSourceCurrency * percentage;
  const totalFee = Math.min(flatFee + percentageFee, maxFee);
  return Math.round(totalFee * 100) / 100;
}

export function buildPayoutSummary(amountGBP, country) {
  const conversion = convertCurrency(amountGBP, country);
  if (!conversion) return null;

  const complianceFee = calculateComplianceFee(amountGBP, country);
  const exchangeInfo = EXCHANGE_RATES[country];

  return {
    country,
    amountSourceCurrency: amountGBP,
    sourceSymbol: exchangeInfo.currency,
    exchangeRate: conversion.rate,
    ghsAmount: conversion.amount,
    complianceFeeSource: complianceFee,
    complianceFeeGHS: Math.round(complianceFee * conversion.rate * 100) / 100,
    netGHS: Math.round((conversion.amount - (complianceFee * conversion.rate)) * 100) / 100,
    exchangeInfo,
  };
}

export function generateFCAReference() {
  return `FCA-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}