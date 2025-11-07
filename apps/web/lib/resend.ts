import { Resend } from 'resend';

let resendClient: Resend | undefined;

export function getResendClient(): Resend | undefined {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}
