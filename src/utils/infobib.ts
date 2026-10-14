import { withExponentialBackoff } from './resilience.ts';

export interface SendNotificationParams {
  toPhone: string;
  message: string;
  channel?: 'whatsapp' | 'sms';
  apiKey?: string;
  baseUrl?: string;
  fromSender?: string;
}

export async function sendInfobipMessage(
  params: SendNotificationParams
): Promise<{ success: boolean; id?: string }> {
  const { toPhone, message, channel = 'whatsapp', apiKey, baseUrl, fromSender } = params;

  if (!apiKey || !baseUrl) {
    console.info(`[Infobip DEV] Simulated ${channel} to ${toPhone}: ${message}`);
    return { success: true, id: 'simulated_infobip_dev' };
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint =
    channel === 'whatsapp'
      ? `${cleanBaseUrl}/whatsapp/1/message/text`
      : `${cleanBaseUrl}/sms/2/text/advanced`;

  const payload =
    channel === 'whatsapp'
      ? {
          from: fromSender || '447111111111',
          to: toPhone.replace('+', ''),
          content: { text: message },
        }
      : {
          messages: [
            {
              from: fromSender || 'Housika',
              destinations: [{ to: toPhone.replace('+', '') }],
              text: message,
            },
          ],
        };

  try {
    return await withExponentialBackoff(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `App ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Infobip HTTP ${res.status}`);
      }

      return { success: true };
    }, { maxRetries: 2, initialDelayMs: 200 });
  } catch (err) {
    console.error(`Infobip ${channel} resilient delivery error:`, err);
    return { success: false };
  }
}
