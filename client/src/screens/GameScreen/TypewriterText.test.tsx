import { describe, expect, it } from '@rstest/core';
import { TypewriterText } from './TypewriterText';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('TypewriterText', () => {
  it('Should report the finished line in tests', () => {
    const harness = buildHarness();
    const typed: Array<{ done: boolean; text: string }> = [];
    renderWithApp(
      () => (
        <TypewriterText
          text="We're in."
          onTyped={(done, text) => {
            typed.push({ done, text });
          }}
        />
      ),
      harness,
    );

    expect(typed).toEqual([{ done: true, text: "We're in." }]);
  });
});
