export function renderOtpEmail(
  otp: string,
  purpose: 'verification' | 'password_reset',
  appName = 'Housika'
): { subject: string; html: string } {
  const isReset = purpose === 'password_reset';
  const title = isReset ? 'Reset Your Password' : 'Verify Your Email Address';
  const subject = `${appName} - Your ${isReset ? 'Password Reset' : 'Verification'} Code`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
    <p style="font-size: 15px; line-height: 1.6;">
      Use the following single-use verification code to complete your ${isReset ? 'password reset' : 'account verification'}:
    </p>
    <div style="margin: 28px 0; text-align: center;">
      <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7; background: #f0f9ff; padding: 12px 24px; border-radius: 6px; border: 1px dashed #38bdf8;">
        ${otp}
      </span>
    </div>
    <p style="font-size: 13px; color: #64748b;">
      This code expires in 10 minutes. If you did not request this, please ignore this email.
    </p>
  </div>
</body>
</html>
`.trim();

  return { subject, html };
}
