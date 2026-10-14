import { Hono } from 'hono';
import { CountryParamSchema } from './schema.ts';
import { queryOne } from '../../../utils/d1.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import type { Bindings } from '../../../types/env.ts';

export const countryByIdRoute = new Hono<{ Bindings: Bindings }>();

interface DbCountryRow {
  id: string;
  name: string;
  iso2: string;
  iso3: string;
  calling_code: string;
  currency_code: string;
  currency_name: string;
  listing_fee: string;
  booking_fee: string;
  is_active: number;
}

countryByIdRoute.get('/:id', async (c) => {
  const param = CountryParamSchema.safeParse(c.req.param());
  if (!param.success) {
    return sendError(c, 'Invalid country identifier', 400, 'VALIDATION_ERROR');
  }

  const { DB_COUNTRIES } = c.env;
  if (!DB_COUNTRIES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const r = await queryOne<DbCountryRow>(
    DB_COUNTRIES,
    `SELECT id, name, iso2, iso3, calling_code, currency_code, currency_name, listing_fee, booking_fee, is_active
     FROM countries WHERE id = ?`,
    [param.data.id]
  );

  if (!r || r.is_active !== 1) {
    return sendError(c, 'Country not found or inactive', 404, 'NOT_FOUND');
  }

  let listingFee = {};
  let bookingFee = {};
  try {
    listingFee = JSON.parse(r.listing_fee);
    bookingFee = JSON.parse(r.booking_fee);
  } catch {
    // fallback
  }

  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return sendSuccess(c, {
    country: {
      id: r.id,
      name: r.name,
      iso2: r.iso2,
      iso3: r.iso3,
      callingCode: r.calling_code,
      currencyCode: r.currency_code,
      currencyName: r.currency_name,
      listingFee,
      bookingFee,
    },
  });
});
