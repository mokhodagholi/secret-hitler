import { describe, expect, it } from '@rstest/core';
import { addressToBan, isPublicAddress } from './firewallBan';

describe('firewallBan', () => {
  it('Should ignore loopback and private peers', () => {
    expect(isPublicAddress('127.0.0.1')).toBe(false);
    expect(isPublicAddress('10.0.0.4')).toBe(false);
    expect(isPublicAddress('172.18.0.1')).toBe(false);
    expect(isPublicAddress('203.0.113.8')).toBe(true);
  });

  it('Should use a public peer instead of a spoofed forwarded address', () => {
    expect(addressToBan('203.0.113.8', '198.51.100.1')).toBe('203.0.113.8');
    expect(addressToBan('::ffff:203.0.113.8', '198.51.100.1')).toBe('203.0.113.8');
    expect(addressToBan('172.18.0.2', '203.0.113.9')).toBe('203.0.113.9');
  });
});
