const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileResponse = {
  success: boolean;
  action?: string;
  cdata?: string;
  'error-codes'?: string[];
};

function isCaptchaConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<{ success: boolean; errors?: string[] }> {
  if (!isCaptchaConfigured()) {
    console.warn('[captcha] TURNSTILE_SECRET_KEY not configured. Skipping verification.');
    return { success: true };
  }

  const body = new URLSearchParams();
  body.set('secret', process.env.TURNSTILE_SECRET_KEY as string);
  body.set('response', token);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    console.error('[captcha] Turnstile verification failed', response.status, response.statusText);
    return { success: false, errors: ['verification_failed'] };
  }

  const payload = (await response.json()) as TurnstileResponse;

  if (!payload.success) {
    const errors = payload['error-codes'] ?? ['unknown_error'];
    console.warn('[captcha] Turnstile rejected token', errors);
    return { success: false, errors };
  }

  return { success: true };
}

export function captchaGuardEnabled(): boolean {
  return isCaptchaConfigured();
}
