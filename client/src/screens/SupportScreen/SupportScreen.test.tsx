import { afterEach, describe, expect, it, rs } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { SupportScreen } from './SupportScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

afterEach(() => {
  rs.restoreAllMocks();
});

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('timed out waiting');
}

describe('SupportScreen', () => {
  it('Should send the chosen topic, the letter, and the player id', async () => {
    const harness = buildHarness();
    const requests: unknown[] = [];
    rs.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input) === '/api/support') {
        requests.push(JSON.parse(String(init?.body)));
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    renderWithApp(() => <SupportScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.support.topic }));
    fireEvent.click(screen.getByRole('option', { name: en.support.topics.suggestion }));
    fireEvent.input(screen.getByPlaceholderText(en.support.descriptionPlaceholder), {
      target: { value: 'please add a veto hint' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.support.send }));

    await waitUntil(() => screen.queryByText(en.support.thanks) != null);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual({
      topic: 'suggestion',
      description: 'please add a veto hint',
      clientId: harness.services.settings.settings.profileId,
    });
  });

  it('Should name the empty topic and the empty letter when Send is pressed', () => {
    const harness = buildHarness();
    renderWithApp(() => <SupportScreen />, harness);

    fireEvent.click(screen.getByRole('button', { name: en.support.send }));
    expect(screen.getByText(en.support.errorTopic)).toBeTruthy();
    expect(screen.getByText(en.support.errorDescription)).toBeTruthy();
  });

  it('Should show how much of the letter is used', () => {
    const harness = buildHarness();
    renderWithApp(() => <SupportScreen />, harness);

    expect(screen.getByText('0 / 2000')).toBeTruthy();
    fireEvent.input(screen.getByPlaceholderText(en.support.descriptionPlaceholder), {
      target: { value: 'hello' },
    });
    expect(screen.getByText('5 / 2000')).toBeTruthy();
  });
});
