export function renderAccountConfirmationEmail(
  name: string,
  appName = 'Housika'
): { subject: string; html: string } {
  const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const subject = `Welcome to ${appName} - Account Created`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to ${appName}, ${safeName}!</h2>
    <p style="font-size: 15px; line-height: 1.6;">
      Your ${appName} account has been created successfully.
    </p>
    <p style="font-size: 15px; line-height: 1.6;">
      To unlock all platform features including property listing and management, please verify your email and phone number using the one-time code sent to you.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
      If you did not create this account, please contact security@housika.com immediately.
    </p>
  </div>
</body>
</html>
`.trim();

  return { subject, html };
}
