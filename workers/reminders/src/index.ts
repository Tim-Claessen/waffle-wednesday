/**
 * The cron Worker. It does nothing except ring the app's doorbell on a schedule.
 *
 * It exists because Astro's Cloudflare adapter owns the main Worker's entry point and
 * there is no supported way to add a `scheduled()` handler to it. Keeping this a dumb
 * pinger means the reminder logic stays in the app, next to the templates and queries it
 * uses, rather than being duplicated across two deploy targets.
 *
 * Every thirty minutes rather than at two fixed times, because reminder times live in the
 * database so they can be changed without a deploy. Two hard-coded cron lines would quietly
 * make the settings screen a lie. Forty-eight invocations a day of a Worker that usually
 * decides "nothing is due" costs nothing.
 */
interface Env {
  /** The app's origin, e.g. https://waffle.example.com */
  APP_URL: string;
  /** Must match the app's CRON_SECRET. */
  CRON_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ring(env));
  },

  /**
   * A manual trigger, same secret. Useful for checking the wiring end to end without
   * waiting until Wednesday morning.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
      return new Response('No', { status: 401 });
    }
    return new Response(await ring(env), { headers: { 'content-type': 'application/json' } });
  },
} satisfies ExportedHandler<Env>;

async function ring(env: Env): Promise<string> {
  const response = await fetch(`${env.APP_URL.replace(/\/$/, '')}/api/cron/reminders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await response.text();
  // Shows up in `wrangler tail` and in the dashboard's logs, which is the whole of the
  // observability this needs.
  console.log(`reminders: ${response.status} ${body}`);
  return body;
}
