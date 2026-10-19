/**
 * One email per person, however many groups they're in. Pure, so it is unit-tested.
 *
 * Someone in two groups whose reminders fall in the same slot would otherwise get two
 * near-identical emails a second apart. The run collects what's due per group, then this
 * folds it into one envelope per person per kind, listing their groups in the order the
 * run found them.
 *
 * Groups with different reminder times still land in different slots and so in separate
 * emails, hours apart. That is the configured behaviour rather than duplication.
 */

export type ReminderKind = 'morning' | 'evening';

export interface DueReminder {
  kind: ReminderKind;
  profileId: string;
  email: string;
  displayName: string;
  group: { name: string; slug: string };
}

export interface Envelope {
  kind: ReminderKind;
  email: string;
  displayName: string;
  groups: Array<{ name: string; slug: string }>;
}

export function bundleReminders(due: DueReminder[]): Envelope[] {
  const envelopes = new Map<string, Envelope>();
  for (const item of due) {
    const key = `${item.kind}:${item.profileId}`;
    const envelope = envelopes.get(key) ?? {
      kind: item.kind,
      email: item.email,
      displayName: item.displayName,
      groups: [],
    };
    if (!envelope.groups.some((group) => group.slug === item.group.slug)) {
      envelope.groups.push(item.group);
    }
    envelopes.set(key, envelope);
  }
  return [...envelopes.values()];
}
