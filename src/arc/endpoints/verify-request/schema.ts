import { z } from 'zod';

export const VerifyRequestSchema = z.object({
  channel: z.enum(['email', 'whatsapp', 'sms']),
  purpose: z.enum(['email_verification', 'phone_verification']).default('email_verification'),
  identifier: z.string().optional(),
});

export type VerifyRequestInput = z.infer<typeof VerifyRequestSchema>;
