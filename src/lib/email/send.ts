/**
 * Sending email, through Resend.
 *
 * A plain `fetch` against the REST API rather than the SDK: one less dependency to keep
 * current, and nothing in the SDK that a Worker benefits from.
 */
import { config } from '../config.ts';
import type { EmailContent } from './templates.ts';

export interface SendResult {
  to: string;
  ok: boolean;
  error?: string;
}

/**
 * Sends one email.
 *
 * Always one recipient per call, never a `bcc` of the whole group. It costs a request per
 * person and removes any chance of one member's reminder revealing who else received it.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<SendResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: [to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      return { to, ok: false, error: `${response.status} ${await response.text()}` };
    }
    return { to, ok: true };
  } catch (error) {
    return { to, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
