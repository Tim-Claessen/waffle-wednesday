/**
 * The Wednesday emails.
 *
 * The email is the real front door: web push doesn't reach iOS reliably and there are no
 * scheduled local notifications in a web app, so this is the only channel that actually
 * lands for everyone. It gets designed rather than treated as plumbing.
 *
 * The evening one is the delicate one. It goes only to the person it concerns, and it must
 * never mention who else has or hasn't posted. There is no parameter on it that could
 * carry that information, which is the point: the constraint is in the signature.
 */

/** Inline styles throughout: no email client can be trusted with a stylesheet. */
const INK = '#e8e1dd';
const INK_SOFT = '#bdb0a6';
const PEAT = '#151311';
const DESK = '#1d1b19';
const EMBER = '#ffb77e';
const EMBER_DEEP = '#4d2600';
const SERIF = "'EB Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Manrope, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The shell every email sits in.
 *
 * A single centred column on a dark ground, with a light-mode fallback that still reads:
 * some clients force their own background, so nothing depends on the dark surface being
 * honoured.
 */
function shell(options: { preheader: string; body: string }): string {
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>Waffle Wednesday</title>
  </head>
  <body style="margin:0;padding:0;background:${PEAT};">
    <!-- The line shown in the inbox list under the subject. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PEAT};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:20px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${INK_SOFT};">
                🧇&nbsp;&nbsp;Waffle Wednesday
              </td>
            </tr>
            ${options.body}
            <tr>
              <td style="padding-top:28px;border-top:1px solid #3a3633;font-family:${SANS};font-size:12px;line-height:20px;color:#8a8079;">
                You get this because you're in the group. Quiet weeks are completely fine — there's
                nothing to catch up on and nobody is counting.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function heading(text: string): string {
  return `<tr><td style="font-family:${SERIF};font-size:30px;line-height:38px;color:${INK};padding-bottom:12px;">${escapeHtml(text)}</td></tr>`;
}

function paragraph(text: string): string {
  return `<tr><td style="font-family:${SANS};font-size:15px;line-height:26px;color:${INK_SOFT};padding-bottom:16px;">${text}</td></tr>`;
}

function button(label: string, href: string): string {
  return `<tr>
    <td style="padding:8px 0 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:${EMBER};border-radius:8px;">
            <a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${SANS};font-size:14px;font-weight:600;color:${EMBER_DEEP};text-decoration:none;">${escapeHtml(label)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function card(inner: string): string {
  return `<tr>
    <td style="background:${DESK};border:1px solid #3a3633;border-radius:16px;padding:20px;margin-bottom:16px;">
      ${inner}
    </td>
  </tr>
  <tr><td style="height:16px;"></td></tr>`;
}

/**
 * The 07:30 email, to everybody in the group.
 *
 * Warm and short. It says nothing about who has already posted, because at half past
 * seven on a Wednesday nobody has, and because the answer is never any of anyone's
 * business.
 */
export function morningReminder(options: {
  firstName: string;
  groupName: string;
  recordUrl: string;
}): EmailContent {
  const { firstName, groupName, recordUrl } = options;

  return {
    subject: 'Wednesday. The kettle is on.',
    text: [
      `Morning ${firstName},`,
      '',
      `It's Wednesday, which means ${groupName} is listening. Three minutes about your week — in the car, in the kitchen, whenever suits.`,
      '',
      `Record it here: ${recordUrl}`,
      '',
      'No edits needed. Bad hair is traditional.',
    ].join('\n'),
    html: shell({
      preheader: `Three minutes about your week, whenever suits.`,
      body: [
        heading('Morning, it’s Wednesday'),
        paragraph(
          `${escapeHtml(groupName)} is listening. Three minutes about your week — in the car, in the kitchen, at the end of a long day. No edits, no tidying up first.`,
        ),
        button('Record today’s waffle', recordUrl),
        paragraph(
          `<span style="color:#8a8079;">It'll take about as long as making a cup of tea, and the file is small enough not to bother your data.</span>`,
        ),
      ].join('\n'),
    }),
  };
}

