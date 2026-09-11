import { describe, expect, it } from '@rstest/core';
import { baleUserInOriginChat, isSeatedInGroup } from './groupMember';

describe('isSeatedInGroup', () => {
  it('Should treat owners, admins, and members as in the group', () => {
    expect(isSeatedInGroup({ status: 'creator' })).toBe(true);
    expect(isSeatedInGroup({ status: 'administrator' })).toBe(true);
    expect(isSeatedInGroup({ status: 'member' })).toBe(true);
  });

  it('Should treat a restricted user as in unless Bale says they are not', () => {
    expect(isSeatedInGroup({ status: 'restricted' })).toBe(true);
    expect(isSeatedInGroup({ status: 'restricted', is_member: true })).toBe(true);
    expect(isSeatedInGroup({ status: 'restricted', is_member: false })).toBe(false);
  });

  it('Should keep left and kicked users behind the password', () => {
    expect(isSeatedInGroup({ status: 'left' })).toBe(false);
    expect(isSeatedInGroup({ status: 'kicked' })).toBe(false);
  });
});

describe('baleUserInOriginChat', () => {
  it('Should return false when there is no group or no lookup', async () => {
    expect(await baleUserInOriginChat(undefined, 1, 9)).toBe(false);
    expect(await baleUserInOriginChat({ getChatMember: async () => ({ status: 'member' }) }, undefined, 9)).toBe(
      false,
    );
  });

  it('Should ask Bale and treat a thrown lookup as not in the group', async () => {
    expect(
      await baleUserInOriginChat(
        { getChatMember: async () => ({ status: 'member' }) },
        -100,
        9,
      ),
    ).toBe(true);
    expect(
      await baleUserInOriginChat(
        {
          getChatMember: async () => {
            throw new Error('not found');
          },
        },
        -100,
        9,
      ),
    ).toBe(false);
  });
});
