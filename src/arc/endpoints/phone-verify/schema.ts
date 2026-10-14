import { z } from 'zod';

export const PhoneVerifySchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  otp: z.string().length(6),
});

export type PhoneVerifyInput = z.infer<typeof PhoneVerifySchema>;
