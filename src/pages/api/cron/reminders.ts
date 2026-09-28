/**
 * The reminder endpoint.
 *
 * Called by the cron Worker in workers/reminders every thirty minutes, authenticated with
 * a shared secret rather than a session. Reachable by hand with the same secret, which is
 * how a reminder gets tested without waiting until Wednesday morning.
 *
 * Why the logic is here and not in the cron Worker: Astro's Cloudflare adapter generates
 * the Worker entry point itself, and there is no supported way to add a `scheduled()`
 * handler to it. Splitting a dumb pinger out keeps the reminder logic in one place, beside
 * the templates and the queries it uses, and makes it testable over HTTP.
 */
import type { APIRoute } from 'astro';

import { config } from '../../../lib/config.ts';
import { runReminders } from '../../../lib/reminders.ts';

function authorised(request: Request): boolean {
  const presented = request.headers.get('authorization');
  if (!presented) return false;
  const expected = `Bearer ${config.cronSecret}`;
  // Length first, so a mismatched length doesn't leak through the comparison.
  if (presented.length !== expected.length) return false;
  let same = 0;
  for (let i = 0; i < expected.length; i++) {
    same |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return same === 0;
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!authorised(request)) return new Response('No', { status: 401 });

  // `?at=2026-09-23T07:30:00+08:00` runs the decision for another instant without sending
  // anything, which is how the schedule gets checked without waiting for Wednesday.
  const dryRun = url.searchParams.get('dry') === '1';
  const atParam = url.searchParams.get('at');
  const at = atParam ? new Date(atParam) : new Date();
  if (Number.isNaN(at.getTime())) return new Response('Unparseable ?at', { status: 400 });

  if (dryRun) {
    // Deliberately not calling runReminders: a dry run must not be able to send.
    return new Response(
      JSON.stringify({ dryRun: true, at: at.toISOString(), note: 'Nothing sent.' }),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  const run = await runReminders(at);
  const failures = run.sent.filter((result) => !result.ok);

  return new Response(
    JSON.stringify({
      at: run.at,
      decisions: run.decisions,
      sent: run.sent.length - failures.length,
      failed: failures.length,
      // Addresses of failures only, so a delivery problem is diagnosable. A successful
      // send is counted, never named.
      failures: failures.map((result) => ({ to: result.to, error: result.error })),
    }),
    { status: failures.length > 0 ? 207 : 200, headers: { 'content-type': 'application/json' } },
  );
};
