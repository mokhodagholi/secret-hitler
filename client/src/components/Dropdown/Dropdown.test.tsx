import { describe, expect, it } from '@rstest/core';
import { fireEvent, screen } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { Dropdown } from './Dropdown';
import { renderWithApp, buildHarness } from '../../../test/test-utils';

const OPTIONS = [
  { value: 'help', label: 'Help' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'criticism', label: 'Criticism' },
] as const;

describe('Dropdown', () => {
  it('Should show the placeholder until a value is chosen', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <Dropdown
          label="Topic"
          value={null}
          options={OPTIONS}
          placeholder="Pick one"
          onChange={() => {}}
        />
      ),
      harness,
    );

    expect(screen.getByText('Pick one')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Should open the list and report the chosen option', () => {
    const harness = buildHarness();
    const picked: string[] = [];
    renderWithApp(
      () => {
        const [value, setValue] = createSignal<'help' | 'suggestion' | 'criticism' | null>(
          null,
        );
        return (
          <Dropdown
            label="Topic"
            value={value()}
            options={OPTIONS}
            placeholder="Pick one"
            onChange={(next) => {
              picked.push(next);
              setValue(next);
            }}
          />
        );
      },
      harness,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Topic' }));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'Suggestion' }));
    expect(picked).toEqual(['suggestion']);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByText('Suggestion')).toBeTruthy();
  });
});
