import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { SupportError, submitSupport } from './support';

afterEach(() => {
  rs.restoreAllMocks();
});

describe('submitSupport', () => {
  it('Should POST the topic, description, and client id', async () => {
    let body: unknown;
    rs.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      body = JSON.parse(String(init?.body));
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });

    await submitSupport({
      topic: 'suggestion',
      description: '  add a veto hint  ',
      clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });

    expect(body).toEqual({
      topic: 'suggestion',
      description: 'add a veto hint',
      clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    });
  });

  it('Should refuse a blank letter before touching the network', async () => {
    const fetchSpy = rs.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('should not fetch');
    });

    await expect(
      submitSupport({
        topic: 'help',
        description: '  ',
        clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).rejects.toBeInstanceOf(SupportError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Should map a closed desk to UNAVAILABLE', async () => {
    rs.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(new Response('{}', { status: 503 })),
    );

    await expect(
      submitSupport({
        topic: 'help',
        description: 'the table froze',
        clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});
