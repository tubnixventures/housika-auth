export interface GooglePayload {
  email: string;
  sub: string;
  name: string;
  picture?: string;
  email_verified?: string | boolean;
  aud?: string;
}

export async function verifyGoogleToken(
  idToken: string,
  expectedClientId?: string
): Promise<{ success: boolean; data?: GooglePayload; error?: string }> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!res.ok) {
      return { success: false, error: 'Invalid Google identity token' };
    }
    const data = (await res.json()) as GooglePayload;
    if (!data.email || !data.sub) {
      return { success: false, error: 'Malformed Google token payload' };
    }
    if (expectedClientId && data.aud && data.aud !== expectedClientId) {
      return { success: false, error: 'Google Client ID audience mismatch' };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: 'Failed to verify token with Google' };
  }
}
