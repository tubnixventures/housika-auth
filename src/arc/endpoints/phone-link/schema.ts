import { z } from 'zod';

export const PhoneLinkSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  channel: z.enum(['whatsapp', 'sms']).default('whatsapp'),
});

export type PhoneLinkInput = z.infer<typeof PhoneLinkSchema>;
