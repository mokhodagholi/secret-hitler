import { describe, expect, it } from '@rstest/core';
import { DEFAULT_BALE_BOT_USERNAME, miniAppStartLink } from './miniAppLink';

describe('miniAppStartLink', () => {
  it('Should open the Bale mini-app, never a website origin', () => {
    expect(miniAppStartLink(DEFAULT_BALE_BOT_USERNAME)).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
    expect(miniAppStartLink('secret_hitler_bot', 'ABC123')).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
    expect(miniAppStartLink(DEFAULT_BALE_BOT_USERNAME, 'ABC123')).not.toContain(
      'mrfantastic',
    );
    expect(miniAppStartLink(DEFAULT_BALE_BOT_USERNAME, 'ABC123')).not.toContain(
      '/join/',
    );
  });
});
