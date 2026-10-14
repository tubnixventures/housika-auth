import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3).max(255),
  channel: z.enum(['email', 'whatsapp', 'sms']).default('email'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
