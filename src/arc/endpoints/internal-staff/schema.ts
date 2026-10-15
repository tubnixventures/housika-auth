import { z } from 'zod';

export const InternalStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  phoneNumber: z.string().min(8).max(20).optional(),
  countryId: z.string().min(2).default('ctry_ke_01'),
  password: z.string().min(8).max(128),
  role: z.enum(['ceo', 'admin', 'manager', 'customercare']),
  displayName: z.string().max(100).optional(),
});

export type InternalStaffInput = z.infer<typeof InternalStaffSchema>;
