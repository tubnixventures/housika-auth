import { z } from 'zod';

export const CountryPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso2: z.string(),
  iso3: z.string(),
  callingCode: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  listingFee: z.record(z.string(), z.number()),
  bookingFee: z.record(z.string(), z.number()),
});

export type CountryPublic = z.infer<typeof CountryPublicSchema>;
