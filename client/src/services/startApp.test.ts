import { describe, expect, it } from '@rstest/core';
import { joinCodeFromStartApp } from './startApp';

describe('joinCodeFromStartApp', () => {
  it('Should treat a 6-character startapp payload as a room invite', () => {
    expect(joinCodeFromStartApp('abc123')).toBe('ABC123');
    expect(joinCodeFromStartApp('ABC123')).toBe('ABC123');
  });

  it('Should ignore empty or unknown payloads so other startapp kinds can land later', () => {
    expect(joinCodeFromStartApp(null)).toBeNull();
    expect(joinCodeFromStartApp('')).toBeNull();
    expect(joinCodeFromStartApp('naqvvxd7vbc2xvky')).toBeNull();
    expect(joinCodeFromStartApp('rules')).toBeNull();
  });
});
