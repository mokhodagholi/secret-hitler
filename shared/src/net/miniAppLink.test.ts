import { describe, expect, it } from '@rstest/core';
import {
  DEFAULT_BALE_BOT_USERNAME,
  isLocalInviteHost,
  miniAppStartLink,
  roomInviteLink,
} from './miniAppLink';

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

describe('roomInviteLink', () => {
  it('Should copy a local join URL on loopback, and a Bale startapp link elsewhere', () => {
    expect(isLocalInviteHost('localhost:3001')).toBe(true);
    expect(isLocalInviteHost('192.168.1.5')).toBe(true);
    expect(isLocalInviteHost('10.0.0.4')).toBe(true);
    expect(
      roomInviteLink({
        code: 'ABC123',
        origin: 'http://localhost:3001',
        hostname: 'localhost',
      }),
    ).toBe('http://localhost:3001/join/ABC123');
    expect(
      roomInviteLink({
        code: 'ABC123',
        origin: 'http://192.168.1.5:3000',
        hostname: '192.168.1.5',
      }),
    ).toBe('http://192.168.1.5:3000/join/ABC123');
    expect(
      roomInviteLink({
        code: 'ABC123',
        origin: 'https://192.168.1.5:3000',
        hostname: '192.168.1.5',
      }),
    ).toBe('https://192.168.1.5:3000/join/ABC123');
    expect(
      roomInviteLink({
        code: 'ABC123',
        origin: 'https://mrfantastic.ir',
        hostname: 'mrfantastic.ir',
      }),
    ).toBe('https://ble.ir/secret_hitler_bot?startapp=ABC123');
  });
});
