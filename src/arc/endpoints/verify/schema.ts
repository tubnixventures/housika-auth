import { z } from 'zod';

export const VerifySchema = z.object({
  otp: z.string().length(6),
  purpose: z.enum(['email_verification', 'phone_verification', 'password_reset']).default('email_verification'),
  identifier: z.string().optional(),
});

export type VerifyInput = z.infer<typeof VerifySchema>;
