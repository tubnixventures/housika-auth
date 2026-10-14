import { withExponentialBackoff } from './resilience.ts';

export interface SendEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  apiKey?: string;
  fromAddress?: string;
  fromName?: string;
}

export async function sendZeptoEmail(params: SendEmailParams): Promise<{ success: boolean; id?: string }> {
  if (!params.apiKey) {
    console.info(`[ZeptoMail DEV] Simulated email to ${params.toEmail}: ${params.subject}`);
    return { success: true, id: 'simulated_mail_dev' };
  }

  const endpoint = 'https://api.zeptomail.com/v1.1/email';
  const payload = {
    from: {
      address: params.fromAddress || 'accounts@housika.co.ke',
      name: params.fromName || 'Housika Accounts',
    },
    to: [{ email_address: { address: params.toEmail, name: params.toName || params.toEmail.split('@')[0] } }],
    subject: params.subject,
    htmlbody: params.htmlContent,
  };

  try {
    return await withExponentialBackoff(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Zoho-enczapikey ${params.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`ZeptoMail HTTP ${res.status}`);
      }

      const data = (await res.json()) as { data?: Array<{ message_id?: string }> };
      return { success: true, id: data.data?.[0]?.message_id };
    }, { maxRetries: 2, initialDelayMs: 200 });
  } catch (err) {
    console.error('ZeptoMail resilient delivery error:', err);
    return { success: false };
  }
}
