export function renderWhatsappOtp(
  otp: string,
  purpose: 'verification' | 'password_reset',
  appName = 'Housika'
): string {
  if (purpose === 'password_reset') {
    return `*${appName} Security Code*\n\nYour password reset code is *${otp}*.\n\nThis code will expire in 10 minutes. Do not share this code with anyone.`;
  }
  return `*${appName} Verification Code*\n\nYour account verification code is *${otp}*.\n\nThis code expires in 10 minutes. Welcome to ${appName}!`;
}

export function renderPasswordChangedAlert(appName = 'Housika'): string {
  return `*${appName} Security Alert*\n\nYour account password was just changed. If you did not make this change, please contact support immediately.`;
}
