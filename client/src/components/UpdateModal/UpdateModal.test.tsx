import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { UpdateModal } from './UpdateModal';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('UpdateModal', () => {
  it('Should stay hidden until the origin publishes a new build', () => {
    const harness = buildHarness();
    renderWithApp(() => <UpdateModal />, harness);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
