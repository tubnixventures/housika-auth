import type { Hono } from 'hono';
import type { Bindings } from './types/env.ts';
import { signupRoute } from './arc/endpoints/signup/index.ts';
import { loginRoute } from './arc/endpoints/login/index.ts';
import { googleAuthRoute } from './arc/endpoints/google/index.ts';
import { logoutRoute } from './arc/endpoints/logout/index.ts';
import { logoutAllRoute } from './arc/endpoints/logout-all/index.ts';
import { currentUserRoute } from './arc/endpoints/current-user/index.ts';
import { verifyRoute } from './arc/endpoints/verify/index.ts';
import { verifyRequestRoute } from './arc/endpoints/verify-request/index.ts';
import { forgotRoute } from './arc/endpoints/forgot/index.ts';
import { resetRoute } from './arc/endpoints/reset/index.ts';
import { changePasswordRoute } from './arc/endpoints/change-password/index.ts';
import { refreshRoute } from './arc/endpoints/refresh/index.ts';
import { upgradeAccountRoute } from './arc/endpoints/upgrade-account/index.ts';
import { phoneLinkRoute } from './arc/endpoints/phone-link/index.ts';
import { phoneVerifyRoute } from './arc/endpoints/phone-verify/index.ts';
import { internalStaffRoute } from './arc/endpoints/internal-staff/index.ts';
import { countriesRoute } from './arc/endpoints/countries/index.ts';
import { countryByIdRoute } from './arc/endpoints/country-by-id/index.ts';
import { countryCreateRoute } from './arc/endpoints/country-create/index.ts';
import { countryUpdateRoute } from './arc/endpoints/country-update/index.ts';
import { countryDeactivateRoute } from './arc/endpoints/country-deactivate/index.ts';
import { openidConfigRoute } from './arc/endpoints/openid-configuration/index.ts';
import { jwksRoute } from './arc/endpoints/jwks/index.ts';
import { docsRoute } from './arc/endpoints/docs/index.ts';

export function registerRoutes(app: Hono<{ Bindings: Bindings }>): void {
  // Authentication & Sessions
  app.route('/auth/signup', signupRoute);
  app.route('/auth/login', loginRoute);
  app.route('/auth/google', googleAuthRoute);
  app.route('/auth/logout', logoutRoute);
  app.route('/auth/logout-all', logoutAllRoute);
  app.route('/auth/current-user', currentUserRoute);
  app.route('/auth/refresh', refreshRoute);

  // Verification & Recovery (Email active, SMS currently inactive)
  app.route('/auth/verify', verifyRoute);
  app.route('/auth/verify-request', verifyRequestRoute);
  app.route('/auth/phone/link', phoneLinkRoute);
  app.route('/auth/phone/verify', phoneVerifyRoute);
  app.route('/auth/forgot', forgotRoute);
  app.route('/auth/reset', resetRoute);
  app.route('/auth/change-password', changePasswordRoute);
  app.route('/auth/upgrade-account', upgradeAccountRoute);

  // Internal Provisioning (Authenticated by Service Key)
  app.route('/auth/internal/staff', internalStaffRoute);

  // Countries
  app.route('/countries', countryCreateRoute);
  app.route('/countries', countriesRoute);
  app.route('/countries', countryByIdRoute);
  app.route('/countries', countryUpdateRoute);
  app.route('/countries', countryDeactivateRoute);

  // OpenID Connect & RFC 7517 JWKS for microservice federation
  app.route('/.well-known/openid-configuration', openidConfigRoute);
  app.route('/.well-known/jwks.json', jwksRoute);

  // Documentation
  app.route('/doc', docsRoute);
}
