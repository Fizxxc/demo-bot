import { getPlan } from './plans.js';

export const WITHDRAW_MIN = 20000;
export const WITHDRAW_MAX = 1000000;
export const WITHDRAW_FEE_RATE = 0.10;

export function isWithdrawDay(date = new Date()) {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' }).format(date);
  return day === 'Sat';
}

export function getMonthlyLimit(planCode) {
  return getPlan(planCode)?.monthlyWithdrawLimit || 0;
}

export function monthRange(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1)).toISOString(),
    end: new Date(Date.UTC(y, m + 1, 1)).toISOString()
  };
}