/**
 * The 20:00 email, to one person who hasn't posted yet.
 *
 * Note what this function cannot do. It takes no list of who has posted, no count and no
 * denominator, so there is no way to write a version of this email that mentions anybody
 * else. It also offers watching as an equal option, because watching without posting is
 * explicitly allowed.
 */
export function eveningReminder(options: {
  firstName: string;
  groupName: string;
  recordUrl: string;
  feedUrl: string;
}): EmailContent {
  const { firstName, groupName, recordUrl, feedUrl } = options;

  return {
    subject: 'There’s still tonight, if you fancy it',
    text: [
      `Evening ${firstName},`,
      '',
      `The week's still open over at ${groupName} — it runs until Tuesday night, so there's no hurry.`,
      '',
      `Record yours: ${recordUrl}`,
      `Or just watch: ${feedUrl}`,
      '',
      "If it's been that sort of week, watching is completely fine.",
    ].join('\n'),
    html: shell({
      preheader: 'The week runs until Tuesday night. No hurry.',
      body: [
        heading('There’s still tonight'),
        paragraph(
          `The week's open at ${escapeHtml(groupName)} until Tuesday night, so there's genuinely no hurry.`,
        ),
        button('Record yours', recordUrl),
        card(
          `<div style="font-family:${SANS};font-size:15px;line-height:26px;color:${INK_SOFT};">
            Or just put the kettle on and watch.
            <a href="${feedUrl}" style="color:${EMBER};text-decoration:none;">See this week’s &rarr;</a>
          </div>`,
        ),
        paragraph(
          `<span style="color:#8a8079;">If it's been that sort of week, watching is completely fine. That's what it's for.</span>`,
        ),
      ].join('\n'),
    }),
  };
}

/**
 * The welcome, sent once when someone is added.
 *
 * Carries the iOS install instruction, because on iOS "add to home screen" is a manual
 * thing nobody discovers by accident — and without it there is no icon and no app.
 */
export function welcome(options: {
  firstName: string;
  groupName: string;
  siteUrl: string;
  signInUrl: string;
  /** False for someone already in another group, who has a password already. */
  newAccount: boolean;
}): EmailContent {
  const { firstName, groupName, siteUrl, signInUrl, newAccount } = options;
  const action = newAccount ? 'Sign in and set a password' : 'Open it';

  return {
    subject: `You're in — ${groupName}`,
    text: [
      `${firstName},`,
      '',
      `You're in ${groupName} on Waffle Wednesday. Every Wednesday you record up to three minutes about your week; everyone in the group can watch it that week, and it's kept for you forever.`,
      '',
      `${action}: ${signInUrl}`,
      '',
      'On an iPhone, open it in Safari, tap Share, then Add to Home Screen — that gives you the icon and makes it feel like an app.',
      '',
      'Nobody is ever shown who has not posted. A quiet week is a legitimate week.',
    ].join('\n'),
    html: shell({
      preheader: `Three minutes a week, kept forever.`,
      body: [
        heading(`You’re in, ${escapeHtml(firstName)}`),
        paragraph(
          `${escapeHtml(groupName)} does one thing: every Wednesday, everyone records up to three minutes about their week. You watch the others' that week, and yours is kept for you forever.`,
        ),
        button(action, signInUrl),
        card(
          `<div style="font-family:${SANS};font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:${EMBER};padding-bottom:8px;">On an iPhone</div>
           <div style="font-family:${SANS};font-size:15px;line-height:26px;color:${INK_SOFT};">
             Open <a href="${siteUrl}" style="color:${EMBER};text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
             in Safari, tap <strong style="color:${INK};">Share</strong>, then
             <strong style="color:${INK};">Add to Home Screen</strong>. That gives you the icon.
           </div>`,
        ),
        paragraph(
          `<span style="color:#8a8079;">Two things worth knowing: nobody is ever shown who hasn't posted, and you can watch without posting. A quiet week is a legitimate week.</span>`,
        ),
      ].join('\n'),
    }),
  };
}
