import { describe, expect, it } from 'vitest';

import { slugFor, slugWithSuffix } from './slug.ts';

/** The same check as `groups.slug` in 0001_init.sql. */
const VALID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('group slugs', () => {
  it('make a tidy address from a name', () => {
    expect(slugFor('FWSH')).toBe('fwsh');
    expect(slugFor('Tim & Zoe')).toBe('tim-and-zoe');
    expect(slugFor('  The Old  Crew!! ')).toBe('the-old-crew');
    expect(slugFor('Café Société')).toBe('cafe-societe');
  });

  it('always pass the database check, even for awkward names', () => {
    for (const name of ['🧇🧇', '---', 'a'.repeat(80), 'x - - y', '日本']) {
      expect(slugFor(name)).toMatch(VALID);
      expect(slugWithSuffix(slugFor(name))).toMatch(VALID);
    }
  });
});
