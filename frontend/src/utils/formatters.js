/**
 * Safe formatting utilities - NEVER return NaN or undefined
 */

export const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? 0 : num;
};

export const formatCurrency = (amount) => {
  const safe = safeNumber(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(safe);
};

export const formatCurrencyDetailed = (amount) => {
  const safe = safeNumber(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safe);
};

export const formatPercent = (value) => {
  const safe = safeNumber(value);
  if (safe === 0) return '0.0%';
  return `${(safe * 100).toFixed(1)}%`;
};

export const formatNumber = (value, decimals = 0) => {
  const safe = safeNumber(value);
  return safe.toFixed(decimals);
};

export const safeDivide = (numerator, denominator, defaultValue = 0) => {
  const num = safeNumber(numerator);
  const denom = safeNumber(denominator);

  if (denom === 0 || denom === null || denom === undefined) {
    return defaultValue;
  }

  const result = num / denom;
  return isNaN(result) || !isFinite(result) ? defaultValue : result;
};

export const calculateRatio = (numerator, denominator, asPercent = false) => {
  const ratio = safeDivide(numerator, denominator, 0);
  return asPercent ? formatPercent(ratio) : formatNumber(ratio, 2);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

export const formatDateShort = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};
