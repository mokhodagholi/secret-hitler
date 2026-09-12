import { describe, expect, it } from '@rstest/core';
import { KeyboardForm } from './KeyboardForm';
import { renderWithApp, buildHarness } from '../../../test/test-utils';

describe('KeyboardForm', () => {
  it('Should mark the cluster so the keyboard service can dock it', () => {
    const harness = buildHarness();
    renderWithApp(
      () => (
        <KeyboardForm>
          <input aria-label="Name" />
          <button type="button">Send</button>
        </KeyboardForm>
      ),
      harness,
    );

    const field = document.querySelector('input');
    expect(field?.closest('[data-keyboard-form]')).toBeTruthy();
  });
});
