import { z } from 'zod';

export const ResetPasswordSchema = z.object({
  identifier: z.string().min(3).max(255),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(128),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
