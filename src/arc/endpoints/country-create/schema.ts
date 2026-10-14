import { z } from 'zod';

export const CountryCreateSchema = z.object({
  id: z.string().min(2).max(32),
  name: z.string().min(2).max(100),
  iso2: z.string().length(2).toUpperCase(),
  iso3: z.string().length(3).toUpperCase(),
  callingCode: z.string().min(2).max(8),
  currencyCode: z.string().length(3).toUpperCase(),
  currencyName: z.string().min(2).max(50),
  listingFee: z.record(z.string(), z.number()),
  bookingFee: z.record(z.string(), z.number()),
  paymentGateway: z.object({
    providers: z.array(z.string()),
    default: z.string(),
  }),
});

export type CountryCreateInput = z.infer<typeof CountryCreateSchema>;
