export function nowUtc(): number {
  return Math.floor(Date.now() / 1000);
}

export function addMinutes(seconds: number, minutes: number): number {
  return seconds + minutes * 60;
}

export function addHours(seconds: number, hours: number): number {
  return seconds + hours * 3600;
}

export function addDays(seconds: number, days: number): number {
  return seconds + days * 86400;
}

export function isExpired(expiresAt: number): boolean {
  return nowUtc() >= expiresAt;
}

export const TOKEN_EXPIRY = {
  ACCESS_MINUTES: 15,
  REFRESH_DAYS: 30,
  OTP_MINUTES: 10,
  RESET_MINUTES: 15,
};
