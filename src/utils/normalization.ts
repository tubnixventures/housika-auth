export function normalizeEmail(email: string): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) return trimmed;

  let [local, domain] = parts;
  // Normalize well-known domains like gmail.com (remove dots)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }
  return `${local}@${domain}`;
}

export function normalizePhone(phone: string, defaultCallingCode = ''): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      const code = defaultCallingCode.startsWith('+') ? defaultCallingCode : `+${defaultCallingCode}`;
      cleaned = code + cleaned.substring(1);
    } else if (defaultCallingCode) {
      const code = defaultCallingCode.startsWith('+') ? defaultCallingCode : `+${defaultCallingCode}`;
      cleaned = code + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

export function isEmail(identifier: string): boolean {
  return identifier.includes('@');
}
