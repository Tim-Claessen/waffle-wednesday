import { describe, expect, it } from 'vitest';

import { eveningReminder, morningReminder } from './email/templates.ts';
import { bundleReminders, type DueReminder } from './reminder-bundle.ts';

const tim = { profileId: 't', email: 'tim@example.com', displayName: 'Tim Claessen' };
const zoe = { profileId: 'z', email: 'zoe@example.com', displayName: 'Zoe Claessen' };
const fwsh = { name: 'FWSH', slug: 'fwsh' };
const home = { name: 'Tim & Zoe', slug: 'tim-and-zoe' };

const due = (person: typeof tim, group: typeof fwsh, kind: DueReminder['kind'] = 'morning'): DueReminder => ({
  ...person,
  group,
  kind,
});

describe('bundling reminders', () => {
  it('sends one email to someone in two groups, listing both', () => {
    const envelopes = bundleReminders([due(tim, fwsh), due(tim, home), due(zoe, home)]);
    expect(envelopes).toHaveLength(2);
    expect(envelopes.find((e) => e.email === tim.email)!.groups).toEqual([fwsh, home]);
    expect(envelopes.find((e) => e.email === zoe.email)!.groups).toEqual([home]);
  });

  it('keeps a morning and an evening reminder apart', () => {
    const envelopes = bundleReminders([due(tim, fwsh, 'morning'), due(tim, home, 'evening')]);
    expect(envelopes.map((e) => e.kind).sort()).toEqual(['evening', 'morning']);
  });

  it('never lists the same group twice', () => {
    const envelopes = bundleReminders([due(tim, fwsh), due(tim, fwsh)]);
    expect(envelopes[0]!.groups).toEqual([fwsh]);
  });
});

describe('a combined email', () => {
  const groups = [
    { name: 'FWSH', recordUrl: 'https://x/g/fwsh/record', feedUrl: 'https://x/g/fwsh' },
    { name: 'Tim & Zoe', recordUrl: 'https://x/g/tim-and-zoe/record', feedUrl: 'https://x/g/tim-and-zoe' },
  ];

  it('has a record link for each group', () => {
    const email = morningReminder({ firstName: 'Tim', groups });
    for (const group of groups) {
      expect(email.html).toContain(group.recordUrl);
      expect(email.text).toContain(group.recordUrl);
    }
    expect(email.html).toContain('FWSH and Tim &amp; Zoe are listening');
  });

  it('reads exactly as before for one group', () => {
    const email = eveningReminder({ firstName: 'Tim', groups: groups.slice(0, 1) });
    expect(email.html).toContain('Record yours');
    expect(email.html).not.toContain('Tim &amp; Zoe');
  });
});
