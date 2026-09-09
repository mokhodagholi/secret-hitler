import { createHmac } from 'node:crypto';
import { describe, expect, it } from '@rstest/core';
import { validateBaleInitData } from './initData';

const TOKEN = '123456:test-token';

function sign(fields: Record<string, string>, token = TOKEN): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('validateBaleInitData', () => {
  it('Should accept a signed payload and return the Bale first name', () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = sign({
      auth_date: authDate,
      query_id: 'AAE',
      user: JSON.stringify({ id: 42, first_name: 'آنا' }),
    });

    expect(validateBaleInitData(initData, TOKEN)).toEqual({
      id: 42,
      firstName: 'آنا',
      username: undefined,
    });
  });

  it('Should reject a tampered hash', () => {
    const authDate = String(Math.floor(Date.now() / 1000));
    const initData = sign({
      auth_date: authDate,
      user: JSON.stringify({ id: 1, first_name: 'Ana' }),
    });
    const forged = initData.replace(/hash=[0-9a-f]+/, 'hash=' + 'ab'.repeat(32));
    expect(validateBaleInitData(forged, TOKEN)).toBeNull();
  });

  it('Should reject stale auth_date', () => {
    const initData = sign({
      auth_date: '100',
      user: JSON.stringify({ id: 1, first_name: 'Ana' }),
    });
    expect(validateBaleInitData(initData, TOKEN, 1_000_000)).toBeNull();
  });
});
