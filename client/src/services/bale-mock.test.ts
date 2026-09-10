import { afterEach, describe, expect, it } from '@rstest/core';
import { installLocalBaleMock, isLocalBaleHost } from './bale-mock';

describe('bale-mock', () => {
  afterEach(() => {
    delete window.Bale;
  });

  it('Should treat loopback names as local', () => {
    expect(isLocalBaleHost('localhost')).toBe(true);
    expect(isLocalBaleHost('127.0.0.1')).toBe(true);
    expect(isLocalBaleHost('[::1]')).toBe(true);
    expect(isLocalBaleHost('mrfantastic.ir')).toBe(false);
  });

  it('Should install a no-op WebApp on localhost when Bale is missing', () => {
    installLocalBaleMock();
    expect(window.Bale?.WebApp.initData).toBe('');
    window.Bale?.WebApp.ready();
    window.Bale?.WebApp.expand();
    window.Bale?.WebApp.BackButton.show();
  });

  it('Should not replace an existing Bale namespace', () => {
    const existing = {
      WebApp: {
        initData: 'real',
        initDataUnsafe: {},
        ready: () => {},
        expand: () => {},
        BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
      },
    };
    window.Bale = existing;
    installLocalBaleMock();
    expect(window.Bale).toBe(existing);
  });
});
