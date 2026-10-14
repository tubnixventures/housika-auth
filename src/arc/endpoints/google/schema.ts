import { z } from 'zod';

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(20),
  countryId: z.string().optional().default('ctry_ke_01'),
  accountType: z.enum(['individual', 'company']).optional().default('individual'),
  role: z.enum(['tenant', 'landlord', 'dual']).optional().default('tenant'),
  phoneNumber: z.string().max(25).optional(),
});

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
