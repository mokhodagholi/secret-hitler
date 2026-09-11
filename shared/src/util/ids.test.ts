import { describe, expect, it } from '@rstest/core';
import { makeId } from './ids';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('makeId', () => {
  it('Should mint a UUID', () => {
    expect(makeId()).toMatch(UUID);
  });

  it('Should mint a UUID when randomUUID is missing', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(makeId()).toMatch(UUID);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: original,
      });
    }
  });
});
