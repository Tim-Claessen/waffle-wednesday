/// <reference types="astro/client" />

/**
 * Secrets, declared so they are typed but never committed.
 *
 * Bindings and plain variables come from `wrangler.jsonc` via `wrangler types`, which
 * writes `worker-configuration.d.ts`. Secrets deliberately do not live in that file —
 * they are set with `wrangler secret put` or in the Cloudflare dashboard, and locally
 * in `.dev.vars`, which is gitignored. Declaring them here gives them a type without
 * giving them a value anywhere in the repo.
 */
declare global {
  interface Env {
    /** Supabase anon key. Safe in the client; row-level security is what protects data. */
    PUBLIC_SUPABASE_ANON_KEY: string;
    /** Bypasses row-level security. Server only, and never sent to the browser. */
    SUPABASE_SERVICE_ROLE_KEY: string;
    /** Resend, for the Wednesday reminders. */
    RESEND_API_KEY: string;
    /** Shared secret the cron worker presents to the reminder endpoint. */
    CRON_SECRET: string;
  }

  namespace App {
    interface Locals {
      /** The signed-in member, or null. Set by middleware on every request. */
      user: import('./lib/auth.ts').SessionUser | null;
      /** A Supabase client bound to this request's cookies, acting as the signed-in user. */
      supabase: import('./lib/supabase.ts').RequestClient;
    }
  }
}

export {};
