import { z } from 'zod';

export const CurrentUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  role: z.string(),
  level: z.number(),
  accountType: z.string(),
  status: z.string(),
  companyId: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().nullable(),
    countryId: z.string(),
    countryName: z.string(),
    currency: z.string(),
    avatarKey: z.string().nullable(),
  }).nullable(),
});

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
