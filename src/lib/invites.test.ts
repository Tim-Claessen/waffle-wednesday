import { describe, expect, it } from 'vitest';

import { generateInviteToken, hashInviteToken, looksLikeInviteToken } from './invites.ts';

describe('invite tokens', () => {
  it('are URL-safe, a fixed length, and different every time', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(looksLikeInviteToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('hash to the same 64 hex characters every time', async () => {
    const token = generateInviteToken();
    const hash = await hashInviteToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashInviteToken(token)).toBe(hash);
  });

  it('turn away anything that is not the right shape', () => {
    expect(looksLikeInviteToken('the-group-slug')).toBe(false);
    expect(looksLikeInviteToken('')).toBe(false);
    expect(looksLikeInviteToken(`${generateInviteToken()}x`)).toBe(false);
  });
});
