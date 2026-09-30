/**
 * Configuration and secrets, read from the Worker environment.
 *
 * Everything the app needs from outside itself comes through here, so there is exactly
 * one place to look when something isn't configured. Non-secret values live in
 * `wrangler.jsonc`; secrets are set with `wrangler secret put` or in the Cloudflare
 * dashboard, and locally in `.dev.vars`. Neither ever reaches the repo.
 *
 * Note the import: `Astro.locals.runtime.env` was removed in Astro 6, and bindings now
 * come from `cloudflare:workers`. That module only exists inside the Worker runtime, so
 * nothing unit-tested may import this file.
 */
import { env } from 'cloudflare:workers';

/** Fails loudly at the point of use rather than silently sending an empty key. */
function required(name: keyof Env): string {
  // `Env` mixes strings with bindings, so indexing it needs a widening cast to stay typed
  // at the call sites while reading a value generically here.
  const value = (env as unknown as Record<string, unknown>)[name as string];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `${name} is not set. Non-secret values go in wrangler.jsonc; secrets go in .dev.vars locally, or \`wrangler secret put ${name}\` for the deployed Worker.`,
    );
  }
  return value;
}

export const config = {
  /** Safe in the browser. Row-level security, not obscurity, is what protects data. */
  get supabaseUrl(): string {
    return required('PUBLIC_SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return required('PUBLIC_SUPABASE_ANON_KEY');
  },
  /** Bypasses row-level security. Server only. Never put this in a response. */
  get supabaseServiceRoleKey(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get resendApiKey(): string {
    return required('RESEND_API_KEY');
  },
  get cronSecret(): string {
    return required('CRON_SECRET');
  },
  get emailFrom(): string {
    return required('EMAIL_FROM');
  },
  /** Absolute, because an email needs a link that works outside the app. */
  get siteUrl(): string {
    return required('PUBLIC_SITE_URL').replace(/\/$/, '');
  },
  /** Rate limiter for invite joins. Absent under a local dev server without the binding. */
  get joinLimiter(): RateLimit | null {
    return (env as Partial<Env>).JOIN_LIMITER ?? null;
  },
  /** The video bucket. Originals live here forever. */
  get bucket(): R2Bucket {
    return env.WAFFLES;
  },
} as const;

/** An absolute URL into the app, for an email or a redirect. */
export function absoluteUrl(path: string): string {
  return `${config.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
