import { describe, expect, it } from '@rstest/core';
import { screen } from '@solidjs/testing-library';
import { RoomsScreen } from './RoomsScreen';
import { en } from '../../i18n/locales/en';
import { buildHarness, renderWithApp } from '../../../test/test-utils';

describe('RoomsScreen', () => {
  it('Should keep create-room fields from inviting browser suggest', () => {
    const harness = buildHarness();
    renderWithApp(() => <RoomsScreen initialTab="create" />, harness);

    const name = screen.getByLabelText(en.createRoom.roomName);
    expect(name.getAttribute('autocomplete')).toBe('off');
    expect(name.getAttribute('enterkeyhint')).toBe('go');

    const password = screen.getByLabelText(en.createRoom.password);
    expect(password.getAttribute('autocomplete')).toBe('new-password');
    expect(password.getAttribute('spellcheck')).toBe('false');
  });
});
