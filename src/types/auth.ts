export type AccountType = 'company' | 'individual';

export type Role =
  | 'root'
  | 'ceo'
  | 'admin'
  | 'manager'
  | 'customercare'
  | 'landlord'
  | 'dual'
  | 'tenant';

export type AccountStatus =
  | 'active'
  | 'pending_verification'
  | 'suspended'
  | 'deactivated';

export const ROLE_LEVELS: Record<Role, number> = {
  root: 100,
  ceo: 90,
  admin: 85,
  manager: 80,
  customercare: 75,
  landlord: 30,
  dual: 25,
  tenant: 20,
};

export const COMPANY_ROLE_LEVELS: Record<string, number> = {
  root: 70,
  ceo: 65,
  admin: 60,
  manager: 55,
  customercare: 50,
};

export interface AccessTokenPayload {
  sub: string;
  countryId: string;
  accountType: AccountType;
  companyId?: string | null;
  scopeId?: string | null;
  level: number;
  role: Role;
  sid: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
  authVersion: number;
}
